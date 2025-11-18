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
      account_ids,
      transaction_types,
      year_start,
      year_end,
      month_start,
      month_end,
      count_mode,
      manual_count
    } = req.body;

    // Validation
    if (!user_id || !account_ids || !Array.isArray(account_ids) || account_ids.length === 0 || !transaction_types || !Array.isArray(transaction_types) || transaction_types.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!year_start || !year_end || year_start > year_end) {
      return res.status(400).json({ error: 'Invalid year range' });
    }

    // Validate and set month values
    const monthStartValue = month_start !== undefined ? month_start : 0;
    const monthEndValue = month_end !== undefined ? month_end : 11;
    
    if (monthStartValue < 0 || monthStartValue > 11 || monthEndValue < 0 || monthEndValue > 11) {
      return res.status(400).json({ error: 'Invalid month values (must be 0-11)' });
    }
    
    if (year_start === year_end && monthStartValue > monthEndValue) {
      return res.status(400).json({ error: 'Start month cannot be greater than end month in the same year' });
    }

    if (count_mode === 'manual' && (!manual_count || manual_count < 1)) {
      return res.status(400).json({ error: 'Invalid manual count' });
    }

    // Verify accounts belong to user
    const { data: accounts, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .in('id', account_ids)
      .eq('user_id', user_id);

    if (accountError || !accounts || accounts.length === 0) {
      return res.status(404).json({ error: 'Accounts not found or do not belong to user' });
    }

    if (accounts.length !== account_ids.length) {
      return res.status(400).json({ error: 'Some account IDs are invalid or do not belong to user' });
    }

    // Determine transaction count per account
    const targetCount = count_mode === 'random'
      ? Math.floor(300 + Math.random() * 600)
      : manual_count;

    // Generate transactions for all accounts
    const transactions = [];
    
    // Calculate the last day of the end month
    const lastDayOfMonth = new Date(year_end, monthEndValue + 1, 0).getDate();
    
    const startDate = new Date(year_start, monthStartValue, 1, 0, 0, 0);
    const endDate = new Date(year_end, monthEndValue, lastDayOfMonth, 23, 59, 59);
    const timeRange = endDate.getTime() - startDate.getTime();

    const statuses = ['completed', 'completed', 'completed', 'pending', 'failed', 'cancelled', 'reversed'];

    // Loop through each account
    for (const account of accounts) {
      let currentBalance = parseFloat(account.balance) || 5000;

      for (let i = 0; i < targetCount; i++) {
      // Random timestamp within range
      const timestamp = new Date(startDate.getTime() + Math.random() * timeRange);

      // Random transaction type from selected types
      const type = transaction_types[Math.floor(Math.random() * transaction_types.length)];

      // Random status (weighted towards completed)
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      // Random amount based on type
      let amount = 0;
      let fee = 0;

      if (type === 'deposit' || type === 'check_deposit' || type === 'atm_deposit' || type === 'zelle_receive' || type === 'crypto_receive' || type === 'ach_credit' || type === 'interest_earned' || type === 'dividend_payment' || type === 'loan_disbursement' || type === 'merchant_settlement') {
        // Larger amounts for income/deposits (increased range)
        amount = Math.round((50 + Math.random() * 120000) * 100) / 100;
      } else if (type === 'transfer' || type === 'wire_transfer_out' || type === 'wire_transfer_in' || type === 'international_transfer') {
        // High amounts for transfers (50-120000)
        amount = Math.round((50 + Math.random() * 120000) * 100) / 100;
      } else if (type === 'crypto_send' || type === 'crypto_receive') {
        // High amounts for crypto (50-120000)
        amount = Math.round((50 + Math.random() * 120000) * 100) / 100;
      } else if (type === 'withdrawal' || type === 'zelle_send' || type === 'ach_debit' || type === 'check_payment' || type === 'investment_purchase' || type === 'bill_payment' || type === 'loan_payment' || type === 'recurring_payment' || type === 'cash_advance') {
        // Moderate to large amounts for expenses/outgoing (increased)
        amount = Math.round((20 + Math.random() * 15000) * 100) / 100;
      } else if (type === 'card_purchase') {
        // Variable amounts for card purchases
        amount = Math.round((5 + Math.random() * 500) * 100) / 100;
      } else if (type === 'bank_charge' || type === 'maintenance_fee' || type === 'atm_fee' || type === 'overdraft_fee' || type === 'wire_fee' || type === 'foreign_transaction_fee') {
        // Smaller amounts for fees
        if (type === 'overdraft_fee') {
          amount = Math.round((25 + Math.random() * 75) * 100) / 100;
        } else if (type === 'wire_fee') {
          amount = Math.round((15 + Math.random() * 35) * 100) / 100;
        } else {
          amount = Math.round((1 + Math.random() * 20) * 100) / 100;
        }
      } else if (type === 'refund' || type === 'reversal' || type === 'investment_sale') {
        // Variable amounts for refunds/sales
        amount = Math.round((10 + Math.random() * 1000) * 100) / 100;
      } else if (type === 'atm_withdrawal') {
        amount = Math.round((20 + Math.random() * 500) * 100) / 100;
      } else {
        // Default for unassigned types
        amount = Math.round((10 + Math.random() * 100) * 100) / 100;
      }

      // Fee logic for applicable types
      if (['withdrawal', 'transfer', 'crypto_send', 'card_purchase', 'wire_transfer_out', 'international_transfer', 'bill_payment', 'zelle_send', 'atm_withdrawal'].includes(type)) {
        fee = Math.round((0.50 + Math.random() * 5.50) * 100) / 100;
      } else if (type === 'bank_charge' || type === 'maintenance_fee' || type === 'atm_fee' || type === 'wire_fee' || type === 'foreign_transaction_fee') {
        fee = Math.round((1 + Math.random() * 10) * 100) / 100;
      }

      // Description with variety
      const descriptionOptions = {
        deposit: ['Direct Deposit - Payroll', 'Mobile Check Deposit', 'Wire Transfer Received', 'ACH Deposit', 'Cash Deposit at Branch', 'Online Transfer In', 'Tax Refund Deposit', 'Social Security Payment', 'Pension Deposit', 'Dividend Payment'],
        withdrawal: ['ATM Withdrawal', 'Cash Withdrawal at Branch', 'Emergency Withdrawal', 'International ATM Withdrawal'],
        transfer: ['Internal Transfer', 'ACH Transfer Out', 'Wire Transfer Out', 'External Bank Transfer', 'Bill Payment Transfer', 'Scheduled Transfer'],
        zelle_send: ['Zelle Payment to Friend', 'Zelle Rent Payment', 'Zelle Bill Split', 'Zelle Payment Sent'],
        zelle_receive: ['Zelle Payment from Friend', 'Zelle Rent Received', 'Zelle Reimbursement', 'Zelle Payment Received', 'Zelle Gift Received'],
        crypto_send: ['Bitcoin Transfer Out', 'Ethereum Transfer Out', 'USDC Transfer Out', 'Crypto Exchange Transfer', 'Cold Wallet Transfer'],
        crypto_receive: ['Bitcoin Transfer In', 'Ethereum Transfer In', 'USDC Transfer In', 'Crypto Exchange Deposit', 'Mining Reward Received'],
        card_purchase: ['Point of Sale Purchase', 'Online Shopping', 'Grocery Store', 'Gas Station', 'Restaurant', 'Subscription Service', 'E-commerce Purchase', 'Contactless Payment', 'Mobile Wallet Purchase'],
        bank_charge: ['Account Service Charge', 'Transaction Fee', 'Monthly Service Fee'],
        maintenance_fee: ['Monthly Maintenance Fee', 'Account Upkeep Charge', 'Service Fee'],
        atm_fee: ['ATM Withdrawal Fee', 'Out-of-Network ATM Fee', 'Foreign ATM Fee'],
        overdraft_fee: ['Overdraft Fee', 'NSF Fee', 'Returned Item Fee'],
        wire_fee: ['Wire Transfer Fee', 'Outgoing Wire Fee', 'Incoming Wire Fee', 'International Wire Fee'],
        foreign_transaction_fee: ['Foreign Transaction Fee', 'International Purchase Fee', 'Currency Conversion Fee'],
        refund: ['Merchant Refund', 'Purchase Return', 'Cancelled Subscription Refund', 'Dispute Resolution Refund', 'Overpayment Refund'],
        reversal: ['Transaction Reversal', 'Duplicate Charge Reversal', 'Error Correction', 'Fraudulent Transaction Reversal', 'System Error Reversal'],
        wire_transfer_in: ['Domestic Wire Received', 'International Wire Received', 'Business Wire Transfer', 'Real Estate Wire', 'Investment Wire Transfer'],
        wire_transfer_out: ['Domestic Wire Sent', 'International Wire Sent', 'Business Wire Payment', 'Real Estate Wire', 'Investment Wire Transfer'],
        ach_credit: ['ACH Credit Received', 'Payroll ACH', 'Vendor Payment', 'Government Benefit', 'Insurance Payout'],
        ach_debit: ['ACH Debit Payment', 'Loan Payment', 'Mortgage Payment', 'Subscription Payment', 'Utility Bill Payment'],
        check_deposit: ['Check Deposit', 'Business Check Deposit', 'Personal Check Deposit', 'Cashier Check Deposit', 'Money Order Deposit'],
        check_payment: ['Check Payment', 'Bill Payment by Check', 'Vendor Check', 'Rent Check', 'Business Expense Check'],
        atm_deposit: ['ATM Cash Deposit', 'ATM Check Deposit', 'Night Deposit', 'Express Deposit'],
        atm_withdrawal: ['ATM Cash Withdrawal', 'Withdrawal at ATM'],
        loan_disbursement: ['Personal Loan Disbursement', 'Auto Loan Disbursement', 'Home Loan Disbursement', 'Student Loan Disbursement', 'Business Loan Disbursement'],
        loan_payment: ['Loan Payment', 'Auto Loan Payment', 'Mortgage Payment', 'Student Loan Payment', 'Personal Loan Payment'],
        investment_purchase: ['Stock Purchase', 'Bond Purchase', 'Mutual Fund Purchase', 'ETF Purchase', 'CD Purchase'],
        investment_sale: ['Stock Sale', 'Bond Sale', 'Mutual Fund Redemption', 'ETF Sale', 'CD Redemption'],
        dividend_payment: ['Stock Dividend', 'Mutual Fund Dividend', 'REIT Dividend', 'Bond Interest', 'Dividend Reinvestment'],
        interest_earned: ['Savings Interest', 'CD Interest', 'Money Market Interest', 'Bond Interest', 'Interest Credit'],
        international_transfer: ['SWIFT Transfer', 'Foreign Currency Exchange', 'International Wire', 'Cross-Border Payment', 'Forex Transaction'],
        bill_payment: ['Utility Bill Payment', 'Credit Card Payment', 'Insurance Payment', 'Phone Bill', 'Internet Bill'],
        merchant_settlement: ['Merchant Settlement', 'Business Revenue', 'Sales Settlement', 'Payment Processor Settlement', 'E-commerce Revenue'],
        chargeback: ['Credit Card Chargeback', 'Disputed Transaction', 'Fraud Chargeback', 'Merchant Dispute', 'Authorization Reversal'],
        cash_advance: ['Credit Card Cash Advance', 'ATM Cash Advance', 'Over-the-Counter Advance', 'Emergency Cash Advance'],
        recurring_payment: ['Subscription Renewal', 'Membership Fee', 'Auto-Pay Bill', 'Recurring Transfer', 'Scheduled Payment']
      };

      const options = descriptionOptions[type] || ['Transaction'];
      const description = options[Math.floor(Math.random() * options.length)];

      // Calculate balance changes (debit vs credit)
      const balanceBefore = currentBalance;
      const debitTypes = [
        'withdrawal', 'transfer', 'crypto_send', 'card_purchase', 'bank_charge', 'maintenance_fee', 'atm_fee', 'overdraft_fee', 'wire_fee', 'foreign_transaction_fee',
        'wire_transfer_out', 'ach_debit', 'check_payment', 'loan_payment',
        'investment_purchase', 'international_transfer', 'bill_payment',
        'chargeback', 'cash_advance', 'recurring_payment', 'zelle_send', 'atm_withdrawal'
      ];

      if (debitTypes.includes(type)) {
        currentBalance = currentBalance - (amount + fee);
      } else {
        currentBalance = currentBalance + amount;
      }
      const balanceAfter = currentBalance;

      transactions.push({
          user_id,
          account_id: account.id,
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
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: authResult.adminId,
        action: `Generated ${inserted} fake transactions for user ${user_id} across ${account_ids.length} account(s)`,
        table_name: 'transactions',
        new_data: {
          user_id,
          account_ids,
          account_count: account_ids.length,
          transaction_count: inserted,
          date_range: `${monthNames[monthStartValue]} ${year_start} - ${monthNames[monthEndValue]} ${year_end}`,
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