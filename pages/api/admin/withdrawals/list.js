import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  const { statusFilter, methodFilter, searchTerm, dateRange } = req.body;

  try {
    let query = supabaseAdmin
      .from('withdrawals')
      .select(`
        *,
        accounts (account_number, user_id),
        applications!withdrawals_user_id_fkey (first_name, last_name, email)
      `)
      .order('created_at', { ascending: false });

    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    // Apply method filter
    if (methodFilter && methodFilter !== 'all') {
      query = query.eq('withdrawal_method', methodFilter);
    }

    // Apply date range filter
    if (dateRange && dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start).toISOString();
      const end = new Date(dateRange.end).toISOString();
      query = query.gte('created_at', start).lte('created_at', end);
    }

    const { data: withdrawals, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch withdrawals', details: error.message });
    }

    // Apply search filter (client-side since it's complex)
    let filtered = withdrawals || [];
    if (searchTerm) {
      filtered = filtered.filter(w => 
        w.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.accounts?.account_number?.includes(searchTerm) ||
        w.applications?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.applications?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.applications?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return res.status(200).json({
      withdrawals: filtered,
      count: filtered.length
    });

  } catch (error) {
    console.error('Error listing withdrawals:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
