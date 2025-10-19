
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accountId, status } = req.body;

    if (!accountId || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate status
    const validStatuses = ['active', 'pending', 'suspended', 'closed', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Update account status
    const { data, error: updateError } = await supabaseAdmin
      .from('accounts')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Failed to update account: ${updateError.message}`);
    }

    res.status(200).json({
      message: 'Account status updated successfully',
      account: data
    });

  } catch (error) {
    console.error('Error updating account status:', error);
    res.status(500).json({
      error: error.message || 'Failed to update account status'
    });
  }
}
