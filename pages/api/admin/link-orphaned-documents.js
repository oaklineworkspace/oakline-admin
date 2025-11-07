
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

  const { userId, documentType, frontFileName, backFileName } = req.body;

  if (!userId || !documentType || !frontFileName) {
    return res.status(400).json({ error: 'userId, documentType, and frontFileName are required' });
  }

  try {
    // Create database record for the existing files
    const { data: docRecord, error: dbError } = await supabaseAdmin
      .from('user_id_documents')
      .insert({
        user_id: userId,
        document_type: documentType,
        front_url: `documents/${frontFileName}`,
        back_url: backFileName ? `documents/${backFileName}` : null,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ error: 'Failed to create document record', details: dbError.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Document linked successfully',
      document: docRecord
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
