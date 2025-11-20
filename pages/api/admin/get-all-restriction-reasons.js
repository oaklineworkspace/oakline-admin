import { supabase } from '../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('admin_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || !adminProfile) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { 
      action_type, 
      category, 
      severity_level, 
      is_active,
      search 
    } = req.query;

    let query = supabaseAdmin
      .from('account_restriction_reasons')
      .select('*')
      .order('action_type', { ascending: true })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (action_type) {
      query = query.eq('action_type', action_type);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (severity_level) {
      query = query.eq('severity_level', severity_level);
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    if (search) {
      query = query.or(`reason_text.ilike.%${search}%,category.ilike.%${search}%`);
    }

    const { data: reasons, error: reasonsError } = await query;

    if (reasonsError) {
      console.error('Error fetching restriction reasons:', reasonsError);
      return res.status(500).json({ 
        error: 'Failed to fetch restriction reasons',
        details: reasonsError 
      });
    }

    const stats = {
      total: reasons.length,
      active: reasons.filter(r => r.is_active).length,
      inactive: reasons.filter(r => !r.is_active).length,
      byActionType: {},
      bySeverity: {},
      byCategory: {}
    };

    reasons.forEach(reason => {
      stats.byActionType[reason.action_type] = (stats.byActionType[reason.action_type] || 0) + 1;
      stats.bySeverity[reason.severity_level] = (stats.bySeverity[reason.severity_level] || 0) + 1;
      stats.byCategory[reason.category] = (stats.byCategory[reason.category] || 0) + 1;
    });

    return res.status(200).json({ 
      success: true, 
      reasons,
      stats,
      totalReasons: reasons.length
    });
  } catch (error) {
    console.error('Server error in get-all-restriction-reasons:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
