
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { documentId, status, rejectionReason } = req.body;

  if (!documentId || !status) {
    return res.status(400).json({ error: 'Document ID and status are required' });
  }

  if (!['verified', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be verified or rejected' });
  }

  if (status === 'rejected' && !rejectionReason) {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  try {
    const updateData = {
      status,
      verified_by: authResult.user.id,
      verified_at: new Date().toISOString(),
    };

    if (status === 'rejected') {
      updateData.rejection_reason = rejectionReason;
    }

    const { data, error } = await supabaseAdmin
      .from('user_id_documents')
      .update(updateData)
      .eq('id', documentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating document:', error);
      return res.status(500).json({ error: error.message });
    }

    // Log the action
    await supabaseAdmin.from('audit_logs').insert({
      user_id: authResult.user.id,
      action: `ID Document ${status}`,
      table_name: 'user_id_documents',
      new_data: data,
    });

    return res.status(200).json({ success: true, document: data });
  } catch (error) {
    console.error('Error in verify-id-document:', error);
    return res.status(500).json({ error: error.message });
  }
}
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

  const { docId, status, reason } = req.body;

  if (!docId || !status) {
    return res.status(400).json({ error: 'Document ID and status are required' });
  }

  if (!['verified', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be "verified" or "rejected"' });
  }

  try {
    const updateData = {
      status,
      verified_by: authResult.adminId,
      updated_at: new Date().toISOString()
    };

    if (status === 'verified') {
      updateData.verified_at = new Date().toISOString();
      updateData.rejection_reason = null;
    } else if (status === 'rejected') {
      updateData.rejection_reason = reason || 'No reason provided';
      updateData.verified_at = null;
    }

    const { error: updateError } = await supabaseAdmin
      .from('user_id_documents')
      .update(updateData)
      .eq('id', docId);

    if (updateError) throw updateError;

    return res.status(200).json({
      success: true,
      message: `Document ${status} successfully`
    });
  } catch (error) {
    console.error('Error verifying document:', error);
    return res.status(500).json({
      error: 'Failed to verify document',
      details: error.message
    });
  }
}
