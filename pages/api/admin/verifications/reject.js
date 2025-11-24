
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
    const { verificationId, rejectionReason, adminNotes } = req.body;

    if (!verificationId) {
      return res.status(400).json({ error: 'Verification ID is required' });
    }

    if (!rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Update verification status
    const { error: updateError } = await supabaseAdmin
      .from('selfie_verifications')
      .update({
        status: 'rejected',
        reviewed_by: authResult.adminId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
        admin_notes: adminNotes || null
      })
      .eq('id', verificationId);

    if (updateError) throw updateError;

    return res.status(200).json({
      success: true,
      message: 'Verification rejected successfully'
    });

  } catch (error) {
    console.error('Error rejecting verification:', error);
    return res.status(500).json({
      error: 'Failed to reject verification',
      details: error.message
    });
  }
}
