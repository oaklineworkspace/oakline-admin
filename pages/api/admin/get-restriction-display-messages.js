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
    const { restriction_reason_id } = req.query;

    let query = supabaseAdmin
      .from('restriction_display_messages')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (restriction_reason_id) {
      query = query.eq('restriction_reason_id', restriction_reason_id);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('Error fetching restriction display messages:', error);
      return res.status(500).json({
        error: 'Failed to fetch restriction display messages',
        details: error.message
      });
    }

    // Group messages by restriction_reason_id for easier access
    const groupedMessages = {};
    messages.forEach(message => {
      if (!groupedMessages[message.restriction_reason_id]) {
        groupedMessages[message.restriction_reason_id] = [];
      }
      groupedMessages[message.restriction_reason_id].push({
        id: message.id,
        text: message.message_text,
        type: message.message_type,
        severity: message.severity_level,
        isDefault: message.is_default
      });
    });

    return res.status(200).json({
      success: true,
      messages: restriction_reason_id ? (groupedMessages[restriction_reason_id] || []) : groupedMessages,
      totalMessages: messages.length
    });
  } catch (error) {
    console.error('Server error in get-restriction-display-messages:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
