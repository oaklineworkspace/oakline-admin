
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
    // Fetch all profiles with verification status
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name, requires_verification, is_verified, verification_reason, verification_required_at, last_verified_at')
      .order('email', { ascending: true });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    return res.status(200).json({
      success: true,
      users: profiles || []
    });

  } catch (error) {
    console.error('Error fetching users with verification status:', error);
    return res.status(500).json({
      error: 'Failed to fetch users',
      details: error.message
    });
  }
}
