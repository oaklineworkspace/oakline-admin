
-- ============================================================================
-- ADD BALANCE TRACKING COLUMNS ONLY
-- Run this if you already have the transactions table
-- ============================================================================

-- Add balance tracking columns if they don't exist
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS balance_before numeric,
  ADD COLUMN IF NOT EXISTS balance_after numeric;

-- Update the CHECK constraint for transaction types if needed
DO $$ 
BEGIN
  ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
  ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check 
    CHECK (type = ANY (ARRAY['credit'::text, 'debit'::text]));
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Update the CHECK constraint for status if needed
DO $$ 
BEGIN
  ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
  ALTER TABLE public.transactions ADD CONSTRAINT transactions_status_check 
    CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'reversal'::text, 'hold'::text, 'reversed'::text]));
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Drop and recreate the trigger function with balance tracking
DROP TRIGGER IF EXISTS trigger_auto_update_balance ON public.transactions;
DROP FUNCTION IF EXISTS public.auto_update_balance_on_transaction_change();

-- Now copy the entire trigger function from supabase_missing_tables.sql here
-- (The CREATE OR REPLACE FUNCTION and CREATE TRIGGER statements)
