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

  const { fileName, userId, email, documentType, side } = req.body;

  if (!fileName || (!userId && !email) || !documentType || !side) {
    return res.status(400).json({
      error: 'fileName, (userId or email), documentType, and side (front/back) are required'
    });
  }

  try {
    // Get user_id from email if needed
    let actualUserId = userId;
    let userEmail = email;

    if (!actualUserId && email) {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('profiles')
        .select('user_id, email')
        .eq('email', email)
        .single();

      if (userError) {
        console.error('Error finding user:', userError);
      } else if (userData) {
        actualUserId = userData.user_id;
        userEmail = userData.email;
      }
    }

    if (!actualUserId) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if document record exists
    let query = supabaseAdmin
      .from('user_id_documents')
      .select('*')
      .eq('document_type', documentType);

    if (actualUserId) {
      query = query.eq('user_id', actualUserId);
    } else if (userEmail) {
      query = query.eq('email', userEmail);
    }

    const { data: existingDocs, error: fetchError } = await query;

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    const existingDoc = existingDocs && existingDocs.length > 0 ? existingDocs[0] : null;
    const updateField = side === 'front' ? 'front_url' : 'back_url';

    if (existingDoc) {
      // Update existing record with full path
      const { error: updateError } = await supabaseAdmin
        .from('user_id_documents')
        .update({
          [updateField]: fileName,
          user_id: actualUserId,
          email: userEmail
        })
        .eq('id', existingDoc.id);

      if (updateError) throw updateError;

      return res.status(200).json({
        success: true,
        message: 'Document linked successfully',
        action: 'updated'
      });
    } else {
      // Create new record with full path
      const { error: insertError } = await supabaseAdmin
        .from('user_id_documents')
        .insert({
          user_id: actualUserId,
          email: userEmail,
          document_type: documentType,
          [updateField]: fileName,
          status: 'pending'
        });

      if (insertError) throw insertError;

      return res.status(200).json({
        success: true,
        message: 'Document record created and linked',
        action: 'created'
      });
    }

  } catch (error) {
    console.error('Error linking document:', error);
    return res.status(500).json({
      error: 'Failed to link document',
      details: error.message
    });
  }
}