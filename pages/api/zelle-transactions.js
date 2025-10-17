
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      sender_id,
      sender_account_id,
      recipient_contact,
      amount,
      memo,
      transaction_type
    } = req.body;

    // Validate required fields
    if (!sender_id || !sender_account_id || !recipient_contact || !amount || !transaction_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate amount
    const transactionAmount = parseFloat(amount);
    if (transactionAmount <= 0 || transactionAmount > 2500) {
      return res.status(400).json({ error: 'Amount must be between $0.01 and $2,500' });
    }

    // Validate contact format (email or phone)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
    
    if (!emailRegex.test(recipient_contact) && !phoneRegex.test(recipient_contact)) {
      return res.status(400).json({ error: 'Invalid email or phone number format' });
    }

    // Check daily and monthly limits
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get today's spending
    const { data: dayTransactions, error: dayError } = await supabase
      .from('zelle_transactions')
      .select('amount')
      .eq('sender_id', sender_id)
      .eq('transaction_type', 'send')
      .in('status', ['completed', 'pending'])
      .gte('created_at', startOfDay.toISOString());

    if (dayError) throw dayError;

    const dailySpent = dayTransactions?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    
    if (dailySpent + transactionAmount > 2500) {
      return res.status(400).json({ 
        error: `Daily limit exceeded. You can send $${(2500 - dailySpent).toFixed(2)} more today.`
      });
    }

    // Get month's spending
    const { data: monthTransactions, error: monthError } = await supabase
      .from('zelle_transactions')
      .select('amount')
      .eq('sender_id', sender_id)
      .eq('transaction_type', 'send')
      .in('status', ['completed', 'pending'])
      .gte('created_at', startOfMonth.toISOString());

    if (monthError) throw monthError;

    const monthlySpent = monthTransactions?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    
    if (monthlySpent + transactionAmount > 20000) {
      return res.status(400).json({ 
        error: `Monthly limit exceeded. You can send $${(20000 - monthlySpent).toFixed(2)} more this month.`
      });
    }

    // For send transactions, check account balance
    if (transaction_type === 'send') {
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('balance')
        .eq('id', sender_account_id)
        .eq('user_id', sender_id)
        .single();

      if (accountError) throw accountError;

      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      if (transactionAmount > parseFloat(account.balance || 0)) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }
    }

    // Create Zelle transaction record
    const { data: zelleTransaction, error: zelleError } = await supabase
      .from('zelle_transactions')
      .insert([{
        sender_id,
        sender_account_id: parseInt(sender_account_id),
        recipient_contact,
        amount: transactionAmount,
        memo: memo || (transaction_type === 'send' ? 'Zelle Transfer' : 'Zelle Request'),
        transaction_type,
        status: transaction_type === 'request' ? 'pending' : 'completed',
        reference_number: `Z${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (zelleError) throw zelleError;

    // For send transactions, create a debit transaction and update balance
    if (transaction_type === 'send') {
      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          user_id: sender_id,
          account_id: parseInt(sender_account_id),
          amount: -transactionAmount,
          type: 'zelle_send',
          description: `Zelle to ${recipient_contact} - ${memo || 'Transfer'}`,
          status: 'completed',
          category: 'transfer',
          reference_number: zelleTransaction.reference_number,
          created_at: new Date().toISOString()
        }]);

      if (transactionError) throw transactionError;

      // Update account balance
      const { error: balanceError } = await supabase.rpc('update_account_balance', {
        account_id: parseInt(sender_account_id),
        amount_change: -transactionAmount
      });

      if (balanceError) {
        console.error('Balance update error:', balanceError);
        // Don't fail the transaction, just log the error
      }
    }

    // Simulate external Zelle network processing
    // In a real implementation, this would integrate with actual Zelle network
    const response = {
      success: true,
      transaction_id: zelleTransaction.id,
      reference_number: zelleTransaction.reference_number,
      status: zelleTransaction.status,
      amount: transactionAmount,
      recipient: recipient_contact,
      estimated_delivery: transaction_type === 'send' ? 'Within minutes' : 'Pending recipient response',
      message: transaction_type === 'send' 
        ? `$${transactionAmount.toFixed(2)} sent to ${recipient_contact}`
        : `$${transactionAmount.toFixed(2)} requested from ${recipient_contact}`
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Zelle transaction error:', error);
    res.status(500).json({ 
      error: 'Transaction failed. Please try again.',
      details: error.message 
    });
  }
}
