
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
    // Fetch payments with detailed loan information
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('loan_payments')
      .select(`
        *,
        loans!inner(
          id,
          user_id,
          account_id,
          loan_type,
          principal,
          interest_rate,
          term_months,
          remaining_balance,
          monthly_payment_amount,
          status,
          deposit_required,
          deposit_paid,
          deposit_method
        ),
        accounts!loan_payments_account_id_fkey(
          id,
          account_number,
          account_type
        )
      `)
      .order('payment_date', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching loan payments:', paymentsError);
      return res.status(500).json({ error: 'Failed to fetch loan payments', details: paymentsError.message });
    }

    const userIds = [...new Set(payments.map(p => p.loans?.user_id).filter(Boolean))];

    // Fetch profiles with complete user information
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name, phone')
      .in('id', userIds);

    const profileMap = (profiles || []).reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});

    // Fetch crypto deposits to cross-reference payment methods
    const { data: cryptoDeposits } = await supabaseAdmin
      .from('crypto_deposits')
      .select('id, user_id, loan_id, tx_hash, amount, status, created_at')
      .in('status', ['confirmed', 'completed', 'approved']);

    // Create a map for quick crypto deposit lookups
    const cryptoDepositMap = {};
    (cryptoDeposits || []).forEach(deposit => {
      if (deposit.tx_hash) {
        cryptoDepositMap[deposit.tx_hash] = deposit;
      }
      if (deposit.loan_id) {
        if (!cryptoDepositMap[deposit.loan_id]) {
          cryptoDepositMap[deposit.loan_id] = [];
        }
        cryptoDepositMap[deposit.loan_id].push(deposit);
      }
    });

    const enrichedPayments = payments.map(payment => {
      const profile = profileMap[payment.loans?.user_id];
      const fullName = profile && (profile.first_name || profile.last_name)
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        : profile?.email || 'N/A';
      
      // Determine actual payment method
      let actualPaymentMethod = 'account_balance';
      
      // Priority 1: Use payment_method column directly from loan_payments table
      if (payment.payment_method && payment.payment_method !== 'account_balance') {
        actualPaymentMethod = payment.payment_method;
      }
      // Priority 2: Check if payment has a tx_hash (indicates crypto transaction)
      else if (payment.tx_hash) {
        actualPaymentMethod = 'crypto';
      }
      // Priority 3: Check metadata for payment method information
      else if (payment.metadata?.payment_method) {
        actualPaymentMethod = payment.metadata.payment_method;
      }
      // Priority 4: For deposits, check the loan's deposit_method
      else if (payment.is_deposit && payment.loans?.deposit_method && payment.loans.deposit_method !== 'balance') {
        actualPaymentMethod = payment.loans.deposit_method;
      }
      // Priority 5: Check if there's a crypto deposit linked to this payment
      else if (payment.tx_hash && cryptoDepositMap[payment.tx_hash]) {
        actualPaymentMethod = 'crypto';
      }
      
      // Determine payment purpose
      let paymentPurpose = 'Regular Loan Payment';
      if (payment.is_deposit) {
        paymentPurpose = `Loan Collateral Deposit (${payment.loans?.deposit_required ? (payment.loans.deposit_required * 100 / payment.loans.principal).toFixed(0) + '%' : '10%'} of loan)`;
      } else if (payment.payment_type === 'prepayment' || payment.payment_type === 'extra') {
        paymentPurpose = 'Extra/Prepayment';
      } else if (payment.payment_type === 'final') {
        paymentPurpose = 'Final Loan Payment';
      }
      
      return {
        ...payment,
        user_id: payment.loans?.user_id,
        user_email: profile?.email || 'N/A',
        user_name: fullName,
        user_phone: profile?.phone || 'N/A',
        account_number: payment.accounts?.account_number || 'N/A',
        account_type: payment.accounts?.account_type || 'N/A',
        loan_type: payment.loans?.loan_type || 'N/A',
        loan_principal: payment.loans?.principal || 0,
        loan_remaining_balance: payment.loans?.remaining_balance || 0,
        loan_monthly_payment: payment.loans?.monthly_payment_amount || 0,
        actual_payment_method: actualPaymentMethod,
        payment_purpose: paymentPurpose,
        loan_status: payment.loans?.status || 'N/A'
      };
    });

    const stats = {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + (parseFloat(p.payment_amount || p.amount) || 0), 0),
      completedPayments: payments.filter(p => p.status === 'completed' || p.status === 'approved').length,
      pendingPayments: payments.filter(p => p.status === 'pending').length,
      failedPayments: payments.filter(p => p.status === 'failed' || p.status === 'rejected').length
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
