
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Log environment info for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('Environment:', process.env.NODE_ENV)
        console.log('Has SUPABASE_URL:', !!process.env.SUPABASE_URL || !!process.env.NEXT_PUBLIC_SUPABASE_URL)
        console.log('Has SERVICE_KEY:', !!process.env.SUPABASE_SERVICE_KEY || !!process.env.SUPABASE_SERVICE_ROLE_KEY)
      }
      
      const { email } = req.query;
      
      if (email) {
        const { data: applications, error } = await supabaseAdmin
          .from('applications')
          .select('*')
          .eq('email', email.trim().toLowerCase())
          .order('submitted_at', { ascending: false });

        if (error) {
          console.error('Error fetching application:', error);
          return res.status(500).json({ error: 'Failed to fetch application' });
        }

        return res.status(200).json(applications || []);
      }

      const { data: applications, error } = await supabaseAdmin
        .from('applications')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching applications:', error);
        return res.status(500).json({ error: 'Failed to fetch applications' });
      }

      const enrichedApplications = await Promise.all(
        applications.map(async (app) => {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('enrollment_completed, password_set')
            .eq('email', app.email)
            .maybeSingle();

          const { data: accounts } = await supabaseAdmin
            .from('accounts')
            .select('id, account_number, account_type, balance, status')
            .eq('application_id', app.id);

          let enrichedAccounts = accounts || [];
          if (accounts && accounts.length > 0) {
            const accountIds = accounts.map(acc => acc.id);
            const { data: cards } = await supabaseAdmin
              .from('cards')
              .select('id, card_number, card_type, status, expiry_date, account_id')
              .in('account_id', accountIds);
            
            const cardsByAccountId = {};
            (cards || []).forEach(card => {
              if (!cardsByAccountId[card.account_id]) {
                cardsByAccountId[card.account_id] = [];
              }
              cardsByAccountId[card.account_id].push(card);
            });

            enrichedAccounts = accounts.map(account => ({
              ...account,
              cards: cardsByAccountId[account.id] || []
            }));
          }

          return {
            ...app,
            enrollment_completed: profile?.enrollment_completed || false,
            password_set: profile?.password_set || false,
            accounts: enrichedAccounts
          };
        })
      );

      res.status(200).json({ applications: enrichedApplications });
    } catch (error) {
      console.error('Application search error:', error);
      res.status(500).json({ error: 'Internal server error' });
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
