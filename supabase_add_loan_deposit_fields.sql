-- Add purpose and loan_id fields to crypto_deposits table for loan requirement deposits

ALTER TABLE public.crypto_deposits 
ADD COLUMN IF NOT EXISTS purpose text DEFAULT 'general_deposit' CHECK (purpose = ANY (ARRAY['general_deposit'::text, 'loan_requirement'::text])),
ADD COLUMN IF NOT EXISTS loan_id uuid REFERENCES public.loans(id);

-- Add deposit_status field to loans table to track deposit verification status
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS deposit_status text DEFAULT 'pending' CHECK (deposit_status = ANY (ARRAY['pending'::text, 'completed'::text, 'not_required'::text]));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_crypto_deposits_loan_id ON public.crypto_deposits(loan_id);
CREATE INDEX IF NOT EXISTS idx_crypto_deposits_purpose ON public.crypto_deposits(purpose);

COMMENT ON COLUMN public.crypto_deposits.purpose IS 'Purpose of the deposit: general_deposit or loan_requirement';
COMMENT ON COLUMN public.crypto_deposits.loan_id IS 'Associated loan ID if purpose is loan_requirement';
COMMENT ON COLUMN public.loans.deposit_status IS 'Status of the required loan deposit: pending, completed, or not_required';
