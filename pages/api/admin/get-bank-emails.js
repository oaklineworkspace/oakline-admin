import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminUserId = await verifyAdminAuth(req);
    if (!adminUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabaseAdmin
      .from('bank_details')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching bank details:', error);
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      return res.status(200).json({ emails: [] });
    }

    const emails = [];
    // Add all email fields from bank_details, filtering out nulls and duplicates
    const emailFields = [
      'email_info',
      'email_contact',
      'email_security',
      'email_support',
      'email_crypto',
      'email_loans',
      'email_verify',
      'email_notify',
      'email_updates',
      'email_welcome'
    ];

    emailFields.forEach(field => {
      if (data[field]) {
        emails.push(data[field]);
      }
    });

    // Remove duplicates while preserving order
    const uniqueEmails = [...new Set(emails)];

    res.status(200).json({ 
      emails: uniqueEmails,
      message: 'Bank emails fetched successfully'
    });
  } catch (err) {
    console.error('Get bank emails error:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to fetch bank emails',
      details: { message: err.message }
    });
  }
}
