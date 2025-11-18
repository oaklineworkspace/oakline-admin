
-- Remove restrictive constraints on transactions table to allow admin updates
-- This will allow admins to update any transaction field including timestamps and descriptions

-- STEP 1: First, identify and fix any invalid transaction types
-- Update any invalid types to 'other'
UPDATE public.transactions 
SET type = 'other'
WHERE type NOT IN (
    'credit', 'debit', 'deposit', 'withdrawal', 'transfer',
    'crypto_deposit', 'loan_disbursement', 'treasury_credit', 'treasury_debit',
    'wire_transfer', 'check_deposit', 'atm_withdrawal', 'debit_card',
    'transfer_in', 'transfer_out', 'ach_transfer', 'check_payment',
    'service_fee', 'refund', 'interest', 'bonus', 'other'
);

-- STEP 2: Drop the restrictive type constraint
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- STEP 3: Add a more permissive type constraint that matches the application code
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type = ANY (ARRAY[
    'credit'::text, 
    'debit'::text, 
    'deposit'::text, 
    'withdrawal'::text, 
    'transfer'::text, 
    'crypto_deposit'::text, 
    'loan_disbursement'::text, 
    'treasury_credit'::text, 
    'treasury_debit'::text,
    'wire_transfer'::text,
    'check_deposit'::text,
    'atm_withdrawal'::text,
    'debit_card'::text,
    'transfer_in'::text,
    'transfer_out'::text,
    'ach_transfer'::text,
    'check_payment'::text,
    'service_fee'::text,
    'refund'::text,
    'interest'::text,
    'bonus'::text,
    'other'::text
]));

-- STEP 4: Make amount constraint more permissive (allow any positive or zero amount)
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_amount_check;
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_amount_check 
CHECK (amount >= 0::numeric);

-- STEP 5: Ensure status constraint is comprehensive
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_status_check 
CHECK (status = ANY (ARRAY[
    'pending'::text, 
    'completed'::text, 
    'failed'::text, 
    'cancelled'::text, 
    'reversal'::text, 
    'hold'::text, 
    'reversed'::text
]));

-- STEP 6: Verify the changes
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'transactions' 
    AND tc.table_schema = 'public'
ORDER BY tc.constraint_name;
