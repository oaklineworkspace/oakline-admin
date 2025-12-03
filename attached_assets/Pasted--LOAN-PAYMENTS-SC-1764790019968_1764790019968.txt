
-- ============================================================================
-- LOAN PAYMENTS SCHEMA UPDATE
-- This updates the loan_payments table with proper status tracking and refund columns
-- ============================================================================

-- 1. First, ensure the loan_payments table exists with all necessary columns
CREATE TABLE IF NOT EXISTS public.loan_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  payment_amount numeric NOT NULL CHECK (payment_amount > 0),
  principal_amount numeric DEFAULT 0 CHECK (principal_amount >= 0),
  interest_amount numeric DEFAULT 0 CHECK (interest_amount >= 0),
  payment_method text NOT NULL CHECK (payment_method = ANY (ARRAY['account_balance'::text, 'crypto'::text, 'wire_transfer'::text, 'check'::text, 'external'::text])),
  payment_type text DEFAULT 'regular' CHECK (payment_type = ANY (ARRAY['regular'::text, 'prepayment'::text, 'final'::text, 'extra'::text])),
  reference_number text UNIQUE,
  transaction_hash text,
  crypto_asset_id uuid REFERENCES public.crypto_assets(id) ON DELETE SET NULL,
  wallet_address text,
  proof_of_payment text,
  notes text,
  admin_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  CONSTRAINT loan_payments_pkey PRIMARY KEY (id)
);

-- 2. Add status column with comprehensive status options
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='loan_payments' AND column_name='status'
  ) THEN
    ALTER TABLE public.loan_payments 
    ADD COLUMN status text DEFAULT 'pending';
  END IF;
END $$;

-- Update status constraint to include all statuses
ALTER TABLE public.loan_payments 
DROP CONSTRAINT IF EXISTS loan_payments_status_check;

ALTER TABLE public.loan_payments 
ADD CONSTRAINT loan_payments_status_check 
CHECK (status = ANY (ARRAY[
  'pending'::text,
  'processing'::text,
  'completed'::text,
  'approved'::text,
  'rejected'::text,
  'failed'::text,
  'cancelled'::text,
  'refund_requested'::text,
  'refund_processing'::text,
  'refund_completed'::text,
  'refund_rejected'::text,
  'refund_failed'::text
]));

-- 3. Add refund tracking columns
ALTER TABLE public.loan_payments 
ADD COLUMN IF NOT EXISTS refund_requested_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS refund_reason text,
ADD COLUMN IF NOT EXISTS refund_amount numeric DEFAULT 0 CHECK (refund_amount >= 0),
ADD COLUMN IF NOT EXISTS refund_processed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS refund_method text CHECK (refund_method = ANY (ARRAY['account_credit'::text, 'crypto'::text, 'wire_transfer'::text, 'check'::text, NULL])),
ADD COLUMN IF NOT EXISTS refund_reference text,
ADD COLUMN IF NOT EXISTS refund_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS refund_notes text;

-- 4. Add rejection tracking columns
ALTER TABLE public.loan_payments 
ADD COLUMN IF NOT EXISTS rejected_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. Add approval tracking columns
ALTER TABLE public.loan_payments 
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6. Add failed payment tracking
ALTER TABLE public.loan_payments 
ADD COLUMN IF NOT EXISTS failed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS failure_reason text,
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0 CHECK (retry_count >= 0);

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_loan_payments_user_id ON public.loan_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON public.loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_status ON public.loan_payments(status);
CREATE INDEX IF NOT EXISTS idx_loan_payments_reference_number ON public.loan_payments(reference_number);
CREATE INDEX IF NOT EXISTS idx_loan_payments_created_at ON public.loan_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loan_payments_refund_status ON public.loan_payments(status) WHERE status LIKE 'refund%';

-- 8. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_loan_payments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_loan_payments_updated_at ON public.loan_payments;
CREATE TRIGGER trg_loan_payments_updated_at
  BEFORE UPDATE ON public.loan_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_loan_payments_timestamp();

-- 9. Create audit log trigger for payment status changes
CREATE OR REPLACE FUNCTION log_loan_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.audit_logs (
      event_type,
      table_name,
      record_id,
      user_id,
      old_values,
      new_values,
      ip_address,
      user_agent
    ) VALUES (
      'loan_payment_status_change',
      'loan_payments',
      NEW.id,
      COALESCE(NEW.approved_by, NEW.rejected_by, NEW.user_id),
      jsonb_build_object(
        'status', OLD.status,
        'payment_amount', OLD.payment_amount
      ),
      jsonb_build_object(
        'status', NEW.status,
        'payment_amount', NEW.payment_amount,
        'rejection_reason', NEW.rejection_reason,
        'refund_reason', NEW.refund_reason
      ),
      current_setting('request.headers', true)::json->>'x-forwarded-for',
      current_setting('request.headers', true)::json->>'user-agent'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_loan_payment_status_change ON public.loan_payments;
CREATE TRIGGER trg_log_loan_payment_status_change
  AFTER UPDATE ON public.loan_payments
  FOR EACH ROW
  EXECUTE FUNCTION log_loan_payment_status_change();

-- 10. Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.loan_payments TO authenticated;
GRANT SELECT ON public.loan_payments TO anon;

-- 11. Add helpful comments
COMMENT ON TABLE public.loan_payments IS 'Stores loan payment transactions with comprehensive status and refund tracking';
COMMENT ON COLUMN public.loan_payments.status IS 'Payment status: pending, processing, completed, approved, rejected, failed, cancelled, refund_requested, refund_processing, refund_completed, refund_rejected, refund_failed';
COMMENT ON COLUMN public.loan_payments.refund_requested_at IS 'Timestamp when refund was requested';
COMMENT ON COLUMN public.loan_payments.refund_reason IS 'Reason for requesting refund';
COMMENT ON COLUMN public.loan_payments.rejected_at IS 'Timestamp when payment was rejected';
COMMENT ON COLUMN public.loan_payments.rejection_reason IS 'Reason for payment rejection';
COMMENT ON COLUMN public.loan_payments.approved_at IS 'Timestamp when payment was approved';
COMMENT ON COLUMN public.loan_payments.failed_at IS 'Timestamp when payment failed';
COMMENT ON COLUMN public.loan_payments.failure_reason IS 'Reason for payment failure';

-- 12. Verify and output results
DO $$
DECLARE
  v_column_count integer;
BEGIN
  SELECT count(*) INTO v_column_count
  FROM information_schema.columns
  WHERE table_name = 'loan_payments'
    AND table_schema = 'public';
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Loan Payments Schema Update Completed!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total columns in loan_payments: %', v_column_count;
  RAISE NOTICE '';
  RAISE NOTICE 'New Status Options:';
  RAISE NOTICE '  - pending (awaiting admin review)';
  RAISE NOTICE '  - processing (being processed)';
  RAISE NOTICE '  - completed (successfully processed)';
  RAISE NOTICE '  - approved (admin approved)';
  RAISE NOTICE '  - rejected (admin rejected)';
  RAISE NOTICE '  - failed (processing failed)';
  RAISE NOTICE '  - cancelled (payment cancelled)';
  RAISE NOTICE '  - refund_requested (refund requested)';
  RAISE NOTICE '  - refund_processing (refund in progress)';
  RAISE NOTICE '  - refund_completed (refund completed)';
  RAISE NOTICE '  - refund_rejected (refund rejected)';
  RAISE NOTICE '  - refund_failed (refund failed)';
  RAISE NOTICE '';
  RAISE NOTICE 'New Columns Added:';
  RAISE NOTICE '  - Refund tracking (refund_requested_at, refund_reason, refund_amount, etc.)';
  RAISE NOTICE '  - Rejection tracking (rejected_at, rejection_reason, rejected_by)';
  RAISE NOTICE '  - Approval tracking (approved_at, approved_by)';
  RAISE NOTICE '  - Failure tracking (failed_at, failure_reason, retry_count)';
  RAISE NOTICE '============================================';
END $$;
