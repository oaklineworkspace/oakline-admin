
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, applicationId } = req.query;

  try {
    const result = {
      timestamp: new Date().toISOString(),
      smtpConfig: {
        host: process.env.SMTP_HOST ? 'configured' : 'missing',
        port: process.env.SMTP_PORT ? 'configured' : 'missing',
        user: process.env.SMTP_USER ? 'configured' : 'missing',
        pass: process.env.SMTP_PASS ? 'configured' : 'missing',
      }
    };

    if (email) {
      // Check application
      const { data: application, error: appError } = await supabaseAdmin
        .from('applications')
        .select('*')
        .eq('email', email)
        .single();

      result.application = {
        found: !!application,
        error: appError?.message,
        data: application ? {
          id: application.id,
          email: application.email,
          name: `${application.first_name} ${application.last_name}`,
          created_at: application.created_at
        } : null
      };

      // Check enrollment
      const { data: enrollment, error: enrollError } = await supabaseAdmin
        .from('enrollments')
        .select('*')
        .eq('email', email)
        .single();

      result.enrollment = {
        found: !!enrollment,
        error: enrollError?.message,
        data: enrollment ? {
          id: enrollment.id,
          email: enrollment.email,
          token: enrollment.token,
          is_used: enrollment.is_used,
          application_id: enrollment.application_id,
          created_at: enrollment.created_at
        } : null
      };

      // Check accounts
      if (application) {
        const { data: accounts, error: accountsError } = await supabaseAdmin
          .from('accounts')
          .select('*')
          .eq('application_id', application.id);

        result.accounts = {
          found: accounts?.length > 0,
          error: accountsError?.message,
          count: accounts?.length || 0,
          data: accounts?.map(acc => ({
            id: acc.id,
            account_number: acc.account_number,
            account_type: acc.account_type,
            balance: acc.balance
          }))
        };
      }
    }

    if (applicationId) {
      // Check specific application by ID
      const { data: appById, error: appByIdError } = await supabaseAdmin
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      result.applicationById = {
        found: !!appById,
        error: appByIdError?.message,
        data: appById
      };
    }

    res.status(200).json(result);

  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ 
      error: 'Debug failed',
      message: error.message 
    });
  }
}
