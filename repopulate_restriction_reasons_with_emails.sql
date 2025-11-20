
-- Delete existing reasons to repopulate with correct emails
DELETE FROM public.account_restriction_reasons;

-- BAN_USER - Security and Compliance Focus
INSERT INTO public.account_restriction_reasons (action_type, category, reason_text, contact_email, severity_level, requires_immediate_action, display_order) VALUES
-- Fraud & Suspicious Activity (security@theoaklinebank.com)
('ban_user', 'Fraud & Suspicious Activity', 'Multiple instances of fraudulent transactions detected across accounts. For assistance, please contact our security team.', 'security@theoaklinebank.com', 'critical', true, 1),
('ban_user', 'Fraud & Suspicious Activity', 'Identity theft or impersonation of another individual. If you believe this is an error, contact our security department.', 'security@theoaklinebank.com', 'critical', true, 2),
('ban_user', 'Fraud & Suspicious Activity', 'Providing false or fabricated documentation during account opening. Please reach out to our compliance team for review.', 'contact-us@theoaklinebank.com', 'critical', true, 3),
('ban_user', 'Fraud & Suspicious Activity', 'Participating in money laundering or illegal financial activities. Contact our legal compliance department.', 'contact-us@theoaklinebank.com', 'critical', true, 4),
('ban_user', 'Fraud & Suspicious Activity', 'Systematic abuse of banking services for fraudulent purposes. For inquiries, contact our fraud prevention team.', 'security@theoaklinebank.com', 'critical', true, 5),

-- Compliance & Regulatory (contact-us@theoaklinebank.com)
('ban_user', 'Compliance & Regulatory', 'Failure to comply with anti-money laundering (AML) regulations. Contact our compliance department for more information.', 'contact-us@theoaklinebank.com', 'critical', true, 10),
('ban_user', 'Compliance & Regulatory', 'Violation of Know Your Customer (KYC) requirements. Please contact our verification team to resolve this issue.', 'verify@theoaklinebank.com', 'high', true, 11),
('ban_user', 'Compliance & Regulatory', 'Account used for activities violating banking regulations. For details, contact our regulatory compliance team.', 'contact-us@theoaklinebank.com', 'critical', true, 12);

-- LOCK_ACCOUNT - Security and Support Focus
INSERT INTO public.account_restriction_reasons (action_type, category, reason_text, contact_email, severity_level, requires_immediate_action, display_order) VALUES
-- Security Concerns (security@theoaklinebank.com)
('lock_account', 'Security Concerns', 'Multiple failed login attempts detected from various locations. For security, your account has been locked. Contact our security team.', 'security@theoaklinebank.com', 'high', true, 1),
('lock_account', 'Security Concerns', 'Suspicious activity detected on your account. We have temporarily locked it for your protection. Please contact our fraud prevention team.', 'security@theoaklinebank.com', 'high', true, 2),
('lock_account', 'Security Concerns', 'Potential unauthorized access detected. Your account is locked pending verification. Contact our security department.', 'security@theoaklinebank.com', 'critical', true, 3),

-- Verification Required (verify@theoaklinebank.com / support@theoaklinebank.com)
('lock_account', 'Verification Required', 'Identity verification pending. Please submit required documents to our verification team to unlock your account.', 'verify@theoaklinebank.com', 'medium', true, 10),
('lock_account', 'Verification Required', 'Additional information needed to verify account ownership. Contact our customer support team.', 'support@theoaklinebank.com', 'medium', true, 11),
('lock_account', 'Verification Required', 'Account activity requires enhanced verification. Please reach out to our compliance team.', 'verify@theoaklinebank.com', 'medium', true, 12);

-- SUSPEND_ACCOUNT - Support and Administrative Focus
INSERT INTO public.account_restriction_reasons (action_type, category, reason_text, contact_email, severity_level, requires_immediate_action, display_order) VALUES
-- Temporary Holds (support@theoaklinebank.com)
('suspend_account', 'Temporary Holds', 'Pending documentation review. Your account is temporarily suspended. Contact our support team for assistance.', 'support@theoaklinebank.com', 'medium', false, 1),
('suspend_account', 'Temporary Holds', 'Insufficient account verification. Please submit required documents to our verification department.', 'verify@theoaklinebank.com', 'medium', true, 2),
('suspend_account', 'Temporary Holds', 'Temporary hold due to unusual transaction patterns. Contact our fraud prevention team for review.', 'security@theoaklinebank.com', 'medium', false, 3),

-- Administrative Review (contact-us@theoaklinebank.com / info@theoaklinebank.com)
('suspend_account', 'Administrative Review', 'Account under administrative review. Please contact our customer relations team for more information.', 'info@theoaklinebank.com', 'medium', false, 10),
('suspend_account', 'Administrative Review', 'Compliance review in progress. Your account will be reactivated once review is complete. Contact our compliance team.', 'contact-us@theoaklinebank.com', 'medium', false, 11);

-- CLOSE_ACCOUNT - Administrative and Compliance Focus
INSERT INTO public.account_restriction_reasons (action_type, category, reason_text, contact_email, severity_level, requires_immediate_action, display_order) VALUES
-- Administrative Closure (info@theoaklinebank.com)
('close_account', 'Administrative Closure', 'Account closed at customer request. For questions, contact our customer service team.', 'info@theoaklinebank.com', 'low', false, 1),
('close_account', 'Administrative Closure', 'Account dormant for extended period. Contact our account services team to reactivate.', 'support@theoaklinebank.com', 'low', false, 2),
('close_account', 'Administrative Closure', 'Failed to maintain minimum balance requirements. Contact our customer support for details.', 'support@theoaklinebank.com', 'medium', false, 3),

-- Compliance & Risk (contact-us@theoaklinebank.com)
('close_account', 'Compliance & Risk', 'Closed due to regulatory compliance requirements. For inquiries, contact our compliance department.', 'contact-us@theoaklinebank.com', 'high', false, 10),
('close_account', 'Compliance & Risk', 'Risk assessment determined account closure necessary. Contact our risk management team.', 'contact-us@theoaklinebank.com', 'high', false, 11);

-- FORCE_PASSWORD_RESET - Security Focus
INSERT INTO public.account_restriction_reasons (action_type, category, reason_text, contact_email, severity_level, requires_immediate_action, display_order) VALUES
-- Security Measures (security@theoaklinebank.com)
('force_password_reset', 'Security Measures', 'Potential security breach detected. Please reset your password immediately. Contact our security team if you need assistance.', 'security@theoaklinebank.com', 'critical', true, 1),
('force_password_reset', 'Security Measures', 'Password compromised in external data breach. Reset required for your protection. Contact our security department.', 'security@theoaklinebank.com', 'critical', true, 2),
('force_password_reset', 'Security Measures', 'Multiple failed login attempts from unknown devices. Password reset required. Contact our fraud prevention team.', 'security@theoaklinebank.com', 'high', true, 3),

-- Policy Compliance (support@theoaklinebank.com)
('force_password_reset', 'Policy Compliance', 'Password does not meet current security standards. Please update your password. Contact support for help.', 'support@theoaklinebank.com', 'medium', true, 10),
('force_password_reset', 'Policy Compliance', 'Periodic password update required per security policy. Contact our customer support team for assistance.', 'support@theoaklinebank.com', 'low', false, 11);

-- SIGN_OUT_ALL_DEVICES - Security Focus
INSERT INTO public.account_restriction_reasons (action_type, category, reason_text, contact_email, severity_level, requires_immediate_action, display_order) VALUES
-- Security Response (security@theoaklinebank.com)
('sign_out_all_devices', 'Security Response', 'Unauthorized device access detected. All sessions terminated for security. Contact our security team.', 'security@theoaklinebank.com', 'critical', true, 1),
('sign_out_all_devices', 'Security Response', 'Suspicious login activity from multiple locations. Sessions terminated. Contact our fraud prevention team.', 'security@theoaklinebank.com', 'high', true, 2),
('sign_out_all_devices', 'Security Response', 'Security credentials may be compromised. All devices signed out. Contact our security department.', 'security@theoaklinebank.com', 'critical', true, 3),

-- Administrative Actions (support@theoaklinebank.com / info@theoaklinebank.com)
('sign_out_all_devices', 'Administrative Actions', 'Session reset requested by administrator. Please sign in again. Contact support if you have questions.', 'support@theoaklinebank.com', 'medium', false, 10),
('sign_out_all_devices', 'Administrative Actions', 'Account security settings updated. Re-authentication required. Contact our customer service team.', 'info@theoaklinebank.com', 'low', false, 11);

-- Add index for faster email-based lookups
CREATE INDEX IF NOT EXISTS idx_restriction_reasons_contact_email ON public.account_restriction_reasons(contact_email);

-- Update the table comment
COMMENT ON TABLE public.account_restriction_reasons IS 'Professional account restriction reasons with department-specific contact emails from bank_details';
