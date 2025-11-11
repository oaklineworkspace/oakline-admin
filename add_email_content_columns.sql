ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS email_content_html text;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS email_content_text text;
