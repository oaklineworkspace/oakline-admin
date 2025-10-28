import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin access
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check admin role
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('admin_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || !adminProfile) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { transactionId, accountId, userId, amount, type } = req.body;

    if (!transactionId || !accountId || !amount || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const reversalAmount = parseFloat(amount);
    if (isNaN(reversalAmount) || reversalAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Get current account balance
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('balance')
      .eq('id', accountId)
      .single();

    if (accountError) {
      console.error('Account fetch error:', accountError);
      return res.status(404).json({ error: 'Account not found' });
    }

    const currentBalance = parseFloat(account.balance || 0);

    // Calculate new balance (reverse the transaction effect)
    // If original was credit (+), reverse is debit (-)
    // If original was debit (-), reverse is credit (+)
    const newBalance = type === 'credit' 
      ? currentBalance - reversalAmount 
      : currentBalance + reversalAmount;

    if (newBalance < 0) {
      return res.status(400).json({ 
        error: 'Insufficient funds',
        details: `Reversal would result in negative balance: $${newBalance.toFixed(2)}`
      });
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
      console.error('Balance update error:', updateError);
      throw updateError;
    }

    // Create reversal transaction
    const { data: reversalTx, error: reversalError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: userId,
        account_id: accountId,
        type: type === 'credit' ? 'debit' : 'credit',
        amount: reversalAmount,
        description: `REVERSAL: Original transaction reversed by admin (Ref: ${transactionId.substring(0, 8)})`,
        status: 'reversal',
        metadata: {
          original_transaction_id: transactionId,
          reversal_reason: 'Admin initiated reversal',
          reversed_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (reversalError) {
      console.error('Reversal transaction error:', reversalError);
      // Rollback balance update
      await supabaseAdmin
        .from('accounts')
        .update({ balance: currentBalance })
        .eq('id', accountId);
      throw reversalError;
    }

    res.status(200).json({
      success: true,
      message: 'Transaction reversed successfully',
      reversal: reversalTx,
      previousBalance: currentBalance,
      newBalance: newBalance
    });
  } catch (error) {
    console.error('Error reversing transaction:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}