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
    const { paymentId, refundReason, refundAmount } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('oakline_pay_pending_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ error: 'Only completed payments can be refunded' });
    }

    const actualRefundAmount = refundAmount || payment.amount;

    // Get user's account and credit the refund amount using sender_id
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('id, balance, user_id')
      .eq('user_id', payment.sender_id)
      .single();

    if (!accountError && account) {
      const refundedBalance = parseFloat(account.balance || 0) + parseFloat(actualRefundAmount || 0);
      await supabaseAdmin
        .from('accounts')
        .update({ balance: refundedBalance, updated_at: new Date().toISOString() })
        .eq('id', account.id);
    }

    const { error: updateError } = await supabaseAdmin
      .from('oakline_pay_pending_payments')
      .update({
        status: 'refunded',
        memo: `Refunded: ${refundReason || 'Customer refund request'}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (updateError) throw updateError;

    return res.status(200).json({
      success: true,
      message: `Refund processed successfully. Amount: $${actualRefundAmount.toFixed(2)} credited to user's account`
    });
  } catch (error) {
    console.error('Error refunding payment:', error);
    return res.status(500).json({
      error: 'Failed to process refund',
      details: error.message
    });
  }
}
