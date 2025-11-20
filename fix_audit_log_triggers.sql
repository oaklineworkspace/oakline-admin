-- Fix account_status_audit_log triggers by removing reason_category column
-- This resolves the error: column "reason_category" does not exist

-- Step 1: Drop and recreate trigger function without reason_category
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
        WHEN NEW.status = 'locked' THEN 'lock'
        WHEN NEW.status = 'flagged' THEN 'flag'
        ELSE 'status_change'
      END,
      jsonb_build_object(
        'ban_reason', NEW.ban_reason,
        'status_reason', NEW.status_reason,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'changed_at', now()
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop and recreate security settings trigger function without reason_category
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

-- Note: Triggers are automatically updated when functions are replaced
-- No need to drop and recreate triggers as they reference the function by name
