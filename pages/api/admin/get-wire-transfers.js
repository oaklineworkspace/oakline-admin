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
    const { data: wireTransfers, error: transfersError } = await supabaseAdmin
      .from('wire_transfers')
      .select(`
        *,
        accounts!wire_transfers_from_account_id_fkey(id, account_number, account_type, user_id, application_id)
      `)
      .order('created_at', { ascending: false });

    if (transfersError) {
      console.error('Error fetching wire transfers:', transfersError);
      return res.status(500).json({ error: 'Failed to fetch wire transfers', details: transfersError.message });
    }

    if (!wireTransfers || wireTransfers.length === 0) {
      return res.status(200).json({
        success: true,
        wireTransfers: []
      });
    }

    const userIds = [...new Set(wireTransfers.map(t => t.user_id).filter(Boolean))];
    const applicationIds = [...new Set(wireTransfers.map(t => t.accounts?.application_id).filter(Boolean))];

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name')
      .in('id', userIds);

    const { data: applications } = await supabaseAdmin
      .from('applications')
      .select('id, email, first_name, last_name, phone, country')
      .in('id', applicationIds);

    const profileMap = (profiles || []).reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});

    const applicationMap = (applications || []).reduce((acc, app) => {
      acc[app.id] = app;
      return acc;
    }, {});

    const enrichedTransfers = wireTransfers.map(transfer => {
      const profile = profileMap[transfer.user_id] || {};
      const application = transfer.accounts?.application_id ? applicationMap[transfer.accounts.application_id] : {};
      
      return {
        ...transfer,
        user_email: profile.email || application.email || 'N/A',
        user_name: profile.first_name && profile.last_name 
          ? `${profile.first_name} ${profile.last_name}`
          : application.first_name && application.last_name
          ? `${application.first_name} ${application.last_name}`
          : 'Unknown User',
        user_phone: application.phone || 'N/A',
        user_country: application.country || 'N/A'
      };
    });

    return res.status(200).json({
      success: true,
      wireTransfers: enrichedTransfers
    });
  } catch (error) {
    console.error('Error in get-wire-transfers:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
