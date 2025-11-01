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

  try {
    const { depositId, newStatus, reason, note } = req.body;

    if (!depositId || !newStatus) {
      return res.status(400).json({ error: 'Deposit ID and new status are required' });
    }

    const validStatuses = ['pending', 'on_hold', 'awaiting_confirmations', 'confirmed', 'processing', 'completed', 'failed', 'reversed'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const { data: deposit, error: depositError } = await supabaseAdmin
      .from('crypto_deposits')
      .select('*')
      .eq('id', depositId)
      .single();

    if (depositError || !deposit) {
      console.error('Error fetching deposit:', depositError);
      return res.status(404).json({ error: 'Deposit not found' });
    }

    const oldStatus = deposit.status;
    let newBalance = null;
    let balanceChanged = false;

    if (newStatus === 'confirmed' || newStatus === 'completed') {
      const { data: account, error: accountError } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('id', deposit.account_id)
        .single();

      if (accountError || !account) {
        console.error('Error fetching account:', accountError);
        return res.status(404).json({ error: 'Account not found' });
      }

      newBalance = parseFloat(account.balance || 0) + parseFloat(deposit.net_amount || deposit.amount);

      const { error: balanceUpdateError } = await supabaseAdmin
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', account.id);

      if (balanceUpdateError) {
        console.error('Error updating account balance:', balanceUpdateError);
        return res.status(500).json({ error: 'Failed to credit account balance. Deposit status not changed.' });
      }

      balanceChanged = true;
    }

    if (newStatus === 'reversed') {
      const { data: account, error: accountError } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('id', deposit.account_id)
        .single();

      if (accountError || !account) {
        console.error('Error fetching account:', accountError);
        return res.status(404).json({ error: 'Account not found' });
      }

      newBalance = parseFloat(account.balance || 0) - parseFloat(deposit.net_amount || deposit.amount);

      if (newBalance < 0) {
        return res.status(400).json({ error: 'Cannot reverse deposit: insufficient account balance. Deposit status not changed.' });
      }

      const { error: balanceUpdateError } = await supabaseAdmin
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', account.id);

      if (balanceUpdateError) {
        console.error('Error updating account balance:', balanceUpdateError);
        return res.status(500).json({ error: 'Failed to deduct account balance. Deposit status not changed.' });
      }

      balanceChanged = true;
    }

    const updateData = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    if (newStatus === 'confirmed' || newStatus === 'completed') {
      updateData.approved_by = authResult.user.id;
      updateData.approved_at = new Date().toISOString();
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
    } else if (newStatus === 'rejected' || newStatus === 'failed') {
      updateData.rejected_by = authResult.user.id;
      updateData.rejected_at = new Date().toISOString();
      if (reason) {
        updateData.rejection_reason = reason;
      }
    } else if (newStatus === 'on_hold') {
      if (reason) {
        updateData.hold_reason = reason;
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('crypto_deposits')
      .update(updateData)
      .eq('id', depositId);

    if (updateError) {
      console.error('Error updating deposit status:', updateError);
      
      if (balanceChanged && newBalance !== null) {
        const { data: account } = await supabaseAdmin
          .from('accounts')
          .select('balance')
          .eq('id', deposit.account_id)
          .single();
        
        if (account) {
          const originalBalance = newStatus === 'reversed' 
            ? parseFloat(account.balance) + parseFloat(deposit.net_amount || deposit.amount)
            : parseFloat(account.balance) - parseFloat(deposit.net_amount || deposit.amount);
          
          await supabaseAdmin
            .from('accounts')
            .update({ balance: originalBalance })
            .eq('id', deposit.account_id);
        }
      }
      
      return res.status(500).json({ error: 'Failed to update deposit status. Balance changes have been rolled back.' });
    }

    const auditLogData = {
      deposit_id: depositId,
      changed_by: authResult.user.id,
      old_status: oldStatus,
      new_status: newStatus,
      old_confirmations: deposit.confirmations,
      new_confirmations: deposit.confirmations,
      old_amount: deposit.amount,
      new_amount: deposit.amount,
      old_fee: deposit.fee,
      new_fee: deposit.fee,
      old_wallet_address: deposit.wallet_address,
      new_wallet_address: deposit.wallet_address,
      note: note || `Status changed from ${oldStatus} to ${newStatus}${reason ? ` - Reason: ${reason}` : ''}`,
      metadata: {
        admin_email: authResult.user.email,
        timestamp: new Date().toISOString(),
        reason: reason || null,
        balance_changed: balanceChanged,
        new_balance: newBalance
      }
    };

    const { error: auditError } = await supabaseAdmin
      .from('crypto_deposit_audit_logs')
      .insert(auditLogData);

    if (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    const responseMessage = balanceChanged
      ? `Deposit ${newStatus} successfully and ${newStatus === 'reversed' ? 'funds deducted' : 'funds credited'}`
      : `Deposit status updated to ${newStatus}`;

    return res.status(200).json({
      success: true,
      message: responseMessage,
      newBalance: newBalance,
      deposit: { ...deposit, status: newStatus }
    });

  } catch (error) {
    console.error('Error in update-crypto-deposit-status API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
