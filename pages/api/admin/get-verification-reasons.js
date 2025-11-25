
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
    // Fetch verification reasons from the dedicated table
    const { data: reasons, error: reasonsError } = await supabaseAdmin
      .from('verification_reasons')
      .select('*')
      .eq('is_active', true)
      .order('verification_type', { ascending: true })
      .order('category', { ascending: true })
      .order('display_order', { ascending: true });

    if (reasonsError) {
      console.error('Error fetching verification reasons:', reasonsError);
      throw reasonsError;
    }

    // Group reasons by verification type and category
    const groupedReasons = {
      selfie: {},
      video: {},
      liveness: {}
    };

    (reasons || []).forEach(reason => {
      const type = reason.verification_type;
      if (!groupedReasons[type]) {
        groupedReasons[type] = {};
      }
      if (!groupedReasons[type][reason.category]) {
        groupedReasons[type][reason.category] = [];
      }
      groupedReasons[type][reason.category].push({
        id: reason.id,
        text: reason.reason_text,
        category: reason.category,
        displayMessage: reason.default_display_message,
        contactEmail: reason.contact_email,
        severityLevel: reason.severity_level,
        requiresImmediate: reason.requires_immediate_action,
        deadlineHours: reason.verification_deadline_hours
      });
    });

    return res.status(200).json({
      success: true,
      reasons: groupedReasons
    });

  } catch (error) {
    console.error('Error fetching verification reasons:', error);
    return res.status(500).json({
      error: 'Failed to fetch verification reasons',
      details: error.message
    });
  }
}
