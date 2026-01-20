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

    const { userId, status, rejectionReason } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!status || !['confirmed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "confirmed" or "rejected"' });
    }

    const updateData = {
      freeze_payment_status: status,
      freeze_payment_reviewed_at: new Date().toISOString(),
      freeze_payment_reviewed_by: authResult.admin.id,
      updated_at: new Date().toISOString()
    };

    if (status === 'rejected' && rejectionReason) {
      updateData.freeze_payment_rejection_reason = rejectionReason;
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating freeze payment status:', error);
      return res.status(500).json({ error: 'Failed to update status: ' + error.message });
    }

    return res.status(200).json({
      success: true,
      message: `Payment status updated to ${status}`,
      user: data
    });

  } catch (error) {
    console.error('Error in update-freeze-payment-status:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
