import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

const VALID_STATUSES = ['pending', 'completed', 'failed', 'hold', 'cancelled', 'reversed'];
const VALID_TYPES = ['credit', 'debit', 'deposit', 'withdrawal', 'transfer', 'crypto_deposit', 'loan_disbursement', 'treasury_credit', 'treasury_debit', 'wire_transfer', 'check_deposit', 'atm_withdrawal', 'debit_card', 'transfer_in', 'transfer_out', 'ach_transfer', 'check_payment', 'service_fee', 'refund', 'interest', 'bonus', 'other'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  const user = authResult.user;

  try {
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

    if (amount !== undefined && isNaN(amount)) {
      return res.status(400).json({ error: 'Amount must be a valid number' });
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
    
    // Build updates object - always include fields that are provided
    if (type !== undefined) {
      updates.type = type;
    }
    
    if (amount !== undefined) {
      updates.amount = parseFloat(amount);
    }
    
    if (description !== undefined) {
      updates.description = description;
    }
    
    if (status !== undefined) {
      updates.status = status;
    }
    
    if (created_at !== undefined) {
      updates.created_at = new Date(created_at).toISOString();
    }

    // Handle updated_at timestamp
    if (manuallyEditUpdatedAt && updated_at !== undefined) {
      // Admin manually changed the updated_at timestamp
      updates.updated_at = new Date(updated_at).toISOString();
    } else {
      // Auto-update to current time when saving
      updates.updated_at = new Date().toISOString();
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
