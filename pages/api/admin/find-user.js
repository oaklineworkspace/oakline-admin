
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, userId } = req.body;

    if (!email && !userId) {
      return res.status(400).json({ error: 'Email or userId is required' });
    }

    let user = null;

    // Search by user ID first if provided
    if (userId) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        user = data;
      }
    }

    // Search by email if not found by ID
    if (!user && email) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (!error && data) {
        user = data;
      }
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      user: user,
    });
  } catch (error) {
    console.error('Error finding user:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
}
