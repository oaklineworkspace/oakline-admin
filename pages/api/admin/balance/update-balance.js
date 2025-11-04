import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { accountId, operation, amount } = req.body;

    if (!accountId || !operation || !amount) {
      return res.status(400).json({ error: 'Account ID, operation, and amount are required' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const { data: currentAccount, error: fetchError } = await supabaseAdmin
      .from('accounts')
      .select('balance, account_number, account_type')
      .eq('id', accountId)
      .single();

    if (fetchError || !currentAccount) {
      throw new Error('Account not found');
    }

    let newBalance;
    const currentBalance = parseFloat(currentAccount.balance) || 0;

    switch (operation) {
      case 'set':
        newBalance = parsedAmount;
        break;
      case 'add':
        newBalance = currentBalance + parsedAmount;
        break;
      case 'subtract':
        newBalance = Math.max(0, currentBalance - parsedAmount);
        break;
      default:
        return res.status(400).json({ error: 'Invalid operation' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('accounts')
      .update({ 
        balance: newBalance.toFixed(2),
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId);

    if (updateError) throw updateError;

    const transactionAmount = operation === 'set' ? newBalance : Math.abs(parsedAmount);
    await supabaseAdmin
      .from('transactions')
      .insert({
        account_id: accountId,
        account_number: currentAccount.account_number,
        type: operation === 'subtract' ? 'debit' : 'credit',
        amount: transactionAmount,
        description: `Admin ${operation} balance: ${operation === 'set' ? 'Set to' : operation === 'add' ? 'Added' : 'Subtracted'} $${parsedAmount.toFixed(2)}`,
        status: 'completed',
        balance_after: newBalance.toFixed(2),
        created_at: new Date().toISOString()
      });

    return res.status(200).json({ 
      success: true,
      message: 'Balance updated successfully',
      previousBalance: currentBalance,
      newBalance: newBalance
    });

  } catch (error) {
    console.error('Error in update-balance API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
