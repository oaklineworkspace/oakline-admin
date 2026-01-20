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

  const adminId = authResult.userId;
  const { userId, action, reason } = req.body;

  if (!userId || !action) {
    return res.status(400).json({ error: 'User ID and action are required' });
  }

  if (!['suspend', 'unsuspend'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Must be suspend or unsuspend' });
  }

  try {
    const { data: existingProfile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name, wire_transfer_suspended')
      .eq('id', userId)
      .single();

    if (fetchError || !existingProfile) {
      return res.status(404).json({ error: 'User not found' });
    }

    let updateData;

    if (action === 'suspend') {
      if (!reason) {
        return res.status(400).json({ error: 'Reason is required for suspension' });
      }

      updateData = {
        wire_transfer_suspended: true,
        wire_transfer_suspension_reason: reason,
        wire_transfer_suspended_at: new Date().toISOString(),
        wire_transfer_suspended_by: adminId,
        wire_transfer_requires_selfie: true,
        wire_transfer_selfie_submitted: false,
        wire_transfer_selfie_submitted_at: null,
        updated_at: new Date().toISOString()
      };
    } else {
      updateData = {
        wire_transfer_suspended: false,
        wire_transfer_suspension_reason: null,
        wire_transfer_suspended_at: null,
        wire_transfer_suspended_by: null,
        wire_transfer_requires_selfie: false,
        wire_transfer_selfie_submitted: false,
        wire_transfer_selfie_submitted_at: null,
        updated_at: new Date().toISOString()
      };
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return res.status(500).json({ error: 'Failed to update wire transfer status' });
    }

    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action: action === 'suspend' ? 'wire_transfer_suspended' : 'wire_transfer_enabled',
      table_name: 'profiles',
      old_data: {
        wire_transfer_suspended: existingProfile.wire_transfer_suspended
      },
      new_data: updateData,
      created_at: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: action === 'suspend' 
        ? 'Wire transfers suspended successfully' 
        : 'Wire transfers enabled successfully'
    });
  } catch (error) {
    console.error('Error in update-user-wire-transfer-status:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}