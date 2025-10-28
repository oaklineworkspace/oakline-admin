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
  type text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  description text,
  reference text DEFAULT md5(((random())::text || (clock_timestamp())::text)) UNIQUE,
  status text DEFAULT 'completed'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text])),
  metadata jsonb,
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
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Add a comment to indicate setup is complete
COMMENT ON TABLE public.transactions IS 'Stores all financial transactions for the banking system';
COMMENT ON TABLE public.check_deposits IS 'Stores mobile check deposit requests pending admin approval';

-- ============================================================================
-- SETUP COMPLETE!
-- Your transactions and check_deposits tables are now ready to use.
-- ============================================================================
