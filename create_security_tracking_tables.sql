
-- Create login_history table
CREATE TABLE IF NOT EXISTS public.login_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  login_time timestamp with time zone DEFAULT now(),
  success boolean DEFAULT true,
  ip_address text,
  user_agent text,
  device_type text,
  browser text,
  os text,
  city text,
  country text,
  latitude numeric,
  longitude numeric,
  failure_reason text,
  CONSTRAINT login_history_pkey PRIMARY KEY (id),
  CONSTRAINT login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_login_time ON public.login_history(login_time DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_success ON public.login_history(success);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text,
  ip_address text,
  user_agent text,
  device_type text,
  created_at timestamp with time zone DEFAULT now(),
  last_activity timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  ended_at timestamp with time zone,
  CONSTRAINT user_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON public.user_sessions(is_active);

-- Create suspicious_activity table
CREATE TABLE IF NOT EXISTS public.suspicious_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  description text,
  risk_level text DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  ip_address text,
  user_agent text,
  resolved boolean DEFAULT false,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT suspicious_activity_pkey PRIMARY KEY (id),
  CONSTRAINT suspicious_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT suspicious_activity_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_user_id ON public.suspicious_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_resolved ON public.suspicious_activity(resolved);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_risk_level ON public.suspicious_activity(risk_level);

-- Enable RLS on all tables
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suspicious_activity ENABLE ROW LEVEL SECURITY;

-- Create policies for admins
CREATE POLICY "Admins can view login history" ON public.login_history
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid()));

CREATE POLICY "Admins can view user sessions" ON public.user_sessions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid()));

CREATE POLICY "Admins can view suspicious activity" ON public.suspicious_activity
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE admin_profiles.id = auth.uid()));

-- Grant permissions
GRANT SELECT ON public.login_history TO authenticated;
GRANT SELECT ON public.user_sessions TO authenticated;
GRANT ALL ON public.suspicious_activity TO authenticated;
GRANT ALL ON public.login_history TO service_role;
GRANT ALL ON public.user_sessions TO service_role;
GRANT ALL ON public.suspicious_activity TO service_role;
