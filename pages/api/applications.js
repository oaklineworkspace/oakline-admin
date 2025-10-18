
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Fetch applications with related data
      const { data: applications, error } = await supabase
        .from('applications')
        .select(`
          *,
          accounts (*,
            cards (*)
          ),
          profiles (*)
        `)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching applications:', error);
        return res.status(500).json({ 
          error: 'Failed to fetch applications',
          details: error.message 
        });
      }

      // Transform data to match expected format
      const transformedApplications = applications?.map(app => ({
        ...app,
        enrollment_completed: app.profiles?.[0]?.enrollment_completed || false,
        password_set: app.profiles?.[0]?.password_set || false
      })) || [];

      return res.status(200).json({ 
        applications: transformedApplications 
      });
    } catch (error) {
      console.error('Error in applications GET:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        details: error.message 
      });
    }
  } else if (req.method === 'POST') {
    try {
      const applicationData = req.body;
      
      // Validate required fields
      const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'dob', 'ssnOrId', 'country', 'state', 'city', 'address', 'zipCode', 'selectedAccountTypes'];
      const missingFields = requiredFields.filter(field => !applicationData[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        });
      }
      
      // Generate application ID
      const applicationId = `APP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('Application received:', {
        id: applicationId,
        email: applicationData.email,
        name: `${applicationData.firstName} ${applicationData.lastName}`,
        accountTypes: applicationData.selectedAccountTypes
      });
      
      res.status(200).json({ 
        id: applicationId, 
        message: 'Application submitted successfully',
        email: applicationData.email
      });
    } catch (error) {
      console.error('Application processing error:', error);
      res.status(500).json({ 
        error: 'Internal server error' 
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
