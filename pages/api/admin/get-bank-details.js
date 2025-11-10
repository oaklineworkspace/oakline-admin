
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
    const { data: bankDetails, error } = await supabaseAdmin
      .from('bank_details')
      .select('*')
      .eq('name', 'Oakline Bank')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const emailDomain = process.env.BANK_EMAIL_DOMAIN || 'theoaklinebank.com';
    
    return res.status(200).json({
      success: true,
      bankDetails: bankDetails || {
        name: 'Oakline Bank',
        branch_name: 'Oklahoma City Branch',
        address: '12201 N May Avenue, Oklahoma City, OK 73120, United States',
        phone: '+1 (636) 635-6122',
        fax: '',
        website: '',
        logo_url: '',
        customer_service_hours: '',
        additional_info: '',
        email_info: `info@${emailDomain}`,
        email_contact: `contact-us@${emailDomain}`,
        email_support: `support@${emailDomain}`,
        email_loans: `loans@${emailDomain}`,
        email_notify: `notify@${emailDomain}`,
        email_updates: `updates@${emailDomain}`,
        email_welcome: `welcome@${emailDomain}`,
        email_security: `security@${emailDomain}`,
        email_verify: `verify@${emailDomain}`,
        email_crypto: `crypto@${emailDomain}`,
        routing_number: '075915826',
        swift_code: 'OAKLUS33',
        nmls_id: '574160'
      }
    });
  } catch (error) {
    console.error('Error fetching bank details:', error);
    return res.status(500).json({
      error: 'Failed to fetch bank details',
      details: error.message
    });
  }
}
