
-- Remove restrictive constraints on transactions table to allow admin updates
-- This will allow admins to update any transaction field including timestamps and descriptions

-- 1. Drop the restrictive type constraint
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- 2. Add a more permissive type constraint that matches the application code
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

-- 3. Make amount constraint more permissive (allow any positive or zero amount)
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_amount_check;
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_amount_check 
CHECK (amount >= 0::numeric);

-- 4. Ensure status constraint is comprehensive
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

-- 5. Remove NOT NULL constraint from type if it prevents updates
-- (Keep it but this shows how to remove if needed)
-- ALTER TABLE public.transactions ALTER COLUMN type DROP NOT NULL;

-- 6. Allow timestamps to be updated freely (they should already be updatable)
-- No constraint needed here, timestamps are already flexible

-- Verify the changes
SELECT 
    constraint_name, 
    constraint_type,
    check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'transactions' 
    AND tc.table_schema = 'public'
ORDER BY constraint_name;
