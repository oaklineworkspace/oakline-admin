
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, application_id } = req.body;

  if (!email || !application_id) {
    return res.status(400).json({ error: 'Email and application_id are required' });
  }

  try {
    // Get application data
    const { data: applicationData, error: appError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', application_id)
      .single();
    
    if (appError || !applicationData) {
      console.error('Application not found:', appError);
      return res.status(404).json({ error: 'Application not found' });
    }

    const userEmail = email.trim().toLowerCase();

    // Check if auth user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return res.status(500).json({ error: 'Failed to check existing users' });
    }
    
    const existingUser = existingUsers?.users?.find(user => user.email === userEmail);

    if (existingUser) {
      console.log('Auth user already exists:', existingUser.id);
      return res.status(200).json({
        message: 'Auth user already exists',
        user: {
          id: application_id,
          email: userEmail,
          name: `${applicationData.first_name} ${applicationData.middle_name ? applicationData.middle_name + ' ' : ''}${applicationData.last_name}`,
          auth_id: existingUser.id
        }
      });
    }

    // Create auth user WITHOUT email confirmation to avoid auto-trigger issues
    const tempPassword = `Temp${Date.now()}!${Math.random().toString(36).substring(2, 8)}`;
    
    console.log('Creating new auth user for:', userEmail);
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password: tempPassword,
      email_confirm: false, // Don't auto-confirm to avoid triggers
      user_metadata: {
        first_name: applicationData.first_name || '',
        last_name: applicationData.last_name || '',
        middle_name: applicationData.middle_name || '',
        application_id: application_id,
        created_via: 'application'
      }
    });

    if (createError) {
      console.error('Error creating auth user:', createError);
      return res.status(500).json({ 
        error: 'Failed to create user account',
        details: createError.message 
      });
    }

    console.log('Auth user created successfully:', newUser.user.id);

    // Return success immediately - profile will be created during enrollment
    res.status(200).json({
      message: 'Auth user created successfully',
      user: {
        id: application_id,
        email: userEmail,
        name: `${applicationData.first_name} ${applicationData.middle_name ? applicationData.middle_name + ' ' : ''}${applicationData.last_name}`,
        auth_id: newUser.user.id
      }
    });

  } catch (error) {
    console.error('Create auth user error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
