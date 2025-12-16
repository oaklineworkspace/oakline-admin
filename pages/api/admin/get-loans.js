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
    // Fetch all loans with all current schema fields
    const { data: loans, error: loansError } = await supabaseAdmin
      .from('loans')
      .select(`
        *,
        accounts!loans_account_id_fkey(id, account_number, account_type, user_id, application_id)
      `)
      .order('created_at', { ascending: false });

    if (loansError) {
      console.error('Error fetching loans:', loansError);
      return res.status(500).json({ error: 'Failed to fetch loans', details: loansError.message });
    }

    if (!loans || loans.length === 0) {
      return res.status(200).json({
        success: true,
        loans: []
      });
    }

    // Get unique user IDs and account IDs
    const userIds = [...new Set(loans.map(loan => loan.user_id).filter(Boolean))];
    const accountIds = [...new Set(loans.map(loan => loan.account_id).filter(Boolean))];

    // Fetch user profiles
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name')
      .in('id', userIds);

    // Fetch accounts
    const { data: accounts } = await supabaseAdmin
      .from('accounts')
      .select('id, account_number, account_type')
      .in('id', accountIds);

    // Create lookup maps
    const profileMap = (profiles || []).reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});

    const accountMap = (accounts || []).reduce((acc, account) => {
      acc[account.id] = account;
      return acc;
    }, {});

    // Fetch deposit information for loans that require deposits
    const loansData = loans; // Renamed for clarity with the change
    let depositVerificationMap = {};

    if (loansData.length > 0) {
      // For each loan that requires a deposit, check deposit status
      const loansWithDeposits = await Promise.all(loansData.map(async (loan) => {
        if (!loan.deposit_required || loan.deposit_required <= 0) {
          return { 
            ...loan, 
            deposit_info: { 
              verified: true, 
              amount: 0, 
              type: 'not_required', 
              status: 'not_required' 
            } 
          };
        }

        const requiredAmount = parseFloat(loan.deposit_required);

        // Check deposit_status field from loans table
        if (loan.deposit_status === 'completed' && loan.deposit_paid) {
          return {
            ...loan,
            deposit_info: {
              verified: true,
              amount: parseFloat(loan.deposit_amount || 0),
              type: loan.deposit_method || 'balance',
              date: loan.deposit_date,
              status: 'completed'
            }
          };
        }

        // Check for completed deposit payments in loan_payments table
        const { data: loanPaymentDeposits } = await supabaseAdmin
          .from('loan_payments')
          .select('*')
          .eq('loan_id', loan.id)
          .eq('is_deposit', true)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1);

        if (loanPaymentDeposits && loanPaymentDeposits.length > 0) {
          const depositPayment = loanPaymentDeposits[0];
          const depositAmount = parseFloat(depositPayment.amount || 0);
          return {
            ...loan,
            // Set loan-level deposit fields for frontend compatibility
            deposit_status: 'completed',
            deposit_paid: true,
            deposit_amount: depositAmount,
            deposit_method: depositPayment.payment_method || 'payment',
            deposit_date: depositPayment.created_at,
            deposit_info: {
              verified: true,
              amount: depositAmount,
              type: depositPayment.payment_method || 'payment',
              method: depositPayment.payment_method || 'payment',
              date: depositPayment.created_at,
              payment_id: depositPayment.id,
              status: 'completed'
            }
          };
        }

        // Also check for pending deposit payments that have been submitted
        const { data: pendingLoanPaymentDeposits } = await supabaseAdmin
          .from('loan_payments')
          .select('*')
          .eq('loan_id', loan.id)
          .eq('is_deposit', true)
          .in('status', ['pending', 'submitted', 'pending_approval'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (pendingLoanPaymentDeposits && pendingLoanPaymentDeposits.length > 0) {
          const pendingPayment = pendingLoanPaymentDeposits[0];
          const pendingAmount = parseFloat(pendingPayment.amount || 0);
          return {
            ...loan,
            // Set loan-level deposit fields for pending submissions
            deposit_status: 'pending',
            deposit_paid: false,
            deposit_amount: pendingAmount,
            deposit_method: pendingPayment.payment_method || 'payment',
            deposit_info: {
              verified: false,
              has_pending: true,
              amount: pendingAmount,
              type: pendingPayment.payment_method || 'payment',
              method: pendingPayment.payment_method || 'payment',
              date: pendingPayment.created_at,
              payment_id: pendingPayment.id,
              status: 'pending'
            }
          };
        }

        // Check for loan-specific crypto deposits
        const { data: loanDeposits } = await supabaseAdmin
          .from('crypto_deposits')
          .select('*')
          .eq('purpose', 'loan_requirement')
          .in('status', ['confirmed', 'completed'])
          .gte('amount', requiredAmount)
          .order('created_at', { ascending: false })
          .limit(1);

        const hasLoanDeposit = loanDeposits && loanDeposits.length > 0;

        if (hasLoanDeposit) {
          const depositAmount = parseFloat(loanDeposits[0].amount);
          // Send email to user about completed crypto deposit
          if (loanDeposits[0].status === 'completed') {
            try {
              await fetch('/api/email/send-deposit-completed-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: profileMap[loan.user_id]?.email,
                  subject: 'Your Crypto Deposit for Loan Requirement is Completed',
                  text: `Your crypto deposit of ${depositAmount} for your loan requirement has been completed. Deposit ID: ${loanDeposits[0].id}.`,
                  html: `<p>Your crypto deposit of <strong>${depositAmount}</strong> for your loan requirement has been completed.</p><p>Deposit ID: ${loanDeposits[0].id}</p>`
                })
              });
            } catch (emailError) {
              console.error('Failed to send deposit completed email:', emailError);
            }
          }
          return {
            ...loan,
            deposit_info: {
              verified: depositAmount >= requiredAmount,
              amount: depositAmount,
              type: 'crypto',
              date: loanDeposits[0].created_at,
              deposit_id: loanDeposits[0].id
            }
          };
        }

        // Check for general crypto deposits by user
        const { data: cryptoDeposits } = await supabaseAdmin
          .from('crypto_deposits')
          .select('*')
          .eq('user_id', loan.user_id)
          .in('status', ['confirmed', 'completed'])
          .gte('amount', requiredAmount)
          .order('created_at', { ascending: false })
          .limit(1);

        const hasCryptoDeposit = cryptoDeposits && cryptoDeposits.length > 0;

        if (hasCryptoDeposit) {
          const cryptoAmount = parseFloat(cryptoDeposits[0].amount);
          // Send email to user about completed crypto deposit
          if (cryptoDeposits[0].status === 'completed') {
            try {
              await fetch('/api/email/send-deposit-completed-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: profileMap[loan.user_id]?.email,
                  subject: 'Your Crypto Deposit is Completed',
                  text: `Your crypto deposit of ${cryptoAmount} has been completed. Deposit ID: ${cryptoDeposits[0].id}.`,
                  html: `<p>Your crypto deposit of <strong>${cryptoAmount}</strong> has been completed.</p><p>Deposit ID: ${cryptoDeposits[0].id}</p>`
                })
              });
            } catch (emailError) {
              console.error('Failed to send deposit completed email:', emailError);
            }
          }
          return {
            ...loan,
            deposit_info: {
              verified: true,
              amount: cryptoAmount,
              type: 'crypto',
              date: cryptoDeposits[0].created_at,
              deposit_id: cryptoDeposits[0].id
            }
          };
        }

        // Check if there's a pending crypto deposit for this loan
        const { data: pendingLoanDeposits } = await supabaseAdmin
          .from('crypto_deposits')
          .select('*')
          .eq('loan_id', loan.id)
          .eq('purpose', 'loan_requirement')
          .in('status', ['pending', 'awaiting_confirmations', 'processing'])
          .order('created_at', { ascending: false })
          .limit(1);

        const hasPendingLoan = pendingLoanDeposits && pendingLoanDeposits.length > 0;

        if (hasPendingLoan) {
          return {
            ...loan,
            deposit_info: {
              verified: false,
              has_pending: true,
              pending_amount: parseFloat(pendingLoanDeposits[0].amount),
              amount: 0,
              type: 'crypto',
              date: null,
              deposit_id: pendingLoanDeposits[0].id
            }
          };
        }

        // Check if there's a pending general crypto deposit
        const { data: pendingDeposits } = await supabaseAdmin
          .from('crypto_deposits')
          .select('*')
          .eq('user_id', loan.user_id)
          .in('status', ['pending', 'awaiting_confirmations', 'processing'])
          .gte('amount', requiredAmount)
          .order('created_at', { ascending: false })
          .limit(1);

        const hasPending = pendingDeposits && pendingDeposits.length > 0;

        if (hasPending) {
          return {
            ...loan,
            deposit_info: {
              verified: false,
              has_pending: true,
              pending_amount: parseFloat(pendingDeposits[0].amount),
              amount: 0,
              type: 'crypto',
              date: null,
              deposit_id: pendingDeposits[0].id
            }
          };
        }

        return {
          ...loan,
          deposit_info: {
            verified: false,
            has_pending: false,
            amount: 0,
            type: null,
            date: null,
            deposit_id: null
          }
        };
      }));

      // Reconstruct the transformedLoans array to include the updated deposit_info AND loan-level deposit fields
      const transformedLoans = loansData.map(loan => {
        const updatedLoan = loansWithDeposits.find(l => l.id === loan.id);
        const hasDepositRequirement = loan.deposit_required && loan.deposit_required > 0;

        let deposit_info = updatedLoan?.deposit_info || { verified: true, amount: 0, type: 'none', status: 'not_required' };

        // Ensure a default for loans without deposit requirements or if the fetch failed
        if (!hasDepositRequirement) {
          deposit_info = { verified: true, amount: 0, type: 'none', status: 'not_required' };
        } else if (!updatedLoan) {
            // Fallback if no deposit info was found for a loan that requires one
            deposit_info = { verified: false, amount: 0, type: 'none', status: 'pending', has_pending: false };
        }

        const profile = profileMap[loan.user_id];
        const fullName = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
          : 'N/A';

        // Merge updatedLoan fields (deposit_status, deposit_paid, etc.) with original loan
        // This ensures loan-level deposit fields from loan_payments checks are preserved
        return {
          ...loan,
          // Apply updated deposit fields from updatedLoan if they exist
          ...(updatedLoan?.deposit_status && { deposit_status: updatedLoan.deposit_status }),
          ...(updatedLoan?.deposit_paid !== undefined && { deposit_paid: updatedLoan.deposit_paid }),
          ...(updatedLoan?.deposit_amount !== undefined && { deposit_amount: updatedLoan.deposit_amount }),
          ...(updatedLoan?.deposit_method && { deposit_method: updatedLoan.deposit_method }),
          ...(updatedLoan?.deposit_date && { deposit_date: updatedLoan.deposit_date }),
          user_email: profile?.email || 'N/A',
          user_name: fullName,
          account_number: accountMap[loan.account_id]?.account_number || 'N/A',
          account_type: accountMap[loan.account_id]?.account_type || 'N/A',
          deposit_info: deposit_info
        };
      });

      return res.status(200).json({
        success: true,
        loans: transformedLoans
      });
    } else {
      // If there are no loans, return empty
      return res.status(200).json({
        success: true,
        loans: []
      });
    }

  } catch (error) {
    console.error('Error in get-loans:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}