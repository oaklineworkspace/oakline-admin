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
    const { userId, accountIds, transactions } = req.body;

    if (!userId || !accountIds || !Array.isArray(accountIds) || accountIds.length === 0 || !transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify accounts belong to user
    const { data: accounts, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('id, balance, user_id')
      .in('id', accountIds)
      .eq('user_id', userId);

    if (accountError || !accounts || accounts.length === 0) {
      return res.status(404).json({ error: 'Accounts not found or do not belong to user' });
    }

    if (accounts.length !== accountIds.length) {
      return res.status(400).json({ error: 'Some account IDs are invalid' });
    }

    // Prepare transactions to insert
    const transactionsToInsert = [];
    let totalCredits = 0;
    let totalDebits = 0;

    // For each account, insert all transactions
    for (const account of accounts) {
      let currentBalance = parseFloat(account.balance || 0);

      for (const tx of transactions) {
        const amount = parseFloat(tx.amount);
        const isCredit = tx.isCredit === true || tx.type === 'credit';

        // Calculate new balance
        const newBalance = isCredit ? currentBalance + amount : currentBalance - amount;

        if (newBalance < 0) {
          return res.status(400).json({
            error: 'Insufficient funds for account ' + account.id,
            details: `Account would go negative with transaction: $${amount}`
          });
        }

        transactionsToInsert.push({
          user_id: userId,
          account_id: account.id,
          type: isCredit ? 'credit' : 'debit',
          amount: amount,
          description: tx.description,
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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
      const finalBalance = currentBalance;
      const { error: updateError } = await supabaseAdmin
        .from('accounts')
        .update({
          balance: finalBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', account.id);

      if (updateError) {
        console.error('Balance update error:', updateError);
        throw updateError;
      }
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
        action: `Bulk imported ${transactionsToInsert.length} transactions for user ${userId} across ${accountIds.length} account(s). Credits: $${totalCredits.toFixed(2)}, Debits: $${totalDebits.toFixed(2)}`,
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
