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

  try {
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name, wire_transfer_suspended, wire_transfer_suspension_reason, wire_transfer_suspended_at')
      .order('last_name', { ascending: true });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    return res.status(200).json({
      success: true,
      users: profiles || []
    });
  } catch (error) {
    console.error('Error in get-wire-transfer-users:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}