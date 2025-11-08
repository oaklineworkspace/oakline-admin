
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

  console.log('Verify document request:', { docId, status, reason });

  if (!docId || !status) {
    console.error('Missing required fields:', { docId, status });
    return res.status(400).json({ error: 'Document ID and status are required' });
  }

  if (!['verified', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be verified or rejected' });
  }

  if (status === 'rejected' && !reason) {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  try {
    // First, try to find the document in user_id_documents table
    const { data: existingDoc } = await supabaseAdmin
      .from('user_id_documents')
      .select('*')
      .eq('id', docId)
      .single();

    let data;
    let tableName;

    if (existingDoc) {
      // Document exists in user_id_documents table
      const updateData = {
        status,
        verified_by: authResult.user.id,
        verified_at: new Date().toISOString(),
      };

      if (status === 'rejected') {
        updateData.rejection_reason = reason;
      }

      const { data: updatedDoc, error } = await supabaseAdmin
        .from('user_id_documents')
        .update(updateData)
        .eq('id', docId)
        .select()
        .single();

      if (error) {
        console.error('Error updating document in user_id_documents:', error);
        return res.status(500).json({ error: error.message });
      }

      data = updatedDoc;
      tableName = 'user_id_documents';
    } else {
      // Document might be from applications table
      const updateData = {
        application_status: status === 'verified' ? 'approved' : 'rejected',
        processed_at: new Date().toISOString(),
      };

      if (status === 'rejected' && reason) {
        updateData.rejection_reason = reason;
      }

      const { data: updatedApp, error } = await supabaseAdmin
        .from('applications')
        .update(updateData)
        .eq('id', docId)
        .select()
        .single();

      if (error) {
        console.error('Error updating application:', error);
        return res.status(500).json({ error: error.message });
      }

      data = updatedApp;
      tableName = 'applications';
    }

    // Log the action
    await supabaseAdmin.from('audit_logs').insert({
      user_id: authResult.user.id,
      action: `ID Document ${status}`,
      table_name: tableName,
      new_data: data,
    });

    return res.status(200).json({ success: true, document: data });
  } catch (error) {
    console.error('Error in verify-id-document:', error);
    return res.status(500).json({ error: error.message });
  }
}
