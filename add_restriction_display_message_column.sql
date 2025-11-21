
-- Add restriction_display_message column to account_restriction_reasons
ALTER TABLE public.account_restriction_reasons
ADD COLUMN IF NOT EXISTS restriction_display_message text;

-- Add restriction_display_message column to account_restoration_reasons  
ALTER TABLE public.account_restoration_reasons
ADD COLUMN IF NOT EXISTS restriction_display_message text;

-- Update existing records to have a default message if null
UPDATE public.account_restriction_reasons
SET restriction_display_message = reason_text
WHERE restriction_display_message IS NULL;

UPDATE public.account_restoration_reasons
SET restriction_display_message = reason_text
WHERE restriction_display_message IS NULL;
