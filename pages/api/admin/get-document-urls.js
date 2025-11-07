
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Fetch documents from user_id_documents table
    const { data: docs, error } = await supabaseAdmin
      .from('user_id_documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching documents:', error);
      return res.status(500).json({ error: 'Failed to fetch documents', details: error.message });
    }

    if (!docs) {
      return res.status(404).json({ error: 'No documents found for this user' });
    }

    // Extract file paths from URLs
    const frontPath = docs.front_url?.split('/documents/').pop();
    const backPath = docs.back_url?.split('/documents/').pop();

    let frontSignedUrl = docs.front_url;
    let backSignedUrl = docs.back_url;

    // Generate signed URLs if paths exist and are storage paths
    if (frontPath && !frontPath.startsWith('http')) {
      const { data: frontData, error: frontError } = await supabaseAdmin
        .storage
        .from('documents')
        .createSignedUrl(frontPath, 3600); // 1 hour expiry

      if (!frontError && frontData) {
        frontSignedUrl = frontData.signedUrl;
      } else if (frontError) {
        console.error('Error generating signed URL for front:', frontError);
      }
    }

    if (backPath && !backPath.startsWith('http')) {
      const { data: backData, error: backError } = await supabaseAdmin
        .storage
        .from('documents')
        .createSignedUrl(backPath, 3600); // 1 hour expiry

      if (!backError && backData) {
        backSignedUrl = backData.signedUrl;
      } else if (backError) {
        console.error('Error generating signed URL for back:', backError);
      }
    }

    return res.status(200).json({
      success: true,
      documents: {
        front: frontSignedUrl,
        back: backSignedUrl,
        type: docs.document_type,
        status: docs.status
      }
    });
  } catch (error) {
    console.error('Error in get-document-urls:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
