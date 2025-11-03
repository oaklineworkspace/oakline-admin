
-- This script will attempt to link existing crypto deposits to loans based on user_id and timing
-- Run this AFTER running fix_loan_deposit_tracking.sql

-- Step 1: Find crypto deposits that match loan requirements and update them
UPDATE public.crypto_deposits cd
SET 
  purpose = 'loan_requirement',
  loan_id = l.id
FROM public.loans l
WHERE 
  cd.user_id = l.user_id
  AND cd.status IN ('confirmed', 'completed', 'pending')
  AND cd.amount >= l.deposit_required
  AND l.deposit_required > 0
  AND cd.created_at >= l.created_at
  AND cd.created_at <= (l.created_at + INTERVAL '7 days')
  AND cd.loan_id IS NULL
  AND cd.purpose = 'general_deposit';

-- Step 2: Update the corresponding loans to mark deposits as completed
UPDATE public.loans l
SET 
  deposit_status = 'completed',
  deposit_paid = true,
  deposit_amount = cd.amount,
  deposit_date = cd.created_at,
  deposit_method = 'crypto'
FROM public.crypto_deposits cd
WHERE 
  cd.loan_id = l.id
  AND cd.purpose = 'loan_requirement'
  AND cd.status IN ('confirmed', 'completed')
  AND l.deposit_status != 'completed';

-- Step 3: Verify the results
SELECT 
  l.id as loan_id,
  l.user_id,
  l.deposit_required,
  l.deposit_status,
  cd.id as deposit_id,
  cd.amount as deposit_amount,
  cd.purpose,
  cd.status as deposit_status
FROM public.loans l
LEFT JOIN public.crypto_deposits cd ON cd.loan_id = l.id
WHERE l.deposit_required > 0
ORDER BY l.created_at DESC;
