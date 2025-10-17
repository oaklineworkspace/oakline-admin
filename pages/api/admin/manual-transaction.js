import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accountId, userId, type, amount, description, transactionDate } = req.body;

    // Validate required fields
    if (!accountId || !userId || !type || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate amount is a number
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
      return res.status(400).json({ error: 'Amount must be a valid number' });
    }

    if (numericAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Get current account data
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const currentBalance = parseFloat(account.balance);
    let newBalance;
    let transactionAmount;
    let transactionType;

    // Determine transaction amount and new balance based on type
    // Note: Store amounts as POSITIVE values, type determines if it's debit/credit
    switch (type) {
      case 'deposit':
      case 'interest':
      case 'bonus':
      case 'refund':
      case 'transfer_in':
        transactionAmount = numericAmount; // Positive amount
        newBalance = currentBalance + numericAmount;
        transactionType = 'credit';
        break;
      
      case 'withdrawal':
      case 'atm_withdrawal':
        transactionAmount = numericAmount; // Store as positive
        newBalance = currentBalance - numericAmount;
        transactionType = 'debit';
        break;
      
      case 'debit_card':
      case 'card_charge':
        transactionAmount = numericAmount; // Store as positive
        newBalance = currentBalance - numericAmount;
        transactionType = 'debit';
        break;
      
      case 'transfer':
      case 'transfer_out':
      case 'wire_transfer':
      case 'ach_transfer':
        transactionAmount = numericAmount; // Store as positive
        newBalance = currentBalance - numericAmount;
        transactionType = 'transfer_out';
        break;
      
      case 'check':
      case 'check_payment':
        transactionAmount = numericAmount; // Store as positive
        newBalance = currentBalance - numericAmount;
        transactionType = 'debit';
        break;
      
      case 'fee':
      case 'service_fee':
        transactionAmount = numericAmount; // Store as positive
        newBalance = currentBalance - numericAmount;
        transactionType = 'fee';
        break;
      
      case 'adjustment':
        // For adjustments, the amount can be positive or negative
        transactionAmount = Math.abs(numericAmount);
        newBalance = currentBalance + numericAmount;
        transactionType = numericAmount >= 0 ? 'credit' : 'debit';
        break;
      
      default:
        return res.status(400).json({ error: 'Invalid transaction type' });
    }

    // Check for negative balance on debit transactions
    if (newBalance < 0 && !['adjustment'].includes(type)) {
      return res.status(400).json({ 
        error: `Insufficient funds. Current balance: $${currentBalance.toFixed(2)}, Transaction amount: $${numericAmount.toFixed(2)}` 
      });
    }

    // Update account balance
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ 
        balance: newBalance.toFixed(2),
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId);

    if (updateError) {
      throw updateError;
    }

    // Create transaction record
    // Try with reference_number first, fallback to reference if needed
    const transactionData = {
      account_id: accountId,
      user_id: userId,
      type: transactionType,
      amount: transactionAmount,
      status: 'completed',
      description: description || `Manual ${type.replace(/_/g, ' ')}`,
      created_at: transactionDate ? new Date(transactionDate).toISOString() : new Date().toISOString()
    };

    // Check if table has reference_number or reference column
    const referenceValue = `MANUAL_${Date.now()}`;
    
    // Try to insert with both possible column names
    let transaction, transactionError;
    
    // First attempt with reference_number
    const result1 = await supabase
      .from('transactions')
      .insert([{ ...transactionData, reference_number: referenceValue }])
      .select()
      .single();
    
    if (result1.error && result1.error.message.includes('reference_number')) {
      // Fallback to 'reference' column name
      const result2 = await supabase
        .from('transactions')
        .insert([{ ...transactionData, reference: referenceValue }])
        .select()
        .single();
      
      transaction = result2.data;
      transactionError = result2.error;
    } else {
      transaction = result1.data;
      transactionError = result1.error;
    }

    if (transactionError) {
      // Try to revert balance update if transaction creation fails
      await supabase
        .from('accounts')
        .update({ 
          balance: currentBalance.toFixed(2),
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId);

      throw transactionError;
    }

    res.status(200).json({
      success: true,
      message: 'Transaction processed successfully',
      transaction: transaction,
      newBalance: newBalance.toFixed(2),
      previousBalance: currentBalance.toFixed(2)
    });

  } catch (error) {
    console.error('Manual transaction error:', error);
    res.status(500).json({
      error: 'Internal server error during transaction processing',
      details: error.message
    });
  }
}
