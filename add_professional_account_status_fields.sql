-- Add professional account status fields to profiles table
-- This enables comprehensive tracking of user account states with professional messaging

-- Step 1: Add status field to profiles table with comprehensive status options
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
CHECK (status IN ('active', 'suspended', 'closed', 'pending', 'under_review', 'restricted', 'locked', 'flagged'));

-- Add status_reason field to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status_reason TEXT;

-- Step 2: Add account_locked field to user_security_settings
ALTER TABLE public.user_security_settings
ADD COLUMN IF NOT EXISTS account_locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_reason text,
ADD COLUMN IF NOT EXISTS locked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS locked_by uuid REFERENCES auth.users(id);

-- Step 3: Create comprehensive account_status_audit_log table
CREATE TABLE IF NOT EXISTS public.account_status_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  changed_by UUID REFERENCES auth.users(id),
  old_status TEXT,
  new_status TEXT,
  old_is_banned BOOLEAN,
  new_is_banned BOOLEAN,
  old_account_locked BOOLEAN,
  new_account_locked BOOLEAN,
  reason TEXT NOT NULL,
  reason_category TEXT,
  action_type TEXT CHECK (action_type IN ('ban', 'unban', 'suspend', 'activate', 'close', 'lock', 'unlock', 'restrict', 'flag', 'unflag')),
  action_description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_account_status_audit_user_id ON public.account_status_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_account_status_audit_created_at ON public.account_status_audit_log(created_at DESC);

-- Step 4: Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_security_settings_account_locked ON public.user_security_settings(account_locked);

-- Step 5: Add status change tracking fields to profiles (moved from original Step 3)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status_changed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS status_changed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS suspension_start_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS suspension_end_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS account_closed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS account_closed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS closure_reason text;

-- Step 6: Enable RLS on audit log
ALTER TABLE public.account_status_audit_log ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for audit log (admin access only)
CREATE POLICY "Admins can view account status audit log"
  ON public.account_status_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert account status audit log"
  ON public.account_status_audit_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

-- Step 8: Create trigger function to log status changes
CREATE OR REPLACE FUNCTION log_account_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF (OLD.status IS DISTINCT FROM NEW.status) OR
     (OLD.is_banned IS DISTINCT FROM NEW.is_banned) THEN
    INSERT INTO public.account_status_audit_log (
      user_id,
      changed_by,
      old_status,
      new_status,
      old_is_banned,
      new_is_banned,
      reason,
      reason_category,
      action_type,
      action_description,
      metadata
    ) VALUES (
      NEW.id,
      NEW.status_changed_by,
      OLD.status,
      NEW.status,
      OLD.is_banned,
      NEW.is_banned,
      NEW.status_reason,
      -- Assuming reason_category can be derived or passed
      CASE
        WHEN NEW.status = 'suspended' THEN 'Suspension'
        WHEN NEW.status = 'closed' THEN 'Closure'
        WHEN NEW.is_banned = true THEN 'Ban'
        ELSE 'Other'
      END,
      CASE
        WHEN NEW.is_banned = true AND OLD.is_banned = false THEN 'ban'
        WHEN NEW.is_banned = false AND OLD.is_banned = true THEN 'unban'
        WHEN NEW.status = 'suspended' THEN 'suspend'
        WHEN NEW.status = 'closed' THEN 'close'
        WHEN NEW.status = 'active' AND OLD.status != 'active' THEN 'reactivate'
        WHEN NEW.status = 'locked' THEN 'lock'
        WHEN NEW.status = 'flagged' THEN 'flag'
        ELSE 'status_change'
      END,
      -- Assuming action_description can be derived or passed
      CASE
        WHEN NEW.status = 'suspended' THEN 'User account has been suspended.'
        WHEN NEW.status = 'closed' THEN 'User account has been closed.'
        WHEN NEW.is_banned = true THEN 'User account has been banned.'
        WHEN NEW.status = 'locked' THEN 'User account has been locked.'
        WHEN NEW.status = 'flagged' THEN 'User account has been flagged.'
        ELSE 'Account status changed.'
      END,
      jsonb_build_object(
        'ban_reason', NEW.ban_reason, -- Assuming ban_reason exists or is mapped from status_reason
        'status_reason', NEW.status_reason,
        'changed_at', now()
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create trigger for profile status changes
DROP TRIGGER IF EXISTS trigger_log_account_status_change ON public.profiles;
CREATE TRIGGER trigger_log_account_status_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.is_banned IS DISTINCT FROM NEW.is_banned
  )
  EXECUTE FUNCTION log_account_status_change();

-- Step 10: Create trigger function to log security settings changes
CREATE OR REPLACE FUNCTION log_security_settings_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.account_locked IS DISTINCT FROM NEW.account_locked) THEN
    INSERT INTO public.account_status_audit_log (
      user_id,
      changed_by,
      old_account_locked,
      new_account_locked,
      reason,
      reason_category,
      action_type,
      action_description,
      metadata
    ) VALUES (
      NEW.user_id,
      NEW.locked_by,
      OLD.account_locked,
      NEW.account_locked,
      NEW.locked_reason,
      'Lock/Unlock',
      CASE
        WHEN NEW.account_locked = true THEN 'lock'
        ELSE 'unlock'
      END,
      CASE
        WHEN NEW.account_locked = true THEN 'User account has been locked due to security reasons.'
        ELSE 'User account has been unlocked.'
      END,
      jsonb_build_object(
        'locked_reason', NEW.locked_reason,
        'locked_at', NEW.locked_at,
        'changed_at', now()
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Create trigger for security settings changes
DROP TRIGGER IF EXISTS trigger_log_security_settings_change ON public.user_security_settings;
CREATE TRIGGER trigger_log_security_settings_change
  AFTER UPDATE ON public.user_security_settings
  FOR EACH ROW
  WHEN (OLD.account_locked IS DISTINCT FROM NEW.account_locked)
  EXECUTE FUNCTION log_security_settings_change();

-- Step 12: Grant necessary permissions
GRANT SELECT ON public.account_status_audit_log TO authenticated;
GRANT INSERT ON public.account_status_audit_log TO authenticated;
GRANT ALL ON public.account_status_audit_log TO service_role;

-- Step 13: Add helpful comments
COMMENT ON COLUMN public.profiles.status IS 'Current account status: active, suspended, closed, pending, under_review, restricted, locked, flagged';
COMMENT ON COLUMN public.profiles.status_reason IS 'Detailed reason for the current account status';
COMMENT ON COLUMN public.user_security_settings.account_locked IS 'Whether the account is locked for security reasons';
COMMENT ON COLUMN public.user_security_settings.locked_reason IS 'Detailed reason why the account was locked';
COMMENT ON TABLE public.account_status_audit_log IS 'Audit trail for all account status changes including bans, locks, suspensions, closures, flags, and restrictions';

-- Verification queries (run these to confirm the changes)
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'profiles' AND column_name IN ('status', 'status_reason', 'suspension_start_date', 'suspension_end_date', 'account_closed_at', 'closure_reason')
-- ORDER BY ordinal_position;

-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'user_security_settings' AND column_name LIKE '%lock%'
-- ORDER BY ordinal_position;

-- SELECT * FROM public.account_status_audit_log LIMIT 10;