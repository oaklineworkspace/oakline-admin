
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { csvData } = req.body;

    if (!csvData) {
      return res.status(400).json({ error: 'CSV data is required' });
    }

    // Parse CSV data
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Validate headers
    const requiredHeaders = ['email', 'account_number', 'type', 'amount', 'description'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      return res.status(400).json({ 
        error: `Missing required headers: ${missingHeaders.join(', ')}` 
      });
    }

    const results = {
      total: lines.length - 1,
      successful: 0,
      failed: 0,
      errors: []
    };

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const rowData = lines[i].split(',').map(cell => cell.trim());
      const row = {};
      
      headers.forEach((header, index) => {
        row[header] = rowData[index];
      });

      try {
        // Validate row data
        if (!row.email || !row.account_number || !row.type || !row.amount) {
          throw new Error('Missing required fields');
        }

        const amount = parseFloat(row.amount);
        if (isNaN(amount) || amount <= 0) {
          throw new Error('Invalid amount');
        }

        // Find user by email
        const { data: user, error: userError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', row.email.toLowerCase())
          .single();

        if (userError || !user) {
          throw new Error('User not found');
        }

        // Find account by account number and user
        const { data: account, error: accountError } = await supabase
          .from('accounts')
          .select('*')
          .eq('account_number', row.account_number)
          .eq('user_id', user.id)
          .single();

        if (accountError || !account) {
          throw new Error('Account not found');
        }

        // Process transaction
        const currentBalance = parseFloat(account.balance);
        let newBalance;
        let transactionAmount;

        switch (row.type.toLowerCase()) {
          case 'deposit':
          case 'interest':
          case 'bonus':
          case 'refund':
            transactionAmount = amount;
            newBalance = currentBalance + amount;
            break;
          case 'withdrawal':
          case 'fee':
            transactionAmount = -amount;
            newBalance = currentBalance - amount;
            break;
          case 'adjustment':
            transactionAmount = amount;
            newBalance = currentBalance + amount;
            break;
          default:
            throw new Error(`Invalid transaction type: ${row.type}`);
        }

        // Update account balance
        const { error: updateError } = await supabase
          .from('accounts')
          .update({ 
            balance: newBalance.toFixed(2),
            updated_at: new Date().toISOString()
          })
          .eq('id', account.id);

        if (updateError) {
          throw updateError;
        }

        // Create transaction record
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert([{
            account_id: account.id,
            user_id: user.id,
            type: row.type.toLowerCase(),
            amount: transactionAmount,
            status: 'completed',
            description: row.description || `Bulk ${row.type}`,
            reference: `BULK_${Date.now()}_${i}`,
            created_at: new Date().toISOString()
          }]);

        if (transactionError) {
          // Revert balance update
          await supabase
            .from('accounts')
            .update({ 
              balance: currentBalance.toFixed(2),
              updated_at: new Date().toISOString()
            })
            .eq('id', account.id);
          
          throw transactionError;
        }

        results.successful++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          message: error.message,
          data: row
        });
      }
    }

    res.status(200).json(results);

  } catch (error) {
    console.error('Bulk transaction error:', error);
    res.status(500).json({
      error: 'Internal server error during bulk processing',
      details: error.message
    });
  }
}
