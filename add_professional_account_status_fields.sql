
-- Add professional account status fields to profiles table
-- This enables comprehensive tracking of user account states with professional messaging

-- Step 1: Add status field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' 
CHECK (status = ANY (ARRAY[
  'active'::text,
  'suspended'::text,
  'closed'::text,
  'pending'::text,
  'under_review'::text,
  'restricted'::text
]));

-- Step 2: Add account_locked field to user_security_settings
ALTER TABLE public.user_security_settings
ADD COLUMN IF NOT EXISTS account_locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_reason text,
ADD COLUMN IF NOT EXISTS locked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS locked_by uuid REFERENCES auth.users(id);

-- Step 3: Add status change tracking fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status_changed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS status_changed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS status_reason text,
ADD COLUMN IF NOT EXISTS suspension_start_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS suspension_end_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS account_closed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS account_closed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS closure_reason text;

-- Step 4: Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_security_settings_account_locked ON public.user_security_settings(account_locked);

-- Step 5: Create audit log table for account status changes
CREATE TABLE IF NOT EXISTS public.account_status_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  changed_by uuid,
  old_status text,
  new_status text,
  old_is_banned boolean,
  new_is_banned boolean,
  old_account_locked boolean,
  new_account_locked boolean,
  reason text,
  action_type text CHECK (action_type = ANY (ARRAY[
    'status_change'::text,
    'ban'::text,
    'unban'::text,
    'lock'::text,
    'unlock'::text,
    'suspend'::text,
    'reactivate'::text,
    'close'::text
  ])),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT account_status_audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT account_status_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT account_status_audit_log_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id)
);

-- Step 6: Create index for audit log
CREATE INDEX IF NOT EXISTS idx_account_status_audit_log_user_id ON public.account_status_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_account_status_audit_log_created_at ON public.account_status_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_status_audit_log_action_type ON public.account_status_audit_log(action_type);

-- Step 7: Enable RLS on audit log
ALTER TABLE public.account_status_audit_log ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for audit log (admin access only)
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

-- Step 9: Create trigger function to log status changes
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
      action_type,
      metadata
    ) VALUES (
      NEW.id,
      NEW.status_changed_by,
      OLD.status,
      NEW.status,
      OLD.is_banned,
      NEW.is_banned,
      NEW.status_reason,
      CASE 
        WHEN NEW.is_banned = true AND OLD.is_banned = false THEN 'ban'
        WHEN NEW.is_banned = false AND OLD.is_banned = true THEN 'unban'
        WHEN NEW.status = 'suspended' THEN 'suspend'
        WHEN NEW.status = 'closed' THEN 'close'
        WHEN NEW.status = 'active' AND OLD.status != 'active' THEN 'reactivate'
        ELSE 'status_change'
      END,
      jsonb_build_object(
        'ban_reason', NEW.ban_reason,
        'status_reason', NEW.status_reason,
        'changed_at', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create trigger for profile status changes
DROP TRIGGER IF EXISTS trigger_log_account_status_change ON public.profiles;
CREATE TRIGGER trigger_log_account_status_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.is_banned IS DISTINCT FROM NEW.is_banned
  )
  EXECUTE FUNCTION log_account_status_change();

-- Step 11: Create trigger function to log security settings changes
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
      action_type,
      metadata
    ) VALUES (
      NEW.user_id,
      NEW.locked_by,
      OLD.account_locked,
      NEW.account_locked,
      NEW.locked_reason,
      CASE 
        WHEN NEW.account_locked = true THEN 'lock'
        ELSE 'unlock'
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

-- Step 12: Create trigger for security settings changes
DROP TRIGGER IF EXISTS trigger_log_security_settings_change ON public.user_security_settings;
CREATE TRIGGER trigger_log_security_settings_change
  AFTER UPDATE ON public.user_security_settings
  FOR EACH ROW
  WHEN (OLD.account_locked IS DISTINCT FROM NEW.account_locked)
  EXECUTE FUNCTION log_security_settings_change();

-- Step 13: Grant necessary permissions
GRANT SELECT ON public.account_status_audit_log TO authenticated;
GRANT INSERT ON public.account_status_audit_log TO authenticated;
GRANT ALL ON public.account_status_audit_log TO service_role;

-- Step 14: Add helpful comments
COMMENT ON COLUMN public.profiles.status IS 'Current account status: active, suspended, closed, pending, under_review, restricted';
COMMENT ON COLUMN public.profiles.status_reason IS 'Reason for current status (e.g., security concerns, user request)';
COMMENT ON COLUMN public.user_security_settings.account_locked IS 'Whether the account is locked for security reasons';
COMMENT ON COLUMN public.user_security_settings.locked_reason IS 'Reason why the account was locked';
COMMENT ON TABLE public.account_status_audit_log IS 'Audit trail for all account status changes including bans, locks, and suspensions';

-- Verification queries (run these to confirm the changes)
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name LIKE '%status%' OR column_name LIKE '%close%' OR column_name LIKE '%suspend%'
-- ORDER BY ordinal_position;

-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_security_settings' AND column_name LIKE '%lock%'
-- ORDER BY ordinal_position;
