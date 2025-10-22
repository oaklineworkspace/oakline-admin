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

      // Update application with existing auth user ID
      await supabaseAdmin
        .from('applications')
        .update({ user_id: existingUser.id })
        .eq('id', application_id);

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

    // Create auth user WITHOUT creating profile (enrollment will handle that)
    const tempPassword = `Temp${Date.now()}!${Math.random().toString(36).substring(2, 8)}`;

    console.log('Creating new auth user for:', userEmail);
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password: tempPassword,
      email_confirm: false, // Don't confirm - let enrollment handle it
      user_metadata: {
        first_name: applicationData.first_name || '',
        last_name: applicationData.last_name || '',
        application_id: application_id
      }
    });

    if (createError) {
      console.error('Supabase auth user creation error:', createError);
      return res.status(500).json({ error: `Failed to create user account: ${createError.message}` });
    }

    console.log('Auth user created successfully:', newUser.user.id);

    // Update application with the new auth user ID
    const { error: updateError } = await supabaseAdmin
      .from('applications')
      .update({ user_id: newUser.user.id })
      .eq('id', application_id);

    if (updateError) {
      console.error('Error updating application with user_id:', updateError);
      return res.status(500).json({ error: 'Failed to link user to application' });
    }

    // Create enrollment record
    const { error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .insert([{
        email: email.trim().toLowerCase(),
        application_id: application_id,
        is_used: false,
        click_count: 0
      }]);

    if (enrollmentError) {
      console.error('Error creating enrollment record:', enrollmentError);
      // Don't fail the process, enrollment will be created when sending welcome email
    }


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