
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  const { status } = req.query;

  try {
    // Fetch from user_id_documents table
    let query = supabaseAdmin
      .from('user_id_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: userIdDocs, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    // Fetch from applications table (where new users upload documents)
    const { data: applications, error: appError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .not('id_front_path', 'is', null)
      .order('submitted_at', { ascending: false });

    if (appError) {
      console.error('Error fetching applications:', appError);
    }

    // Combine documents from both sources
    const allDocuments = [];

    // Process user_id_documents
    const userIdDocsWithDetails = await Promise.all(
      (userIdDocs || []).map(async (doc) => {
        let profile = null;
        let application = null;

        // Try to get profile from user_id
        if (doc.user_id) {
          const { data: profileData } = await supabaseAdmin
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', doc.user_id)
            .single();
          profile = profileData;
        }

        // Try to get application data
        if (doc.application_id) {
          const { data: appData } = await supabaseAdmin
            .from('applications')
            .select('first_name, last_name, email')
            .eq('id', doc.application_id)
            .single();
          application = appData;
        }

        // Use application data as fallback if profile is missing
        const finalProfile = profile || application || {
          first_name: 'Unknown',
          last_name: 'User',
          email: doc.email || 'No email'
        };
        
        return {
          ...doc,
          profiles: finalProfile,
          source: 'user_id_documents'
        };
      })
    );

    allDocuments.push(...userIdDocsWithDetails);

    // Process applications with documents
    if (applications && applications.length > 0) {
      const appDocs = applications.map(app => {
        // Check if this application already has a record in user_id_documents
        const existsInUserIdDocs = userIdDocs?.some(
          doc => doc.application_id === app.id
        );

        // Skip if already in user_id_documents to avoid duplicates
        if (existsInUserIdDocs) {
          return null;
        }

        // Map application document status to match filter
        let docStatus = 'pending'; // Default for applications
        if (app.application_status === 'approved') {
          docStatus = 'verified';
        } else if (app.application_status === 'rejected') {
          docStatus = 'rejected';
        }

        // Filter by status if specified
        if (status && status !== 'all' && docStatus !== status) {
          return null;
        }

        return {
          id: app.id,
          user_id: app.user_id,
          application_id: app.id,
          email: app.email,
          document_type: 'ID Card',
          front_url: app.id_front_path,
          back_url: app.id_back_path,
          status: docStatus,
          verified_by: null,
          verified_at: app.processed_at,
          rejection_reason: null,
          created_at: app.submitted_at,
          updated_at: app.updated_at,
          profiles: {
            first_name: app.first_name,
            last_name: app.last_name,
            email: app.email
          },
          source: 'applications'
        };
      }).filter(doc => doc !== null);

      allDocuments.push(...appDocs);
    }

    // Sort all documents by created_at descending
    allDocuments.sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );

    return res.status(200).json({
      success: true,
      documents: allDocuments
    });
  } catch (error) {
    console.error('Error fetching user documents:', error);
    return res.status(500).json({
      error: 'Failed to fetch documents',
      details: error.message
    });
  }
}
