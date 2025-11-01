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
    const { status } = req.query;

    let query = supabaseAdmin
      .from('crypto_deposits')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      if (status === 'verifying') {
        query = query.eq('status', 'pending').not('confirmed_at', 'is', null);
      } else {
        query = query.eq('status', status);
      }
    }

    const { data: deposits, error } = await query;

    if (error) {
      console.error('Error fetching crypto deposits:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch crypto deposits',
        details: error.message 
      });
    }

    // Fetch user emails from profiles table
    const userIds = [...new Set(deposits.map(d => d.user_id).filter(Boolean))];
    let userEmailMap = {};

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .in('id', userIds);
      
      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
        return res.status(500).json({ 
          error: 'Failed to fetch user profiles',
          details: profilesError.message 
        });
      }

      profiles.forEach(profile => {
        userEmailMap[profile.id] = profile.email;
      });
    }

    const enrichedDeposits = deposits.map(deposit => ({
      ...deposit,
      user_email: userEmailMap[deposit.user_id] || 'Unknown'
    }));

    const summary = {
      total: deposits.length,
      pending: deposits.filter(d => d.status === 'pending' && !d.confirmed_at).length,
      verifying: deposits.filter(d => d.status === 'pending' && d.confirmed_at).length,
      confirmed: deposits.filter(d => d.status === 'confirmed').length,
      rejected: deposits.filter(d => d.status === 'rejected').length,
      reversed: deposits.filter(d => d.status === 'reversed').length,
      totalPendingAmount: deposits
        .filter(d => d.status === 'pending')
        .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0)
    };

    return res.status(200).json({ 
      success: true,
      deposits: enrichedDeposits,
      summary
    });

  } catch (error) {
    console.error('Error in get-crypto-deposits API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
