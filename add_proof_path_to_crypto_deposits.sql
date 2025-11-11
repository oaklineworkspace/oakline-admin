
-- Add proof_path column to crypto_deposits table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='crypto_deposits' AND column_name='proof_path'
  ) THEN
    ALTER TABLE public.crypto_deposits 
    ADD COLUMN proof_path text;
  END IF;
END $$;
