import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminAuth = await verifyAdminAuth(req);
    if (!adminAuth.success) {
      return res.status(401).json({ error: adminAuth.error });
    }

    const { data: freezeReasons, error } = await supabaseAdmin
      .from('freeze_reasons')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching freeze reasons:', error);
      return res.status(500).json({ error: 'Failed to fetch freeze reasons' });
    }

    return res.status(200).json({ freezeReasons: freezeReasons || [] });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
