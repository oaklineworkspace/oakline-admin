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
      .select('id, email, first_name, last_name, withdrawal_suspended, withdrawal_suspension_reason, withdrawal_suspended_at')
      .order('last_name', { ascending: true });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    const userIds = profiles.map(p => p.id);
    const { data: selfies, error: selfiesError } = await supabaseAdmin
      .from('selfie_verifications')
      .select('user_id, image_path, verification_type, status, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (selfiesError) {
      console.error('Error fetching selfies:', selfiesError);
    }

    const selfieMap = {};
    if (selfies) {
      selfies.forEach(selfie => {
        if (!selfieMap[selfie.user_id]) {
          selfieMap[selfie.user_id] = selfie;
        }
      });
    }

    const usersWithSelfies = profiles.map(profile => ({
      ...profile,
      selfie: selfieMap[profile.id] || null
    }));

    return res.status(200).json({
      success: true,
      users: usersWithSelfies || []
    });
  } catch (error) {
    console.error('Error in get-withdrawal-users:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
