-- Create table for account restoration reasons
-- This table stores predefined reasons for restoring user access
-- (unban, lift suspension, unlock account, etc.)

CREATE TABLE IF NOT EXISTS public.account_restoration_reasons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  action_type text NOT NULL CHECK (action_type = ANY (ARRAY['unban_user'::text, 'lift_suspension'::text, 'unlock_account'::text, 'reactivate_account'::text])),
  category text NOT NULL,
  reason_text text NOT NULL,
  contact_email text NOT NULL,
  severity_level text CHECK (severity_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  requires_immediate_action boolean DEFAULT false,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT account_restoration_reasons_pkey PRIMARY KEY (id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_account_restoration_reasons_action_type ON public.account_restoration_reasons(action_type);
CREATE INDEX IF NOT EXISTS idx_account_restoration_reasons_is_active ON public.account_restoration_reasons(is_active);

-- Insert default restoration reasons
INSERT INTO public.account_restoration_reasons (action_type, category, reason_text, contact_email, severity_level, display_order, is_active)
VALUES
  ('unban_user', 'Appeals', 'User appealed ban decision', 'support@theoaklinebank.com', 'medium', 1, true),
  ('unban_user', 'Appeals', 'Ban was applied in error', 'support@theoaklinebank.com', 'high', 2, true),
  ('unban_user', 'Compliance', 'Compliance review completed - account cleared', 'compliance@theoaklinebank.com', 'medium', 3, true),
  ('unban_user', 'Legal', 'Legal order to restore account', 'legal@theoaklinebank.com', 'critical', 4, true),
  ('lift_suspension', 'Appeals', 'User appealed suspension', 'support@theoaklinebank.com', 'medium', 5, true),
  ('lift_suspension', 'Compliance', 'Suspension period completed', 'support@theoaklinebank.com', 'low', 6, true),
  ('lift_suspension', 'Compliance', 'Compliance issue resolved', 'compliance@theoaklinebank.com', 'medium', 7, true),
  ('lift_suspension', 'Other', 'Administrative review - restore access', 'support@theoaklinebank.com', 'medium', 8, true),
  ('unlock_account', 'Security', 'Verified user identity - account cleared', 'security@theoaklinebank.com', 'medium', 9, true),
  ('unlock_account', 'Technical', 'Technical issue resolved', 'support@theoaklinebank.com', 'low', 10, true),
  ('reactivate_account', 'User Request', 'User requested account reactivation', 'support@theoaklinebank.com', 'low', 11, true),
  ('reactivate_account', 'Compliance', 'Compliance requirements met', 'compliance@theoaklinebank.com', 'medium', 12, true)
ON CONFLICT DO NOTHING;
