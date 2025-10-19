
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Find the user by email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return res.status(500).json({ error: 'Failed to find user' });
    }

    const user = users.users.find(u => u.email === email);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user to confirm email
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { 
        email_confirm: true,
        user_metadata: {
          ...user.user_metadata,
          email_confirmed_by_admin: true,
          email_confirmed_at: new Date().toISOString()
        }
      }
    );

    if (updateError) {
      console.error('Error confirming email:', updateError);
      return res.status(500).json({ error: 'Failed to confirm email' });
    }

    res.status(200).json({
      message: 'Email confirmed successfully',
      email: email
    });

  } catch (error) {
    console.error('Error confirming email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
