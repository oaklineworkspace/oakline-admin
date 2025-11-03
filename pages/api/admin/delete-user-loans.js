
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { userId, email } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log(`🗑️ Starting loan deletion for user: ${userId} (${email})`);

    const { data: loans, error: loansError } = await supabaseAdmin
      .from('loans')
      .select('id')
      .eq('user_id', userId);

    if (loansError) {
      console.error('Error fetching loans:', loansError);
      return res.status(500).json({ error: 'Failed to fetch user loans' });
    }

    const loanIds = (loans || []).map(loan => loan.id);
    let deletedCounts = {
      loans: 0,
      payments: 0,
      deposits: 0
    };

    if (loanIds.length > 0) {
      const { error: paymentsError, count: paymentsCount } = await supabaseAdmin
        .from('loan_payments')
        .delete()
        .in('loan_id', loanIds);

      if (paymentsError) {
        console.error('Error deleting loan payments:', paymentsError);
      } else {
        deletedCounts.payments = paymentsCount || 0;
        console.log(`✅ Deleted ${paymentsCount} loan payments`);
      }

      const { data: cryptoDeposits } = await supabaseAdmin
        .from('crypto_deposits')
        .select('id')
        .in('loan_id', loanIds)
        .eq('purpose', 'loan_requirement');

      if (cryptoDeposits && cryptoDeposits.length > 0) {
        const depositIds = cryptoDeposits.map(d => d.id);
        
        await supabaseAdmin
          .from('crypto_deposit_audit_logs')
          .delete()
          .in('deposit_id', depositIds);

        const { error: depositsError, count: depositsCount } = await supabaseAdmin
          .from('crypto_deposits')
          .delete()
          .in('id', depositIds);

        if (depositsError) {
          console.error('Error deleting crypto deposits:', depositsError);
        } else {
          deletedCounts.deposits = depositsCount || 0;
          console.log(`✅ Deleted ${depositsCount} crypto deposits`);
        }
      }
    }

    const { error: loansDeleteError, count: loansCount } = await supabaseAdmin
      .from('loans')
      .delete()
      .eq('user_id', userId);

    if (loansDeleteError) {
      console.error('Error deleting loans:', loansDeleteError);
      return res.status(500).json({ error: 'Failed to delete loans' });
    }

    deletedCounts.loans = loansCount || 0;
    console.log(`✅ Deleted ${loansCount} loans`);

    const summary = `Deleted: ${deletedCounts.loans} loan(s), ${deletedCounts.payments} payment(s), ${deletedCounts.deposits} deposit(s)`;

    return res.status(200).json({
      success: true,
      message: 'All loan data deleted successfully',
      summary,
      deletedCounts
    });

  } catch (error) {
    console.error('Error in delete-user-loans:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
