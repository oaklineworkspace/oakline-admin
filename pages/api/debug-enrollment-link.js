
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token parameter required' });
  }

  try {
    const { supabaseAdmin } = await import('../../lib/supabaseClient');

    // Check enrollment token
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .select('*')
      .eq('token', token)
      .single();

    const result = {
      token_provided: token,
      enrollment_found: !!enrollment,
      enrollment_error: enrollmentError?.message || null,
      enrollment_data: enrollment ? {
        id: enrollment.id,
        email: enrollment.email,
        application_id: enrollment.application_id,
        is_used: enrollment.is_used,
        created_at: enrollment.created_at
      } : null
    };

    if (enrollment) {
      // Check corresponding application
      const { data: application, error: appError } = await supabaseAdmin
        .from('applications')
        .select('*')
        .eq('id', enrollment.application_id)
        .single();

      result.application_found = !!application;
      result.application_error = appError?.message || null;
      result.application_data = application ? {
        id: application.id,
        email: application.email,
        first_name: application.first_name,
        last_name: application.last_name,
        status: application.status
      } : null;

      // Check accounts for this application
      const { data: accounts, error: accountsError } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('application_id', enrollment.application_id);

      result.accounts_found = accounts?.length || 0;
      result.accounts_error = accountsError?.message || null;
      result.accounts_data = accounts?.map(acc => ({
        id: acc.id,
        account_number: acc.account_number,
        account_type: acc.account_type,
        balance: acc.balance
      }));
    }

    res.status(200).json(result);

  } catch (error) {
    console.error('Debug enrollment error:', error);
    res.status(500).json({ 
      error: 'Debug failed',
      message: error.message 
    });
  }
}
