
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
    const { id, name, description, icon, rate, category, min_deposit } = req.body;

    if (!name || !description || !icon || !rate || !category) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const accountTypeData = {
      name,
      description,
      icon,
      rate,
      category,
      min_deposit: parseFloat(min_deposit) || 0,
      updated_at: new Date().toISOString()
    };

    let result;

    if (id) {
      const { data, error } = await supabaseAdmin
        .from('account_types')
        .update(accountTypeData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('account_types')
        .insert([accountTypeData])
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return res.status(200).json({
      success: true,
      accountType: result,
      message: id ? 'Account type updated successfully' : 'Account type created successfully'
    });
  } catch (error) {
    console.error('Error saving account type:', error);
    return res.status(500).json({
      error: 'Failed to save account type',
      details: error.message
    });
  }
}
