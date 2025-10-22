
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all users from auth.users using admin client
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000 // Adjust as needed
    });

    if (error) {
      console.error('Error fetching auth users:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch users',
        details: error.message 
      });
    }

    return res.status(200).json({
      success: true,
      users: users || [],
      count: users?.length || 0
    });

  } catch (error) {
    console.error('Error in get-auth-users:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
