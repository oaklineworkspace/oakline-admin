import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  const { transactionId, accountId, transactionType, amount, status, source } = req.body;

  if (!transactionId) {
    return res.status(400).json({ error: 'Transaction ID is required' });
  }

  try {
    let balanceReverted = false;

    // If transaction was completed, we need to reverse the balance
    if (status === 'completed' && accountId && transactionType && amount) {
      const { data: account } = await supabaseAdmin
        .from('accounts')
        .select('balance')
        .eq('id', accountId)
        .single();

      if (account) {
        const currentBalance = parseFloat(account.balance);
        let newBalance;

        // Reverse the transaction effect
        if (transactionType === 'credit' || transactionType === 'account_opening_deposit' || transactionType === 'loan_collateral_deposit') {
          // Reverting a credit means subtracting from balance
          newBalance = currentBalance - parseFloat(amount);
        } else {
          // Reverting a debit means adding to balance
          newBalance = currentBalance + parseFloat(amount);
        }

        // Update account balance
        const { error: balanceError } = await supabaseAdmin
          .from('accounts')
          .update({ 
            balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', accountId);

        if (balanceError) {
          console.error('Error updating account balance:', balanceError);
          return res.status(500).json({ error: 'Failed to revert account balance' });
        }

        balanceReverted = true;
      }
    }

    // Delete from the appropriate table based on source
    let deleteError;
    
    if (source === 'loan_payment') {
      // Delete from loan_payments table
      const { error } = await supabaseAdmin
        .from('loan_payments')
        .delete()
        .eq('id', transactionId);
      deleteError = error;
    } else if (source === 'account_opening_deposit') {
      // Delete from account_opening_crypto_deposits table
      const { error } = await supabaseAdmin
        .from('account_opening_crypto_deposits')
        .delete()
        .eq('id', transactionId);
      deleteError = error;
    } else {
      // Delete from transactions table (default)
      const { error } = await supabaseAdmin
        .from('transactions')
        .delete()
        .eq('id', transactionId);
      deleteError = error;
    }

    if (deleteError) {
      console.error('Error deleting transaction:', deleteError);
      return res.status(500).json({ error: 'Failed to delete transaction' });
    }

    // Log the deletion
    await supabaseAdmin.from('audit_logs').insert({
      action: 'transaction_deleted',
      admin_id: authResult.adminId,
      details: {
        transaction_id: transactionId,
        account_id: accountId,
        type: transactionType,
        amount: amount,
        status: status,
        source: source || 'transaction',
        balance_reverted: balanceReverted
      }
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Transaction deleted successfully',
      balanceReverted
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete transaction' });
  }
}