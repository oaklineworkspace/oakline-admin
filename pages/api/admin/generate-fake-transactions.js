
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const {
      user_id,
      account_id,
      transaction_types,
      year_start,
      year_end,
      count_mode,
      manual_count
    } = req.body;

    // Validation
    if (!user_id || !account_id || !transaction_types || !Array.isArray(transaction_types) || transaction_types.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!year_start || !year_end || year_start > year_end) {
      return res.status(400).json({ error: 'Invalid year range' });
    }

    if (count_mode === 'manual' && (!manual_count || manual_count < 1)) {
      return res.status(400).json({ error: 'Invalid manual count' });
    }

    // Verify account belongs to user
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', account_id)
      .eq('user_id', user_id)
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Account not found or does not belong to user' });
    }

    // Determine transaction count
    const targetCount = count_mode === 'random'
      ? Math.floor(300 + Math.random() * 600)
      : manual_count;

    // Generate transactions
    const transactions = [];
    let currentBalance = parseFloat(account.balance) || 5000;
    const startDate = new Date(year_start, 0, 1, 0, 0, 0);
    const endDate = new Date(year_end, 11, 31, 23, 59, 59);
    const timeRange = endDate.getTime() - startDate.getTime();

    const statuses = ['completed', 'completed', 'completed', 'pending', 'failed', 'cancelled', 'reversed'];

    for (let i = 0; i < targetCount; i++) {
      // Random timestamp within range
      const timestamp = new Date(startDate.getTime() + Math.random() * timeRange);

      // Random transaction type from selected types
      const type = transaction_types[Math.floor(Math.random() * transaction_types.length)];

      // Random status (weighted towards completed)
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      // Random amount
      const amount = Math.round((10 + Math.random() * 890) * 100) / 100;

      // Fee logic
      let fee = 0;
      if (['withdrawal', 'transfer', 'crypto_send', 'card_purchase'].includes(type)) {
        fee = Math.round((0.50 + Math.random() * 5.50) * 100) / 100;
      }

      // Description
      const descriptions = {
        deposit: 'Account Deposit',
        withdrawal: 'Cash Withdrawal',
        transfer: 'Bank Transfer',
        zelle_send: 'Zelle Payment Sent',
        zelle_receive: 'Zelle Payment Received',
        crypto_send: 'Crypto Transfer Sent',
        crypto_receive: 'Crypto Transfer Received',
        card_purchase: 'Card POS Purchase',
        bank_charge: 'Bank Service Charge',
        refund: 'Merchant Refund',
        reversal: 'Reversal of Previous Transaction'
      };
      const description = descriptions[type] || 'Transaction';

      // Calculate balance changes
      const balanceBefore = currentBalance;
      if (['withdrawal', 'transfer', 'crypto_send', 'card_purchase', 'bank_charge'].includes(type)) {
        currentBalance = currentBalance - (amount + fee);
      } else {
        currentBalance = currentBalance + amount;
      }
      const balanceAfter = currentBalance;

      transactions.push({
        user_id,
        account_id,
        type,
        amount,
        description,
        status,
        created_at: timestamp.toISOString(),
        updated_at: timestamp.toISOString(),
        balance_before: balanceBefore,
        balance_after: balanceAfter
      });
    }

    // Sort transactions by date
    transactions.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Insert transactions in batches
    const batchSize = 100;
    let inserted = 0;
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      const { error: insertError } = await supabaseAdmin
        .from('transactions')
        .insert(batch);

      if (insertError) {
        console.error('Error inserting batch:', insertError);
        return res.status(500).json({ 
          error: 'Failed to insert transactions', 
          details: insertError.message,
          inserted_count: inserted
        });
      }
      inserted += batch.length;
    }

    // Log the action
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: authResult.adminId,
        action: `Generated ${inserted} fake transactions for user ${user_id}`,
        table_name: 'transactions',
        new_data: {
          user_id,
          account_id,
          transaction_count: inserted,
          year_range: `${year_start}-${year_end}`,
          types: transaction_types
        }
      });

    return res.status(200).json({
      success: true,
      total_transactions_generated: inserted,
      first_transaction_date: transactions[0].created_at,
      last_transaction_date: transactions[transactions.length - 1].created_at,
      message: `Successfully generated ${inserted} transactions`
    });
  } catch (error) {
    console.error('Error generating transactions:', error);
    return res.status(500).json({
      error: 'Failed to generate transactions',
      details: error.message
    });
  }
}
