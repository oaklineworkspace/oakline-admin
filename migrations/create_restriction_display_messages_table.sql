-- Create restriction_display_messages table
-- This table stores multiple display messages that can be used for each restriction reason

CREATE TABLE IF NOT EXISTS public.restriction_display_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restriction_reason_id uuid NOT NULL,
  message_text text NOT NULL,
  message_type text CHECK (message_type = ANY (ARRAY['standard'::text, 'urgent'::text, 'investigation'::text, 'temporary'::text, 'permanent'::text])),
  severity_level text CHECK (severity_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  is_default boolean DEFAULT false,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT restriction_display_messages_pkey PRIMARY KEY (id),
  CONSTRAINT restriction_display_messages_reason_fkey FOREIGN KEY (restriction_reason_id) REFERENCES public.account_restriction_reasons(id) ON DELETE CASCADE
);

-- Create index for faster lookups by restriction_reason_id
CREATE INDEX IF NOT EXISTS idx_restriction_display_messages_reason_id 
ON public.restriction_display_messages(restriction_reason_id);

-- Create index for active messages
CREATE INDEX IF NOT EXISTS idx_restriction_display_messages_active 
ON public.restriction_display_messages(is_active) WHERE is_active = true;

COMMENT ON TABLE public.restriction_display_messages IS 'Stores multiple user-facing display messages for each restriction reason';
COMMENT ON COLUMN public.restriction_display_messages.restriction_reason_id IS 'References the restriction reason from account_restriction_reasons table';
COMMENT ON COLUMN public.restriction_display_messages.message_text IS 'The actual message text shown to users when their account is restricted';
COMMENT ON COLUMN public.restriction_display_messages.message_type IS 'Type of message: standard, urgent, investigation, temporary, permanent';
COMMENT ON COLUMN public.restriction_display_messages.is_default IS 'Indicates if this is the default message for this restriction reason';
