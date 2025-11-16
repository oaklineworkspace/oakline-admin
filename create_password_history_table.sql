
-- Create password_history table to track password changes
CREATE TABLE IF NOT EXISTS public.password_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  changed_at timestamp with time zone DEFAULT now(),
  changed_by text,
  password_strength_score integer DEFAULT 0 CHECK (password_strength_score >= 0 AND password_strength_score <= 4),
  ip_address text,
  user_agent text,
  method text DEFAULT 'user_settings' CHECK (method IN ('user_settings', 'reset', 'admin_force', 'enrollment')),
  CONSTRAINT password_history_pkey PRIMARY KEY (id),
  CONSTRAINT password_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON public.password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_changed_at ON public.password_history(changed_at DESC);

-- Enable RLS
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to read password history
CREATE POLICY "Admins can view password history" ON public.password_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT ON public.password_history TO authenticated;
GRANT ALL ON public.password_history TO service_role;

-- Create function to log password changes
CREATE OR REPLACE FUNCTION public.log_password_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if password actually changed
  IF OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password THEN
    INSERT INTO public.password_history (
      user_id,
      changed_at,
      changed_by,
      password_strength_score,
      method
    ) VALUES (
      NEW.id,
      NOW(),
      'user',
      2, -- default medium strength
      'user_settings'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table for password changes
DROP TRIGGER IF EXISTS password_change_logger ON auth.users;
CREATE TRIGGER password_change_logger
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.log_password_change();
