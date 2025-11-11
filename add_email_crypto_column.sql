
-- Add email_crypto column to bank_details table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='bank_details' AND column_name='email_crypto'
  ) THEN
    ALTER TABLE public.bank_details 
    ADD COLUMN email_crypto text DEFAULT 'crypto@theoaklinebank.com';
    
    -- Update existing row if it exists
    UPDATE public.bank_details 
    SET email_crypto = 'crypto@theoaklinebank.com' 
    WHERE email_crypto IS NULL;
  END IF;
END $$;
