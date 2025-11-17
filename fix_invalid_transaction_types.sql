
-- Step 1: Identify all invalid transaction types
-- Run this first to see what needs to be fixed
SELECT DISTINCT type, COUNT(*) as count
FROM public.transactions
WHERE type NOT IN (
    'credit', 'debit', 'deposit', 'withdrawal', 'transfer',
    'crypto_deposit', 'loan_disbursement', 'treasury_credit', 'treasury_debit',
    'wire_transfer', 'check_deposit', 'atm_withdrawal', 'debit_card',
    'transfer_in', 'transfer_out', 'ach_transfer', 'check_payment',
    'service_fee', 'refund', 'interest', 'bonus', 'other'
)
GROUP BY type
ORDER BY count DESC;

-- Step 2: Update invalid types to valid ones
-- Map common invalid types to their valid equivalents
UPDATE public.transactions 
SET type = CASE 
    -- If type is NULL or empty, default to 'other'
    WHEN type IS NULL OR type = '' THEN 'other'
    -- Add more mappings as needed based on the output from Step 1
    -- For example, if you find 'card_transaction', map it to 'debit_card'
    -- WHEN type = 'card_transaction' THEN 'debit_card'
    -- WHEN type = 'loan_payment' THEN 'transfer'
    ELSE 'other'
END
WHERE type NOT IN (
    'credit', 'debit', 'deposit', 'withdrawal', 'transfer',
    'crypto_deposit', 'loan_disbursement', 'treasury_credit', 'treasury_debit',
    'wire_transfer', 'check_deposit', 'atm_withdrawal', 'debit_card',
    'transfer_in', 'transfer_out', 'ach_transfer', 'check_payment',
    'service_fee', 'refund', 'interest', 'bonus', 'other'
);

-- Step 3: Verify no invalid types remain
SELECT DISTINCT type, COUNT(*) as count
FROM public.transactions
WHERE type NOT IN (
    'credit', 'debit', 'deposit', 'withdrawal', 'transfer',
    'crypto_deposit', 'loan_disbursement', 'treasury_credit', 'treasury_debit',
    'wire_transfer', 'check_deposit', 'atm_withdrawal', 'debit_card',
    'transfer_in', 'transfer_out', 'ach_transfer', 'check_payment',
    'service_fee', 'refund', 'interest', 'bonus', 'other'
)
GROUP BY type;

-- Step 4: Now you can safely run the constraint update
-- (The content from update_transactions_table_constraints.sql)
