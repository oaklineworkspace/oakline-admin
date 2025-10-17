import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    console.log('Fetching cards for user:', user.id, 'Email:', user.email);

    // Find the user profile in applications table
    const { data: userProfile, error: profileError } = await supabase
      .from('applications')
      .select('*')
      .eq('email', user.email)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', profileError);
    }

    console.log('Found user profile:', userProfile ? 'Yes' : 'No');

    // Get active accounts linked to user (either via user_id or application_id)
    let userAccounts = [];
    if (userProfile?.id) {
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .or(`user_id.eq.${user.id},application_id.eq.${userProfile.id}`)
        .eq('status', 'active');

      if (accountsError) {
        console.error('Error fetching accounts:', accountsError);
      } else {
        userAccounts = accountsData || [];
      }
    }

    console.log('Found accounts:', userAccounts.length);

    const accountIds = userAccounts.map(acc => acc.id);

    // Fetch cards linked to user
    const { data: cardsData, error: cardsError } = await supabase
      .from('cards')
      .select(`
        *,
        accounts!inner (
          id,
          account_number,
          account_type,
          balance,
          user_id
        )
      `)
      .or(`user_id.eq.${user.id},account_id.in.(${accountIds.join(',')})`)
      .eq('status', 'active');

    if (cardsError) {
      console.error('Error fetching cards:', cardsError);
    }

    const safeCards = (cardsData || []).map(card => ({
      ...card,
      card_number: card.card_number ? `****-****-****-${card.card_number.slice(-4)}` : '****-****-****-0000',
      cvv: undefined,
      pin_hash: undefined
    }));

    // Fetch card applications linked to user
    const { data: applicationsData, error: appsError } = await supabase
      .from('card_applications')
      .select(`
        *,
        accounts (
          id,
          account_number,
          account_type,
          balance,
          user_id
        )
      `)
      .or(`user_id.eq.${user.id},account_id.in.(${accountIds.join(',')})`)
      .order('requested_at', { ascending: false });

    if (appsError) {
      console.error('Error fetching card applications:', appsError);
    }

    console.log('Found applications:', applicationsData.length);

    res.status(200).json({
      success: true,
      cards: safeCards,
      applications: applicationsData || [],
      userProfile
    });

  } catch (error) {
    console.error('Error fetching user cards:', error);
    res.status(500).json({ error: `Failed to load cards: ${error.message}` });
  }
}
