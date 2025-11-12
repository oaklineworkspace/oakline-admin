
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, startDate, endDate, activityType, limit = 100 } = req.query;

    // Build the query - fetch audit logs
    let auditQuery = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters to audit logs
    if (userId) {
      auditQuery = auditQuery.eq('user_id', userId);
    }

    if (startDate) {
      auditQuery = auditQuery.gte('created_at', startDate);
    }

    if (endDate) {
      auditQuery = auditQuery.lte('created_at', endDate + 'T23:59:59');
    }

    if (activityType && activityType !== 'all') {
      if (activityType === 'password') {
        auditQuery = auditQuery.or('action.ilike.%password%,action.eq.update_user_password');
      } else {
        auditQuery = auditQuery.ilike('action', `%${activityType}%`);
      }
    }

    auditQuery = auditQuery.limit(parseInt(limit) * 2); // Fetch more for filtering

    const { data: auditLogs, error: auditError } = await auditQuery;

    if (auditError) {
      console.error('Error fetching audit logs:', auditError);
    }

    // Fetch system logs for auth events and other activities
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
      if (activityType === 'auth' || activityType === 'login') {
        systemLogsQuery = systemLogsQuery.eq('type', 'auth');
      } else if (activityType === 'password') {
        systemLogsQuery = systemLogsQuery.or('type.eq.auth,message.ilike.%password%');
      } else {
        systemLogsQuery = systemLogsQuery.eq('type', activityType);
      }
    }

    systemLogsQuery = systemLogsQuery.limit(parseInt(limit) * 2);

    const { data: systemLogs, error: systemError } = await systemLogsQuery;

    if (systemError) {
      console.error('Error fetching system logs:', systemError);
    }

    // Fetch user profiles for all users involved
    const allActivities = [...(auditLogs || []), ...(systemLogs || [])];
    const userIds = [...new Set(allActivities.map(a => a.user_id).filter(Boolean))];
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

    // Merge profile data and categorize activities
    const activitiesWithProfiles = (auditLogs || []).map(activity => ({
      ...activity,
      profiles: activity.user_id ? profilesMap[activity.user_id] : null,
      source: 'audit_log',
      activity_category: categorizeActivity(activity.action, activity.table_name)
    }));

    const systemLogsWithProfiles = (systemLogs || []).map(log => ({
      ...log,
      profiles: log.user_id ? profilesMap[log.user_id] : null,
      source: 'system_log',
      activity_category: categorizeSystemLog(log.type, log.message),
      action: log.message || log.type
    }));

    // Combine and sort all activities
    const combinedActivities = [
      ...activitiesWithProfiles,
      ...systemLogsWithProfiles
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.status(200).json({ 
      activities: combinedActivities.slice(0, parseInt(limit)),
      total: combinedActivities.length
    });
  } catch (error) {
    console.error('Error in get-user-activities API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// Helper function to categorize audit log activities
function categorizeActivity(action, tableName) {
  if (!action) return 'other';
  
  const actionLower = action.toLowerCase();
  
  if (actionLower.includes('password')) return 'password';
  if (actionLower.includes('login') || actionLower.includes('sign')) return 'login';
  if (tableName === 'transactions') return 'transaction';
  if (tableName === 'cards' || tableName === 'card_transactions') return 'card';
  if (tableName === 'accounts') return 'account';
  if (tableName === 'loans' || tableName === 'loan_payments') return 'loan';
  if (tableName === 'profiles') return 'profile';
  if (actionLower.includes('create')) return 'create';
  if (actionLower.includes('update')) return 'update';
  if (actionLower.includes('delete')) return 'delete';
  
  return 'other';
}

// Helper function to categorize system log activities
function categorizeSystemLog(type, message) {
  if (type === 'auth') return 'login';
  if (message?.toLowerCase().includes('password')) return 'password';
  if (type === 'transaction') return 'transaction';
  if (type === 'card') return 'card';
  if (type === 'user') return 'profile';
  
  return type || 'other';
}
