import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { cardId, action, additionalData = {} } = req.body;

    if (!cardId || !action) {
      return res.status(400).json({ error: 'Card ID and action are required' });
    }

    let updateData = {};
    
    switch (action) {
      case 'lock':
        updateData.is_locked = true;
        break;
      case 'unlock':
        updateData.is_locked = false;
        break;
      case 'deactivate':
        updateData.status = 'inactive';
        break;
      case 'activate':
        updateData.status = 'active';
        break;
      case 'update_limits':
        if (additionalData.dailyLimit !== undefined) updateData.daily_limit = additionalData.dailyLimit;
        if (additionalData.monthlyLimit !== undefined) updateData.monthly_limit = additionalData.monthlyLimit;
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    const { error: updateError } = await supabase
      .from('cards')
      .update(updateData)
      .eq('id', cardId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating card:', updateError);
      return res.status(500).json({ error: `Failed to ${action} card: ${updateError.message}` });
    }

    res.status(200).json({
      success: true,
      message: `Card ${action} successful`
    });

  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({ error: 'Error updating card' });
  }
}
