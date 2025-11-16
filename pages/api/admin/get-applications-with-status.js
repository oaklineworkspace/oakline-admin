import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { status } = req.query;

    console.log('Fetching applications with status:', status || 'all');

    // Fetch all applications
    let query = supabaseAdmin
      .from('applications')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('application_status', status);
    }

    const { data: applications, error } = await query;

    if (error) {
      console.error('Error fetching applications from Supabase:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch applications',
        details: error.message 
      });
    }

    console.log(`Found ${applications?.length || 0} applications`);

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

        let appStatus = app.application_status || 'pending';
        let enrollmentCompleted = false;

        if (profile?.enrollment_completed) {
          enrollmentCompleted = true;
        } else if (enrollment?.is_used) {
          enrollmentCompleted = true;
        }

        return {
          ...app,
          enrollment_completed: enrollmentCompleted,
          enrollment_completed_at: profile?.enrollment_completed_at
        };
      })
    );

    console.log('Returning applications with enrollment status');
    
    return res.status(200).json({
      success: true,
      applications: applicationsWithStatus || [],
      count: applicationsWithStatus?.length || 0
    });
  } catch (error) {
    console.error('Error in get-applications-with-status:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message 
    });
  }
}