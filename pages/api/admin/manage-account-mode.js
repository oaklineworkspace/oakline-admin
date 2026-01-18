import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authResult = await verifyAdminAuth(req);
    if (authResult.error) {
      return res.status(authResult.status || 401).json({ error: authResult.error });
    }

    const adminId = authResult.user?.id;
    const { userId, action, reason, amountRequired } = req.body;

    if (!userId || !action) {
      return res.status(400).json({ error: 'Missing required fields: userId, action' });
    }

    const validActions = ['freeze', 'unfreeze', 'set_unlimited', 'remove_unlimited'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be one of: ' + validActions.join(', ') });
    }

    let updateData = {};
    const now = new Date().toISOString();

    switch (action) {
      case 'freeze':
        updateData = {
          is_frozen: true,
          frozen_at: now,
          frozen_by: adminId,
          frozen_reason: reason || 'Account frozen by admin',
          freeze_amount_required: amountRequired || 0
        };
        break;
      case 'unfreeze':
        updateData = {
          is_frozen: false,
          frozen_at: null,
          frozen_by: null,
          frozen_reason: null,
          freeze_amount_required: 0
        };
        break;
      case 'set_unlimited':
        updateData = {
          is_unlimited: true,
          unlimited_at: now,
          unlimited_by: adminId,
          unlimited_reason: reason || 'Unlimited access granted by admin'
        };
        break;
      case 'remove_unlimited':
        updateData = {
          is_unlimited: false,
          unlimited_at: null,
          unlimited_by: null,
          unlimited_reason: null
        };
        break;
    }

    updateData.updated_at = now;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ error: 'Failed to update user status: ' + error.message });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully ${action.replace('_', ' ')} for user`,
      profile: data
    });

  } catch (error) {
    console.error('Error in manage-account-mode:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
