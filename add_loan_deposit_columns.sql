-- Add purpose and loan_id fields to crypto_deposits table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crypto_deposits' AND column_name='purpose') THEN
    ALTER TABLE public.crypto_deposits 
    ADD COLUMN purpose text DEFAULT 'general_deposit' CHECK (purpose = ANY (ARRAY['general_deposit'::text, 'loan_requirement'::text]));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crypto_deposits' AND column_name='loan_id') THEN
    ALTER TABLE public.crypto_deposits 
    ADD COLUMN loan_id uuid REFERENCES public.loans(id);
  END IF;
END $$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_crypto_deposits_loan_id ON public.crypto_deposits(loan_id);
CREATE INDEX IF NOT EXISTS idx_crypto_deposits_purpose ON public.crypto_deposits(purpose);
