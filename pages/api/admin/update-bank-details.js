
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const {
      name,
      branch_name,
      address,
      phone,
      fax,
      website,
      logo_url,
      customer_service_hours,
      additional_info,
      email_info,
      email_contact,
      email_support,
      email_loans,
      email_notify,
      email_updates,
      email_welcome,
      email_security,
      email_verify,
      email_crypto,
      routing_number,
      swift_code,
      nmls_id
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Bank name is required' });
    }

    const updateData = {
      name,
      branch_name,
      address,
      phone,
      fax,
      website,
      logo_url,
      customer_service_hours,
      additional_info,
      email_info,
      email_contact,
      email_support,
      email_loans,
      email_notify,
      email_updates,
      email_welcome,
      email_security,
      email_verify,
      email_crypto,
      routing_number,
      swift_code,
      nmls_id,
      updated_at: new Date().toISOString()
    };

    // Check if bank details exist
    const { data: existing } = await supabaseAdmin
      .from('bank_details')
      .select('id')
      .eq('name', 'Oakline Bank')
      .single();

    let result;
    if (existing) {
      // Update existing record
      const { data, error } = await supabaseAdmin
        .from('bank_details')
        .update(updateData)
        .eq('name', 'Oakline Bank')
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new record
      const { data, error } = await supabaseAdmin
        .from('bank_details')
        .insert([updateData])
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return res.status(200).json({
      success: true,
      bankDetails: result,
      message: 'Bank details updated successfully'
    });
  } catch (error) {
    console.error('Error updating bank details:', error);
    return res.status(500).json({
      error: 'Failed to update bank details',
      details: error.message
    });
  }
}
