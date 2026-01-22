import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { status, userId } = req.query;

    let query = supabaseAdmin
      .from('accounts')
      .select(`
        *,
        user_id,
        application_id,
        applications (
          id,
          first_name,
          last_name,
          email,
          account_types
        )
      `)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    // For card issuance, always filter by active status if not explicitly set
    if (!status) {
      query = query.eq('status', 'active');
    } else if (status) {
      query = query.eq('status', status);
    }

    const { data: accounts, error } = await query;

    if (error) {
      console.error('Error fetching accounts:', error);
      return res.status(500).json({ error: 'Failed to fetch accounts' });
    }

    const filteredAccounts = accounts || [];

    console.log(`Fetched ${filteredAccounts.length} active accounts for userId: ${userId}`);

    return res.status(200).json({
      success: true,
      accounts: filteredAccounts
    });
  } catch (error) {
    console.error('Error in get-accounts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}