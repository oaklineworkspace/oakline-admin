
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

    const { data: loans, error: loansError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('user_id', userId);

    if (loansError) {
      console.error('Error fetching loans:', loansError);
      return res.status(500).json({ error: 'Failed to fetch loans' });
    }

    const loanIds = (loans || []).map(loan => loan.id);

    let payments = [];
    let deposits = [];

    if (loanIds.length > 0) {
      const { data: paymentsData } = await supabaseAdmin
        .from('loan_payments')
        .select('*')
        .in('loan_id', loanIds);
      payments = paymentsData || [];

      const { data: depositsData } = await supabaseAdmin
        .from('crypto_deposits')
        .select('*')
        .in('loan_id', loanIds)
        .eq('purpose', 'loan_requirement');
      deposits = depositsData || [];
    }

    return res.status(200).json({
      loans: loans || [],
      payments,
      deposits
    });
  } catch (error) {
    console.error('Error in get-user-loan-details:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
