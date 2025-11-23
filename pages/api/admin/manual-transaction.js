import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

const CREDIT_TYPES = ['deposit_adjust', 'transfer_in', 'refund', 'interest', 'bonus'];
const DEBIT_TYPES = ['withdrawal', 'atm_withdrawal', 'debit_card', 'transfer_out', 'ach_transfer', 'check_payment', 'service_fee', 'other'];
const FLEXIBLE_TYPES = ['check_deposit', 'wire_transfer']; // Can be either credit or debit

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { accountId, userId, transactionType, amount, description, status, creditDebitOverride, transactionDate, transactionTime, transactionCount } = req.body;

    if (!accountId || !userId || !transactionType || amount === undefined || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount (must be positive)' });
    }

    let txCount = parseInt(transactionCount) || 1;
    if (txCount < 1 || txCount > 100) {
      return res.status(400).json({ error: 'Transaction count must be between 1 and 100' });
    }

    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('balance, account_number, user_id')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (account.user_id !== userId) {
      return res.status(403).json({ error: 'Account does not belong to the specified user' });
    }

    let isCredit;
    if (creditDebitOverride) {
      isCredit = creditDebitOverride === 'credit';
    } else {
      isCredit = CREDIT_TYPES.includes(transactionType);
    }

    const currentBalance = parseFloat(account.balance || 0);
    let newBalance = currentBalance;

    if (status === 'completed') {
      const totalChange = (isCredit ? parsedAmount : -parsedAmount) * txCount;
      newBalance = currentBalance + totalChange;
      
      if (newBalance < 0) {
        return res.status(400).json({ 
          error: 'Insufficient funds',
          details: `${txCount} transaction(s) would result in negative balance: $${newBalance.toFixed(2)}`
        });
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('accounts')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId);

    if (updateError) {
      console.error('Balance update error:', updateError);
      throw updateError;
    }

    const transactionTypeName = transactionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const baseDateTime = transactionDate && transactionTime ? `${transactionDate}T${transactionTime}:00Z` : new Date().toISOString();
    
    const transactionsToInsert = [];
    for (let i = 0; i < txCount; i++) {
      const txDateTime = new Date(new Date(baseDateTime).getTime() + i * 60000);
      transactionsToInsert.push({
        user_id: userId,
        account_id: accountId,
        type: isCredit ? 'credit' : 'debit',
        amount: parsedAmount,
        description: description || `${transactionTypeName} - Manual transaction by admin`,
        status: status,
        created_at: txDateTime.toISOString()
      });
    }

    const { data: transactions, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert(transactionsToInsert)
      .select();

    if (transactionError) {
      console.error('Transaction insert error:', transactionError);
      await supabaseAdmin
        .from('accounts')
        .update({ balance: currentBalance })
        .eq('id', accountId);
      throw transactionError;
    }

    res.status(200).json({
      success: true,
      message: txCount > 1 ? `${txCount} transactions processed successfully` : 'Transaction processed successfully',
      transactionCount: txCount,
      previousBalance: currentBalance,
      newBalance: newBalance,
      accountNumber: account.account_number
    });
  } catch (error) {
    console.error('Error processing manual transaction:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
