import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const { data: transaction, error: fetchError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError || !transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('balance')
      .eq('id', transaction.account_id)
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const currentBalance = parseFloat(account.balance || 0);
    let newBalance = currentBalance;
    const amount = parseFloat(transaction.amount);
    
    const unsafeDeletionTypes = [
      'transfer', 'transfer_in', 'transfer_out', 'treasury_transfer',
      'loan_disbursement', 'loan_payment', 'ach_transfer'
    ];
    
    if (unsafeDeletionTypes.includes(transaction.type)) {
      return res.status(400).json({ 
        error: `Cannot delete '${transaction.type}' transactions as they involve paired entries or linked records. Please use the reverse transaction feature instead.` 
      });
    }
    
    if (transaction.status === 'completed') {
      const creditTypes = [
        'credit', 'deposit', 'crypto_deposit', 'treasury_credit', 
        'deposit_adjust', 'refund', 'interest', 'bonus', 'interest_accrual'
      ];
      
      const debitTypes = [
        'debit', 'withdrawal', 'treasury_debit', 'atm_withdrawal', 
        'debit_card', 'check_payment', 'service_fee', 'fee', 'chargeback'
      ];
      
      if (creditTypes.includes(transaction.type)) {
        newBalance = currentBalance - amount;
      } else if (debitTypes.includes(transaction.type)) {
        newBalance = currentBalance + amount;
      } else {
        return res.status(400).json({ 
          error: `Unsupported transaction type '${transaction.type}'. Please use the reverse transaction feature or contact support.` 
        });
      }

      if (newBalance < 0) {
        return res.status(400).json({ 
          error: 'Cannot delete: Would result in negative account balance',
          details: `Current: $${currentBalance.toFixed(2)}, After deletion: $${newBalance.toFixed(2)}`
        });
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from('transactions')
      .delete()
      .eq('id', transactionId);

    if (deleteError) {
      throw new Error('Failed to delete transaction: ' + deleteError.message);
    }

    if (transaction.status === 'completed') {
      const { error: updateError } = await supabaseAdmin
        .from('accounts')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', transaction.account_id);

      if (updateError) {
        await supabaseAdmin
          .from('transactions')
          .insert(transaction);
        throw new Error('Failed to update account balance. Transaction deletion rolled back.');
      }
    }

    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'DELETE',
        table_name: 'transactions',
        old_data: transaction
      });

    return res.status(200).json({ 
      success: true, 
      message: 'Transaction deleted successfully'
    });

  } catch (error) {
    console.error('Delete transaction error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
