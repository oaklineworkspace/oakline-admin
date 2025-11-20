
-- Update account restriction reasons to use appropriate bank emails from bank_details
-- This ensures each restriction type references the correct department email

-- Security-related restrictions should use security@theoaklinebank.com
UPDATE public.account_restriction_reasons
SET contact_email = 'security@theoaklinebank.com'
WHERE action_type IN ('ban_user', 'lock_account', 'force_password_reset', 'sign_out_all_devices')
  AND category IN ('Fraud & Suspicious Activity', 'Security Concerns', 'Security Measures', 'Security Response', 'Unauthorized Access');

-- Compliance and verification-related restrictions should use contact-us@theoaklinebank.com
UPDATE public.account_restriction_reasons
SET contact_email = 'contact-us@theoaklinebank.com'
WHERE action_type IN ('ban_user', 'lock_account', 'suspend_account', 'close_account')
  AND category IN ('Compliance & Regulatory', 'Verification Required', 'Administrative Review', 'Administrative Closure', 'Compliance & Risk');

-- Account closure and administrative actions should use info@theoaklinebank.com
UPDATE public.account_restriction_reasons
SET contact_email = 'info@theoaklinebank.com'
WHERE action_type IN ('close_account', 'suspend_account')
  AND category IN ('Administrative Actions', 'Temporary Holds', 'Account Maintenance');

-- Support-related restrictions should use support@theoaklinebank.com
UPDATE public.account_restriction_reasons
SET contact_email = 'support@theoaklinebank.com'
WHERE action_type IN ('suspend_account', 'lock_account')
  AND category IN ('Policy Compliance', 'Account Issues', 'Payment Issues');

-- Crypto-related restrictions should use crypto@theoaklinebank.com
UPDATE public.account_restriction_reasons
SET contact_email = 'crypto@theoaklinebank.com'
WHERE reason_text ILIKE '%crypto%' OR reason_text ILIKE '%digital asset%' OR reason_text ILIKE '%blockchain%';

-- Loan-related restrictions should use loans@theoaklinebank.com
UPDATE public.account_restriction_reasons
SET contact_email = 'loans@theoaklinebank.com'
WHERE reason_text ILIKE '%loan%' OR reason_text ILIKE '%credit%' OR reason_text ILIKE '%debt%';

-- Update the comment on the table
COMMENT ON COLUMN public.account_restriction_reasons.contact_email IS 'Department email from bank_details: security, contact-us, support, info, loans, crypto, verify, or notify';
