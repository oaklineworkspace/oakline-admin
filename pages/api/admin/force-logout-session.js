import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { sessionId, reason } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const { data: session, error: fetchError } = await supabaseAdmin
      .from('user_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('user_sessions')
      .update({
        is_active: false,
        ended_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      throw updateError;
    }

    await supabaseAdmin
      .from('system_logs')
      .insert({
        level: 'warning',
        type: 'auth',
        message: `Admin forced logout of session ${sessionId}`,
        details: {
          session_id: sessionId,
          user_id: session.user_id,
          reason: reason || 'Suspicious activity',
          ip_address: session.ip_address,
          device_type: session.device_type,
          forced_at: new Date().toISOString()
        },
        user_id: session.user_id
      });

    return res.status(200).json({
      success: true,
      message: 'Session terminated successfully'
    });

  } catch (error) {
    console.error('Error forcing logout:', error);
    return res.status(500).json({ 
      error: 'Failed to terminate session',
      details: error.message 
    });
  }
}
