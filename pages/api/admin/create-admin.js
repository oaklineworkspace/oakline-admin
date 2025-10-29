
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required' });
  }

  const validRoles = ['admin', 'manager', 'super_admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role specified' });
  }

  try {
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role,
        is_admin: true
      }
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      return res.status(500).json({ error: authError.message });
    }

    // Insert into admin_profiles table
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('admin_profiles')
      .insert([
        {
          id: authData.user.id,
          email: email.toLowerCase(),
          role: role
        }
      ])
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Clean up auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: 'Failed to create admin profile' });
    }

    return res.status(201).json({
      success: true,
      admin: {
        id: profileData.id,
        email: profileData.email,
        role: profileData.role
      }
    });

  } catch (error) {
    console.error('Admin creation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
