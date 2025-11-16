
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
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Fetch user auth data
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authError) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch application
    const { data: application } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Fetch profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Fetch accounts
    const { data: accounts } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Fetch cards
    const { data: cards } = await supabaseAdmin
      .from('cards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Fetch loans
    const { data: loans } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Fetch transactions (recent 20)
    const { data: transactions } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Fetch login history (recent 10)
    const { data: login_history } = await supabaseAdmin
      .from('login_history')
      .select('*')
      .eq('user_id', userId)
      .order('login_time', { ascending: false })
      .limit(10);

    // Fetch check deposits
    const { data: check_deposits } = await supabaseAdmin
      .from('check_deposits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Fetch crypto deposits
    const { data: crypto_deposits } = await supabaseAdmin
      .from('crypto_deposits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Fetch account opening deposits
    const { data: account_opening_deposits } = await supabaseAdmin
      .from('account_opening_crypto_deposits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Fetch loan payments
    const { data: loan_payments } = await supabaseAdmin
      .from('loan_payments')
      .select('*')
      .in('loan_id', (loans || []).map(l => l.id))
      .order('created_at', { ascending: false });

    // Fetch crypto investments
    const { data: crypto_investments } = await supabaseAdmin
      .from('crypto_investments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Fetch notifications
    const { data: notifications } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    return res.status(200).json({
      success: true,
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        created_at: authUser.user.created_at
      },
      application,
      profile,
      accounts: accounts || [],
      cards: cards || [],
      loans: loans || [],
      transactions: transactions || [],
      login_history: login_history || [],
      check_deposits: check_deposits || [],
      crypto_deposits: crypto_deposits || [],
      account_opening_deposits: account_opening_deposits || [],
      loan_payments: loan_payments || [],
      crypto_investments: crypto_investments || [],
      notifications: notifications || []
    });
  } catch (error) {
    console.error('Error fetching user timestamps:', error);
    return res.status(500).json({
      error: 'Failed to fetch user timestamps',
      details: error.message
    });
  }
}
