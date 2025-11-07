
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

    console.log('Document URLs from database:', { front: docs.front_url, back: docs.back_url });

    // Extract file paths from URLs - handle both full URLs and just filenames
    let frontPath = docs.front_url;
    let backPath = docs.back_url;
    
    if (frontPath?.includes('/storage/v1/object/public/documents/')) {
      frontPath = frontPath.split('/storage/v1/object/public/documents/').pop();
    } else if (frontPath?.includes('/documents/')) {
      frontPath = frontPath.split('/documents/').pop();
    }
    
    if (backPath?.includes('/storage/v1/object/public/documents/')) {
      backPath = backPath.split('/storage/v1/object/public/documents/').pop();
    } else if (backPath?.includes('/documents/')) {
      backPath = backPath.split('/documents/').pop();
    }

    console.log('Extracted paths:', { frontPath, backPath });

    let frontSignedUrl = null;
    let backSignedUrl = null;

    // Generate signed URLs for both documents
    if (frontPath && !frontPath.startsWith('http')) {
      const { data: frontData, error: frontError } = await supabaseAdmin
        .storage
        .from('documents')
        .createSignedUrl(frontPath, 3600); // 1 hour expiry

      if (!frontError && frontData?.signedUrl) {
        frontSignedUrl = frontData.signedUrl;
        console.log('✅ Generated signed URL for front document');
      } else {
        console.error('❌ Error generating signed URL for front:', frontError);
        // Try to use the original URL as fallback
        frontSignedUrl = docs.front_url;
      }
    } else if (frontPath?.startsWith('http')) {
      frontSignedUrl = frontPath;
    }

    if (backPath && !backPath.startsWith('http')) {
      const { data: backData, error: backError } = await supabaseAdmin
        .storage
        .from('documents')
        .createSignedUrl(backPath, 3600); // 1 hour expiry

      if (!backError && backData?.signedUrl) {
        backSignedUrl = backData.signedUrl;
        console.log('✅ Generated signed URL for back document');
      } else {
        console.error('❌ Error generating signed URL for back:', backError);
        // Try to use the original URL as fallback
        backSignedUrl = docs.back_url;
      }
    } else if (backPath?.startsWith('http')) {
      backSignedUrl = backPath;
    }

    console.log('Final signed URLs:', { front: !!frontSignedUrl, back: !!backSignedUrl });

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
