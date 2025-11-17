
-- Update transactions table to add proper CHECK constraints
-- This ensures data integrity for transaction types and statuses

-- Drop existing constraint if it exists (for type)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'transactions_type_check'
    ) THEN
        ALTER TABLE public.transactions DROP CONSTRAINT transactions_type_check;
    END IF;
END $$;

-- Add comprehensive type constraint
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

-- Ensure status constraint is comprehensive
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'transactions_status_check'
    ) THEN
        ALTER TABLE public.transactions DROP CONSTRAINT transactions_status_check;
    END IF;
END $$;

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

-- Add metadata column if it doesn't exist (for storing additional transaction info)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transactions' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Create index on type for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_status_type ON public.transactions(user_id, status, type);

COMMENT ON TABLE public.transactions IS 'Stores all financial transactions with comprehensive type and status tracking';
