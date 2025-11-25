
-- Seed verification reasons table with professional, categorized reasons

-- SELFIE VERIFICATION REASONS
INSERT INTO public.verification_reasons (
  verification_type, 
  category, 
  reason_text, 
  contact_email, 
  severity_level, 
  requires_immediate_action, 
  display_order,
  default_display_message,
  verification_deadline_hours
) VALUES
-- Security & Fraud Prevention (High Priority)
('selfie', 'Security & Fraud Prevention', 'Unusual account activity detected. Identity verification required for your protection.', 'security@theoaklinebank.com', 'high', true, 1, 'For your security, we need to verify your identity due to unusual account activity. Please submit a selfie verification within 7 days.', 168),
('selfie', 'Security & Fraud Prevention', 'Multiple failed login attempts from new devices. Verification needed to secure your account.', 'security@theoaklinebank.com', 'high', true, 2, 'Your account security is important to us. Please complete selfie verification to confirm your identity and secure your account.', 72),
('selfie', 'Security & Fraud Prevention', 'Suspicious transaction patterns detected. Please verify your identity to continue.', 'fraud@theoaklinebank.com', 'high', true, 3, 'We detected unusual transaction patterns on your account. Please verify your identity to ensure account security.', 48),
('selfie', 'Security & Fraud Prevention', 'Account accessed from unrecognized location. Verification required.', 'security@theoaklinebank.com', 'medium', true, 4, 'Your account was accessed from a new location. Please verify your identity for security purposes.', 168),
('selfie', 'Security & Fraud Prevention', 'Identity theft protection measure. Verification needed.', 'fraud@theoaklinebank.com', 'critical', true, 5, 'As part of our identity theft protection protocols, we require immediate selfie verification.', 24),

-- Compliance & Regulatory Requirements
('selfie', 'Compliance & Regulatory', 'Annual KYC (Know Your Customer) compliance verification required.', 'compliance@theoaklinebank.com', 'medium', false, 6, 'As part of our annual compliance requirements, please complete identity verification to maintain your account in good standing.', 336),
('selfie', 'Compliance & Regulatory', 'Enhanced due diligence required for high-value transactions.', 'compliance@theoaklinebank.com', 'high', false, 7, 'Your recent transactions require enhanced verification. Please submit a selfie to continue.', 168),
('selfie', 'Compliance & Regulatory', 'AML (Anti-Money Laundering) verification process.', 'compliance@theoaklinebank.com', 'high', true, 8, 'Regulatory compliance requires us to verify your identity. Please complete this verification promptly.', 96),
('selfie', 'Compliance & Regulatory', 'Regulatory audit - customer identity verification.', 'compliance@theoaklinebank.com', 'medium', false, 9, 'We are conducting routine regulatory compliance checks. Your cooperation with identity verification is appreciated.', 240),
('selfie', 'Compliance & Regulatory', 'CTF (Counter-Terrorism Financing) screening requirement.', 'compliance@theoaklinebank.com', 'critical', true, 10, 'Federal regulations require immediate identity verification. Please complete this process within 24 hours.', 24),

-- Account Changes & Updates
('selfie', 'Account Changes', 'Profile information recently updated. Verification needed to confirm changes.', 'verify@theoaklinebank.com', 'medium', false, 11, 'You recently updated your profile information. Please verify your identity to confirm these changes.', 168),
('selfie', 'Account Changes', 'New device or browser detected. Verification required for security.', 'security@theoaklinebank.com', 'medium', false, 12, 'A new device was added to your account. Please verify your identity to authorize this device.', 120),
('selfie', 'Account Changes', 'Contact information changed. Identity verification needed.', 'verify@theoaklinebank.com', 'medium', false, 13, 'To protect your account, we need to verify your identity after contact information changes.', 168),
('selfie', 'Account Changes', 'Password reset from unrecognized device. Verification required.', 'security@theoaklinebank.com', 'high', true, 14, 'Your password was reset from a new device. Please verify your identity immediately.', 48),

-- Transaction Related
('selfie', 'Transaction Verification', 'Large transaction authorization required.', 'transactions@theoaklinebank.com', 'high', false, 15, 'Please verify your identity to authorize this large transaction for your protection.', 72),
('selfie', 'Transaction Verification', 'International wire transfer verification needed.', 'transfers@theoaklinebank.com', 'high', false, 16, 'International transfers require identity verification. Please complete this process to proceed.', 96),
('selfie', 'Transaction Verification', 'Multiple high-value transactions detected.', 'fraud@theoaklinebank.com', 'high', true, 17, 'Your recent transaction activity requires identity verification for security purposes.', 48),

-- Account Reactivation & Recovery
('selfie', 'Account Recovery', 'Account reactivation after suspension. Verification required.', 'support@theoaklinebank.com', 'medium', false, 18, 'To reactivate your account, please complete identity verification.', 168),
('selfie', 'Account Recovery', 'Account recovery process - identity confirmation needed.', 'support@theoaklinebank.com', 'high', true, 19, 'As part of account recovery, we need to verify your identity. Please complete this verification.', 72),
('selfie', 'Account Recovery', 'Locked account - verification needed to unlock.', 'support@theoaklinebank.com', 'medium', false, 20, 'Your account is locked. Please verify your identity to regain access.', 168),

-- VIDEO VERIFICATION REASONS
-- Enhanced Security (Video)
('video', 'Enhanced Security', 'High-risk transaction detected. Video verification required.', 'security@theoaklinebank.com', 'critical', true, 1, 'For maximum security, we require video verification to authorize this high-risk transaction.', 48),
('video', 'Enhanced Security', 'Account compromise suspected. Enhanced verification needed.', 'fraud@theoaklinebank.com', 'critical', true, 2, 'We suspect unauthorized access to your account. Please complete video verification immediately.', 24),
('video', 'Enhanced Security', 'Advanced fraud prevention protocol activated.', 'fraud@theoaklinebank.com', 'critical', true, 3, 'Our fraud detection system requires video verification to protect your account.', 48),
('video', 'Enhanced Security', 'Multiple security alerts triggered. Video verification mandatory.', 'security@theoaklinebank.com', 'critical', true, 4, 'Your account has triggered multiple security alerts. Video verification is required to continue.', 72),

-- Compliance & High-Value Operations (Video)
('video', 'Compliance & High-Value', 'Large crypto deposit verification required.', 'crypto@theoaklinebank.com', 'high', false, 5, 'Your cryptocurrency deposit requires video verification for regulatory compliance.', 96),
('video', 'Compliance & High-Value', 'Wire transfer exceeding $50,000 - enhanced verification needed.', 'transfers@theoaklinebank.com', 'high', true, 6, 'High-value wire transfers require video verification. Please complete this process within 72 hours.', 72),
('video', 'Compliance & High-Value', 'Loan disbursement verification - video required.', 'loans@theoaklinebank.com', 'high', false, 7, 'Before loan disbursement, we require video verification of your identity.', 120),
('video', 'Compliance & High-Value', 'Investment account opening - KYC video verification.', 'compliance@theoaklinebank.com', 'medium', false, 8, 'To open an investment account, please complete video verification.', 168),

-- Account Opening & Onboarding (Video)
('video', 'Account Opening', 'New account application - video verification required.', 'verify@theoaklinebank.com', 'medium', false, 9, 'Thank you for applying! Please complete video verification to activate your new account.', 240),
('video', 'Account Opening', 'Premium account tier upgrade - enhanced verification needed.', 'accounts@theoaklinebank.com', 'medium', false, 10, 'Upgrading to a premium account requires video verification for security.', 168),
('video', 'Account Opening', 'Business account application - owner verification required.', 'business@theoaklinebank.com', 'medium', false, 11, 'Business account applications require video verification of ownership.', 240),

-- Dispute Resolution & Special Cases (Video)
('video', 'Dispute Resolution', 'Fraud claim investigation - video statement required.', 'disputes@theoaklinebank.com', 'high', true, 12, 'To process your fraud claim, we need a video statement verifying the disputed transactions.', 96),
('video', 'Dispute Resolution', 'Chargeback verification process.', 'disputes@theoaklinebank.com', 'medium', false, 13, 'Please provide video verification to support your chargeback request.', 168),
('video', 'Special Cases', 'Estate account access - heir verification required.', 'legal@theoaklinebank.com', 'high', false, 14, 'Video verification is required to verify heir status and grant account access.', 240),

-- LIVENESS VERIFICATION REASONS
-- Anti-Spoofing & Advanced Security
('liveness', 'Anti-Spoofing', 'Advanced biometric verification required for security.', 'security@theoaklinebank.com', 'high', true, 1, 'Our advanced security protocols require liveness verification to prevent fraud.', 72),
('liveness', 'Anti-Spoofing', 'Suspicious login pattern - liveness check needed.', 'security@theoaklinebank.com', 'high', true, 2, 'To ensure account security, please complete a liveness verification check.', 48),
('liveness', 'Anti-Spoofing', 'Multiple authentication failures - enhanced verification required.', 'security@theoaklinebank.com', 'critical', true, 3, 'After multiple failed attempts, we require liveness verification to secure your account.', 24),

-- High-Security Operations
('liveness', 'High-Security Operations', 'Large fund movement authorization.', 'security@theoaklinebank.com', 'critical', true, 4, 'This high-value operation requires liveness verification for your protection.', 48),
('liveness', 'High-Security Operations', 'Cryptocurrency wallet access - biometric verification.', 'crypto@theoaklinebank.com', 'high', true, 5, 'Access to cryptocurrency features requires liveness verification.', 72),
('liveness', 'High-Security Operations', 'International transfer - enhanced biometric check.', 'transfers@theoaklinebank.com', 'high', false, 6, 'International transfers require liveness verification for security compliance.', 96),

-- Periodic Security Reviews
('liveness', 'Periodic Security Review', 'Quarterly security verification required.', 'security@theoaklinebank.com', 'medium', false, 7, 'As part of our periodic security review, please complete liveness verification.', 336),
('liveness', 'Periodic Security Review', 'Annual biometric authentication update.', 'security@theoaklinebank.com', 'low', false, 8, 'Please update your biometric authentication with a liveness check.', 720);

-- Add constraint to account_restriction_reasons for enforce_verification action type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'account_restriction_reasons_action_type_check_updated'
  ) THEN
    ALTER TABLE public.account_restriction_reasons DROP CONSTRAINT IF EXISTS account_restriction_reasons_action_type_check;
    ALTER TABLE public.account_restriction_reasons 
    ADD CONSTRAINT account_restriction_reasons_action_type_check 
    CHECK (action_type = ANY (ARRAY[
      'ban_user'::text, 
      'lock_account'::text, 
      'force_password_reset'::text, 
      'sign_out_all_devices'::text, 
      'suspend_account'::text, 
      'close_account'::text,
      'enforce_verification'::text
    ]));
  END IF;
END $$;
