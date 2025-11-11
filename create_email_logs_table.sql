-- Create email_logs table to track which SMTP provider sends each email
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_user_id uuid,
  subject text,
  email_type text,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  message_id text,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_logs_pkey PRIMARY KEY (id),
  CONSTRAINT email_logs_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_email ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_provider ON public.email_logs(provider);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all logs
CREATE POLICY "Admin can view email logs" ON public.email_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );
-- Create email_logs table to track which SMTP provider sends each email
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_user_id uuid,
  subject text,
  email_type text,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  message_id text,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_logs_pkey PRIMARY KEY (id),
  CONSTRAINT email_logs_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_email ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_provider ON public.email_logs(provider);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_user_id ON public.email_logs(recipient_user_id);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all logs
CREATE POLICY "Admin can view email logs" ON public.email_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

-- Comment on table
COMMENT ON TABLE public.email_logs IS 'Tracks all emails sent through the system including SMTP provider information';
COMMENT ON COLUMN public.email_logs.provider IS 'SMTP provider used to send the email (smtp1, smtp2, smtp3, smtp4, smtp5)';
COMMENT ON COLUMN public.email_logs.email_type IS 'Type of email sent (e.g., account_approval, loan_approval, password_reset)';
COMMENT ON COLUMN public.email_logs.metadata IS 'Additional metadata about the email such as template variables';
