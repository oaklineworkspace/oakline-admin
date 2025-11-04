-- Add approved_at column to loans table if it doesn't exist
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_loans_approved_at ON public.loans(approved_at);
