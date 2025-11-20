
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authResult = await verifyAdminAuth(req);
    if (authResult.error) {
      return res.status(authResult.status || 401).json({ error: authResult.error });
    }

    // Fetch all users from auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      throw authError;
    }

    // Filter for banned users
    const bannedUsers = authData.users
      .filter(user => user.banned_until || user.ban_duration)
      .map(user => ({
        id: user.id,
        email: user.email,
        banned_until: user.banned_until,
        ban_duration: user.ban_duration,
        created_at: user.created_at
      }));

    // Fetch profiles for banned users
    const userIds = bannedUsers.map(u => u.id);
    
    let bannedProfiles = [];
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      } else {
        bannedProfiles = profiles || [];
      }
    }

    // Enrich banned users with profile data
    const enrichedBannedUsers = bannedUsers.map(user => {
      const profile = bannedProfiles.find(p => p.id === user.id);
      return {
        ...user,
        first_name: profile?.first_name,
        last_name: profile?.last_name,
        email: user.email || profile?.email
      };
    });

    return res.status(200).json({
      success: true,
      bannedUsers: enrichedBannedUsers
    });

  } catch (error) {
    console.error('Error fetching banned users:', error);
    return res.status(500).json({
      error: 'Failed to fetch banned users',
      details: error.message
    });
  }
}
