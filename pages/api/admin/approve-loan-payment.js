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
    const { paymentId, action, rejectionReason } = req.body;

    if (!paymentId || !action) {
      return res.status(400).json({ error: 'Payment ID and action are required' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be either "approve" or "reject"' });
    }

    const { data: result, error: rpcError } = await supabaseAdmin.rpc('approve_loan_payment_atomic', {
      p_payment_id: paymentId,
      p_admin_id: authResult.adminId,
      p_action: action,
      p_rejection_reason: rejectionReason || null
    });

    if (rpcError) {
      console.error('Error in approve_loan_payment_atomic:', rpcError);
      return res.status(500).json({ 
        error: rpcError.message || 'Failed to process payment',
        details: rpcError.hint
      });
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error in approve-loan-payment:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
