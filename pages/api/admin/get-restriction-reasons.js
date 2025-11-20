import { supabase } from '../../../lib/supabaseClient';

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

    const { data: adminProfile, error: adminError } = await supabase
      .from('admin_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || !adminProfile) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { action_type } = req.query;

    let query = supabase
      .from('account_restriction_reasons')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (action_type) {
      query = query.eq('action_type', action_type);
    }

    const { data: reasons, error: reasonsError } = await query;

    if (reasonsError) {
      console.error('Error fetching restriction reasons:', reasonsError);
      return res.status(500).json({ 
        error: 'Failed to fetch restriction reasons',
        details: reasonsError 
      });
    }

    const groupedReasons = {};
    
    reasons.forEach(reason => {
      if (!groupedReasons[reason.action_type]) {
        groupedReasons[reason.action_type] = {};
      }
      
      if (!groupedReasons[reason.action_type][reason.category]) {
        groupedReasons[reason.action_type][reason.category] = [];
      }
      
      groupedReasons[reason.action_type][reason.category].push({
        id: reason.id,
        text: reason.reason_text,
        severity: reason.severity_level,
        requiresImmediateAction: reason.requires_immediate_action,
        contactEmail: reason.contact_email
      });
    });

    return res.status(200).json({ 
      success: true, 
      reasons: action_type ? groupedReasons[action_type] : groupedReasons,
      totalReasons: reasons.length
    });
  } catch (error) {
    console.error('Server error in get-restriction-reasons:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
