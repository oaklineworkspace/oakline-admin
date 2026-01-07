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

  const { userId, action, reason } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (!action || !['suspend', 'unsuspend'].includes(action)) {
    return res.status(400).json({ error: 'Valid action (suspend or unsuspend) is required' });
  }

  if (action === 'suspend' && !reason) {
    return res.status(400).json({ error: 'Reason is required for suspension' });
  }

  try {
    const updateData = action === 'suspend' 
      ? {
          withdrawal_suspended: true,
          withdrawal_suspension_reason: reason,
          withdrawal_suspended_at: new Date().toISOString(),
          withdrawal_suspended_by: authResult.user.id
        }
      : {
          withdrawal_suspended: false,
          withdrawal_suspension_reason: null,
          withdrawal_suspended_at: null,
          withdrawal_suspended_by: null
        };

    const { data, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating withdrawal status:', updateError);
      return res.status(500).json({ error: 'Failed to update withdrawal status' });
    }

    await supabaseAdmin
      .from('account_status_audit_log')
      .insert({
        user_id: userId,
        changed_by: authResult.user.id,
        action_type: action === 'suspend' ? 'suspend' : 'reactivate',
        reason: action === 'suspend' ? reason : 'Withdrawal suspension lifted',
        metadata: { feature: 'withdrawal', action }
      });

    return res.status(200).json({
      success: true,
      message: action === 'suspend' 
        ? 'Withdrawals suspended successfully' 
        : 'Withdrawal suspension lifted successfully',
      user: data
    });
  } catch (error) {
    console.error('Error in update-user-withdrawal-status:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
