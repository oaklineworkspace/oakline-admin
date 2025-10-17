import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all applications
    const { data: applications, error } = await supabaseAdmin
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching applications:', error);
      return res.status(500).json({ error: 'Failed to fetch applications' });
    }

    // Get enrollment data and profile completion status for each application
    const applicationsWithStatus = await Promise.all(
      applications.map(async (app) => {
        // Check enrollments table
        const { data: enrollment } = await supabaseAdmin
          .from('enrollments')
          .select('is_used')
          .eq('email', app.email)
          .maybeSingle();

        // Check profiles table for actual enrollment completion
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('enrollment_completed, enrollment_completed_at')
          .eq('email', app.email)
          .maybeSingle();

        let status = 'pending';
        let enrollmentCompleted = false;

        if (profile?.enrollment_completed) {
          status = 'completed';
          enrollmentCompleted = true;
        } else if (enrollment?.is_used) {
          status = 'completed';
          enrollmentCompleted = true;
        } else if (enrollment) {
          status = 'enrollment_sent';
        }

        return {
          ...app,
          status,
          enrollment_completed: enrollmentCompleted,
          enrollment_completed_at: profile?.enrollment_completed_at
        };
      })
    );

    // Get users table to check auth status
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('users')
      .select('application_id, email, created_at, is_active');

    if (usersError) {
      console.warn('Users table query failed:', usersError);
    }

    // Get enrollment records
    const { data: enrollmentsData, error: enrollError } = await supabaseAdmin
      .from('enrollments')
      .select('application_id, email, is_used, created_at');

    if (enrollError) {
      console.warn('Enrollments table query failed:', enrollError);
    }

    // Check Supabase Auth users
    const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers();

    // Combine data
    const enrichedApplications = applicationsWithStatus.map(app => {
      const userRecord = usersData?.find(u => u.application_id === app.id);
      const enrollmentRecord = enrollmentsData?.find(e => e.application_id === app.id || e.email === app.email);
      const authUser = authUsersData?.users?.find(u => u.email === app.email);

      let combinedStatus = 'pending';
      if (authUser && userRecord?.is_active) {
        combinedStatus = 'completed';
      } else if (authUser) {
        combinedStatus = 'auth_created';
      } else if (enrollmentRecord) {
        combinedStatus = 'enrollment_sent';
      }
      // Use the status derived from the profile/enrollment check if it's 'completed'
      if (app.status === 'completed') {
          combinedStatus = 'completed';
      }


      return {
        ...app,
        status: combinedStatus, // Use the combined status
        user_record: userRecord,
        enrollment_record: enrollmentRecord,
        auth_user: authUser
      };
    });

    return res.status(200).json({
      applications: enrichedApplications
    });

  } catch (error) {
    console.error('Error fetching applications:', error);
    return res.status(500).json({
      error: 'Failed to fetch applications',
      details: error.message
    });
  }
}