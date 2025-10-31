
-- Add custom_emails column to bank_details table
-- This will store additional email addresses as a JSON array

ALTER TABLE bank_details 
ADD COLUMN IF NOT EXISTS custom_emails JSONB DEFAULT NULL;

-- Add a comment to describe the column
COMMENT ON COLUMN bank_details.custom_emails IS 'Array of custom email objects with id, label, and value fields for additional bank email addresses';

-- Optional: Add other commonly used columns if they don't exist
ALTER TABLE bank_details 
ADD COLUMN IF NOT EXISTS email_support TEXT,
ADD COLUMN IF NOT EXISTS email_loans TEXT,
ADD COLUMN IF NOT EXISTS fax TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS customer_service_hours TEXT,
ADD COLUMN IF NOT EXISTS additional_info TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bank_details'
AND column_name = 'custom_emails';
