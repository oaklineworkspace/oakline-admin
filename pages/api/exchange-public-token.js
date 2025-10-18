
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { supabase } from '../../lib/supabaseClient';

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { public_token, user_id } = req.body;

    if (!public_token) {
      return res.status(400).json({ error: 'public_token is required' });
    }

    // Exchange public token for access token
    const response = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Get institution information
    let institutionId = null;
    let institutionName = null;
    
    try {
      const itemResponse = await plaidClient.itemGet({
        access_token: accessToken,
      });
      
      institutionId = itemResponse.data.item.institution_id;
      
      if (institutionId) {
        const institutionResponse = await plaidClient.institutionsGetById({
          institution_id: institutionId,
          country_codes: ['US'],
        });
        institutionName = institutionResponse.data.institution.name;
      }
    } catch (err) {
      console.warn('Could not fetch institution details:', err.message);
    }

    // Store in Supabase if user_id is provided
    if (user_id) {
      const { data: plaidItem, error: dbError } = await supabase
        .from('plaid_items')
        .upsert({
          user_id: user_id,
          item_id: itemId,
          access_token: accessToken,
          institution_id: institutionId,
          institution_name: institutionName,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'item_id',
        })
        .select()
        .single();

      if (dbError) {
        console.error('Error storing Plaid item in database:', dbError);
        // Still return success since the token exchange worked
      }

      // Get and store account details
      try {
        const accountsResponse = await plaidClient.accountsGet({
          access_token: accessToken,
        });

        const accounts = accountsResponse.data.accounts;

        if (accounts && accounts.length > 0 && plaidItem) {
          const accountsToInsert = accounts.map(account => ({
            plaid_item_id: plaidItem.id,
            account_id: account.account_id,
            name: account.name,
            official_name: account.official_name,
            type: account.type,
            subtype: account.subtype,
            mask: account.mask,
            available_balance: account.balances?.available,
            current_balance: account.balances?.current,
            iso_currency_code: account.balances?.iso_currency_code || 'USD',
          }));

          const { error: accountsError } = await supabase
            .from('plaid_accounts')
            .upsert(accountsToInsert, {
              onConflict: 'account_id',
            });

          if (accountsError) {
            console.error('Error storing Plaid accounts:', accountsError);
          }
        }
      } catch (err) {
        console.warn('Could not fetch/store account details:', err.message);
      }
    }

    res.json({ 
      access_token: accessToken,
      item_id: itemId,
      success: true,
    });
  } catch (error) {
    console.error('Error exchanging public token:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data?.error_message || 'Unknown error',
    });
  }
}
