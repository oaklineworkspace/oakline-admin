
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: cards, error } = await supabaseAdmin
      .from('cards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cards:', error);
      return res.status(500).json({ error: 'Failed to fetch cards' });
    }

    return res.status(200).json({ 
      success: true,
      cards: cards || [] 
    });
  } catch (error) {
    console.error('Error in get-user-cards:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
