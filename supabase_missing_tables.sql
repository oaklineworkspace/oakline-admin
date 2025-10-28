
-- ============================================================================
-- OAKLINE BANK - MISSING TABLES SETUP
-- Run this SQL in your Supabase SQL Editor to create the missing tables
-- ============================================================================

-- ============================================================================
-- 1. TRANSACTIONS TABLE
-- Stores all financial transactions (deposits, withdrawals, transfers, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  account_id uuid,
  type text NOT NULL CHECK (type = ANY (ARRAY['credit'::text, 'debit'::text])),
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  description text,
  reference text DEFAULT md5(((random())::text || (clock_timestamp())::text)) UNIQUE,
  status text DEFAULT 'completed'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'reversal'::text, 'hold'::text, 'reversed'::text])),
  metadata jsonb,
  balance_before numeric,
  balance_after numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON public.transactions(reference);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can update transactions"
  ON public.transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );


-- ============================================================================
-- 2. CHECK_DEPOSITS TABLE
-- Stores mobile check deposit requests for admin approval
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.check_deposits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  check_number text,
  check_front_image text,
  check_back_image text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'processing'::text])),
  rejection_reason text,
  processed_by uuid,
  processed_at timestamp with time zone,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT check_deposits_pkey PRIMARY KEY (id),
  CONSTRAINT check_deposits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT check_deposits_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE,
  CONSTRAINT check_deposits_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_check_deposits_user_id ON public.check_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_check_deposits_account_id ON public.check_deposits(account_id);
CREATE INDEX IF NOT EXISTS idx_check_deposits_status ON public.check_deposits(status);
CREATE INDEX IF NOT EXISTS idx_check_deposits_created_at ON public.check_deposits(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.check_deposits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for check_deposits
CREATE POLICY "Users can view their own check deposits"
  ON public.check_deposits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own check deposits"
  ON public.check_deposits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all check deposits"
  ON public.check_deposits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can update check deposits"
  ON public.check_deposits FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGER: Auto-update balance on transaction changes
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_update_balance_on_transaction_change()
RETURNS trigger AS $$
DECLARE
  old_balance numeric;
  new_balance numeric;
  amount_diff numeric;
  old_direction text;
  new_direction text;
  affected_account uuid;
  revert_account uuid;
BEGIN
  -- Map transaction types to direction (credit adds, debit subtracts)
  old_direction := CASE
    WHEN OLD IS NULL THEN NULL
    WHEN lower(OLD.type) = 'credit' THEN 'credit'
    ELSE 'debit'
  END;

  new_direction := CASE
    WHEN NEW IS NULL THEN NULL
    WHEN lower(NEW.type) = 'credit' THEN 'credit'
    ELSE 'debit'
  END;

  -- ---------- HANDLE INSERT ----------
  IF (TG_OP = 'INSERT') THEN
    IF NEW.status IS NOT NULL AND lower(NEW.status) = 'completed' THEN
      affected_account := NEW.account_id;
      SELECT balance INTO new_balance FROM public.accounts WHERE id = affected_account FOR UPDATE;

      IF new_balance IS NULL THEN
        RAISE EXCEPTION 'Account % not found when applying inserted transaction', affected_account;
      END IF;

      IF new_direction = 'credit' THEN
        UPDATE public.accounts SET balance = new_balance + COALESCE(NEW.amount,0), updated_at = now() WHERE id = affected_account;
      ELSE
        UPDATE public.accounts SET balance = new_balance - COALESCE(NEW.amount,0), updated_at = now() WHERE id = affected_account;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- ---------- HANDLE UPDATE ----------
  IF (TG_OP = 'UPDATE') THEN
    -- Case 1: Status changed from non-completed to completed => apply NEW effect
    IF (COALESCE(lower(OLD.status),'') NOT IN ('completed') AND lower(COALESCE(NEW.status,'')) = 'completed') THEN
      affected_account := NEW.account_id;
      SELECT balance INTO new_balance FROM public.accounts WHERE id = affected_account FOR UPDATE;
      IF new_balance IS NULL THEN
        RAISE EXCEPTION 'Account % not found applying completion', affected_account;
      END IF;

      old_balance := new_balance;

      IF new_direction = 'credit' THEN
        new_balance := new_balance + COALESCE(NEW.amount,0);
      ELSE
        new_balance := new_balance - COALESCE(NEW.amount,0);
      END IF;

      UPDATE public.accounts SET balance = new_balance, updated_at = now() WHERE id = affected_account;
      
      -- Update transaction with balance info
      UPDATE public.transactions 
      SET balance_before = old_balance, 
          balance_after = new_balance,
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'balance_applied', true,
            'balance_before', old_balance,
            'balance_after', new_balance,
            'applied_at', now()
          )
      WHERE id = NEW.id;

      RETURN NEW;
    END IF;

    -- Case 2: Status changed from completed to cancelled/reversed/failed => revert OLD effect
    IF (lower(COALESCE(OLD.status,'')) = 'completed' AND lower(COALESCE(NEW.status,'')) IN ('cancelled','canceled','reversed','reversal','hold','failed')) THEN
      revert_account := OLD.account_id;
      SELECT balance INTO old_balance FROM public.accounts WHERE id = revert_account FOR UPDATE;
      IF old_balance IS NULL THEN
        RAISE EXCEPTION 'Account % not found when reverting completed transaction', revert_account;
      END IF;

      IF old_direction = 'credit' THEN
        UPDATE public.accounts SET balance = old_balance - COALESCE(OLD.amount,0), updated_at = now() WHERE id = revert_account;
      ELSE
        UPDATE public.accounts SET balance = old_balance + COALESCE(OLD.amount,0), updated_at = now() WHERE id = revert_account;
      END IF;

      RETURN NEW;
    END IF;

    -- Case 3: Amount changed while status is completed => apply difference
    IF (NEW.status IS NOT NULL AND lower(NEW.status) = 'completed' AND (OLD.amount IS DISTINCT FROM NEW.amount)) THEN
      affected_account := NEW.account_id;
      SELECT balance INTO new_balance FROM public.accounts WHERE id = affected_account FOR UPDATE;
      IF new_balance IS NULL THEN
        RAISE EXCEPTION 'Account % not found when applying amount diff', affected_account;
      END IF;

      amount_diff := COALESCE(NEW.amount,0) - COALESCE(OLD.amount,0);

      IF new_direction = 'credit' THEN
        UPDATE public.accounts SET balance = new_balance + amount_diff, updated_at = now() WHERE id = affected_account;
      ELSE
        UPDATE public.accounts SET balance = new_balance - amount_diff, updated_at = now() WHERE id = affected_account;
      END IF;

      RETURN NEW;
    END IF;

    -- Case 4: Type changed while status is completed => revert old, apply new
    IF (lower(COALESCE(OLD.status,'')) = 'completed' AND lower(COALESCE(NEW.status,'')) = 'completed' AND (OLD.type IS DISTINCT FROM NEW.type)) THEN
      affected_account := NEW.account_id;
      SELECT balance INTO new_balance FROM public.accounts WHERE id = affected_account FOR UPDATE;
      IF new_balance IS NULL THEN
        RAISE EXCEPTION 'Account % not found when type changed', affected_account;
      END IF;

      -- Revert old type effect
      IF old_direction = 'credit' THEN
        new_balance := new_balance - COALESCE(OLD.amount,0);
      ELSE
        new_balance := new_balance + COALESCE(OLD.amount,0);
      END IF;

      -- Apply new type effect
      IF new_direction = 'credit' THEN
        new_balance := new_balance + COALESCE(NEW.amount,0);
      ELSE
        new_balance := new_balance - COALESCE(NEW.amount,0);
      END IF;

      UPDATE public.accounts SET balance = new_balance, updated_at = now() WHERE id = affected_account;

      RETURN NEW;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_update_balance ON public.transactions;

-- Create trigger
CREATE TRIGGER trigger_auto_update_balance
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_balance_on_transaction_change();

-- ============================================================================
-- SETUP COMPLETE!
-- Your transactions and check_deposits tables are now ready to use.
-- ============================================================================
