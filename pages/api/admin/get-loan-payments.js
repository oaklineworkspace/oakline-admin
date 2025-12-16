
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
      .order('created_at', { ascending: false });

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

    // Calculate total deposits paid per loan for partial deposit detection with payment details
    // Track both completed and pending deposits
    const loanDepositTotals = {};
    payments.forEach(payment => {
      if (payment.is_deposit && payment.loan_id) {
        if (!loanDepositTotals[payment.loan_id]) {
          loanDepositTotals[payment.loan_id] = {
            completedAmount: 0,
            pendingAmount: 0,
            totalCommitted: 0,
            required: payment.loans?.deposit_required || 0,
            completedCount: 0,
            pendingCount: 0,
            payment_details: []
          };
        }
        const paymentAmt = parseFloat(payment.amount || payment.payment_amount || 0);
        const method = payment.deposit_method || payment.payment_method || 'account_balance';
        const isCompleted = payment.status === 'completed' || payment.status === 'approved';
        const isPending = ['pending', 'submitted', 'pending_approval', 'processing'].includes(payment.status);
        
        if (isCompleted) {
          loanDepositTotals[payment.loan_id].completedAmount += paymentAmt;
          loanDepositTotals[payment.loan_id].completedCount += 1;
        } else if (isPending) {
          loanDepositTotals[payment.loan_id].pendingAmount += paymentAmt;
          loanDepositTotals[payment.loan_id].pendingCount += 1;
        }
        
        if (isCompleted || isPending) {
          loanDepositTotals[payment.loan_id].totalCommitted += paymentAmt;
          loanDepositTotals[payment.loan_id].payment_details.push({
            id: payment.id,
            amount: paymentAmt,
            method: method,
            date: payment.created_at,
            status: isCompleted ? 'completed' : 'pending'
          });
        }
      }
    });

    const enrichedPayments = payments.map(payment => {
      const profile = profileMap[payment.loans?.user_id];
      const fullName = profile && (profile.first_name || profile.last_name)
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        : profile?.email || 'N/A';
      
      // Determine actual payment method
      let actualPaymentMethod = 'account_balance';
      
      // Priority 1: Check deposit_method column (most reliable for deposits)
      if (payment.deposit_method) {
        actualPaymentMethod = payment.deposit_method;
      }
      // Priority 2: Check notes column for payment method keywords
      else if (payment.notes) {
        const notesLower = payment.notes.toLowerCase();
        if (notesLower.includes('bitcoin') || notesLower.includes('btc') || 
            notesLower.includes('ethereum') || notesLower.includes('eth') ||
            notesLower.includes('crypto') || notesLower.includes('usdt') ||
            notesLower.includes('tether') || notesLower.includes('usdc')) {
          actualPaymentMethod = 'crypto';
        } else if (notesLower.includes('wire') || notesLower.includes('bank transfer')) {
          actualPaymentMethod = 'wire_transfer';
        } else if (notesLower.includes('check')) {
          actualPaymentMethod = 'check';
        }
      }
      // Priority 3: Use payment_method column directly from loan_payments table
      else if (payment.payment_method && payment.payment_method !== 'account_balance') {
        actualPaymentMethod = payment.payment_method;
      }
      // Priority 4: Check if payment has a tx_hash (indicates crypto transaction)
      else if (payment.tx_hash) {
        actualPaymentMethod = 'crypto';
      }
      // Priority 5: Check metadata for payment method information
      else if (payment.metadata?.payment_method) {
        actualPaymentMethod = payment.metadata.payment_method;
      }
      // Priority 6: For deposits, check the loan's deposit_method
      else if (payment.is_deposit && payment.loans?.deposit_method && payment.loans.deposit_method !== 'balance') {
        actualPaymentMethod = payment.loans.deposit_method;
      }
      // Priority 7: Check if there's a crypto deposit linked to this payment
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
      
      // Get deposit tracking info for this loan
      const depositTracking = payment.loan_id ? loanDepositTotals[payment.loan_id] : null;
      const depositRequired = Math.round((payment.loans?.deposit_required || 0) * 100) / 100;
      const completedAmount = Math.round((depositTracking?.completedAmount || 0) * 100) / 100;
      const pendingAmount = Math.round((depositTracking?.pendingAmount || 0) * 100) / 100;
      const totalCommitted = Math.round((depositTracking?.totalCommitted || 0) * 100) / 100;
      // Use tolerance of $0.01 for floating point comparison
      const rawRemaining = depositRequired - completedAmount;
      const depositRemaining = rawRemaining <= 0.01 ? 0 : Math.round(rawRemaining * 100) / 100;
      const isDepositFullyPaid = depositRequired > 0 ? (completedAmount >= depositRequired - 0.01) : true;
      const completedProgressPercent = depositRequired > 0 ? Math.min((completedAmount / depositRequired) * 100, 100) : 100;
      const pendingProgressPercent = depositRequired > 0 ? Math.min((pendingAmount / depositRequired) * 100, 100 - completedProgressPercent) : 0;

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
        loan_status: payment.loans?.status || 'N/A',
        deposit_required: depositRequired,
        total_deposit_paid: completedAmount,
        deposit_pending_amount: pendingAmount,
        deposit_total_committed: totalCommitted,
        deposit_remaining: depositRemaining,
        is_deposit_fully_paid: isDepositFullyPaid,
        has_pending_contributions: pendingAmount > 0,
        deposit_progress_percent: completedProgressPercent,
        deposit_pending_progress_percent: pendingProgressPercent,
        deposit_payments_count: (depositTracking?.completedCount || 0) + (depositTracking?.pendingCount || 0),
        deposit_completed_count: depositTracking?.completedCount || 0,
        deposit_pending_count: depositTracking?.pendingCount || 0,
        deposit_payment_details: depositTracking?.payment_details || []
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
