
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

    // First, delete associated interest rates
    const { error: ratesDeleteError } = await supabaseAdmin
      .from('loan_interest_rates')
      .delete()
      .eq('loan_type_id', id);

    if (ratesDeleteError) {
      console.error('Error deleting interest rates:', ratesDeleteError);
      throw ratesDeleteError;
    }

    // Then delete the loan type
    const { error: loanTypeDeleteError } = await supabaseAdmin
      .from('loan_types')
      .delete()
      .eq('id', id);

    if (loanTypeDeleteError) {
      console.error('Error deleting loan type:', loanTypeDeleteError);
      throw loanTypeDeleteError;
    }

    return res.status(200).json({
      success: true,
      message: 'Loan type deleted successfully'
    });

  } catch (error) {
    console.error('Error in delete-loan-type-with-rate:', error);
    return res.status(500).json({
      error: 'Failed to delete loan type',
      details: error.message
    });
  }
}
