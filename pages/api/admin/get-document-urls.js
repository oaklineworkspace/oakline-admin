
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
    return res.status(400).json({ error: 'User ID, email, or application ID is required' });
  }

  try {
    console.log('📄 Fetching documents for:', { userId, email, applicationId });

    let docs = null;
    let error = null;

    // Try to fetch by user_id first
    if (userId) {
      const result = await supabaseAdmin
        .from('user_id_documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      docs = result.data;
      error = result.error;
    }

    // If no documents found and we have email, try searching by email
    if (!docs && email) {
      console.log('🔍 No documents found by user_id, trying email:', email);
      const result = await supabaseAdmin
        .from('user_id_documents')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      docs = result.data;
      error = result.error;
    }

    // If still no documents and we have application_id, try searching by application_id
    if (!docs && applicationId) {
      console.log('🔍 No documents found by user_id or email, trying application_id:', applicationId);
      const result = await supabaseAdmin
        .from('user_id_documents')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      docs = result.data;
      error = result.error;
    }

    if (error) {
      console.error('❌ Database error fetching documents:', error);
      return res.status(500).json({ error: 'Failed to fetch documents', details: error.message });
    }

    if (!docs) {
      console.log('📭 No documents found for user:', userId);
      return res.status(404).json({ error: 'No documents found for this user' });
    }

    console.log('📋 Document record found:', { 
      id: docs.id, 
      type: docs.document_type, 
      status: docs.status,
      hasFront: !!docs.front_url,
      hasBack: !!docs.back_url
    });

    // Extract file paths from URLs - handle both full URLs and just filenames
    let frontPath = docs.front_url;
    let backPath = docs.back_url;
    
    // Clean up paths
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

    console.log('🔍 Cleaned file paths:', { frontPath, backPath });

    let frontSignedUrl = null;
    let backSignedUrl = null;

    // Generate signed URLs for front document
    if (frontPath && !frontPath.startsWith('http')) {
      const { data: frontData, error: frontError } = await supabaseAdmin
        .storage
        .from('documents')
        .createSignedUrl(frontPath, 3600); // 1 hour expiry

      if (!frontError && frontData?.signedUrl) {
        frontSignedUrl = frontData.signedUrl;
        console.log('✅ Generated signed URL for front document');
      } else {
        console.error('❌ Error generating signed URL for front:', frontError?.message || frontError);
        // Try public URL as fallback
        const { data: publicUrlData } = await supabaseAdmin
          .storage
          .from('documents')
          .getPublicUrl(frontPath);
        
        frontSignedUrl = publicUrlData?.publicUrl || docs.front_url;
        console.log('🔄 Using fallback URL for front:', frontSignedUrl ? 'success' : 'failed');
      }
    } else if (frontPath?.startsWith('http')) {
      frontSignedUrl = frontPath;
      console.log('🌐 Using existing HTTP URL for front');
    }

    // Generate signed URLs for back document
    if (backPath && !backPath.startsWith('http')) {
      const { data: backData, error: backError } = await supabaseAdmin
        .storage
        .from('documents')
        .createSignedUrl(backPath, 3600); // 1 hour expiry

      if (!backError && backData?.signedUrl) {
        backSignedUrl = backData.signedUrl;
        console.log('✅ Generated signed URL for back document');
      } else {
        console.error('❌ Error generating signed URL for back:', backError?.message || backError);
        // Try public URL as fallback
        const { data: publicUrlData } = await supabaseAdmin
          .storage
          .from('documents')
          .getPublicUrl(backPath);
        
        backSignedUrl = publicUrlData?.publicUrl || docs.back_url;
        console.log('🔄 Using fallback URL for back:', backSignedUrl ? 'success' : 'failed');
      }
    } else if (backPath?.startsWith('http')) {
      backSignedUrl = backPath;
      console.log('🌐 Using existing HTTP URL for back');
    }

    console.log('✨ Final URLs ready:', { 
      front: frontSignedUrl ? '✓' : '✗', 
      back: backSignedUrl ? '✓' : '✗' 
    });

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
    console.error('💥 Unexpected error in get-document-urls:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
