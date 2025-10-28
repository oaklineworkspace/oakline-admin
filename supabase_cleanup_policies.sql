
-- ============================================================================
-- CLEANUP SCRIPT - Run this BEFORE supabase_missing_tables.sql
-- This drops existing policies and triggers to allow clean recreation
-- ============================================================================

-- Drop existing policies for transactions table
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON public.transactions;

-- Drop existing policies for check_deposits table
DROP POLICY IF EXISTS "Users can view their own check deposits" ON public.check_deposits;
DROP POLICY IF EXISTS "Users can insert their own check deposits" ON public.check_deposits;
DROP POLICY IF EXISTS "Admins can view all check deposits" ON public.check_deposits;
DROP POLICY IF EXISTS "Admins can update check deposits" ON public.check_deposits;

-- Drop existing triggers FIRST (before dropping the function it depends on)
DROP TRIGGER IF EXISTS trigger_auto_update_balance ON public.transactions CASCADE;
DROP TRIGGER IF EXISTS trg_auto_update_balance ON public.transactions CASCADE;

-- Now drop the function with all possible signatures (no dependencies remain)
DROP FUNCTION IF EXISTS public.auto_update_balance_on_transaction_change() CASCADE;
DROP FUNCTION IF EXISTS public.auto_update_balance_on_transaction_change CASCADE;

-- Clean up any orphaned trigger functions
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'transactions' 
        AND trigger_schema = 'public'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.transactions CASCADE';
    END LOOP;
END $$;

-- Now you can run supabase_missing_tables.sql
