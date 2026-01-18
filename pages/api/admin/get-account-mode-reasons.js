import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '../../../lib/adminAuth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authResult = await verifyAdminAuth(req);
    if (!authResult.isAdmin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type } = req.query;

    if (type === 'freeze') {
      const { data: freezeReasons, error } = await supabaseAdmin
        .from('freeze_reasons')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return res.status(200).json({ reasons: freezeReasons });
    }

    if (type === 'unlimited') {
      const { data: unlimitedReasons, error } = await supabaseAdmin
        .from('unlimited_reasons')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return res.status(200).json({ reasons: unlimitedReasons });
    }

    const { data: freezeReasons, error: freezeError } = await supabaseAdmin
      .from('freeze_reasons')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    const { data: unlimitedReasons, error: unlimitedError } = await supabaseAdmin
      .from('unlimited_reasons')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (freezeError) throw freezeError;
    if (unlimitedError) throw unlimitedError;

    return res.status(200).json({
      freezeReasons: freezeReasons || [],
      unlimitedReasons: unlimitedReasons || []
    });

  } catch (error) {
    console.error('Error fetching reasons:', error);
    return res.status(500).json({ error: 'Failed to fetch reasons' });
  }
}
