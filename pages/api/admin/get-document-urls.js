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
    // First, try to fetch from user_id_documents table
    let query = supabaseAdmin
      .from('user_id_documents')
      .select('*');

    if (applicationId) {
      console.log('Fetching documents by application_id:', applicationId);
      query = query.eq('application_id', applicationId);
    } else if (email) {
      console.log('Fetching documents by email:', email);
      query = query.eq('email', email);
    } else if (userId) {
      console.log('Fetching documents by user_id:', userId);
      query = query.eq('user_id', userId);
    }

    const { data: documents, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching documents:', fetchError);
      throw fetchError;
    }

    let doc = null;

    // If found in user_id_documents, use it
    if (documents && documents.length > 0) {
      doc = documents.sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      )[0];
    } else {
      // If not found, try fetching from applications table
      console.log('No documents in user_id_documents, checking applications table...');
      
      let appQuery = supabaseAdmin
        .from('applications')
        .select('*')
        .not('id_front_path', 'is', null);

      if (applicationId) {
        appQuery = appQuery.eq('id', applicationId);
      } else if (email) {
        appQuery = appQuery.eq('email', email);
      } else if (userId) {
        appQuery = appQuery.eq('user_id', userId);
      }

      const { data: apps, error: appError } = await appQuery;

      if (appError) {
        console.error('Error fetching applications:', appError);
        throw appError;
      }

      if (!apps || apps.length === 0) {
        return res.status(404).json({
          error: 'No documents found for this user',
          documents: { front: null, back: null }
        });
      }

      const app = apps.sort((a, b) =>
        new Date(b.submitted_at) - new Date(a.submitted_at)
      )[0];

      // Map application to document format
      doc = {
        front_url: app.id_front_path,
        back_url: app.id_back_path,
        document_type: 'ID Card',
        status: app.application_status === 'approved' ? 'verified' : 
                app.application_status === 'rejected' ? 'rejected' : 'pending',
        verified_at: app.processed_at,
        rejection_reason: null
      };
    }

    // Generate signed URLs for the documents
    const signedUrls = {};

    if (doc.front_url) {
      // Remove 'documents/' prefix if present since we're already specifying the bucket
      const frontPath = doc.front_url.replace(/^documents\//, '');
      
      console.log('Attempting to create signed URL for front:', frontPath);

      const { data: frontData, error: frontError } = await supabaseAdmin
        .storage
        .from('documents')
        .createSignedUrl(frontPath, 3600); // 1 hour expiry

      if (!frontError && frontData) {
        signedUrls.front = frontData.signedUrl;
        console.log('Front URL created successfully');
      } else {
        console.error('Error creating signed URL for front:', frontError);
        console.error('Attempted path:', frontPath);
        console.error('Original path:', doc.front_url);
      }
    }

    if (doc.back_url) {
      // Remove 'documents/' prefix if present since we're already specifying the bucket
      const backPath = doc.back_url.replace(/^documents\//, '');
      
      console.log('Attempting to create signed URL for back:', backPath);

      const { data: backData, error: backError } = await supabaseAdmin
        .storage
        .from('documents')
        .createSignedUrl(backPath, 3600); // 1 hour expiry

      if (!backError && backData) {
        signedUrls.back = backData.signedUrl;
        console.log('Back URL created successfully');
      } else {
        console.error('Error creating signed URL for back:', backError);
        console.error('Attempted path:', backPath);
        console.error('Original path:', doc.back_url);
      }
    }

    return res.status(200).json({
      success: true,
      documents: signedUrls,
      documentType: doc.document_type,
      status: doc.status,
      verifiedAt: doc.verified_at,
      rejectionReason: doc.rejection_reason
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}