
-- ============================================================================
-- FIX LOAN DEPOSIT TRACKING WORKFLOW
-- This SQL adds the missing columns needed for proper loan deposit tracking
-- ============================================================================

-- 1. Add purpose and loan_id to crypto_deposits table
ALTER TABLE public.crypto_deposits 
ADD COLUMN IF NOT EXISTS purpose text DEFAULT 'general_deposit' 
  CHECK (purpose = ANY (ARRAY['general_deposit'::text, 'loan_requirement'::text])),
ADD COLUMN IF NOT EXISTS loan_id uuid REFERENCES public.loans(id) ON DELETE SET NULL;

-- 2. Add deposit_status to loans table
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS deposit_status text DEFAULT 'pending' 
  CHECK (deposit_status = ANY (ARRAY['pending'::text, 'completed'::text, 'not_required'::text]));

-- 3. Add approved_amount to track the exact approved deposit amount
ALTER TABLE public.crypto_deposits
ADD COLUMN IF NOT EXISTS approved_amount numeric DEFAULT 0 CHECK (approved_amount >= 0::numeric);

-- 4. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_crypto_deposits_loan_id ON public.crypto_deposits(loan_id);
CREATE INDEX IF NOT EXISTS idx_crypto_deposits_purpose ON public.crypto_deposits(purpose);
CREATE INDEX IF NOT EXISTS idx_crypto_deposits_status ON public.crypto_deposits(status);
CREATE INDEX IF NOT EXISTS idx_crypto_deposits_user_id_status ON public.crypto_deposits(user_id, status);
CREATE INDEX IF NOT EXISTS idx_loans_deposit_status ON public.loans(deposit_status);
CREATE INDEX IF NOT EXISTS idx_loans_user_status ON public.loans(user_id, status);

-- 5. Add comments for documentation
COMMENT ON COLUMN public.crypto_deposits.purpose IS 'Purpose of deposit: general_deposit or loan_requirement';
COMMENT ON COLUMN public.crypto_deposits.loan_id IS 'Associated loan ID if purpose is loan_requirement';
COMMENT ON COLUMN public.crypto_deposits.approved_amount IS 'Amount approved by admin (may differ from submitted amount)';
COMMENT ON COLUMN public.loans.deposit_status IS 'Tracks loan deposit verification: pending, completed, or not_required';

-- 6. Update existing loans without deposit requirement
UPDATE public.loans 
SET deposit_status = 'not_required' 
WHERE deposit_required = 0 OR deposit_required IS NULL;

-- 7. Update existing loans with deposit requirement but already paid
UPDATE public.loans 
SET deposit_status = 'completed' 
WHERE deposit_required > 0 AND deposit_paid = true;

-- 8. Create a function to auto-update loan deposit_status when crypto deposit is approved
CREATE OR REPLACE FUNCTION update_loan_deposit_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if this is a loan requirement deposit and status changed to completed
  IF NEW.purpose = 'loan_requirement' 
     AND NEW.loan_id IS NOT NULL 
     AND NEW.status = 'completed' 
     AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    UPDATE public.loans
    SET 
      deposit_status = 'completed',
      deposit_paid = true,
      deposit_amount = NEW.approved_amount,
      deposit_date = NEW.completed_at,
      deposit_method = 'crypto',
      updated_at = now()
    WHERE id = NEW.loan_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger to automatically update loan status
DROP TRIGGER IF EXISTS trg_update_loan_deposit_status ON public.crypto_deposits;
CREATE TRIGGER trg_update_loan_deposit_status
  AFTER UPDATE ON public.crypto_deposits
  FOR EACH ROW
  EXECUTE FUNCTION update_loan_deposit_status();

-- 10. Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'Schema update completed successfully!';
  RAISE NOTICE 'crypto_deposits now has: purpose, loan_id, approved_amount columns';
  RAISE NOTICE 'loans now has: deposit_status column';
  RAISE NOTICE 'Indexes created for better performance';
  RAISE NOTICE 'Trigger created to auto-update loan deposit status';
END $$;
