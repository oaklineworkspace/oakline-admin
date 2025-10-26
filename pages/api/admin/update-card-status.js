
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cardId, action } = req.body;

    if (!cardId || !action) {
      return res.status(400).json({ error: 'Card ID and action are required' });
    }

    let updateData = { updated_at: new Date().toISOString() };

    switch (action) {
      case 'block':
        updateData.status = 'blocked';
        break;
      case 'unblock':
        updateData.status = 'active';
        break;
      case 'suspend':
        updateData.status = 'suspended';
        break;
      case 'activate':
        updateData.status = 'active';
        break;
      case 'deactivate':
        updateData.status = 'deactivated';
        break;
      case 'close':
        updateData.status = 'inactive';
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    const { data: card, error: updateError } = await supabaseAdmin
      .from('cards')
      .update(updateData)
      .eq('id', cardId)
      .select()
      .single();

    if (updateError) {
      console.error(`Error ${action} card:`, updateError);
      return res.status(500).json({ error: `Failed to ${action} card`, details: updateError.message });
    }

    return res.status(200).json({
      success: true,
      message: `Card ${action} successfully`,
      card: card
    });

  } catch (error) {
    console.error(`Error in update-card-status:`, error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
