
-- Add missing columns to bank_details table
ALTER TABLE public.bank_details 
ADD COLUMN IF NOT EXISTS email_info TEXT,
ADD COLUMN IF NOT EXISTS email_contact TEXT,
ADD COLUMN IF NOT EXISTS email_support TEXT,
ADD COLUMN IF NOT EXISTS email_loans TEXT,
ADD COLUMN IF NOT EXISTS email_notify TEXT,
ADD COLUMN IF NOT EXISTS email_updates TEXT,
ADD COLUMN IF NOT EXISTS email_welcome TEXT,
ADD COLUMN IF NOT EXISTS fax TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS customer_service_hours TEXT,
ADD COLUMN IF NOT EXISTS additional_info TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS custom_emails JSONB DEFAULT NULL;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bank_details' 
ORDER BY column_name;
