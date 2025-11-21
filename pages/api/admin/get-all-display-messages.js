import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: adminProfile, error: adminError } = await supabaseAdmin
    .from('admin_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (adminError || !adminProfile) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    // Fetch all display messages with their restriction reason details
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('restriction_display_messages')
      .select(`
        *,
        restriction_reason:account_restriction_reasons(
          id,
          action_type,
          category,
          reason_text
        )
      `)
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('Error fetching display messages:', messagesError);
      return res.status(500).json({ 
        error: 'Failed to fetch display messages',
        details: messagesError
      });
    }

    // Get stats
    const totalMessages = messages.length;
    const activeMessages = messages.filter(m => m.is_active).length;
    const inactiveMessages = messages.filter(m => !m.is_active).length;
    const defaultMessages = messages.filter(m => m.is_default).length;

    const stats = {
      total: totalMessages,
      active: activeMessages,
      inactive: inactiveMessages,
      default: defaultMessages
    };

    return res.status(200).json({
      messages: messages || [],
      stats
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ 
      error: 'An unexpected error occurred',
      details: err.message 
    });
  }
}
