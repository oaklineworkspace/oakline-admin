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

    // Fetch banned users from profiles table (is_banned = true)
    const { data: bannedProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name, is_banned, ban_reason, ban_display_message, status, status_reason, banned_at, status_changed_at, banned_by')
      .eq('is_banned', true)
      .order('banned_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching banned profiles:', profilesError);
      throw profilesError;
    }

    // Enrich with auth user data if available
    const enrichedBannedUsers = (bannedProfiles || []).map(profile => ({
      id: profile.id,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      is_banned: profile.is_banned,
      reason: profile.ban_reason,
      ban_display_message: profile.ban_display_message,
      banned_at: profile.banned_at,
      status_changed_at: profile.status_changed_at,
      banned_by: profile.banned_by
    }));

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