
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { depositId, accountId, action, amount, reason } = req.body;

    if (!depositId || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (action === 'approve') {
      if (!accountId || !amount) {
        return res.status(400).json({ error: 'Account ID and amount required for approval' });
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      // Get current account balance
      const { data: account, error: accountError } = await supabaseAdmin
        .from('accounts')
        .select('balance, user_id')
        .eq('id', accountId)
        .single();

      if (accountError || !account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      const currentBalance = parseFloat(account.balance || 0);
      const newBalance = currentBalance + parsedAmount;

      // Update account balance
      const { error: balanceError } = await supabaseAdmin
        .from('accounts')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId);

      if (balanceError) {
        console.error('Balance update error:', balanceError);
        throw balanceError;
      }

      // Create transaction record
      const { error: transactionError } = await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: account.user_id,
          account_id: accountId,
          type: 'credit',
          amount: parsedAmount,
          description: 'Mobile Check Deposit - Approved by admin',
          status: 'completed',
          created_at: new Date().toISOString()
        });

      if (transactionError) {
        console.error('Transaction insert error:', transactionError);
        // Rollback balance update
        await supabaseAdmin
          .from('accounts')
          .update({ balance: currentBalance })
          .eq('id', accountId);
        throw transactionError;
      }

      // Update check deposit status
      const { error: updateError } = await supabaseAdmin
        .from('check_deposits')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', depositId);

      if (updateError) throw updateError;

      res.status(200).json({
        success: true,
        message: 'Check deposit approved',
        newBalance: newBalance
      });
    } else if (action === 'reject') {
      const { error: updateError } = await supabaseAdmin
        .from('check_deposits')
        .update({
          status: 'rejected',
          rejection_reason: reason || 'Rejected by admin',
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', depositId);

      if (updateError) throw updateError;

      res.status(200).json({
        success: true,
        message: 'Check deposit rejected'
      });
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error processing check deposit:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
