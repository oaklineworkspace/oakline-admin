import { supabase } from '../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Helper function to verify admin authentication
async function verifyAdminAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header', status: 401 };
  }

  const token = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    console.error('Auth error:', authError);
    return { error: 'Unauthorized', status: 401 };
  }

  const { data: adminProfile, error: adminError } = await supabaseAdmin
    .from('admin_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (adminError || !adminProfile) {
    return { error: 'Admin access required', status: 403 };
  }

  return { user, adminProfile };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { action_type } = req.query;

    // Fetch bank details to get all available emails
    const { data: bankDetails } = await supabaseAdmin
      .from('bank_details')
      .select('email_info, email_contact, email_support, email_security, email_verify, email_crypto, email_loans, email_notify, email_updates, email_welcome')
      .limit(1)
      .single();

    let query = supabaseAdmin
      .from('account_restriction_reasons')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('display_order', { ascending: true });

    if (action_type) {
      query = query.eq('action_type', action_type);
    }

    const { data: reasons, error } = await query;

    if (error) {
      console.error('Error fetching restriction reasons:', error);
      return res.status(500).json({
        error: 'Failed to fetch restriction reasons',
        details: error.message
      });
    }

    const groupedReasons = {};

    reasons.forEach(reason => {
      if (!groupedReasons[reason.action_type]) {
        groupedReasons[reason.action_type] = {};
      }

      if (!groupedReasons[reason.action_type][reason.category]) {
        groupedReasons[reason.action_type][reason.category] = [];
      }

      // Map the reason's contact_email to the appropriate bank email based on action_type and category
      let mappedContactEmail = reason.contact_email; // Default to existing contact_email
      if (bankDetails) {
        switch (reason.action_type) {
          case 'BLOCK_ACCOUNT':
            switch (reason.category) {
              case 'SECURITY':
                mappedContactEmail = bankDetails.email_security || mappedContactEmail;
                break;
              case 'VERIFICATION':
                mappedContactEmail = bankDetails.email_verify || mappedContactEmail;
                break;
              default:
                mappedContactEmail = bankDetails.email_support || mappedContactEmail;
            }
            break;
          case 'TRANSACTION_LIMIT':
            switch (reason.category) {
              case 'CRYPTO':
                mappedContactEmail = bankDetails.email_crypto || mappedContactEmail;
                break;
              case 'LOANS':
                mappedContactEmail = bankDetails.email_loans || mappedContactEmail;
                break;
              default:
                mappedContactEmail = bankDetails.email_contact || mappedContactEmail;
            }
            break;
          case 'IDENTITY_VERIFICATION':
            mappedContactEmail = bankDetails.email_verify || mappedContactEmail;
            break;
          case 'INACTIVITY':
            mappedContactEmail = bankDetails.email_notify || mappedContactEmail;
            break;
          case 'FRAUD_ALERT':
            mappedContactEmail = bankDetails.email_security || mappedContactEmail;
            break;
          default:
            mappedContactEmail = bankDetails.email_info || mappedContactEmail;
        }
      }


      groupedReasons[reason.action_type][reason.category].push({
        id: reason.id,
        text: reason.reason_text,
        severity: reason.severity_level,
        requiresImmediateAction: reason.requires_immediate_action,
        contactEmail: mappedContactEmail,
        displayMessage: reason.restriction_display_message || reason.reason_text
      });
    });

    return res.status(200).json({
      success: true,
      reasons: action_type ? groupedReasons[action_type] : groupedReasons,
      totalReasons: reasons.length,
      bankEmails: {
        info: bankDetails?.email_info || 'info@theoaklinebank.com',
        contact: bankDetails?.email_contact || 'contact-us@theoaklinebank.com',
        support: bankDetails?.email_support || 'support@theoaklinebank.com',
        security: bankDetails?.email_security || 'security@theoaklinebank.com',
        verify: bankDetails?.email_verify || 'verify@theoaklinebank.com',
        crypto: bankDetails?.email_crypto || 'crypto@theoaklinebank.com',
        loans: bankDetails?.email_loans || 'loans@theoaklinebank.com',
        notify: bankDetails?.email_notify || 'notify@theoaklinebank.com',
        updates: bankDetails?.email_updates || 'updates@theoaklinebank.com',
        welcome: bankDetails?.email_welcome || 'welcome@theoaklinebank.com'
      }
    });
  } catch (error) {
    console.error('Server error in get-restriction-reasons:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}