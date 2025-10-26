
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cardId, dailyLimit, monthlyLimit, status } = req.body;

    if (!cardId) {
      return res.status(400).json({ error: 'Card ID is required' });
    }

    const updateData = {};
    if (dailyLimit !== undefined) updateData.daily_limit = dailyLimit;
    if (monthlyLimit !== undefined) updateData.monthly_limit = monthlyLimit;
    if (status !== undefined) updateData.status = status;
    updateData.updated_at = new Date().toISOString();

    const { data: card, error: updateError } = await supabaseAdmin
      .from('cards')
      .update(updateData)
      .eq('id', cardId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating card:', updateError);
      return res.status(500).json({ error: 'Failed to update card', details: updateError.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Card updated successfully',
      card: card
    });

  } catch (error) {
    console.error('Error in update-card:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
