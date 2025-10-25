
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, userId } = req.body;

    if (!email && !userId) {
      return res.status(400).json({ error: 'Email or userId is required' });
    }

    // Fetch all users from auth
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (authError) {
      console.error('Error fetching users:', authError);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    // Find user by email or userId
    let user = null;
    if (userId) {
      user = users.find(u => u.id === userId);
    } else if (email) {
      user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch profile data
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      }
    });

  } catch (error) {
    console.error('Error finding user:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
