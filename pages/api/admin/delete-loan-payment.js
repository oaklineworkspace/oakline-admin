
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { paymentId } = req.body;

    console.log('Delete loan payment request:', paymentId);

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    // First, fetch the payment to ensure it exists
    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('loan_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      console.error('Payment not found:', fetchError);
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Prevent deletion of completed payments that have been processed
    if (payment.status === 'completed' && payment.processed_by) {
      return res.status(400).json({
        error: 'Cannot delete completed payments that have been processed. Please reject them first.'
      });
    }

    // Delete the payment
    const { error: deleteError } = await supabaseAdmin
      .from('loan_payments')
      .delete()
      .eq('id', paymentId);

    if (deleteError) {
      console.error('Error deleting payment:', deleteError);
      return res.status(500).json({
        error: 'Failed to delete payment',
        details: deleteError.message
      });
    }

    console.log('Payment deleted successfully:', paymentId);

    // Log the deletion
    await supabaseAdmin
      .from('system_logs')
      .insert({
        level: 'warning',
        type: 'transaction',
        message: `Loan payment deleted by admin`,
        details: {
          payment_id: paymentId,
          deleted_by: authResult.adminId,
          deleted_by_email: authResult.user?.email,
          payment_amount: payment.amount,
          payment_status: payment.status,
          loan_id: payment.loan_id,
          timestamp: new Date().toISOString()
        },
        admin_id: authResult.adminId
      });

    return res.status(200).json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    // First, check if payment exists
    const { data: payment, error: fetchError } = await supabase
      .from('loan_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      console.error('Payment fetch error:', fetchError);
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Delete the payment
    const { error: deleteError } = await supabase
      .from('loan_payments')
      .delete()
      .eq('id', paymentId);

    if (deleteError) {
      console.error('Payment deletion error:', deleteError);
      return res.status(500).json({ error: 'Failed to delete payment', details: deleteError.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment deleted successfully'
    });

  } catch (error) {
    console.error('Error in delete-loan-payment:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
