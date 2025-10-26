-- Drop existing trigger if it exists (with CASCADE to handle dependencies)
DROP TRIGGER IF EXISTS on_application_approved ON public.applications CASCADE;
DROP TRIGGER IF EXISTS application_approved_trigger ON public.applications CASCADE;
DROP FUNCTION IF EXISTS handle_application_approval() CASCADE;

-- Function to generate a unique account number
CREATE OR REPLACE FUNCTION generate_account_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  is_unique BOOLEAN := FALSE;
BEGIN
  WHILE NOT is_unique LOOP
    new_number := '1234' || LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');

    SELECT NOT EXISTS (
      SELECT 1 FROM public.accounts WHERE account_number = new_number
    ) INTO is_unique;
  END LOOP;

  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate a unique card number based on brand
CREATE OR REPLACE FUNCTION generate_card_number(brand TEXT)
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  is_unique BOOLEAN := FALSE;
  prefix TEXT;
BEGIN
  -- Set prefix based on card brand
  CASE brand
    WHEN 'visa' THEN prefix := '4';
    WHEN 'mastercard' THEN prefix := '5';
    WHEN 'amex' THEN prefix := '34';
    ELSE prefix := '4'; -- Default to Visa
  END CASE;

  WHILE NOT is_unique LOOP
    IF brand = 'amex' THEN
      -- Amex has 15 digits
      new_number := prefix || LPAD(FLOOR(RANDOM() * 10000000000000)::TEXT, 13, '0');
    ELSE
      -- Visa and Mastercard have 16 digits
      new_number := prefix || LPAD(FLOOR(RANDOM() * 1000000000000000)::TEXT, 15, '0');
    END IF;

    SELECT NOT EXISTS (
      SELECT 1 FROM public.cards WHERE card_number = new_number
    ) INTO is_unique;
  END LOOP;

  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate CVC
CREATE OR REPLACE FUNCTION generate_cvc(brand TEXT)
RETURNS TEXT AS $$
BEGIN
  IF brand = 'amex' THEN
    RETURN LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  ELSE
    RETURN LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to generate expiry date (3 years from now)
CREATE OR REPLACE FUNCTION generate_expiry_date()
RETURNS DATE AS $$
BEGIN
  RETURN (CURRENT_DATE + INTERVAL '3 years')::DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to generate a secure temporary password
CREATE OR REPLACE FUNCTION generate_temp_password()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  special_chars TEXT := '!@#$%&*';
  password TEXT := 'Oak';
  i INTEGER;
BEGIN
  -- Add 8 random alphanumeric characters
  FOR i IN 1..8 LOOP
    password := password || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;

  -- Add a special character
  password := password || substr(special_chars, floor(random() * length(special_chars) + 1)::int, 1);

  -- Add timestamp suffix for uniqueness
  password := password || substr(floor(extract(epoch from now()))::text, -4);

  RETURN password;
END;
$$ LANGUAGE plpgsql;

-- Main function to handle application approval
CREATE OR REPLACE FUNCTION handle_application_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_account_number TEXT;
  v_card_number TEXT;
  v_cvc TEXT;
  v_expiry_date DATE;
  v_account_id UUID;
  v_card_brand TEXT;
  v_card_category TEXT;
  v_daily_limit NUMERIC;
  v_monthly_limit NUMERIC;
  v_account_type TEXT;
  v_initial_balance NUMERIC;
  v_account_types TEXT[];
  v_temp_password TEXT;
  v_auth_user_id UUID;
  old_app_data JSONB;
  new_app_data JSONB;
  v_enrollment_token TEXT;
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.application_status = 'approved' AND
     (OLD.application_status IS NULL OR OLD.application_status != 'approved') THEN

    -- Prepare audit log data
    old_app_data := to_jsonb(OLD);
    new_app_data := to_jsonb(NEW);

    -- Generate temporary password
    v_temp_password := generate_temp_password();

    -- NOTE: Supabase auth user creation must be done via API
    -- We'll store the temp password in email_queue for the API to use
    -- The API endpoint will read from email_queue and create the auth user

    -- Get card preferences from application
    v_card_brand := COALESCE(NEW.chosen_card_brand, 'visa');
    v_card_category := COALESCE(NEW.chosen_card_category, 'debit');

    -- Get account types (default to checking if not specified)
    v_account_types := COALESCE(NEW.account_types, ARRAY['checking_account']::TEXT[]);

    -- Ensure checking_account is always included
    IF NOT ('checking_account' = ANY(v_account_types)) THEN
      v_account_types := array_prepend('checking_account', v_account_types);
    END IF;

    -- Generate a unique enrollment token for this approval
    v_enrollment_token := encode(gen_random_bytes(32), 'hex');

    -- Loop through each account type to create
    FOREACH v_account_type IN ARRAY v_account_types LOOP

      -- Determine initial balance based on account type
      CASE v_account_type
        WHEN 'checking_account' THEN v_initial_balance := 100.00;
        WHEN 'savings_account' THEN v_initial_balance := 0.00;
        WHEN 'business_checking' THEN v_initial_balance := 500.00;
        WHEN 'business_savings' THEN v_initial_balance := 250.00;
        WHEN 'student_checking' THEN v_initial_balance := 25.00;
        WHEN 'money_market' THEN v_initial_balance := 1000.00;
        WHEN 'certificate_of_deposit' THEN v_initial_balance := 5000.00;
        WHEN 'retirement_ira' THEN v_initial_balance := 0.00;
        WHEN 'joint_checking' THEN v_initial_balance := 100.00;
        WHEN 'trust_account' THEN v_initial_balance := 10000.00;
        WHEN 'investment_brokerage' THEN v_initial_balance := 2500.00;
        WHEN 'high_yield_savings' THEN v_initial_balance := 500.00;
        ELSE v_initial_balance := 0.00;
      END CASE;

      -- Generate or use manual account number
      IF NEW.manual_account_number IS NOT NULL AND NEW.manual_account_number != '' THEN
        -- Check if manual account number is unique
        IF EXISTS (SELECT 1 FROM public.accounts WHERE account_number = NEW.manual_account_number) THEN
          RAISE EXCEPTION 'Account number % already exists', NEW.manual_account_number;
        END IF;
        v_account_number := NEW.manual_account_number;
      ELSE
        v_account_number := generate_account_number();
      END IF;

      -- Create account (user_id will be updated later by API)
      INSERT INTO public.accounts (
        user_id,
        application_id,
        account_number,
        routing_number,
        account_type,
        balance,
        status,
        created_at,
        updated_at
      ) VALUES (
        NULL, -- Will be set by API after auth user creation
        NEW.id,
        v_account_number,
        '075915826',
        v_account_type,
        v_initial_balance,
        'active',
        NOW(),
        NOW()
      ) RETURNING id INTO v_account_id;

      -- Determine card limits based on account type
      CASE v_account_type
        WHEN 'checking_account' THEN
          v_daily_limit := 5000;
          v_monthly_limit := 20000;
        WHEN 'business_checking' THEN
          v_daily_limit := 15000;
          v_monthly_limit := 50000;
        WHEN 'student_checking' THEN
          v_daily_limit := 1000;
          v_monthly_limit := 3000;
        ELSE
          v_daily_limit := 5000;
          v_monthly_limit := 20000;
      END CASE;

      -- Generate card details
      v_card_number := generate_card_number(v_card_brand);
      v_cvc := generate_cvc(v_card_brand);
      v_expiry_date := generate_expiry_date();

      -- Create card for the account (user_id will be updated later by API)
      INSERT INTO public.cards (
        user_id,
        account_id,
        card_number,
        card_type,
        card_brand,
        card_category,
        status,
        expiry_date,
        cvc,
        daily_limit,
        monthly_limit,
        daily_spent,
        monthly_spent,
        is_locked,
        contactless,
        requires_3d_secure,
        created_at,
        updated_at,
        activated_at
      ) VALUES (
        NULL, -- Will be set by API after auth user creation
        v_account_id,
        v_card_number,
        v_card_category,
        v_card_brand,
        v_card_category,
        'active',
        v_expiry_date,
        v_cvc,
        v_daily_limit,
        v_monthly_limit,
        0,
        0,
        FALSE,
        TRUE,
        TRUE,
        NOW(),
        NOW(),
        NOW()
      );

    END LOOP;

    -- Queue email with auth user creation instructions
    -- The API will pick this up and create the auth user + send welcome email
    INSERT INTO public.email_queue (
      user_id,
      email,
      subject,
      body,
      sent,
      created_at,
      updated_at
    ) VALUES (
      NULL, -- Will be set after auth user creation
      NEW.email,
      'PENDING_AUTH_USER_CREATION',
      jsonb_build_object(
        'temp_password', v_temp_password,
        'application_id', NEW.id,
        'enrollment_token', v_enrollment_token,
        'first_name', NEW.first_name,
        'last_name', NEW.last_name,
        'middle_name', COALESCE(NEW.middle_name, ''),
        'email', NEW.email
      )::text,
      FALSE,
      NOW(),
      NOW()
    );

    -- Create audit log entry
    INSERT INTO public.audit_logs (
      user_id,
      action,
      table_name,
      old_data,
      new_data,
      created_at,
      updated_at
    ) VALUES (
      NULL, -- Will be set after auth user creation
      'APPLICATION_APPROVED',
      'applications',
      old_app_data,
      new_app_data,
      NOW(),
      NOW()
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER on_application_approved
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION handle_application_approval();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_account_number() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION generate_card_number(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION generate_cvc(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION generate_expiry_date() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION generate_temp_password() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION handle_application_approval() TO authenticated, service_role;