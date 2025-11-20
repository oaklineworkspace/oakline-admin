
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
    // Fetch suspended users (status = 'suspended' AND is_banned = false)
    const { data: suspendedProfiles, error: suspendedError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name, is_banned, ban_display_message, status, status_reason, status_changed_at, suspension_start_date, suspension_end_date')
      .eq('status', 'suspended')
      .eq('is_banned', false)
      .order('status_changed_at', { ascending: false });

    if (suspendedError) {
      console.error('Error fetching suspended users:', suspendedError);
      throw suspendedError;
    }

    const suspendedUsers = (suspendedProfiles || []).map(profile => ({
      id: profile.id,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      is_banned: profile.is_banned,
      ban_display_message: profile.ban_display_message,
      status: profile.status,
      status_reason: profile.status_reason,
      status_changed_at: profile.status_changed_at,
      suspension_start_date: profile.suspension_start_date,
      suspension_end_date: profile.suspension_end_date,
      reason: profile.status_reason
    }));

    return res.status(200).json({ 
      success: true,
      suspendedUsers 
    });

  } catch (error) {
    console.error('Error in get-suspended-users:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch suspended users',
      details: error.message 
    });
  }
}
