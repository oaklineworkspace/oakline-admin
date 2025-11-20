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
    // Fetch banned users (is_banned = true)
    const { data: bannedProfiles, error: bannedError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name, is_banned, ban_reason, ban_display_message, status, status_reason, banned_at, status_changed_at, suspension_start_date, suspension_end_date')
      .eq('is_banned', true)
      .order('banned_at', { ascending: false });

    if (bannedError) {
      console.error('Error fetching banned users:', bannedError);
      throw bannedError;
    }

    const bannedUsers = (bannedProfiles || []).map(profile => ({
      id: profile.id,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      is_banned: profile.is_banned,
      ban_reason: profile.ban_reason,
      ban_display_message: profile.ban_display_message,
      status: profile.status,
      status_reason: profile.status_reason,
      banned_at: profile.banned_at,
      status_changed_at: profile.status_changed_at,
      reason: profile.ban_reason
    }));

    return res.status(200).json({ 
      success: true,
      bannedUsers 
    });

  } catch (error) {
    console.error('Error in get-banned-users:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch banned users',
      details: error.message 
    });
  }
}