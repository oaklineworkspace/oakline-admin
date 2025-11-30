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

  const { withdrawalId, action, adminNotes, rejectionReason } = req.body;

  if (!withdrawalId) {
    return res.status(400).json({ error: 'Withdrawal ID is required' });
  }

  if (!['approve', 'reject', 'complete'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  try {
    // Fetch the withdrawal
    const { data: withdrawal, error: fetchError } = await supabaseAdmin
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawalId)
      .single();

    if (fetchError || !withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    let updates = {
      processed_by: authResult.adminId,
      updated_at: new Date().toISOString()
    };

    if (adminNotes) {
      updates.admin_notes = adminNotes;
    }

    if (action === 'approve') {
      updates.status = 'approved';
      updates.approved_at = new Date().toISOString();
    } else if (action === 'reject') {
      updates.status = 'rejected';
      updates.rejection_reason = rejectionReason || '';
      updates.rejected_at = new Date().toISOString();
    } else if (action === 'complete') {
      updates.status = 'completed';
      updates.completed_at = new Date().toISOString();

      // Deduct the withdrawal amount from the account balance
      const { data: account, error: accountError } = await supabaseAdmin
        .from('accounts')
        .select('balance')
        .eq('id', withdrawal.account_id)
        .single();

      if (!accountError && account) {
        const newBalance = parseFloat(account.balance) - parseFloat(withdrawal.amount);
        await supabaseAdmin
          .from('accounts')
          .update({
            balance: Math.max(0, newBalance),
            updated_at: new Date().toISOString()
          })
          .eq('id', withdrawal.account_id);
      }

      // Create a corresponding transaction record
      await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: withdrawal.user_id,
          account_id: withdrawal.account_id,
          type: 'withdrawal',
          amount: withdrawal.amount,
          description: `Withdrawal - ${withdrawal.withdrawal_method} - Ref: ${withdrawal.reference_number}`,
          reference: withdrawal.reference_number,
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }

    // Update the withdrawal
    const { error: updateError } = await supabaseAdmin
      .from('withdrawals')
      .update(updates)
      .eq('id', withdrawalId);

    if (updateError) {
      console.error('Error updating withdrawal:', updateError);
      return res.status(500).json({ error: 'Failed to update withdrawal' });
    }

    // Log the action
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: authResult.adminId,
        action: `withdrawal_${action}`,
        table_name: 'withdrawals',
        old_data: withdrawal,
        new_data: { ...withdrawal, ...updates }
      });

    return res.status(200).json({
      success: true,
      message: `Withdrawal ${action}ed successfully`,
      withdrawal: { ...withdrawal, ...updates }
    });

  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
