
-- Create activity tracking tables for user monitoring
-- Run this in your Supabase SQL editor

-- 1. System Logs Table (if not exists)
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  level text DEFAULT 'info' CHECK (level IN ('info', 'warning', 'error', 'critical')),
  type text NOT NULL,
  message text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON public.system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_type ON public.system_logs(type);

-- 2. Login History Table (if not exists)
CREATE TABLE IF NOT EXISTS public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  login_time timestamp with time zone DEFAULT now(),
  success boolean NOT NULL,
  ip_address text,
  user_agent text,
  device_type text,
  browser text,
  os text,
  failure_reason text,
  created_at timestamp with time zone DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_login_time ON public.login_history(login_time DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_success ON public.login_history(success);

-- 3. User Sessions Table (if not exists)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text,
  user_agent text,
  device_type text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  last_activity timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON public.user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON public.user_sessions(created_at DESC);

-- 4. Password History Table (should already exist from create_password_history_table.sql)
-- Just in case, we'll create it if not exists
CREATE TABLE IF NOT EXISTS public.password_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_at timestamp with time zone DEFAULT now(),
  changed_by text DEFAULT 'user',
  ip_address text,
  user_agent text,
  method text,
  created_at timestamp with time zone DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON public.password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_changed_at ON public.password_history(changed_at DESC);

-- 5. Audit Logs Table (should already exist from create_security_tracking_tables.sql)
-- Just in case, we'll create it if not exists
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  table_name text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);

-- Enable Row Level Security
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access (assuming you have admin role checking)
-- Note: Adjust these policies based on your admin authentication setup

-- System logs policies
CREATE POLICY "Admins can view all system logs" ON public.system_logs
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own system logs" ON public.system_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Login history policies
CREATE POLICY "Admins can view all login history" ON public.login_history
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own login history" ON public.login_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User sessions policies
CREATE POLICY "Admins can view all sessions" ON public.user_sessions
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own sessions" ON public.user_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Password history policies
CREATE POLICY "Admins can view all password history" ON public.password_history
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own password history" ON public.password_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Audit logs policies
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT ON public.system_logs TO authenticated;
GRANT INSERT ON public.system_logs TO authenticated;

GRANT SELECT ON public.login_history TO authenticated;
GRANT INSERT ON public.login_history TO authenticated;

GRANT ALL ON public.user_sessions TO authenticated;

GRANT SELECT ON public.password_history TO authenticated;
GRANT INSERT ON public.password_history TO authenticated;

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT INSERT ON public.audit_logs TO authenticated;
