import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { loanId } = req.body;

    if (!loanId) {
      return res.status(400).json({ error: 'Loan ID is required' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    const { data: adminProfile } = await supabaseAdmin
      .from('admin_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!adminProfile) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const { error: paymentsError } = await supabaseAdmin
      .from('loan_payments')
      .delete()
      .eq('loan_id', loanId);

    if (paymentsError) {
      console.error('Error deleting loan payments:', paymentsError);
    }

    const { error: collateralsError } = await supabaseAdmin
      .from('loan_collaterals')
      .delete()
      .eq('loan_id', loanId);

    if (collateralsError) {
      console.error('Error deleting loan collaterals:', collateralsError);
    }

    const { error: documentsError } = await supabaseAdmin
      .from('loan_documents')
      .delete()
      .eq('loan_id', loanId);

    if (documentsError) {
      console.error('Error deleting loan documents:', documentsError);
    }

    const { error: deleteError } = await supabaseAdmin
      .from('loans')
      .delete()
      .eq('id', loanId);

    if (deleteError) {
      console.error('Error deleting loan:', deleteError);
      return res.status(500).json({ error: 'Failed to delete loan', details: deleteError.message });
    }

    try {
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'loan_deleted',
          table_name: 'loans',
          old_data: { 
            loan_id: loanId,
            loan_type: loan.loan_type,
            principal: loan.principal,
            status: loan.status,
            user_id: loan.user_id
          },
          new_data: null
        });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Loan deleted successfully',
      deletedLoanId: loanId
    });

  } catch (error) {
    console.error('Error in delete-loan handler:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
