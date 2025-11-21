import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Check restriction status
    let restriction = null;
    if (profile.is_banned === true) {
      restriction = {
        type: 'banned',
        message: profile.restriction_display_message || 'Your account has been banned. Please contact support for more information.'
      };
    } else if (profile.status === 'suspended') {
      restriction = {
        type: 'suspended',
        message: profile.restriction_display_message || 'Your account is temporarily suspended. Please contact support for more information.',
        endDate: profile.suspension_end_date
      };
    } else if (profile.status === 'closed') {
      restriction = {
        type: 'closed',
        message: profile.restriction_display_message || 'Your account has been closed. Please contact support for more information.'
      };
    } else if (profile.account_locked === true) {
      restriction = {
        type: 'locked',
        message: profile.restriction_display_message || 'Your account is locked. Please contact support for more information.'
      };
    }

    res.status(200).json({
      restricted: !!restriction,
      restriction: restriction
    });
  } catch (err) {
    console.error('Check user restriction error:', err);
    res.status(500).json({
      error: err.message || 'Failed to check user restriction',
      details: { message: err.message }
    });
  }
}
