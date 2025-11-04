
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
    // Fetch all loans
    const { data: loans, error: loansError } = await supabaseAdmin
      .from('loans')
      .select('*');

    if (loansError) throw loansError;

    // Fetch all loan payments
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('loan_payments')
      .select('*')
      .eq('status', 'completed');

    if (paymentsError) throw paymentsError;

    // Calculate analytics
    const totalLoans = loans.length;
    const activeLoans = loans.filter(l => l.status === 'active').length;
    const pendingLoans = loans.filter(l => l.status === 'pending').length;
    const overdueLoans = loans.filter(l => l.is_late).length;
    const closedLoans = loans.filter(l => l.status === 'closed').length;

    const totalOutstanding = loans
      .filter(l => l.status === 'active')
      .reduce((sum, l) => sum + parseFloat(l.remaining_balance || 0), 0);

    const totalDisbursed = loans
      .filter(l => l.disbursed_at)
      .reduce((sum, l) => sum + parseFloat(l.principal || 0), 0);

    const totalInterestCollected = payments
      .reduce((sum, p) => sum + parseFloat(p.interest_amount || 0), 0);

    const monthlyInterestIncome = payments
      .filter(p => {
        const paymentDate = new Date(p.payment_date);
        const now = new Date();
        return paymentDate.getMonth() === now.getMonth() && 
               paymentDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, p) => sum + parseFloat(p.interest_amount || 0), 0);

    // Loans by type
    const loansByType = loans.reduce((acc, loan) => {
      const type = loan.loan_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Recent activity
    const recentLoans = loans
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    const recentPayments = payments
      .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      analytics: {
        summary: {
          totalLoans,
          activeLoans,
          pendingLoans,
          overdueLoans,
          closedLoans,
          totalOutstanding,
          totalDisbursed,
          totalInterestCollected,
          monthlyInterestIncome
        },
        loansByType,
        recentLoans,
        recentPayments
      }
    });

  } catch (error) {
    console.error('Error fetching loan analytics:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch analytics', 
      details: error.message 
    });
  }
}
