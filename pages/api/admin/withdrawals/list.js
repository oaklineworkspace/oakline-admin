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

  const { statusFilter, methodFilter, searchTerm, dateRange, userFilter } = req.body;

  try {
    // First, fetch all withdrawals
    const { data: withdrawals, error: withdrawalsError } = await supabaseAdmin
      .from('withdrawals')
      .select('*')
      .order('created_at', { ascending: false });

    if (withdrawalsError) {
      console.error('Database error fetching withdrawals:', withdrawalsError);
      return res.status(500).json({ error: 'Failed to fetch withdrawals', details: withdrawalsError.message });
    }

    if (!withdrawals || withdrawals.length === 0) {
      return res.status(200).json({
        withdrawals: [],
        count: 0
      });
    }

    // Get unique user IDs
    const userIds = [...new Set(withdrawals.map(w => w.user_id).filter(Boolean))];

    let enrichedWithdrawals = withdrawals;

    // Fetch applications for these users
    if (userIds.length > 0) {
      const { data: applications, error: appsError } = await supabaseAdmin
        .from('applications')
        .select('id, user_id, first_name, last_name, email')
        .in('user_id', userIds);

      if (!appsError && applications) {
        const appMap = {};
        applications.forEach(app => {
          appMap[app.user_id] = app;
        });

        enrichedWithdrawals = withdrawals.map(w => ({
          ...w,
          applications: appMap[w.user_id] || null
        }));
      }

      // Fetch accounts for these users to get account numbers
      const { data: accounts, error: accountsError } = await supabaseAdmin
        .from('accounts')
        .select('id, user_id, account_number')
        .in('user_id', userIds);

      if (!accountsError && accounts) {
        const accountMap = {};
        accounts.forEach(acc => {
          if (!accountMap[acc.user_id]) {
            accountMap[acc.user_id] = [];
          }
          accountMap[acc.user_id].push(acc);
        });

        enrichedWithdrawals = enrichedWithdrawals.map(w => ({
          ...w,
          accounts: accountMap[w.user_id]?.[0] || null
        }));
      }
    }

    // Apply filters
    let filtered = enrichedWithdrawals;

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(w => w.status === statusFilter);
    }

    // Method filter
    if (methodFilter && methodFilter !== 'all') {
      filtered = filtered.filter(w => w.withdrawal_method === methodFilter);
    }

    // User filter
    if (userFilter && userFilter !== 'all') {
      filtered = filtered.filter(w => w.user_id === userFilter);
    }

    // Date range filter
    if (dateRange && dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start).toISOString();
      const end = new Date(dateRange.end).toISOString();
      filtered = filtered.filter(w => {
        const wDate = new Date(w.created_at).toISOString();
        return wDate >= start && wDate <= end;
      });
    }

    // Search filter
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
