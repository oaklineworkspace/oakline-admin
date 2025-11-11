
-- ============================================================================
-- AUTO-SEND ADMIN NOTIFICATION ON NEW APPLICATION SUBMISSION
-- This trigger automatically sends an email to info@theoaklinebank.com
-- when a user submits an application from the frontend repository
-- ============================================================================

-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

-- Function that sends admin notification via HTTP request
CREATE OR REPLACE FUNCTION notify_admin_on_new_application()
RETURNS trigger AS $$
DECLARE
  admin_api_url text := 'https://oakline-controller.theoaklinebank/api/send-admin-application-notification';
  request_id bigint;
BEGIN
  -- Only send notification for new applications with 'pending' status
  IF NEW.application_status = 'pending' OR NEW.application_status IS NULL THEN
    -- Make HTTP POST request to admin notification API using pg_net
    BEGIN
      SELECT net.http_post(
        url := admin_api_url,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
          'applicationId', NEW.id,
          'applicantName', NEW.first_name || ' ' || NEW.last_name,
          'applicantEmail', NEW.email
        )::jsonb
      ) INTO request_id;
      
      RAISE NOTICE 'Admin notification queued for application % (request_id: %)', NEW.id, request_id;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the application insertion
      RAISE WARNING 'Failed to queue admin notification for application %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_notify_admin_on_application ON public.applications;

-- Create trigger that fires AFTER INSERT
CREATE TRIGGER trigger_notify_admin_on_application
  AFTER INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_new_application();

-- ============================================================================
-- SETUP COMPLETE!
-- Now whenever a user submits an application from the frontend,
-- info@theoaklinebank.com will automatically receive an email notification.
-- ============================================================================

COMMENT ON FUNCTION notify_admin_on_new_application() IS 
'Automatically sends email notification to info@theoaklinebank.com when a new application is submitted';

COMMENT ON TRIGGER trigger_notify_admin_on_application ON public.applications IS 
'Triggers admin notification email on new application submission';
