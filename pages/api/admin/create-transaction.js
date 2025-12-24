import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const VALID_STATUSES = ['pending', 'completed', 'failed', 'hold', 'cancelled', 'reversed'];
const VALID_TYPES = ['credit', 'debit', 'deposit', 'withdrawal', 'transfer', 'crypto_deposit', 'loan_disbursement', 'treasury_credit', 'treasury_debit', 'wire_transfer', 'check_deposit', 'atm_withdrawal', 'debit_card', 'transfer_in', 'transfer_out', 'ach_transfer', 'check_payment', 'service_fee', 'refund', 'interest', 'bonus', 'other'];

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
    
    let user;
    try {
      const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !authUser) {
        throw new Error('Invalid token');
      }
      user = authUser;
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError.message);
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
      status,
      created_at,
      updated_at,
      recurring,
      startMonth,
      endMonth,
      startYear,
      endYear,
      twiceMonthlyDay1,
      twiceMonthlyDay2
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

    // Handle twice-monthly recurring transactions
    if (recurring === 'twice-monthly' && startYear && endYear && startMonth && endMonth && twiceMonthlyDay1 && twiceMonthlyDay2) {
      const transactions = [];
      
      const startYearNum = parseInt(startYear);
      const endYearNum = parseInt(endYear);
      const startMonthNum = parseInt(startMonth);
      const endMonthNum = parseInt(endMonth);
      const day1 = parseInt(twiceMonthlyDay1);
      const day2 = parseInt(twiceMonthlyDay2);
      
      // Create transactions for each month in the year and month range
      for (let year = startYearNum; year <= endYearNum; year++) {
        for (let month = 1; month <= 12; month++) {
          // Skip if month is before start month (in start year) or after end month (in end year)
          if (year === startYearNum && month < startMonthNum) continue;
          if (year === endYearNum && month > endMonthNum) continue;
          
          // Create first transaction (day1)
          const transactionDate1 = new Date(year, month - 1, day1, 12, 0, 0, 0);
          
          const transactionData1 = {
            user_id: user_id || account.user_id,
            account_id,
            type,
            amount: parseFloat(amount),
            description: description || null,
            status: status || 'pending',
            created_at: transactionDate1.toISOString(),
            updated_at: (updated_at || transactionDate1.toISOString())
          };
          
          transactions.push(transactionData1);
          
          // Create second transaction (day2)
          const transactionDate2 = new Date(year, month - 1, day2, 12, 0, 0, 0);
          
          const transactionData2 = {
            user_id: user_id || account.user_id,
            account_id,
            type,
            amount: parseFloat(amount),
            description: description || null,
            status: status || 'pending',
            created_at: transactionDate2.toISOString(),
            updated_at: (updated_at || transactionDate2.toISOString())
          };
          
          transactions.push(transactionData2);
        }
      }
      
      // Insert all transactions
      const { data: newTransactions, error: insertError } = await supabaseAdmin
        .from('transactions')
        .insert(transactions)
        .select();

      if (insertError) {
        console.error('Error creating twice-monthly transactions:', insertError);
        return res.status(500).json({ error: insertError.message });
      }

      // Log audit entry
      const { error: auditError } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'create_twice_monthly_recurring_transactions',
          table_name: 'transactions',
          old_data: null,
          new_data: { 
            count: newTransactions.length, 
            startYear, 
            endYear, 
            day1: twiceMonthlyDay1, 
            day2: twiceMonthlyDay2, 
            recurring: 'twice-monthly' 
          }
        });

      if (auditError) {
        console.error('Error creating audit log:', auditError);
      }

      return res.status(201).json({ 
        success: true, 
        transactions: newTransactions,
        count: newTransactions.length,
        recurring: 'twice-monthly'
      });
    }

    // Handle monthly recurring transactions
    if (recurring === 'monthly' && startMonth && endMonth) {
      const baseDate = created_at ? new Date(created_at) : new Date();
      const transactions = [];
      
      const startMonthNum = parseInt(startMonth);
      const endMonthNum = parseInt(endMonth);
      
      // Create transactions for each month in 2024 and 2025
      for (let year = 2024; year <= 2025; year++) {
        for (let month = 1; month <= 12; month++) {
          // Skip if month is before start month (in year 2024) or after end month (in year 2025)
          if (year === 2024 && month < startMonthNum) continue;
          if (year === 2025 && month > endMonthNum) continue;
          
          const transactionDate = new Date(year, month - 1, 15, 12, 0, 0, 0);
          
          const transactionData = {
            user_id: user_id || account.user_id,
            account_id,
            type,
            amount: parseFloat(amount),
            description: description || null,
            status: status || 'pending',
            created_at: transactionDate.toISOString(),
            updated_at: (updated_at || transactionDate.toISOString())
          };
          
          transactions.push(transactionData);
        }
      }
      
      // Insert all transactions
      const { data: newTransactions, error: insertError } = await supabaseAdmin
        .from('transactions')
        .insert(transactions)
        .select();

      if (insertError) {
        console.error('Error creating monthly transactions:', insertError);
        return res.status(500).json({ error: insertError.message });
      }

      // Log audit entry
      const { error: auditError } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'create_monthly_recurring_transactions',
          table_name: 'transactions',
          old_data: null,
          new_data: { count: newTransactions.length, startMonth, endMonth, recurring: 'monthly' }
        });

      if (auditError) {
        console.error('Error creating audit log:', auditError);
      }

      return res.status(201).json({ 
        success: true, 
        transactions: newTransactions,
        count: newTransactions.length,
        recurring: 'monthly'
      });
    }

    // Handle one-time transaction
    const transactionData = {
      user_id: user_id || account.user_id,
      account_id,
      type,
      amount: parseFloat(amount),
      description: description || null,
      status: status || 'pending',
      created_at: created_at ? new Date(created_at).toISOString() : new Date().toISOString(),
      updated_at: updated_at ? new Date(updated_at).toISOString() : new Date().toISOString()
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
      recurring: 'one-time',
      imported: 1
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
