
-- Fix users who have both is_banned = true AND status = 'suspended'
-- This should never happen - these states are mutually exclusive

-- Step 1: Identify conflicting users
SELECT 
  id, 
  email, 
  is_banned, 
  status, 
  ban_reason, 
  status_reason,
  banned_at,
  suspension_start_date
FROM public.profiles
WHERE is_banned = true AND status = 'suspended';

-- Step 2: Fix conflicting states - prioritize ban over suspension
-- If user is banned, clear suspension status
UPDATE public.profiles
SET 
  status = 'active',
  status_reason = NULL,
  suspension_start_date = NULL,
  suspension_end_date = NULL,
  status_changed_at = NOW()
WHERE is_banned = true AND status = 'suspended';

-- Step 3: Verify the fix
SELECT 
  id, 
  email, 
  is_banned, 
  status, 
  ban_reason, 
  status_reason,
  banned_at,
  suspension_start_date
FROM public.profiles
WHERE is_banned = true OR status = 'suspended'
ORDER BY 
  CASE 
    WHEN is_banned = true THEN 1 
    WHEN status = 'suspended' THEN 2 
    ELSE 3 
  END;

-- Step 4: Add a constraint to prevent this in the future (optional but recommended)
-- This will ensure that if is_banned = true, status cannot be 'suspended'
ALTER TABLE public.profiles
ADD CONSTRAINT check_ban_suspend_exclusive 
CHECK (
  NOT (is_banned = true AND status = 'suspended')
);

COMMENT ON CONSTRAINT check_ban_suspend_exclusive ON public.profiles IS 
'Ensures that a user cannot be both banned (is_banned=true) and suspended (status=suspended) simultaneously. These are mutually exclusive states.';
