
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { data: accountTypes, error } = await supabaseAdmin
      .from('account_types')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      accountTypes: accountTypes || []
    });
  } catch (error) {
    console.error('Error fetching account types:', error);
    return res.status(500).json({
      error: 'Failed to fetch account types',
      details: error.message
    });
  }
}
