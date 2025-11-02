
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
    const { loanId } = req.query;

    if (!loanId) {
      return res.status(400).json({ error: 'Loan ID is required' });
    }

    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      console.error('Error fetching loan:', loanError);
      return res.status(404).json({ error: 'Loan not found' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', loan.user_id)
      .single();

    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('account_number, account_type, balance')
      .eq('id', loan.account_id)
      .single();

    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('payment_date', { ascending: false });

    let depositInfo = null;
    if (loan.deposit_required && loan.deposit_required > 0) {
      const { data: cryptoDeposits } = await supabaseAdmin
        .from('crypto_deposits')
        .select('*')
        .eq('user_id', loan.user_id)
        .gte('amount', loan.deposit_required)
        .in('status', ['confirmed', 'completed'])
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: transactions } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('user_id', loan.user_id)
        .eq('account_id', loan.account_id)
        .eq('type', 'deposit')
        .gte('amount', loan.deposit_required)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (cryptoDeposits && cryptoDeposits.length > 0) {
        depositInfo = {
          type: 'crypto',
          verified: true,
          amount: cryptoDeposits[0].amount,
          date: cryptoDeposits[0].created_at,
          details: cryptoDeposits[0]
        };
      } else if (transactions && transactions.length > 0) {
        depositInfo = {
          type: 'bank_transfer',
          verified: true,
          amount: transactions[0].amount,
          date: transactions[0].created_at,
          details: transactions[0]
        };
      } else {
        depositInfo = {
          type: 'none',
          verified: false,
          amount: 0,
          date: null,
          details: null
        };
      }
    }

    const { data: auditLogs } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('table_name', 'loans')
      .order('created_at', { ascending: false })
      .limit(20);

    return res.status(200).json({
      success: true,
      loan: {
        ...loan,
        user_email: profile?.email || 'N/A',
        user_name: profile?.full_name || 'N/A',
        account_number: account?.account_number || 'N/A',
        account_type: account?.account_type || 'N/A',
        account_balance: account?.balance || 0
      },
      payments: payments || [],
      depositInfo,
      auditLogs: auditLogs || []
    });

  } catch (error) {
    console.error('Error in get-loan-detail:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
