import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGet(req, res) {
  try {
    const { status = 'pending', search = '' } = req.query;

    let query = supabaseAdmin
      .from('linked_bank_accounts')
      .select(`
        id,
        user_id,
        account_holder_name,
        bank_name,
        account_number,
        routing_number,
        account_type,
        swift_code,
        iban,
        bank_address,
        is_primary,
        is_verified,
        status,
        verification_deposits_sent_at,
        verification_amount_1,
        verification_amount_2,
        verified_at,
        created_at,
        updated_at,
        users (
          id,
          email,
          profiles (
            id,
            first_name,
            last_name,
            phone
          )
        )
      `);

    // Filter by status
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: accounts, error } = await query;

    if (error) {
      console.error('Error fetching accounts:', error);
      return res.status(500).json({ error: error.message });
    }

    // Apply search filter
    let filteredAccounts = accounts || [];
    if (search) {
      const searchLower = search.toLowerCase();
      filteredAccounts = filteredAccounts.filter(account => {
        return (
          account.account_holder_name?.toLowerCase().includes(searchLower) ||
          account.account_number?.slice(-4).includes(search) ||
          account.users?.email?.toLowerCase().includes(searchLower) ||
          account.bank_name?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Calculate statistics
    const statistics = {
      total: accounts?.length || 0,
      pending: accounts?.filter(a => a.status === 'pending').length || 0,
      active: accounts?.filter(a => a.status === 'active').length || 0,
      rejected: accounts?.filter(a => a.status === 'deleted').length || 0
    };

    return res.status(200).json({
      success: true,
      accounts: filteredAccounts,
      statistics
    });
  } catch (error) {
    console.error('Error in linked-bank-accounts GET:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handlePost(req, res) {
  try {
    const { account_id, action, rejection_reason } = req.body;

    if (!account_id || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let updateData = {};

    if (action === 'approve') {
      updateData = {
        status: 'active',
        is_verified: true,
        verified_at: new Date().toISOString()
      };
    } else if (action === 'reject') {
      updateData = {
        status: 'deleted',
        is_verified: false,
        metadata: {
          rejection_reason,
          rejected_at: new Date().toISOString()
        }
      };
    } else if (action === 'suspend') {
      updateData = {
        status: 'suspended'
      };
    } else if (action === 'reactivate') {
      updateData = {
        status: 'active'
      };
    } else if (action === 'delete') {
      updateData = {
        status: 'deleted'
      };
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const { data, error } = await supabaseAdmin
      .from('linked_bank_accounts')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', account_id)
      .select();

    if (error) {
      console.error('Error updating account:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      message: `Account ${action}ed successfully`,
      account: data[0]
    });
  } catch (error) {
    console.error('Error in linked-bank-accounts POST:', error);
    return res.status(500).json({ error: error.message });
  }
}
