
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
    const { verificationId, adminNotes } = req.body;

    if (!verificationId) {
      return res.status(400).json({ error: 'Verification ID is required' });
    }

    // Update verification status
    const { data: verification, error: updateError } = await supabaseAdmin
      .from('selfie_verifications')
      .update({
        status: 'approved',
        reviewed_by: authResult.adminId,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes || null
      })
      .eq('id', verificationId)
      .select('user_id')
      .single();

    if (updateError) throw updateError;

    // Update user profile to mark as verified
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_verified: true,
        last_verified_at: new Date().toISOString(),
        requires_verification: false
      })
      .eq('id', verification.user_id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    return res.status(200).json({
      success: true,
      message: 'Verification approved successfully'
    });

  } catch (error) {
    console.error('Error approving verification:', error);
    return res.status(500).json({
      error: 'Failed to approve verification',
      details: error.message
    });
  }
}
