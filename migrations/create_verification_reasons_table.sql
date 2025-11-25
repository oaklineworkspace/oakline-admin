
-- Create verification reasons table
-- This table stores predefined professional reasons for requiring selfie/video verification
-- Each reason includes the appropriate bank contact email and display message

CREATE TABLE IF NOT EXISTS public.verification_reasons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  verification_type text NOT NULL CHECK (verification_type = ANY (ARRAY[
    'selfie'::text,
    'video'::text,
    'liveness'::text,
    'document'::text,
    'identity'::text
  ])),
  category text NOT NULL,
  reason_text text NOT NULL,
  contact_email text NOT NULL,
  severity_level text CHECK (severity_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  requires_immediate_action boolean DEFAULT false,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  default_display_message text,
  verification_deadline_hours integer DEFAULT 168, -- 7 days default
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT verification_reasons_pkey PRIMARY KEY (id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_verification_reasons_type ON public.verification_reasons(verification_type);
CREATE INDEX IF NOT EXISTS idx_verification_reasons_active ON public.verification_reasons(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_verification_reasons_category ON public.verification_reasons(category);

-- Add comments
COMMENT ON TABLE public.verification_reasons IS 'Professional verification requirement reasons with department-specific contact emails';
COMMENT ON COLUMN public.verification_reasons.verification_type IS 'Type of verification required: selfie, video, liveness, document, identity';
COMMENT ON COLUMN public.verification_reasons.default_display_message IS 'Default message shown to users when verification is required';
COMMENT ON COLUMN public.verification_reasons.verification_deadline_hours IS 'Hours until verification requirement expires (default 168 = 7 days)';
