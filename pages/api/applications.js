import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch applications
    const { data: applicationsData, error: applicationsError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (applicationsError) {
      console.error('Error fetching applications:', applicationsError);
      throw applicationsError;
    }

    // Fetch enrollments separately
    const { data: enrollmentsData, error: enrollmentsError } = await supabaseAdmin
      .from('enrollments')
      .select('application_id, email, is_used');

    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError);
    }

    // Fetch auth users to check password_set
    const { data: authUsersData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
    }

    // Combine the data
    const enrichedApplications = applicationsData.map(app => {
      const enrollment = enrollmentsData?.find(e => e.application_id === app.id || e.email === app.email);
      const authUser = authUsersData?.users?.find(u => u.email === app.email);

      return {
        ...app,
        enrollment_completed: enrollment?.is_used || false,
        password_set: authUser ? true : false
      };
    });

    res.status(200).json({
      applications: enrichedApplications || []
    });

  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      error: 'Failed to fetch applications',
      details: error.message
    });
  }
}