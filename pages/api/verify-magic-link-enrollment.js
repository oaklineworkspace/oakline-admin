
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, email, applicationId } = req.body;

  if (!userId || !email || !applicationId) {
    return res.status(400).json({ error: 'User ID, email, and application ID are required' });
  }

  try {
    // Verify the auth user exists
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (authError || !authUser.user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (authUser.user.email !== email) {
      return res.status(400).json({ error: 'Email mismatch' });
    }

    // Get application data
    const { data: applicationData, error: applicationError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .eq('email', email)
      .single();

    if (applicationError || !applicationData) {
      return res.status(404).json({ error: 'Application not found or email mismatch' });
    }

    // Check if user already has a profile (indicates completed enrollment)
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, enrollment_completed')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile && existingProfile.enrollment_completed) {
      return res.status(400).json({ 
        error: 'This enrollment has already been completed. Please sign in using your password at the login page.',
        enrollment_completed: true
      });
    }

    // Check enrollment record - but don't enforce click limits during verification
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .select('is_used, click_count, updated_at')
      .eq('application_id', applicationId)
      .eq('email', email)
      .maybeSingle();

    // If enrollment doesn't exist, create it (this can happen with magic links)
    if (!enrollment && !enrollmentError) {
      console.log('Creating enrollment record for magic link user');
      const { error: createError } = await supabaseAdmin
        .from('enrollments')
        .insert([{
          email: email,
          application_id: applicationId,
          is_used: false,
          click_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (createError) {
        console.error('Error creating enrollment:', createError);
      }
    }
    
    // Note: We're removing click count enforcement here since it's causing false expiration
    // Click count will only be enforced when enrollment is actually completed

    // Get account numbers for this application
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('accounts')
      .select('account_number, account_type')
      .eq('application_id', applicationId);

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError);
    }

    const accountNumbers = accounts?.filter(acc => acc.account_number).map(acc => acc.account_number) || [];

    // Ensure we have valid application data
    if (!applicationData) {
      return res.status(404).json({ 
        error: 'Application not found. Please contact support.',
        application_id: applicationId
      });
    }

    res.status(200).json({
      message: 'Magic link verification successful',
      application: applicationData,
      accounts: accounts || [],
      account_numbers: accountNumbers,
      enrollment_completed: existingProfile?.enrollment_completed || false,
      user: {
        id: authUser.user.id,
        email: authUser.user.email
      }
    });

  } catch (error) {
    console.error('Magic link verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
