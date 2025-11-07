
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
      .select(`
        *,
        profiles!user_id_documents_user_id_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    return res.status(200).json({
      success: true,
      documents: data || []
    });
  } catch (error) {
    console.error('Error fetching user documents:', error);
    return res.status(500).json({
      error: 'Failed to fetch documents',
      details: error.message
    });
  }
}
