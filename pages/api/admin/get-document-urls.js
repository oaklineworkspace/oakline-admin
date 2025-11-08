
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

  const { userId, email, applicationId } = req.body;

  if (!userId && !email && !applicationId) {
    return res.status(400).json({ 
      error: 'User ID, email, or application ID is required' 
    });
  }

  try {
    // Build query based on available identifiers
    let query = supabaseAdmin
      .from('user_id_documents')
      .select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (email) {
      query = query.eq('email', email);
    } else if (applicationId) {
      query = query.eq('application_id', applicationId);
    }

    const { data: documents, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching documents:', fetchError);
      throw fetchError;
    }

    if (!documents || documents.length === 0) {
      return res.status(404).json({ 
        error: 'No documents found for this user',
        documents: { front: null, back: null }
      });
    }

    // Get the most recent document
    const doc = documents.sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    )[0];

    // Generate signed URLs for the documents
    const signedUrls = {};

    if (doc.front_url) {
      const { data: frontData, error: frontError } = await supabaseAdmin
        .storage
        .from('documents')
        .createSignedUrl(doc.front_url, 3600); // 1 hour expiry

      if (!frontError && frontData) {
        signedUrls.front = frontData.signedUrl;
      } else {
        console.error('Error creating signed URL for front:', frontError);
      }
    }

    if (doc.back_url) {
      const { data: backData, error: backError } = await supabaseAdmin
        .storage
        .from('documents')
        .createSignedUrl(doc.back_url, 3600); // 1 hour expiry

      if (!backError && backData) {
        signedUrls.back = backData.signedUrl;
      } else {
        console.error('Error creating signed URL for back:', backError);
      }
    }

    return res.status(200).json({
      success: true,
      documents: signedUrls
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
