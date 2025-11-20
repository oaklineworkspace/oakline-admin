-- Create account restriction reasons table
-- This table stores predefined professional reasons for account restrictions
-- Each reason includes the appropriate bank contact email for affected users

CREATE TABLE IF NOT EXISTS public.account_restriction_reasons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  action_type text NOT NULL CHECK (action_type = ANY (ARRAY[
    'ban_user'::text, 
    'lock_account'::text, 
    'force_password_reset'::text, 
    'sign_out_all_devices'::text, 
    'suspend_account'::text, 
    'close_account'::text
  ])),
  category text NOT NULL,
  reason_text text NOT NULL,
  contact_email text NOT NULL,
  severity_level text CHECK (severity_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  requires_immediate_action boolean DEFAULT false,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT account_restriction_reasons_pkey PRIMARY KEY (id)
);

-- Create index for faster lookups by action_type
CREATE INDEX IF NOT EXISTS idx_restriction_reasons_action_type ON public.account_restriction_reasons(action_type);
CREATE INDEX IF NOT EXISTS idx_restriction_reasons_active ON public.account_restriction_reasons(is_active) WHERE is_active = true;

-- Insert professional reasons for BAN_USER action
INSERT INTO public.account_restriction_reasons (action_type, category, reason_text, contact_email, severity_level, requires_immediate_action, display_order) VALUES
-- Fraud & Suspicious Activity
('ban_user', 'Fraud & Suspicious Activity', 'Multiple instances of fraudulent transactions detected across accounts. For assistance, please contact our security team.', 'contact-us@theoaklinebank.com', 'critical', true, 1),
('ban_user', 'Fraud & Suspicious Activity', 'Identity theft or impersonation of another individual. If you believe this is an error, contact our security department.', 'contact-us@theoaklinebank.com', 'critical', true, 2),
('ban_user', 'Fraud & Suspicious Activity', 'Providing false or fabricated documentation during account opening. Please reach out to our compliance team for review.', 'contact-us@theoaklinebank.com', 'critical', true, 3),
('ban_user', 'Fraud & Suspicious Activity', 'Participating in money laundering or illegal financial activities. Contact our legal compliance department.', 'contact-us@theoaklinebank.com', 'critical', true, 4),
('ban_user', 'Fraud & Suspicious Activity', 'Systematic abuse of banking services for fraudulent purposes. For inquiries, contact our fraud prevention team.', 'contact-us@theoaklinebank.com', 'critical', true, 5),
('ban_user', 'Fraud & Suspicious Activity', 'Connection to known fraud rings or criminal networks. Please contact our security department for more information.', 'contact-us@theoaklinebank.com', 'critical', true, 6),
('ban_user', 'Fraud & Suspicious Activity', 'Orchestrating check kiting or float manipulation schemes. Contact our fraud investigation team.', 'contact-us@theoaklinebank.com', 'critical', true, 7),
('ban_user', 'Fraud & Suspicious Activity', 'Involvement in credit card fraud or unauthorized charge schemes. Please reach out to our security team.', 'contact-us@theoaklinebank.com', 'critical', true, 8),
('ban_user', 'Fraud & Suspicious Activity', 'Operating accounts for illicit cryptocurrency transactions. Contact our compliance department for details.', 'contact-us@theoaklinebank.com', 'critical', true, 9),
('ban_user', 'Fraud & Suspicious Activity', 'Engaging in wire transfer fraud or romance scams. Please contact our fraud prevention division.', 'contact-us@theoaklinebank.com', 'critical', true, 10),
('ban_user', 'Fraud & Suspicious Activity', 'Creating multiple accounts with stolen identities. Contact our security team if you believe this is in error.', 'contact-us@theoaklinebank.com', 'critical', true, 11),
('ban_user', 'Fraud & Suspicious Activity', 'Systematically exploiting banking system vulnerabilities. Please reach out to our security department.', 'contact-us@theoaklinebank.com', 'critical', true, 12),

-- Security Violations
('ban_user', 'Security Violations', 'Severe security breach compromising multiple accounts. Contact our security operations center immediately.', 'contact-us@theoaklinebank.com', 'critical', true, 13),
('ban_user', 'Security Violations', 'Unauthorized access attempts to other customer accounts. Please contact our security team for clarification.', 'contact-us@theoaklinebank.com', 'critical', true, 14),
('ban_user', 'Security Violations', 'Intentional circumvention of security protocols and safeguards. Reach out to our security department.', 'contact-us@theoaklinebank.com', 'critical', true, 15),
('ban_user', 'Security Violations', 'Sharing account credentials with unauthorized third parties. Contact our security team for review.', 'contact-us@theoaklinebank.com', 'high', true, 16),
('ban_user', 'Security Violations', 'Engaging in phishing or social engineering attacks against customers. Contact our fraud prevention team.', 'contact-us@theoaklinebank.com', 'critical', true, 17),
('ban_user', 'Security Violations', 'Repeated attempts to bypass two-factor authentication. Please contact our security department.', 'contact-us@theoaklinebank.com', 'high', true, 18),
('ban_user', 'Security Violations', 'Using compromised or stolen credentials to access banking services. Reach out to our security team.', 'contact-us@theoaklinebank.com', 'critical', true, 19),
('ban_user', 'Security Violations', 'Installing malware or keyloggers on banking terminals. Contact our cybersecurity division immediately.', 'contact-us@theoaklinebank.com', 'critical', true, 20),
('ban_user', 'Security Violations', 'Conducting brute force attacks on account authentication. Please contact our security operations center.', 'contact-us@theoaklinebank.com', 'critical', true, 21),
('ban_user', 'Security Violations', 'Exploiting zero-day vulnerabilities for unauthorized access. Contact our security team for details.', 'contact-us@theoaklinebank.com', 'critical', true, 22),
('ban_user', 'Security Violations', 'Selling or distributing customer credentials on dark web platforms. Please reach out to our security department.', 'contact-us@theoaklinebank.com', 'critical', true, 23),

-- Regulatory Compliance
('ban_user', 'Regulatory Compliance', 'Violations of Anti-Money Laundering (AML) regulations. Contact our compliance department for more information.', 'contact-us@theoaklinebank.com', 'critical', true, 24),
('ban_user', 'Regulatory Compliance', 'Non-compliance with Know Your Customer (KYC) requirements. Please reach out to our compliance team.', 'contact-us@theoaklinebank.com', 'high', true, 25),
('ban_user', 'Regulatory Compliance', 'Failure to provide required documentation after multiple requests. Contact our customer service team.', 'info@theoaklinebank.com', 'high', true, 26),
('ban_user', 'Regulatory Compliance', 'Involvement in transactions violating OFAC sanctions. Please contact our legal compliance department immediately.', 'contact-us@theoaklinebank.com', 'critical', true, 27),
('ban_user', 'Regulatory Compliance', 'Operating accounts for terrorist financing or prohibited entities. Contact our compliance division.', 'contact-us@theoaklinebank.com', 'critical', true, 28),

-- Terms of Service Violations
('ban_user', 'Terms of Service Violations', 'Repeated violations of banking terms and conditions. For assistance, contact our customer service team.', 'info@theoaklinebank.com', 'high', false, 29),
('ban_user', 'Terms of Service Violations', 'Using accounts for prohibited business activities. Please contact our business compliance team.', 'contact-us@theoaklinebank.com', 'high', false, 30),
('ban_user', 'Terms of Service Violations', 'Deliberate overdraft abuse or check fraud. Contact our fraud prevention department.', 'contact-us@theoaklinebank.com', 'high', true, 31),
('ban_user', 'Terms of Service Violations', 'Operating multiple accounts under false identities. Please reach out to our security team.', 'contact-us@theoaklinebank.com', 'critical', true, 32),
('ban_user', 'Terms of Service Violations', 'Persistent abusive behavior toward bank staff. Contact our customer relations department.', 'info@theoaklinebank.com', 'medium', false, 33),

-- LOCK_ACCOUNT reasons
-- Security Concerns
('lock_account', 'Security Concerns', 'Suspicious login activity from unusual locations detected. For assistance, please contact our security team.', 'contact-us@theoaklinebank.com', 'high', true, 1),
('lock_account', 'Security Concerns', 'Multiple failed login attempts indicating potential breach. Please verify your identity with our security department.', 'contact-us@theoaklinebank.com', 'high', true, 2),
('lock_account', 'Security Concerns', 'Unauthorized transaction patterns detected. Contact our fraud prevention team for review.', 'contact-us@theoaklinebank.com', 'high', true, 3),
('lock_account', 'Security Concerns', 'Customer-reported account compromise or unauthorized access. Please contact our security team to restore access.', 'contact-us@theoaklinebank.com', 'high', true, 4),
('lock_account', 'Security Concerns', 'Suspected account takeover attempt. Contact our security operations center immediately.', 'contact-us@theoaklinebank.com', 'high', true, 5),
('lock_account', 'Security Concerns', 'Device fingerprint mismatch with known user patterns. Please verify your identity by contacting our security team.', 'contact-us@theoaklinebank.com', 'medium', true, 6),

-- Verification Required
('lock_account', 'Verification Required', 'Additional identity verification needed for compliance. Please contact our customer service team.', 'info@theoaklinebank.com', 'medium', false, 7),
('lock_account', 'Verification Required', 'Documentation expired and requires renewal. Reach out to our verification team to update your information.', 'info@theoaklinebank.com', 'medium', false, 8),
('lock_account', 'Verification Required', 'Account activity inconsistent with customer profile. Please contact our compliance department for review.', 'contact-us@theoaklinebank.com', 'medium', false, 9),
('lock_account', 'Verification Required', 'Large transaction requiring enhanced due diligence. Contact our verification team to complete the process.', 'info@theoaklinebank.com', 'medium', false, 10),
('lock_account', 'Verification Required', 'Pending review of reported discrepancies. Please reach out to our customer service team.', 'info@theoaklinebank.com', 'medium', false, 11),

-- Fraud Prevention
('lock_account', 'Fraud Prevention', 'Transaction flagged by fraud detection systems. Contact our fraud prevention team for verification.', 'contact-us@theoaklinebank.com', 'high', true, 12),
('lock_account', 'Fraud Prevention', 'Potential card skimming or cloning detected. Please contact our security team immediately.', 'contact-us@theoaklinebank.com', 'high', true, 13),
('lock_account', 'Fraud Prevention', 'Suspicious wire transfer or ACH activity. Reach out to our fraud prevention department for review.', 'contact-us@theoaklinebank.com', 'high', true, 14),
('lock_account', 'Fraud Prevention', 'Account being used in a fraud investigation. Contact our investigation team for more information.', 'contact-us@theoaklinebank.com', 'high', true, 15),
('lock_account', 'Fraud Prevention', 'Temporary hold pending fraud review. Please contact our fraud prevention team to expedite resolution.', 'contact-us@theoaklinebank.com', 'medium', true, 16),

-- FORCE_PASSWORD_RESET reasons
-- Security Measures
('force_password_reset', 'Security Measures', 'Suspected password compromise or data breach. Please reset your password and contact our security team.', 'contact-us@theoaklinebank.com', 'high', true, 1),
('force_password_reset', 'Security Measures', 'Password detected in known breach databases. Update your password immediately and contact our security department.', 'contact-us@theoaklinebank.com', 'high', true, 2),
('force_password_reset', 'Security Measures', 'Weak password not meeting current security standards. Please update to a stronger password. Contact support if needed.', 'info@theoaklinebank.com', 'medium', false, 3),
('force_password_reset', 'Security Measures', 'Account showing signs of unauthorized access. Reset your password and contact our security team immediately.', 'contact-us@theoaklinebank.com', 'high', true, 4),
('force_password_reset', 'Security Measures', 'Regular security maintenance and password rotation policy. Please update your password. Contact support for assistance.', 'info@theoaklinebank.com', 'low', false, 5),
('force_password_reset', 'Security Measures', 'User-requested password reset for security reasons. Contact our support team if you did not request this.', 'info@theoaklinebank.com', 'medium', true, 6),

-- Policy Compliance
('force_password_reset', 'Policy Compliance', 'Password has not been changed in over 90 days (policy requirement). Please update your password to continue.', 'info@theoaklinebank.com', 'low', false, 7),
('force_password_reset', 'Policy Compliance', 'Password reuse detected across multiple compromised sites. Update to a unique password and contact our security team.', 'contact-us@theoaklinebank.com', 'medium', true, 8),
('force_password_reset', 'Policy Compliance', 'Compliance with enhanced security protocols. Please reset your password. Contact support if needed.', 'info@theoaklinebank.com', 'medium', false, 9),
('force_password_reset', 'Policy Compliance', 'Administrative password audit findings. Please update your password and contact our support team for details.', 'info@theoaklinebank.com', 'medium', false, 10),

-- SIGN_OUT_ALL_DEVICES reasons
-- Security Response
('sign_out_all_devices', 'Security Response', 'Suspicious concurrent sessions from multiple locations. Please sign in again and contact our security team.', 'contact-us@theoaklinebank.com', 'high', true, 1),
('sign_out_all_devices', 'Security Response', 'User reported lost or stolen device with active session. Contact our security team to secure your account.', 'contact-us@theoaklinebank.com', 'high', true, 2),
('sign_out_all_devices', 'Security Response', 'Detected unauthorized device access. Please sign in on your trusted device and contact our security department.', 'contact-us@theoaklinebank.com', 'high', true, 3),
('sign_out_all_devices', 'Security Response', 'Security breach requiring immediate session termination. Contact our security operations center immediately.', 'contact-us@theoaklinebank.com', 'critical', true, 4),
('sign_out_all_devices', 'Security Response', 'Account compromise investigation in progress. Please contact our security team for assistance.', 'contact-us@theoaklinebank.com', 'high', true, 5),

-- Administrative Actions
('sign_out_all_devices', 'Administrative Actions', 'System-wide security update requiring re-authentication. Please sign in again. Contact support if needed.', 'info@theoaklinebank.com', 'low', false, 6),
('sign_out_all_devices', 'Administrative Actions', 'Account migration or maintenance procedure. Please sign in again to continue. Contact support for assistance.', 'info@theoaklinebank.com', 'low', false, 7),
('sign_out_all_devices', 'Administrative Actions', 'User requested to sign out all devices. Contact our support team if you did not make this request.', 'info@theoaklinebank.com', 'medium', true, 8),
('sign_out_all_devices', 'Administrative Actions', 'Termination of suspicious session activity. Please sign in and contact our security team if you have concerns.', 'contact-us@theoaklinebank.com', 'medium', true, 9),

-- SUSPEND_ACCOUNT reasons
-- Temporary Holds
('suspend_account', 'Temporary Holds', 'Pending investigation of suspicious transactions. Please contact our fraud prevention team for updates.', 'contact-us@theoaklinebank.com', 'medium', false, 1),
('suspend_account', 'Temporary Holds', 'Awaiting customer response to verification request. Please contact our verification team to resolve.', 'info@theoaklinebank.com', 'medium', false, 2),
('suspend_account', 'Temporary Holds', 'Disputed transaction under review. Contact our dispute resolution team for status updates.', 'info@theoaklinebank.com', 'medium', false, 3),
('suspend_account', 'Temporary Holds', 'Temporary compliance hold pending documentation. Please submit required documents by contacting our compliance team.', 'contact-us@theoaklinebank.com', 'medium', false, 4),
('suspend_account', 'Temporary Holds', 'Account review for unusual activity patterns. Contact our security team for more information.', 'contact-us@theoaklinebank.com', 'medium', false, 5),
('suspend_account', 'Temporary Holds', 'Cooling-off period following multiple fraud alerts. Contact our fraud prevention team to restore access.', 'contact-us@theoaklinebank.com', 'medium', false, 6),
('suspend_account', 'Temporary Holds', 'Investigation of potential account takeover incident. Please contact our security department immediately.', 'contact-us@theoaklinebank.com', 'high', true, 7),
('suspend_account', 'Temporary Holds', 'Review of large or irregular transaction patterns. Contact our compliance team for details.', 'contact-us@theoaklinebank.com', 'medium', false, 8),
('suspend_account', 'Temporary Holds', 'Pending resolution of customer dispute or complaint. Contact our customer service team for assistance.', 'info@theoaklinebank.com', 'medium', false, 9),
('suspend_account', 'Temporary Holds', 'Temporary freeze due to reported lost or stolen card. Contact our card services team to resolve.', 'info@theoaklinebank.com', 'medium', true, 10),
('suspend_account', 'Temporary Holds', 'Awaiting completion of enhanced due diligence review. Please contact our compliance department.', 'contact-us@theoaklinebank.com', 'medium', false, 11),
('suspend_account', 'Temporary Holds', 'Precautionary hold following security incident notification. Contact our security team for next steps.', 'contact-us@theoaklinebank.com', 'medium', true, 12),

-- Administrative Review
('suspend_account', 'Administrative Review', 'Inconsistent information requiring clarification. Please contact our verification team to update your details.', 'info@theoaklinebank.com', 'medium', false, 13),
('suspend_account', 'Administrative Review', 'Large transaction exceeding normal patterns under review. Contact our compliance team for more information.', 'contact-us@theoaklinebank.com', 'medium', false, 14),
('suspend_account', 'Administrative Review', 'Third-party fraud report received, investigation pending. Please contact our fraud investigation team.', 'contact-us@theoaklinebank.com', 'high', true, 15),
('suspend_account', 'Administrative Review', 'Regulatory audit or examination in progress. Contact our compliance department for details.', 'contact-us@theoaklinebank.com', 'medium', false, 16),
('suspend_account', 'Administrative Review', 'Customer-requested temporary account freeze. Contact our customer service team to lift the freeze.', 'info@theoaklinebank.com', 'low', false, 17),

-- CLOSE_ACCOUNT reasons
-- Administrative Closure
('close_account', 'Administrative Closure', 'Account closure requested by customer. Contact our customer service team if this was not authorized by you.', 'info@theoaklinebank.com', 'low', false, 1),
('close_account', 'Administrative Closure', 'Dormant account with no activity for extended period (over 12 months). Contact us to reactivate if needed.', 'info@theoaklinebank.com', 'low', false, 2),
('close_account', 'Administrative Closure', 'Duplicate account consolidation. Contact our account services team for more information.', 'info@theoaklinebank.com', 'low', false, 3),
('close_account', 'Administrative Closure', 'Account no longer meets bank service criteria. Please contact our customer service team for details.', 'info@theoaklinebank.com', 'medium', false, 4),
('close_account', 'Administrative Closure', 'Migration to different account type completed. Contact our account services team for your new account details.', 'info@theoaklinebank.com', 'low', false, 5),
('close_account', 'Administrative Closure', 'Estate closure following account holder deceased. Please contact our estate services department.', 'info@theoaklinebank.com', 'low', false, 6),
('close_account', 'Administrative Closure', 'Business entity dissolved or partnership terminated. Contact our business banking team for final settlement.', 'info@theoaklinebank.com', 'low', false, 7),
('close_account', 'Administrative Closure', 'Customer relocated to unsupported geographic area. Please contact us to discuss alternative options.', 'info@theoaklinebank.com', 'low', false, 8),
('close_account', 'Administrative Closure', 'Account maintenance fees remain unpaid for extended period. Contact our billing department to resolve.', 'info@theoaklinebank.com', 'medium', false, 9),
('close_account', 'Administrative Closure', 'Mutual agreement between bank and customer for account termination. Contact us if you have any questions.', 'info@theoaklinebank.com', 'low', false, 10),

-- Compliance & Risk
('close_account', 'Compliance & Risk', 'Unable to verify customer identity after multiple attempts. Please contact our verification team.', 'contact-us@theoaklinebank.com', 'high', false, 11),
('close_account', 'Compliance & Risk', 'Customer residing in unsupported or sanctioned jurisdiction. Contact our compliance department for clarification.', 'contact-us@theoaklinebank.com', 'high', false, 12),
('close_account', 'Compliance & Risk', 'Account activity incompatible with bank risk appetite. Please contact our risk management team.', 'contact-us@theoaklinebank.com', 'medium', false, 13),
('close_account', 'Compliance & Risk', 'Regulatory restrictions preventing continued service. Contact our legal compliance department for details.', 'contact-us@theoaklinebank.com', 'high', false, 14),
('close_account', 'Compliance & Risk', 'Persistent non-compliance with account requirements. Please contact our compliance team for resolution.', 'contact-us@theoaklinebank.com', 'medium', false, 15),
('close_account', 'Compliance & Risk', 'Failure to provide required tax documentation (W-9, W-8BEN). Contact our tax compliance department.', 'contact-us@theoaklinebank.com', 'medium', false, 16),
('close_account', 'Compliance & Risk', 'Account flagged for persistent suspicious activity beyond tolerance. Contact our security team for details.', 'contact-us@theoaklinebank.com', 'high', false, 17),
('close_account', 'Compliance & Risk', 'Customer appears on OFAC or other sanctions lists. Please contact our legal compliance department immediately.', 'contact-us@theoaklinebank.com', 'critical', true, 18),
('close_account', 'Compliance & Risk', 'Inability to meet enhanced due diligence requirements. Contact our compliance department for assistance.', 'contact-us@theoaklinebank.com', 'high', false, 19),
('close_account', 'Compliance & Risk', 'Court order or legal mandate requiring account closure. Contact our legal department for more information.', 'contact-us@theoaklinebank.com', 'high', false, 20),
('close_account', 'Compliance & Risk', 'Revocation of banking license or charter in customer jurisdiction. Contact our customer service team.', 'contact-us@theoaklinebank.com', 'high', false, 21);

-- Grant appropriate permissions (adjust based on your RLS policies)
-- Example: Allow authenticated users to read, but only admins to write
COMMENT ON TABLE public.account_restriction_reasons IS 'Stores predefined professional reasons for account restrictions with appropriate contact emails';
COMMENT ON COLUMN public.account_restriction_reasons.action_type IS 'Type of security action: ban_user, lock_account, force_password_reset, sign_out_all_devices, suspend_account, close_account';
COMMENT ON COLUMN public.account_restriction_reasons.contact_email IS 'Email address from bank_details table for affected users to reach out';
COMMENT ON COLUMN public.account_restriction_reasons.severity_level IS 'Severity of the restriction: low, medium, high, critical';
COMMENT ON COLUMN public.account_restriction_reasons.requires_immediate_action IS 'Whether the user needs to take immediate action';
