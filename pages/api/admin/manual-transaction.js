import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accountId, amount, type, description } = req.body;

    if (!accountId || amount === undefined || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Get current account balance
    const { data: accountData, error: fetchError } = await supabaseAdmin
      .from('accounts')
      .select('balance, account_number')
      .eq('id', accountId)
      .single();

    if (fetchError || !accountData) {
      console.error('Fetch error:', fetchError);
      return res.status(404).json({ error: 'Account not found' });
    }

    // Calculate new balance based on transaction type
    let newBalance;
    if (type === 'balance_update') {
      newBalance = parsedAmount;
    } else if (type === 'credit' || type === 'deposit') {
      newBalance = parseFloat(accountData.balance) + parsedAmount;
    } else if (type === 'debit' || type === 'withdrawal') {
      newBalance = parseFloat(accountData.balance) - parsedAmount;
    } else {
      // Defaulting to parsedAmount if type is unknown, could be 'balance_update' or similar
      newBalance = parsedAmount;
    }

    // Update account balance
    const { error: updateError } = await supabaseAdmin
      .from('accounts')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    // Create transaction record
    const { error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert({
        account_id: accountId,
        type: type === 'balance_update' ? 'credit' : type, // Map 'balance_update' to 'credit' for transaction log
        amount: type === 'balance_update' ? parsedAmount : Math.abs(parsedAmount), // Store absolute amount for transactions
        description: description || 'Manual transaction by admin',
        status: 'completed',
        created_at: new Date().toISOString()
      });

    if (transactionError) {
      console.error('Transaction error:', transactionError);
      // Consider a more robust error handling here, e.g., attempting to revert the balance update
    }

    res.status(200).json({
      message: 'Transaction completed successfully',
      newBalance: newBalance,
      accountNumber: accountData.account_number
    });
  } catch (error) {
    console.error('Error processing manual transaction:', error);
    res.status(500).json({ error: error.message });
  }
}