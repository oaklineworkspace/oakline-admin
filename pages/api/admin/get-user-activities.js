
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, startDate, endDate, activityType, limit = 100 } = req.query;

    // Build the query
    let query = supabaseAdmin
      .from('audit_logs')
      .select(`
        *,
        profiles!audit_logs_user_id_fkey(first_name, last_name, email)
      `)
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
      ...(activities || []).map(a => ({ ...a, source: 'audit_log' })),
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
