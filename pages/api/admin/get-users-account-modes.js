import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authResult = await verifyAdminAuth(req);
    if (authResult.error) {
      return res.status(authResult.status || 401).json({ error: authResult.error });
    }

    const { filter } = req.query;

    let query = supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name, is_frozen, frozen_at, frozen_by, frozen_reason, freeze_amount_required, is_unlimited, unlimited_at, unlimited_by, unlimited_reason, status, created_at, updated_at, freeze_payment_proof_path, freeze_payment_status, freeze_payment_amount, freeze_payment_method, freeze_payment_submitted_at, freeze_payment_tx_hash')
      .order('created_at', { ascending: false });

    if (filter === 'frozen') {
      query = query.eq('is_frozen', true);
    } else if (filter === 'unlimited') {
      query = query.eq('is_unlimited', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching profiles:', error);
      return res.status(500).json({ error: 'Failed to fetch users: ' + error.message });
    }

    return res.status(200).json({
      success: true,
      users: data || []
    });

  } catch (error) {
    console.error('Error in get-users-account-modes:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
