
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
    // First, ensure all email columns exist
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.bank_details
        ADD COLUMN IF NOT EXISTS email_security text,
        ADD COLUMN IF NOT EXISTS email_verify text,
        ADD COLUMN IF NOT EXISTS email_crypto text;
      `
    }).catch(() => {
      // If rpc doesn't exist, try direct query
      console.log('Using direct query for column creation');
    });

    const { data: bankDetails, error } = await supabaseAdmin
      .from('bank_details')
      .select('*')
      .eq('name', 'Oakline Bank')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

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
        email_info: 'info@theoaklinebank.com',
        email_contact: 'contact-us@theoaklinebank.com',
        email_support: 'support@theoaklinebank.com',
        email_loans: 'loans@theoaklinebank.com',
        email_notify: 'notify@theoaklinebank.com',
        email_updates: 'updates@theoaklinebank.com',
        email_welcome: 'welcome@theoaklinebank.com',
        email_security: 'security@theoaklinebank.com',
        email_verify: 'verify@theoaklinebank.com',
        email_crypto: 'crypto@theoaklinebank.com',
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
