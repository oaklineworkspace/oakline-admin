
// pages/api/account-management.js
// Combined: Account operations, transactions, balance updates, and admin functions

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // use service key for server-side operations
);

// Utility: Generate random transaction reference
function generateReference() {
  return 'TX' + Math.floor(1000000000 + Math.random() * 9000000000);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, fromAccountId, toAccountNumber, amount, transferType } = req.body;

  try {
    switch(action) {
      case 'transfer':
        // 1. Validate input
        if (!fromAccountId || !toAccountNumber || !amount || parseFloat(amount) <= 0) {
          return res.status(400).json({ error: 'Missing or invalid fields.' });
        }

        // 2. Get sender account
        const { data: fromAccData, error: fromAccError } = await supabase
          .from('accounts')
          .select('*')
          .eq('id', fromAccountId)
          .single();
        if (fromAccError) throw fromAccError;

        if (parseFloat(amount) > fromAccData.balance) {
          return res.status(400).json({ error: 'Insufficient balance.' });
        }

        // 3. Find recipient account
        const { data: recipient, error: recipientError } = await supabase
          .from('accounts')
          .select('*')
          .eq('account_number', toAccountNumber)
          .single();
        if (recipientError) throw recipientError;
        if (!recipient) return res.status(404).json({ error: 'Recipient account not found.' });

        // 4. Handle different transfer types
        let fee = 0;
        if (transferType === 'international') {
          fee = 15; // flat fee for example
        }

        const totalAmount = parseFloat(amount) + fee;

        if (totalAmount > fromAccData.balance) {
          return res.status(400).json({ error: 'Insufficient balance including fees.' });
        }

        // 5. Update balances
        await supabase.from('accounts').update({
          balance: fromAccData.balance - totalAmount
        }).eq('id', fromAccountId);

        await supabase.from('accounts').update({
          balance: recipient.balance + parseFloat(amount)
        }).eq('id', recipient.id);

        // 6. Record transactions
        const reference = generateReference();
        await supabase.from('transactions').insert([
          {
            account_id: fromAccountId,
            type: transferType === 'international' ? 'International Transfer Out' : 'Transfer Out',
            amount: parseFloat(amount),
            status: 'completed',
            reference
          },
          {
            account_id: recipient.id,
            type: transferType === 'international' ? 'International Transfer In' : 'Transfer In',
            amount: parseFloat(amount),
            status: 'completed',
            reference
          }
        ]);

        return res.status(200).json({ message: `Transfer successful. Reference: ${reference}` });

      case 'history':
        const { accountId } = req.body;
        if (!accountId) return res.status(400).json({ error: 'Account ID required.' });

        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('account_id', accountId)
          .order('created_at', { ascending: false });

        if (txError) throw txError;
        return res.status(200).json({ transactions });

      default:
        return res.status(400).json({ error: 'Invalid action.' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
