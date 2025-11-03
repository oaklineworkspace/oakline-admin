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
    // Fetch all loans first
    const { data: loans, error: loansError } = await supabaseAdmin
      .from('loans')
      .select('*')
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
      .select('id, email')
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
      // For each loan that requires a deposit, check if it's been paid
      const loansWithDeposits = await Promise.all(loansData.map(async (loan) => {
        if (!loan.deposit_required || loan.deposit_required <= 0) {
          return { ...loan, deposit_info: null };
        }

        const requiredAmount = parseFloat(loan.deposit_required);

        // First check for loan-specific deposits (purpose = 'loan_requirement' and loan_id matches)
        const { data: loanDeposits } = await supabaseAdmin
          .from('crypto_deposits')
          .select('*')
          .eq('loan_id', loan.id)
          .eq('purpose', 'loan_requirement')
          .in('status', ['confirmed', 'completed'])
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

      // Reconstruct the transformedLoans array to include the updated deposit_info
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


        return {
          ...loan,
          user_email: profileMap[loan.user_id]?.email || 'N/A',
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