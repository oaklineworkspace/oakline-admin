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
    const { userId, accountId, transactions, startDate, endDate } = req.body;

    if (!userId || !accountId || !transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    // Verify account belongs to user
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('id, balance, user_id')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Account not found or does not belong to user' });
    }

    // Prepare transactions to insert for this account
    const transactionsToInsert = [];
    let currentBalance = parseFloat(account.balance || 0);
    let totalCredits = 0;
    let totalDebits = 0;

    // Calculate date distribution
    // Parse dates properly: "2024-01-01" -> [2024, 01, 01]
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    
    const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
    const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
    const timeDifference = end - start;
    const transactionCount = transactions.length;

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      const amount = parseFloat(tx.amount);
      const isCredit = tx.isCredit === true || tx.type === 'credit';

      // Distribute transactions evenly across the date range
      const distributionRatio = transactionCount > 1 ? i / (transactionCount - 1) : 0;
      const transactionDate = new Date(start.getTime() + (timeDifference * distributionRatio));
      
      // Add random time within the day (8 AM to 8 PM)
      const randomHour = 8 + Math.floor(Math.random() * 12);
      const randomMinute = Math.floor(Math.random() * 60);
      transactionDate.setHours(randomHour, randomMinute, 0, 0);

      // Calculate new balance
      const newBalance = isCredit ? currentBalance + amount : currentBalance - amount;

      if (newBalance < 0) {
        return res.status(400).json({
          error: 'Insufficient funds for account ' + accountId,
          details: `Account would go negative with transaction: $${amount}`
        });
      }

      transactionsToInsert.push({
        user_id: userId,
        account_id: accountId,
        type: isCredit ? 'credit' : 'debit',
        amount: amount,
        description: tx.description,
        status: 'completed',
        created_at: transactionDate.toISOString(),
        updated_at: transactionDate.toISOString(),
        balance_before: currentBalance,
        balance_after: newBalance
      });

      if (isCredit) {
        totalCredits += amount;
      } else {
        totalDebits += amount;
      }

      currentBalance = newBalance;
    }

    // Update account balance
    const { error: updateError } = await supabaseAdmin
      .from('accounts')
      .update({
        balance: currentBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId);

    if (updateError) {
      console.error('Balance update error:', updateError);
      throw updateError;
    }

    // Insert all transactions in batch
    if (transactionsToInsert.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < transactionsToInsert.length; i += batchSize) {
        const batch = transactionsToInsert.slice(i, i + batchSize);
        const { error: insertError } = await supabaseAdmin
          .from('transactions')
          .insert(batch);

        if (insertError) {
          console.error('Transaction insert error:', insertError);
          throw insertError;
        }
      }
    }

    // Log the action
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: authResult.adminId,
        action: `Bulk imported ${transactionsToInsert.length} transactions for account ${accountId}. Credits: $${totalCredits.toFixed(2)}, Debits: $${totalDebits.toFixed(2)}`,
        table_name: 'transactions'
      });

    res.status(200).json({
      success: true,
      message: 'Transactions imported successfully',
      imported: transactionsToInsert.length,
      totalCredits: totalCredits.toFixed(2),
      totalDebits: totalDebits.toFixed(2)
    });
  } catch (error) {
    console.error('Error importing transactions:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
