import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Loan type ID is required' });
    }

    const { count: loanCount } = await supabaseAdmin
      .from('loans')
      .select('*', { count: 'exact', head: true })
      .eq('loan_type', id);

    if (loanCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete loan type',
        details: `This loan type is being used by ${loanCount} active loan(s). Consider deactivating it instead.`
      });
    }

    const { error } = await supabaseAdmin
      .from('loan_types')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Loan type deleted successfully'
    });

  } catch (error) {
    console.error('Error in delete-loan-type:', error);
    return res.status(500).json({
      error: 'Failed to delete loan type',
      details: error.message
    });
  }
}
