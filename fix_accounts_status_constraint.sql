
-- Fix accounts table status constraint to include all status types used in the application

ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_status_check;

ALTER TABLE public.accounts ADD CONSTRAINT accounts_status_check 
CHECK (status = ANY (ARRAY[
  'pending_application'::text, 
  'pending'::text,
  'approved'::text, 
  'pending_funding'::text, 
  'active'::text, 
  'suspended'::text,
  'closed'::text,
  'rejected'::text
]));

-- Update any existing 'pending_application' records to 'pending' for consistency
-- (Only run this if you want to normalize the data)
-- UPDATE public.accounts SET status = 'pending' WHERE status = 'pending_application';
