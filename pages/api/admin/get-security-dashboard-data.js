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
    const { dateRange, deviceType, location, userEmail, status, limit = 100 } = req.query;

    const recentLoginsQuery = supabaseAdmin
      .from('login_history')
      .select(`
        *,
        profiles!login_history_user_id_fkey(email, first_name, last_name, user_id)
      `)
      .order('login_time', { ascending: false })
      .limit(parseInt(limit));

    if (dateRange) {
      const [startDate, endDate] = dateRange.split(',');
      if (startDate) {
        recentLoginsQuery.gte('login_time', startDate);
      }
      if (endDate) {
        recentLoginsQuery.lte('login_time', endDate);
      }
    }

    if (deviceType && deviceType !== 'all') {
      recentLoginsQuery.eq('device_type', deviceType);
    }

    if (location && location !== 'all') {
      recentLoginsQuery.ilike('country', `%${location}%`);
    }

    if (status === 'failed') {
      recentLoginsQuery.eq('success', false);
    } else if (status === 'success') {
      recentLoginsQuery.eq('success', true);
    }

    if (userEmail) {
      recentLoginsQuery.ilike('profiles.email', `%${userEmail}%`);
    }

    const { data: recentLogins, error: loginsError } = await recentLoginsQuery;

    if (loginsError) {
      console.error('Error fetching login history:', loginsError);
      throw loginsError;
    }

    const activeSessionsQuery = supabaseAdmin
      .from('user_sessions')
      .select(`
        *,
        profiles!user_sessions_user_id_fkey(email, first_name, last_name, user_id)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (userEmail) {
      activeSessionsQuery.ilike('profiles.email', `%${userEmail}%`);
    }

    const { data: activeSessions, error: sessionsError } = await activeSessionsQuery;

    if (sessionsError) {
      console.error('Error fetching active sessions:', sessionsError);
      throw sessionsError;
    }

    const pinActivityQuery = supabaseAdmin
      .from('system_logs')
      .select(`
        *,
        profiles!system_logs_user_id_fkey(email, first_name, last_name, user_id)
      `)
      .eq('type', 'auth')
      .or('message.ilike.%Transaction PIN created%,message.ilike.%Transaction PIN reset%')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (dateRange) {
      const [startDate, endDate] = dateRange.split(',');
      if (startDate) {
        pinActivityQuery.gte('created_at', startDate);
      }
      if (endDate) {
        pinActivityQuery.lte('created_at', endDate);
      }
    }

    if (userEmail) {
      pinActivityQuery.ilike('profiles.email', `%${userEmail}%`);
    }

    const { data: pinActivity, error: pinError } = await pinActivityQuery;

    if (pinError) {
      console.error('Error fetching PIN activity:', pinError);
      throw pinError;
    }

    const { data: bannedUsers, error: bannedError } = await supabaseAdmin.auth.admin.listUsers();

    if (bannedError) {
      console.error('Error fetching users:', bannedError);
      throw bannedError;
    }

    const bannedUsersList = bannedUsers.users.filter(user => user.banned_until || user.ban_duration);

    const { data: bannedProfiles, error: bannedProfilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email, first_name, last_name')
      .in('user_id', bannedUsersList.map(u => u.id));

    if (bannedProfilesError) {
      console.error('Error fetching banned profiles:', bannedProfilesError);
    }

    const bannedUsersWithProfiles = bannedUsersList.map(user => {
      const profile = bannedProfiles?.find(p => p.user_id === user.id);
      return {
        id: user.id,
        email: user.email || profile?.email,
        first_name: profile?.first_name,
        last_name: profile?.last_name,
        banned_until: user.banned_until,
        ban_duration: user.ban_duration,
        created_at: user.created_at
      };
    });

    const suspiciousPatterns = {
      multipleFailedLogins: {},
      unusualLocations: {},
      concurrentSessions: {}
    };

    recentLogins?.forEach(login => {
      if (!login.success && login.profiles?.email) {
        const email = login.profiles.email;
        suspiciousPatterns.multipleFailedLogins[email] = 
          (suspiciousPatterns.multipleFailedLogins[email] || 0) + 1;
      }
    });

    activeSessions?.forEach(session => {
      const email = session.profiles?.email;
      if (email) {
        suspiciousPatterns.concurrentSessions[email] = 
          (suspiciousPatterns.concurrentSessions[email] || 0) + 1;
      }
    });

    const alerts = [];

    Object.entries(suspiciousPatterns.multipleFailedLogins).forEach(([email, count]) => {
      if (count >= 3) {
        alerts.push({
          type: 'failed_logins',
          severity: count >= 5 ? 'high' : 'medium',
          message: `${count} failed login attempts for ${email}`,
          user_email: email,
          count
        });
      }
    });

    Object.entries(suspiciousPatterns.concurrentSessions).forEach(([email, count]) => {
      if (count >= 3) {
        alerts.push({
          type: 'concurrent_sessions',
          severity: count >= 5 ? 'high' : 'medium',
          message: `${count} concurrent sessions for ${email}`,
          user_email: email,
          count
        });
      }
    });

    const stats = {
      totalLogins: recentLogins?.length || 0,
      failedLogins: recentLogins?.filter(l => !l.success).length || 0,
      activeSessions: activeSessions?.length || 0,
      pinSetups: pinActivity?.filter(p => p.message?.includes('created')).length || 0,
      pinResets: pinActivity?.filter(p => p.message?.includes('reset')).length || 0,
      bannedUsers: bannedUsersWithProfiles.length,
      suspiciousAlerts: alerts.length
    };

    return res.status(200).json({
      success: true,
      data: {
        recentLogins: recentLogins || [],
        activeSessions: activeSessions || [],
        pinActivity: pinActivity || [],
        bannedUsers: bannedUsersWithProfiles,
        alerts,
        stats
      }
    });

  } catch (error) {
    console.error('Error fetching security dashboard data:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch security dashboard data',
      details: error.message 
    });
  }
}
