
-- Update existing banned users with professional display messages
-- Run this SQL in your Supabase SQL editor

-- Add the ban_display_message column if it doesn't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ban_display_message TEXT DEFAULT 'Your account access has been restricted. Please contact our support team for assistance.';

-- Update existing banned users with professional messages based on their ban reason
UPDATE public.profiles
SET ban_display_message = CASE
  WHEN LOWER(ban_reason) LIKE '%fraud%' OR LOWER(ban_reason) LIKE '%suspicious%' THEN
    'Your account has been permanently restricted due to suspicious activity detected on your account. For your security and to protect our banking community, access has been suspended. Please contact our Fraud Prevention team immediately.'
  
  WHEN LOWER(ban_reason) LIKE '%security%' OR LOWER(ban_reason) LIKE '%breach%' THEN
    'Account access has been restricted due to security concerns. Our Security team has identified activity that requires immediate attention. Please contact us to resolve this matter.'
  
  WHEN LOWER(ban_reason) LIKE '%compliance%' OR LOWER(ban_reason) LIKE '%regulatory%' THEN
    'Your account access has been restricted to ensure compliance with banking regulations. Please contact our Compliance department to complete the necessary verification procedures.'
  
  WHEN LOWER(ban_reason) LIKE '%unauthorized%' OR LOWER(ban_reason) LIKE '%credential%' THEN
    'Account access has been restricted due to unauthorized access attempts or credential sharing violations. Please contact our Security team to restore your access.'
  
  WHEN LOWER(ban_reason) LIKE '%terms%' OR LOWER(ban_reason) LIKE '%violation%' THEN
    'Your account has been restricted due to violations of our Terms of Service. Please review our policies and contact our Customer Relations team.'
  
  ELSE
    'Your account access has been restricted by our administrative team. For detailed information and resolution steps, please contact our Customer Support department.'
END
WHERE is_banned = true;

-- Verify the updates
SELECT 
  id,
  email,
  is_banned,
  ban_reason,
  ban_display_message
FROM public.profiles
WHERE is_banned = true
LIMIT 10;
