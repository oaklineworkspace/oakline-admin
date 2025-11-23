import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { transactionId, description } = req.body;

    if (!transactionId || !description) {
      return res.status(400).json({ error: 'Transaction ID and description are required' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('transactions')
      .update({ description })
      .eq('id', transactionId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    res.status(200).json({
      success: true,
      message: 'Description updated successfully'
    });
  } catch (error) {
    console.error('Error updating description:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
