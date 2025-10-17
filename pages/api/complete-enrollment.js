// pages/api/complete-enrollment.js
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, ssn, id_number, accountNumber, token, application_id } = req.body;

  if (!application_id || !token || !email || !password || !accountNumber) {
    return res.status(400).json({ error: 'Missing required fields: application_id, token, email, password, and accountNumber are required' });
  }

  // Require either SSN or ID number based on citizenship
  if (!ssn && !id_number) {
    return res.status(400).json({ error: 'Either SSN or ID number is required' });
  }

  try {
    // 1️⃣ Verify enrollment token
    const { data: enrollmentData, error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .select('*')
      .eq('token', token)
      .single();

    if (enrollmentError || !enrollmentData) {
      return res.status(404).json({ error: 'Invalid enrollment token' });
    }

    // Check if token is already used (password already set)
    if (enrollmentData.is_used) {
      return res.status(400).json({ error: 'This enrollment has already been completed. Please sign in using your password at the login page.' });
    }

    // Check if token is expired (24 hours)
    const tokenCreatedAt = new Date(enrollmentData.created_at);
    const now = new Date();
    const hoursSinceCreation = (now - tokenCreatedAt) / (1000 * 60 * 60);
    
    if (hoursSinceCreation > 24) {
      return res.status(400).json({ 
        error: 'This enrollment link has expired. Please request a new enrollment link.',
        expired: true
      });
    }

    // 2️⃣ Get application data
    const { data: applicationData, error: applicationError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', application_id)
      .single();

    if (applicationError || !applicationData) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // 3️⃣ Verify email matches
    if (enrollmentData.email !== applicationData.email || applicationData.email !== email) {
      return res.status(400).json({ error: 'Email verification failed' });
    }

    // 4️⃣ Verify identity - either SSN or ID number based on citizenship
    if (applicationData.country === 'US') {
      // US citizens - verify SSN
      const cleanSSN = ssn ? ssn.replace(/-/g, '') : '';
      const applicationSSN = applicationData.ssn ? applicationData.ssn.replace(/-/g, '') : '';
      if (applicationSSN && applicationSSN !== cleanSSN) {
        return res.status(400).json({ error: 'SSN verification failed. Please check your Social Security Number.' });
      }
    } else {
      // International citizens - verify ID number
      if (applicationData.id_number && applicationData.id_number !== id_number) {
        return res.status(400).json({ error: 'ID number verification failed. Please check your Government ID Number.' });
      }
    }

    // 5️⃣ Verify account number exists for this application
    const { data: applicationAccounts, error: accountsError } = await supabaseAdmin
      .from('accounts')
      .select('account_number, account_type, balance')
      .eq('application_id', application_id);

    if (accountsError) {
      console.error('Error fetching application accounts:', accountsError);
      return res.status(500).json({ error: 'Error verifying account information' });
    }

    if (!applicationAccounts || applicationAccounts.length === 0) {
      return res.status(404).json({ error: 'No accounts found for this application' });
    }

    // Verify the selected account number belongs to this application
    const selectedAccount = applicationAccounts.find(acc => acc.account_number === accountNumber);
    if (!selectedAccount) {
      return res.status(400).json({ error: 'Invalid account number selected' });
    }

    // 6️⃣ Check if user has already completed enrollment
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id, enrollment_completed, email')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile && existingProfile.enrollment_completed) {
      return res.status(400).json({ 
        error: 'This enrollment has already been completed. Please sign in using your password at the login page.',
        enrollment_completed: true
      });
    }

    // 7️⃣ Create or update Supabase Auth user
    let authUser = null;
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return res.status(500).json({ error: 'Error checking for existing user.' });
    }

    const existingAuthUser = users.users.find(user => user.email === email);

    if (existingAuthUser) {
      // User already exists, update password
      authUser = existingAuthUser;
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingAuthUser.id,
        { password: password }
      );

      if (updateError) {
        console.error('Error updating user password:', updateError);
        return res.status(500).json({ error: 'Failed to set password' });
      }
    } else {
      // Create a new auth user
      const { data: newUser, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm email
      });

      if (signUpError) {
        console.error('Supabase signup error:', signUpError);
        return res.status(500).json({ error: `Failed to create user account: ${signUpError.message}` });
      }
      authUser = newUser.user;
    }

    // 8️⃣ Mark enrollment as completed and update profile
    const completedAt = new Date().toISOString();
    
    const { error: enrollmentUpdateError } = await supabaseAdmin
      .from('enrollments')
      .update({ 
        is_used: true,
        completed_at: completedAt,
        selected_account_number: accountNumber
      })
      .eq('token', token)
      .eq('email', email);

    if (enrollmentUpdateError) {
      console.error('Error updating enrollment record:', enrollmentUpdateError);
      // Don't fail the process for this
    }

    // Update profile to mark enrollment as completed
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        enrollment_completed: true,
        enrollment_completed_at: completedAt,
        password_set: true,
        application_status: 'completed',
        updated_at: completedAt
      })
      .eq('id', authUser.id);

    if (profileUpdateError) {
      console.error('Error updating profile enrollment status:', profileUpdateError);
    } else {
      console.log('✅ Profile marked as enrollment_completed with timestamp');
    }

    // Update application status to completed
    const { error: applicationUpdateError } = await supabaseAdmin
      .from('applications')
      .update({
        application_status: 'completed',
        processed_at: completedAt
      })
      .eq('id', application_id);

    if (applicationUpdateError) {
      console.error('Error updating application status:', applicationUpdateError);
    } else {
      console.log('✅ Application status updated to completed');
    }


    // 9️⃣ Link accounts to the auth user
    const { error: accountError } = await supabaseAdmin
      .from('accounts')
      .update({ 
        user_id: authUser.id // Link accounts to the auth user
      })
      .eq('application_id', application_id);

    if (accountError) {
      console.error('Account update error:', accountError);
      return res.status(500).json({ error: 'Failed to activate accounts. Please contact support.' });
    }

    res.status(200).json({
      message: 'Enrollment completed successfully',
      user: {
        id: applicationData.id,
        email: applicationData.email,
        name: `${applicationData.first_name} ${applicationData.last_name}`,
        selected_account: selectedAccount
      }
    });

  } catch (error) {
    console.error('Complete enrollment error:', error);
    res.status(500).json({ error: 'Internal server error during enrollment completion' });
  }
}