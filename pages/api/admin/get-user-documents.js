
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
    let query = supabaseAdmin
      .from('user_id_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    // Fetch profile and application data for each document
    const documentsWithDetails = await Promise.all(
      (data || []).map(async (doc) => {
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
          profiles: finalProfile
        };
      })
    );

    return res.status(200).json({
      success: true,
      documents: documentsWithDetails
    });
  } catch (error) {
    console.error('Error fetching user documents:', error);
    return res.status(500).json({
      error: 'Failed to fetch documents',
      details: error.message
    });
  }
}
