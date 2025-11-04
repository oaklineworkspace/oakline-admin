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
    const { includeInactive } = req.query;

    let query = supabaseAdmin
      .from('loan_types')
      .select('*')
      .order('name', { ascending: true });

    if (includeInactive !== 'true') {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching loan types:', error);
      throw error;
    }

    return res.status(200).json({
      success: true,
      loanTypes: data || []
    });

  } catch (error) {
    console.error('Error in get-loan-types:', error);
    return res.status(500).json({
      error: 'Failed to fetch loan types',
      details: error.message
    });
  }
}
