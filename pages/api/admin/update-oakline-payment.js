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
    const { paymentId, status } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['pending', 'completed', 'expired', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status provided' });
    }

    // Fetch the payment transaction
    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('oakline_pay_transactions')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      throw new Error('Payment not found');
    }

    // If completing payment, credit user's account
    if (status === 'completed' && payment.status !== 'completed') {
      // Get user's account
      const { data: account, error: accountError } = await supabaseAdmin
        .from('accounts')
        .select('id, balance, user_id')
        .eq('user_id', payment.user_id)
        .single();

      if (!accountError && account) {
        const newBalance = parseFloat(account.balance || 0) + parseFloat(payment.amount || 0);
        await supabaseAdmin
          .from('accounts')
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq('id', account.id);
      }
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabaseAdmin
      .from('oakline_pay_transactions')
      .update(updateData)
      .eq('id', paymentId);

    if (updateError) throw updateError;

    return res.status(200).json({
      success: true,
      message: 'Payment status updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    return res.status(500).json({
      error: 'Failed to update payment status',
      details: error.message
    });
  }
}
