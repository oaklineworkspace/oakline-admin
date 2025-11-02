
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
        const requiredAmount = parseFloat(loan.deposit_required);
        
        // Check crypto deposits
        const { data: cryptoDeposits } = await supabaseAdmin
          .from('crypto_deposits')
          .select('*')
          .eq('user_id', loan.user_id)
          .in('status', ['confirmed', 'completed'])
          .order('created_at', { ascending: false })
          .limit(1);

        // Check regular transactions (deposits to the loan account)
        const { data: transactions } = await supabaseAdmin
          .from('transactions')
          .select('*')
          .eq('user_id', loan.user_id)
          .eq('account_id', loan.account_id)
          .eq('type', 'deposit')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1);

        const hasCryptoDeposit = cryptoDeposits && cryptoDeposits.length > 0;
        const hasBankDeposit = transactions && transactions.length > 0;
        
        let depositAmount = 0;
        let isVerified = false;
        let depositType = 'none';
        
        if (hasCryptoDeposit) {
          depositAmount = parseFloat(cryptoDeposits[0].amount);
          isVerified = depositAmount >= requiredAmount;
          depositType = 'crypto';
        } else if (hasBankDeposit) {
          depositAmount = parseFloat(transactions[0].amount);
          isVerified = depositAmount >= requiredAmount;
          depositType = 'bank';
        }
        
        depositVerificationMap[loan.id] = {
          verified: isVerified,
          amount: depositAmount,
          type: depositType
        };
      }
    }

    // Transform the data to include user email, account info, and deposit verification
    const transformedLoans = loans.map(loan => {
      const hasDepositRequirement = loan.deposit_required && loan.deposit_required > 0;
      const defaultDepositInfo = hasDepositRequirement 
        ? { verified: false, amount: 0, type: 'none' }
        : { verified: true, amount: 0, type: 'none' };
      
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
