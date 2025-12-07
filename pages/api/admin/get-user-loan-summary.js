
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
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Fetch all loans for the user
    const { data: loans, error: loansError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('user_id', userId);

    if (loansError) {
      console.error('Error fetching loans:', loansError);
      return res.status(500).json({ error: 'Failed to fetch loans' });
    }

    if (!loans || loans.length === 0) {
      return res.status(200).json({
        loans: [],
        summary: {
          totalLoanPrincipal: 0,
          totalPaidAllLoans: 0,
          totalRemainingAllLoans: 0,
          loansCount: 0
        }
      });
    }

    const loanIds = loans.map(loan => loan.id);

    // Fetch all payments for these loans
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('loan_payments')
      .select('*')
      .in('loan_id', loanIds);

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return res.status(500).json({ error: 'Failed to fetch payments' });
    }

    // Build detailed loan information
    const loanDetails = loans.map(loan => {
      const loanPayments = (payments || []).filter(p => p.loan_id === loan.id);
      
      const totalPaid = loanPayments
        .filter(p => p.status === 'approved' || p.status === 'completed')
        .reduce((sum, p) => sum + (parseFloat(p.payment_amount || p.amount || 0)), 0);
      
      const totalPrincipalPaid = loanPayments
        .filter(p => p.status === 'approved' || p.status === 'completed')
        .reduce((sum, p) => sum + (parseFloat(p.principal_amount || 0)), 0);
      
      const totalInterestPaid = loanPayments
        .filter(p => p.status === 'approved' || p.status === 'completed')
        .reduce((sum, p) => sum + (parseFloat(p.interest_amount || 0)), 0);

      return {
        loanId: loan.id,
        loanType: loan.loan_type,
        loanStatus: loan.status,
        loanPrincipal: parseFloat(loan.principal || 0),
        remainingBalance: parseFloat(loan.remaining_balance || 0),
        totalPaid,
        totalPrincipalPaid,
        totalInterestPaid,
        monthlyPayment: parseFloat(loan.monthly_payment_amount || 0),
        paymentCount: loanPayments.length,
        approvedPayments: loanPayments.filter(p => p.status === 'approved' || p.status === 'completed').length,
        pendingPayments: loanPayments.filter(p => p.status === 'pending').length,
        interestRate: parseFloat(loan.interest_rate || 0),
        termMonths: loan.term_months,
        startDate: loan.start_date,
        nextPaymentDate: loan.next_payment_date
      };
    });

    const summary = {
      totalLoanPrincipal: loanDetails.reduce((sum, loan) => sum + loan.loanPrincipal, 0),
      totalPaidAllLoans: loanDetails.reduce((sum, loan) => sum + loan.totalPaid, 0),
      totalRemainingAllLoans: loanDetails.reduce((sum, loan) => sum + loan.remainingBalance, 0),
      loansCount: loanDetails.length
    };

    return res.status(200).json({
      loans: loanDetails,
      summary
    });

  } catch (error) {
    console.error('Error in get-user-loan-summary:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
