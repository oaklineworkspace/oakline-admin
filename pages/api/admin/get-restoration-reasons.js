import { supabase } from '../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Helper function to verify admin authentication
async function verifyAdminAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header', status: 401 };
  }

  const token = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    console.error('Auth error:', authError);
    return { error: 'Unauthorized', status: 401 };
  }

  const { data: adminProfile, error: adminError } = await supabaseAdmin
    .from('admin_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (adminError || !adminProfile) {
    return { error: 'Admin access required', status: 403 };
  }

  return { user, adminProfile };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { action_type } = req.query;

    let query = supabaseAdmin
      .from('account_restoration_reasons')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('display_order', { ascending: true });

    if (action_type) {
      query = query.eq('action_type', action_type);
    }

    const { data: reasons, error } = await query;

    if (error) {
      console.error('Error fetching restoration reasons:', error);
      return res.status(500).json({
        error: 'Failed to fetch restoration reasons',
        details: error.message
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
    console.error('Server error in get-restoration-reasons:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
