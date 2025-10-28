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
      transactionId, 
      type, 
      amount, 
      description, 
      status, 
      created_at, 
      updated_at,
      manuallyEditUpdatedAt
    } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    if (type && !VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    if (amount !== undefined && (isNaN(amount) || parseFloat(amount) <= 0)) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const { data: oldTransaction, error: fetchError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError || !oldTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const updates = {};
    
    if (type !== undefined && type !== oldTransaction.type) {
      updates.type = type;
    }
    
    if (amount !== undefined && parseFloat(amount) !== parseFloat(oldTransaction.amount)) {
      updates.amount = parseFloat(amount);
    }
    
    if (description !== undefined && description !== oldTransaction.description) {
      updates.description = description;
    }
    
    if (status !== undefined && status !== oldTransaction.status) {
      updates.status = status;
    }
    
    if (created_at !== undefined && created_at !== oldTransaction.created_at) {
      updates.created_at = created_at;
    }

    if (manuallyEditUpdatedAt && updated_at !== undefined) {
      const oldUpdatedAt = new Date(oldTransaction.updated_at).toISOString();
      const newUpdatedAt = new Date(updated_at).toISOString();
      if (oldUpdatedAt !== newUpdatedAt) {
        updates.updated_at = newUpdatedAt;
      }
    } else if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No changes detected' });
    }

    const { data: updatedTransaction, error: updateError } = await supabaseAdmin
      .from('transactions')
      .update(updates)
      .eq('id', transactionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating transaction:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    const { error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'update_transaction',
        table_name: 'transactions',
        old_data: oldTransaction,
        new_data: updatedTransaction
      });

    if (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    // Fetch updated account balance
    const { data: updatedAccount } = await supabaseAdmin
      .from('accounts')
      .select('balance, account_number')
      .eq('id', updatedTransaction.account_id)
      .single();

    return res.status(200).json({ 
      success: true, 
      transaction: updatedTransaction,
      message: 'Transaction updated successfully',
      accountBalance: updatedAccount?.balance,
      accountNumber: updatedAccount?.account_number
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
