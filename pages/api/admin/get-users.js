import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // First get all users from auth
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    // Then get application data to get names
    const { data: applications, error: appError } = await supabaseAdmin
      .from('applications')
      .select('user_id, first_name, middle_name, last_name, email');

    if (appError) {
      console.error('Error fetching applications:', appError);
    }

    // Create a map of user_id to name
    const nameMap = {};
    if (applications) {
      applications.forEach(app => {
        if (app.user_id) {
          const fullName = [app.first_name, app.middle_name, app.last_name]
            .filter(Boolean)
            .join(' ');
          nameMap[app.user_id] = fullName || null;
        }
      });
    }

    // Map auth users with names from applications
    const formattedUsers = authUsers.users.map(user => {
      const fullName = nameMap[user.id];
      const nameParts = fullName ? fullName.trim().split(' ') : [];
      
      return {
        id: user.id,
        email: user.email,
        profiles: {
          first_name: nameParts[0] || null,
          last_name: nameParts.slice(1).join(' ') || null
        }
      };
    });

    return res.status(200).json({ users: formattedUsers });
  } catch (error) {
    console.error('Error in get-users API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}