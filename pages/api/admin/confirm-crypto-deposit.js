import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authUser) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('admin_profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (adminError || !adminProfile) {
      return res.status(403).json({ error: 'Forbidden: Not an admin' });
    }

    const { depositId } = req.body;

    if (!depositId) {
      return res.status(400).json({ error: 'Deposit ID is required' });
    }

    const { data: deposit, error: depositError } = await supabaseAdmin
      .from('crypto_deposits')
      .select('*')
      .eq('id', depositId)
      .single();

    if (depositError || !deposit) {
      console.error('Error fetching deposit:', depositError);
      return res.status(404).json({ error: 'Deposit not found' });
    }

    if (deposit.status !== 'pending') {
      return res.status(400).json({ 
        error: `Deposit has already been ${deposit.status}` 
      });
    }

    if (deposit.confirmed_at) {
      return res.status(400).json({ 
        error: 'Deposit has already been confirmed' 
      });
    }

    const { error: confirmError } = await supabaseAdmin
      .from('crypto_deposits')
      .update({ 
        confirmed_at: new Date().toISOString(),
        confirmations: (deposit.confirmations || 0) + 1
      })
      .eq('id', depositId);

    if (confirmError) {
      console.error('Error confirming deposit:', confirmError);
      return res.status(500).json({ error: 'Failed to confirm deposit' });
    }

    return res.status(200).json({ 
      success: true,
      message: 'Deposit confirmed successfully'
    });

  } catch (error) {
    console.error('Error in confirm-crypto-deposit:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
