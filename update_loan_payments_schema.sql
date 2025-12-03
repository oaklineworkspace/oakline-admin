
-- ============================================================================
-- LOAN PAYMENTS SCHEMA UPDATE
-- This updates the loan_payments table with proper status tracking and refund columns
-- ============================================================================

-- 1. Add status column with comprehensive status options
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

-- 2. Add payment_amount column if it doesn't exist (for consistency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='loan_payments' AND column_name='payment_amount'
  ) THEN
    ALTER TABLE public.loan_payments 
    ADD COLUMN payment_amount numeric;
    
    -- Copy amount to payment_amount if it exists
    UPDATE public.loan_payments SET payment_amount = amount WHERE amount IS NOT NULL;
  END IF;
END $$;

-- 3. Add payment_method column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='loan_payments' AND column_name='payment_method'
  ) THEN
    ALTER TABLE public.loan_payments 
    ADD COLUMN payment_method text DEFAULT 'account_balance' 
    CHECK (payment_method = ANY (ARRAY['account_balance'::text, 'crypto'::text, 'wire_transfer'::text, 'check'::text, 'external'::text]));
  END IF;
END $$;

-- 4. Add account_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='loan_payments' AND column_name='account_id'
  ) THEN
    ALTER TABLE public.loan_payments 
    ADD COLUMN account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Add refund tracking columns
ALTER TABLE public.loan_payments 
ADD COLUMN IF NOT EXISTS refund_requested_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS refund_reason text,
ADD COLUMN IF NOT EXISTS refund_amount numeric DEFAULT 0 CHECK (refund_amount >= 0),
ADD COLUMN IF NOT EXISTS refund_processed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS refund_method text CHECK (refund_method = ANY (ARRAY['account_credit'::text, 'crypto'::text, 'wire_transfer'::text, 'check'::text, NULL])),
ADD COLUMN IF NOT EXISTS refund_reference text,
ADD COLUMN IF NOT EXISTS refund_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS refund_notes text;

-- 6. Add rejection tracking columns
ALTER TABLE public.loan_payments 
ADD COLUMN IF NOT EXISTS rejected_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 7. Add approval tracking columns
ALTER TABLE public.loan_payments 
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 8. Add failed payment tracking
ALTER TABLE public.loan_payments 
ADD COLUMN IF NOT EXISTS failed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS failure_reason text,
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0 CHECK (retry_count >= 0);

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON public.loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_status ON public.loan_payments(status);
CREATE INDEX IF NOT EXISTS idx_loan_payments_reference_number ON public.loan_payments(reference_number);
CREATE INDEX IF NOT EXISTS idx_loan_payments_payment_date ON public.loan_payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_loan_payments_refund_status ON public.loan_payments(status) WHERE status LIKE 'refund%';

-- 10. Create updated_at trigger if it doesn't exist
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

-- 11. Create audit log trigger for payment status changes (if audit_logs table exists)
CREATE OR REPLACE FUNCTION log_loan_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Only insert if audit_logs table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
      INSERT INTO public.audit_logs (
        action,
        table_name,
        old_data,
        new_data,
        user_id,
        created_at
      ) VALUES (
        'loan_payment_status_change',
        'loan_payments',
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
        COALESCE(NEW.approved_by, NEW.rejected_by, NEW.processed_by),
        now()
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_loan_payment_status_change ON public.loan_payments;
CREATE TRIGGER trg_log_loan_payment_status_change
  AFTER UPDATE ON public.loan_payments
  FOR EACH ROW
  EXECUTE FUNCTION log_loan_payment_status_change();

-- 12. Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.loan_payments TO authenticated;
GRANT SELECT ON public.loan_payments TO anon;

-- 13. Add helpful comments
COMMENT ON TABLE public.loan_payments IS 'Stores loan payment transactions with comprehensive status and refund tracking';
COMMENT ON COLUMN public.loan_payments.status IS 'Payment status: pending, processing, completed, approved, rejected, failed, cancelled, refund_requested, refund_processing, refund_completed, refund_rejected, refund_failed';
COMMENT ON COLUMN public.loan_payments.refund_requested_at IS 'Timestamp when refund was requested';
COMMENT ON COLUMN public.loan_payments.refund_reason IS 'Reason for requesting refund';
COMMENT ON COLUMN public.loan_payments.rejected_at IS 'Timestamp when payment was rejected';
COMMENT ON COLUMN public.loan_payments.rejection_reason IS 'Reason for payment rejection';
COMMENT ON COLUMN public.loan_payments.approved_at IS 'Timestamp when payment was approved';
COMMENT ON COLUMN public.loan_payments.failed_at IS 'Timestamp when payment failed';
COMMENT ON COLUMN public.loan_payments.failure_reason IS 'Reason for payment failure';

-- 14. Verify and output results
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
