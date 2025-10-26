
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accountId, newAccountNumber } = req.body;

    if (!accountId || !newAccountNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate account number format (numeric, 10-16 digits)
    if (!/^\d{10,16}$/.test(newAccountNumber)) {
      return res.status(400).json({ 
        error: 'Invalid account number format. Must be 10-16 digits.' 
      });
    }

    // Check if account number already exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('account_number', newAccountNumber)
      .neq('id', accountId)
      .single();

    if (existing) {
      return res.status(400).json({ 
        error: 'Account number already exists' 
      });
    }

    // Update account number
    const { data, error: updateError } = await supabaseAdmin
      .from('accounts')
      .update({
        account_number: newAccountNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Failed to update account number: ${updateError.message}`);
    }

    res.status(200).json({
      message: 'Account number updated successfully',
      account: data
    });

  } catch (error) {
    console.error('Error updating account number:', error);
    res.status(500).json({
      error: error.message || 'Failed to update account number'
    });
  }
}
