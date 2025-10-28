import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const VALID_STATUSES = ['pending', 'completed', 'failed', 'hold', 'cancelled', 'reversed'];
const VALID_TYPES = ['credit', 'debit'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('admin_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (adminError || !adminProfile) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { 
      user_id,
      account_id, 
      type, 
      amount, 
      description, 
      status 
    } = req.body;

    if (!account_id || !type || !amount) {
      return res.status(400).json({ error: 'account_id, type, and amount are required' });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('user_id')
      .eq('id', account_id)
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const transactionData = {
      user_id: user_id || account.user_id,
      account_id,
      type,
      amount: parseFloat(amount),
      description: description || null,
      status: status || 'pending'
    };

    const { data: newTransaction, error: insertError } = await supabaseAdmin
      .from('transactions')
      .insert(transactionData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating transaction:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    const { error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'create_transaction',
        table_name: 'transactions',
        old_data: null,
        new_data: newTransaction
      });

    if (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return res.status(201).json({ 
      success: true, 
      transaction: newTransaction,
      message: 'Transaction created successfully'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
