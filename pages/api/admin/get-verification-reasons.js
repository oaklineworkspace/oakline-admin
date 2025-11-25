
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    // Fetch verification-specific restriction reasons
    const { data: reasons, error: reasonsError } = await supabaseAdmin
      .from('account_restriction_reasons')
      .select('*')
      .eq('action_type', 'enforce_verification')
      .order('category', { ascending: true })
      .order('display_order', { ascending: true });

    if (reasonsError) {
      console.error('Error fetching verification reasons:', reasonsError);
      throw reasonsError;
    }

    // Group reasons by category
    const groupedReasons = {};
    (reasons || []).forEach(reason => {
      if (!groupedReasons[reason.category]) {
        groupedReasons[reason.category] = [];
      }
      groupedReasons[reason.category].push({
        id: reason.id,
        text: reason.reason_text,
        category: reason.category,
        displayMessage: reason.default_display_message
      });
    });

    return res.status(200).json({
      success: true,
      reasons: {
        enforce_verification: groupedReasons
      }
    });

  } catch (error) {
    console.error('Error fetching verification reasons:', error);
    return res.status(500).json({
      error: 'Failed to fetch verification reasons',
      details: error.message
    });
  }
}
