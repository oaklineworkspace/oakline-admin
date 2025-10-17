
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Get user's accounts using multiple approaches
    let accounts = [];
    
    // Try by user_id first
    const { data: accountsByUserId, error: accountsError1 } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id);

    if (accountsByUserId && accountsByUserId.length > 0) {
      accounts = accountsByUserId;
    } else {
      // Try by email if user_id doesn't work
      const { data: accountsByEmail, error: accountsError2 } = await supabase
        .from('accounts')
        .select('*')
        .eq('email', user.email);

      if (accountsByEmail && accountsByEmail.length > 0) {
        accounts = accountsByEmail;
      }
    }

    console.log('Found accounts for user:', accounts.length);

    // Get user's cards using multiple approaches
    let cards = [];
    
    // First, try by user_id
    const { data: cardsByUserId, error: cardsError1 } = await supabase
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
      .eq('user_id', user.id);

    console.log('Cards by user_id:', cardsByUserId, 'Error:', cardsError1);

    if (cardsByUserId && cardsByUserId.length > 0) {
      cards = cardsByUserId;
    } else if (accounts.length > 0) {
      // Try by account_id if user has accounts
      const accountIds = accounts.map(acc => acc.id);
      const { data: cardsByAccountId, error: cardsError2 } = await supabase
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
        .in('account_id', accountIds);

      console.log('Cards by account_id:', cardsByAccountId, 'Error:', cardsError2);

      if (cardsByAccountId && cardsByAccountId.length > 0) {
        cards = cardsByAccountId;
      }
    }

    // Also try a simple query without joins
    if (cards.length === 0) {
      const { data: simpleCards, error: simpleError } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', user.id);

      console.log('Simple cards query:', simpleCards, 'Error:', simpleError);

      if (simpleCards && simpleCards.length > 0) {
        // Get account details separately
        for (let card of simpleCards) {
          const { data: accountData } = await supabase
            .from('accounts')
            .select('*')
            .eq('id', card.account_id)
            .single();
          
          if (accountData) {
            card.accounts = accountData;
          }
        }
        cards = simpleCards;
      }
    }

    console.log('Found cards for user:', cards.length);

    // Get card applications using multiple approaches
    let applications = [];
    
    // Try by user_id first
    const { data: appsByUserId, error: applicationsError1 } = await supabase
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
      .eq('user_id', user.id);

    if (appsByUserId && appsByUserId.length > 0) {
      applications = appsByUserId;
    } else if (accounts.length > 0) {
      // Try by account_id if user has accounts
      const accountIds = accounts.map(acc => acc.id);
      const { data: appsByAccountId, error: applicationsError2 } = await supabase
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
        .in('account_id', accountIds);

      if (appsByAccountId && appsByAccountId.length > 0) {
        applications = appsByAccountId;
      }
    }

    console.log('Found applications for user:', applications.length);

    return res.status(200).json({
      success: true,
      cards: cards || [],
      applications: applications || [],
      accounts: accounts || []
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
