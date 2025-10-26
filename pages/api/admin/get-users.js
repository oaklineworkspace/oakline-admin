
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch users from Supabase Auth
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return res.status(500).json({ 
        error: 'Failed to fetch users from authentication',
        details: authError.message 
      });
    }

    // Fetch additional profile data for each user
    const userIds = users.map(u => u.id);
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', userIds);

    if (profileError) {
      console.warn('Error fetching profiles:', profileError);
    }

    // Merge auth users with profile data
    const enrichedUsers = users.map(user => {
      const profile = profiles?.find(p => p.id === user.id);
      return {
        id: user.id,
        email: user.email,
        profiles: {
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
          email: profile?.email || user.email
        },
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      };
    });

    return res.status(200).json({ 
      success: true,
      users: enrichedUsers,
      total: enrichedUsers.length 
    });

  } catch (error) {
    console.error('Error in get-users API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
