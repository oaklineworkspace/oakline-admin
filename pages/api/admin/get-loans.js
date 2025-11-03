
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
    const loansRequiringDeposits = loans.filter(loan => 
      loan.deposit_required && loan.deposit_required > 0
    );

    let depositVerificationMap = {};
    if (loansRequiringDeposits.length > 0) {
      for (const loan of loansRequiringDeposits) {
        const isDepositCompleted = loan.deposit_status === 'completed';
        const depositAmount = parseFloat(loan.deposit_amount || 0);
        
        // Check if there's a pending deposit for this loan
        const { data: pendingDeposits } = await supabaseAdmin
          .from('crypto_deposits')
          .select('*')
          .eq('loan_id', loan.id)
          .eq('purpose', 'loan_requirement')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        const hasPendingDeposit = pendingDeposits && pendingDeposits.length > 0;
        
        depositVerificationMap[loan.id] = {
          verified: isDepositCompleted,
          amount: depositAmount,
          type: loan.deposit_method || 'crypto',
          status: loan.deposit_status,
          has_pending: hasPendingDeposit,
          pending_amount: hasPendingDeposit ? parseFloat(pendingDeposits[0].amount) : 0
        };
      }
    }

    // Transform the data to include user email, account info, and deposit verification
    const transformedLoans = loans.map(loan => {
      const hasDepositRequirement = loan.deposit_required && loan.deposit_required > 0;
      const defaultDepositInfo = hasDepositRequirement 
        ? { verified: loan.deposit_status === 'completed', amount: parseFloat(loan.deposit_amount || 0), type: loan.deposit_method || 'none', status: loan.deposit_status }
        : { verified: true, amount: 0, type: 'none', status: 'not_required' };
      
      return {
        ...loan,
        user_email: profileMap[loan.user_id]?.email || 'N/A',
        account_number: accountMap[loan.account_id]?.account_number || 'N/A',
        account_type: accountMap[loan.account_id]?.account_type || 'N/A',
        deposit_info: depositVerificationMap[loan.id] || defaultDepositInfo
      };
    });

    return res.status(200).json({
      success: true,
      loans: transformedLoans
    });

  } catch (error) {
    console.error('Error in get-loans:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
