
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  const { method } = req;
  
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

    switch (method) {
      case 'GET':
        return await getUserCards(user.id, res);
      case 'PUT':
        return await updateCard(req, user.id, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in cards API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getUserCards(userId, res) {
  try {
    const { data: cards, error } = await supabase
      .from('cards')
      .select(`
        *,
        accounts!inner(
          id,
          account_number,
          account_type,
          balance
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cards:', error);
      return res.status(500).json({ error: 'Failed to fetch cards' });
    }

    // Hide sensitive card information
    const safeCards = cards.map(card => ({
      ...card,
      card_number: `****-****-****-${card.card_number.slice(-4)}`,
      cvv: undefined,
      pin_hash: undefined
    }));

    res.status(200).json({
      success: true,
      cards: safeCards
    });
  } catch (error) {
    console.error('Error in getUserCards:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
}

async function updateCard(req, userId, res) {
  try {
    const { cardId, action, dailyLimit, monthlyLimit } = req.body;

    if (!cardId || !action) {
      return res.status(400).json({ error: 'Card ID and action are required' });
    }

    // Verify card belongs to user
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', userId)
      .single();

    if (cardError || !card) {
      return res.status(404).json({ error: 'Card not found' });
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
      case 'update_limits':
        if (dailyLimit !== undefined) updateData.daily_limit = dailyLimit;
        if (monthlyLimit !== undefined) updateData.monthly_limit = monthlyLimit;
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    const { data: updatedCard, error: updateError } = await supabase
      .from('cards')
      .update(updateData)
      .eq('id', cardId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating card:', updateError);
      return res.status(500).json({ error: 'Failed to update card' });
    }

    res.status(200).json({
      success: true,
      message: `Card ${action} successful`,
      card: {
        ...updatedCard,
        card_number: `****-****-****-${updatedCard.card_number.slice(-4)}`,
        cvv: undefined,
        pin_hash: undefined
      }
    });
  } catch (error) {
    console.error('Error in updateCard:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
}
