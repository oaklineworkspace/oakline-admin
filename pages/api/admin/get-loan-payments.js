
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('loan_payments')
      .select('*, loans!inner(*)')
      .order('payment_date', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching loan payments:', paymentsError);
      return res.status(500).json({ error: 'Failed to fetch loan payments', details: paymentsError.message });
    }

    const loanIds = [...new Set(payments.map(p => p.loan_id).filter(Boolean))];
    const userIds = [...new Set(payments.map(p => p.loans?.user_id).filter(Boolean))];
    const accountIds = [...new Set(payments.map(p => p.loans?.account_id).filter(Boolean))];

    // Fetch profiles with first_name and last_name
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name')
      .in('id', userIds);

    const { data: accounts } = await supabaseAdmin
      .from('accounts')
      .select('id, account_number, account_type')
      .in('id', accountIds);

    const profileMap = (profiles || []).reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});

    const accountMap = (accounts || []).reduce((acc, account) => {
      acc[account.id] = account;
      return acc;
    }, {});

    const enrichedPayments = payments.map(payment => {
      const profile = profileMap[payment.loans?.user_id];
      const fullName = profile && (profile.first_name || profile.last_name)
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        : profile?.email || 'N/A';
      
      return {
        ...payment,
        user_email: profile?.email || 'N/A',
        user_name: fullName,
        account_number: accountMap[payment.loans?.account_id]?.account_number || 'N/A',
        account_type: accountMap[payment.loans?.account_id]?.account_type || 'N/A',
        loan_type: payment.loans?.loan_type || 'N/A'
      };
    });

    const stats = {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
      completedPayments: payments.filter(p => p.status === 'completed').length,
      pendingPayments: payments.filter(p => p.status === 'pending').length,
      failedPayments: payments.filter(p => p.status === 'failed').length
    };

    return res.status(200).json({
      success: true,
      payments: enrichedPayments,
      stats
    });

  } catch (error) {
    console.error('Error in get-loan-payments:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
