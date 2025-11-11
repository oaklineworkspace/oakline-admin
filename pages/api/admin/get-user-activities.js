
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, startDate, endDate, activityType, limit = 100 } = req.query;

    // Build the query - fetch audit logs without the foreign key hint
    let query = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate + 'T23:59:59');
    }

    if (activityType && activityType !== 'all') {
      query = query.ilike('action', `%${activityType}%`);
    }

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data: activities, error } = await query;

    if (error) {
      console.error('Error fetching user activities:', error);
      return res.status(500).json({ error: 'Failed to fetch user activities' });
    }

    // Fetch user profiles separately
    const userIds = [...new Set((activities || []).map(a => a.user_id).filter(Boolean))];
    let profilesMap = {};
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);
      
      if (profiles) {
        profilesMap = profiles.reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      }
    }

    // Merge profile data into activities
    const activitiesWithProfiles = (activities || []).map(activity => ({
      ...activity,
      profiles: activity.user_id ? profilesMap[activity.user_id] : null
    }));

    // Also fetch system logs for auth events
    let systemLogsQuery = supabaseAdmin
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      systemLogsQuery = systemLogsQuery.eq('user_id', userId);
    }

    if (startDate) {
      systemLogsQuery = systemLogsQuery.gte('created_at', startDate);
    }

    if (endDate) {
      systemLogsQuery = systemLogsQuery.lte('created_at', endDate + 'T23:59:59');
    }

    if (activityType && activityType !== 'all') {
      systemLogsQuery = systemLogsQuery.eq('type', activityType);
    }

    if (limit) {
      systemLogsQuery = systemLogsQuery.limit(parseInt(limit));
    }

    const { data: systemLogs, error: systemError } = await systemLogsQuery;

    if (systemError) {
      console.error('Error fetching system logs:', systemError);
    }

    // Combine and sort activities
    const combinedActivities = [
      ...(activitiesWithProfiles || []).map(a => ({ ...a, source: 'audit_log' })),
      ...(systemLogs || []).map(s => ({ ...s, source: 'system_log' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.status(200).json({ 
      activities: combinedActivities.slice(0, parseInt(limit))
    });
  } catch (error) {
    console.error('Error in get-user-activities API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
