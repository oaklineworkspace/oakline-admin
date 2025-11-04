
-- Add email_loans column to bank_details table if it doesn't exist
ALTER TABLE public.bank_details 
ADD COLUMN IF NOT EXISTS email_loans text DEFAULT 'loans@theoaklinebank.com';

-- Update existing record with default loan email
UPDATE public.bank_details 
SET email_loans = 'loans@theoaklinebank.com'
WHERE email_loans IS NULL;

COMMENT ON COLUMN public.bank_details.email_loans IS 'Email address for loan-related communications';
