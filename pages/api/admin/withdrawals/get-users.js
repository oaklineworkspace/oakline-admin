import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    // Fetch all applications with their user IDs
    const { data: applications, error: appsError } = await supabaseAdmin
      .from('applications')
      .select('id, user_id, first_name, last_name, email')
      .order('first_name', { ascending: true });

    if (appsError) {
      console.error('Error fetching applications:', appsError);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    return res.status(200).json({
      users: applications || []
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
