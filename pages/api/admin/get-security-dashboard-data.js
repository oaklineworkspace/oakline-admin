
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

    // Fetch login history
    let recentLoginsQuery = supabaseAdmin
      .from('login_history')
      .select('*')
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

    const { data: recentLogins, error: loginsError } = await recentLoginsQuery;

    if (loginsError) {
      console.error('Error fetching login history:', loginsError);
      throw loginsError;
    }

    // Fetch active sessions
    const { data: activeSessions, error: sessionsError } = await supabaseAdmin
      .from('user_sessions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching active sessions:', sessionsError);
      throw sessionsError;
    }

    // Fetch PIN activity
    let pinActivityQuery = supabaseAdmin
      .from('system_logs')
      .select('*')
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

    const { data: pinActivity, error: pinError } = await pinActivityQuery;

    if (pinError) {
      console.error('Error fetching PIN activity:', pinError);
      throw pinError;
    }

    // Get all unique user IDs
    const userIds = new Set();
    recentLogins?.forEach(login => userIds.add(login.user_id));
    activeSessions?.forEach(session => userIds.add(session.user_id));
    pinActivity?.forEach(activity => userIds.add(activity.user_id));

    // Fetch profiles for all users
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name')
      .in('id', Array.from(userIds));

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Create a map of user_id to profile
    const profileMap = {};
    profiles?.forEach(profile => {
      profileMap[profile.id] = profile;
    });

    // Attach profiles to login history
    const loginsWithProfiles = recentLogins?.map(login => ({
      ...login,
      profiles: profileMap[login.user_id] || null
    })) || [];

    // Filter by email if requested
    let filteredLogins = loginsWithProfiles;
    if (userEmail) {
      filteredLogins = loginsWithProfiles.filter(login => 
        login.profiles?.email?.toLowerCase().includes(userEmail.toLowerCase())
      );
    }

    // Attach profiles to sessions
    let sessionsWithProfiles = activeSessions?.map(session => ({
      ...session,
      profiles: profileMap[session.user_id] || null
    })) || [];

    // Filter by email if requested
    if (userEmail) {
      sessionsWithProfiles = sessionsWithProfiles.filter(session => 
        session.profiles?.email?.toLowerCase().includes(userEmail.toLowerCase())
      );
    }

    // Attach profiles to PIN activity
    let pinActivityWithProfiles = pinActivity?.map(activity => ({
      ...activity,
      profiles: profileMap[activity.user_id] || null
    })) || [];

    // Filter by email if requested
    if (userEmail) {
      pinActivityWithProfiles = pinActivityWithProfiles.filter(activity => 
        activity.profiles?.email?.toLowerCase().includes(userEmail.toLowerCase())
      );
    }

    // Fetch banned users
    const { data: bannedUsers, error: bannedError } = await supabaseAdmin.auth.admin.listUsers();

    if (bannedError) {
      console.error('Error fetching users:', bannedError);
      throw bannedError;
    }

    const bannedUsersList = bannedUsers.users.filter(user => user.banned_until || user.ban_duration);

    const { data: bannedProfiles, error: bannedProfilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name')
      .in('id', bannedUsersList.map(u => u.id));

    if (bannedProfilesError) {
      console.error('Error fetching banned profiles:', bannedProfilesError);
    }

    const bannedUsersWithProfiles = bannedUsersList.map(user => {
      const profile = bannedProfiles?.find(p => p.id === user.id);
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

    // Calculate suspicious patterns
    const suspiciousPatterns = {
      multipleFailedLogins: {},
      unusualLocations: {},
      concurrentSessions: {}
    };

    filteredLogins.forEach(login => {
      if (!login.success && login.profiles?.email) {
        const email = login.profiles.email;
        suspiciousPatterns.multipleFailedLogins[email] = 
          (suspiciousPatterns.multipleFailedLogins[email] || 0) + 1;
      }
    });

    sessionsWithProfiles.forEach(session => {
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
      totalLogins: filteredLogins.length,
      failedLogins: filteredLogins.filter(l => !l.success).length,
      activeSessions: sessionsWithProfiles.length,
      pinSetups: pinActivityWithProfiles.filter(p => p.message?.includes('created')).length,
      pinResets: pinActivityWithProfiles.filter(p => p.message?.includes('reset')).length,
      bannedUsers: bannedUsersWithProfiles.length,
      suspiciousAlerts: alerts.length
    };

    return res.status(200).json({
      success: true,
      data: {
        recentLogins: filteredLogins,
        activeSessions: sessionsWithProfiles,
        pinActivity: pinActivityWithProfiles,
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
