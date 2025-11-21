-- ============================================================================
-- SEED DATA: Professional Restriction Reasons, Restoration Reasons & Display Messages
-- For Oakline Bank Admin Panel
-- Uses DYNAMIC emails from bank_details table
-- ============================================================================

-- ============================================================================
-- 1. FETCH DYNAMIC EMAILS FROM BANK_DETAILS
-- ============================================================================

WITH bank_emails AS (
  SELECT
    COALESCE(email_security, 'security@theoaklinebank.com') as security_email,
    COALESCE(email_compliance, 'compliance@theoaklinebank.com') as compliance_email,
    COALESCE(email_verify, 'verify@theoaklinebank.com') as verify_email,
    COALESCE(email_support, 'support@theoaklinebank.com') as support_email,
    COALESCE(
      (custom_emails->>'fraud')::text,
      'fraud@theoaklinebank.com'
    ) as fraud_email,
    COALESCE(
      (custom_emails->>'legal')::text,
      'legal@theoaklinebank.com'
    ) as legal_email
  FROM public.bank_details
  LIMIT 1
),

-- ============================================================================
-- 2. INSERT RESTRICTION REASONS with DYNAMIC EMAILS
-- ============================================================================

restriction_insert AS (
  INSERT INTO public.account_restriction_reasons (
    action_type,
    category,
    reason_text,
    contact_email,
    severity_level,
    requires_immediate_action,
    display_order,
    is_active
  )
  SELECT 
    action_type,
    category,
    reason_text,
    contact_email,
    severity_level,
    requires_immediate_action,
    display_order,
    is_active
  FROM (
    SELECT
      'ban_user' as action_type,
      'Security' as category,
      'Account compromised - unauthorized access detected from multiple locations and suspicious transactions initiated' as reason_text,
      be.security_email as contact_email,
      'critical'::text as severity_level,
      true as requires_immediate_action,
      1 as display_order,
      true as is_active
    FROM bank_emails be
    UNION ALL
    SELECT 'ban_user', 'Security', 'Account flagged for potential money laundering activity - unusual transaction patterns detected', be.security_email, 'critical', true, 2, true FROM bank_emails be
    UNION ALL
    SELECT 'suspend_account', 'Security', 'Unusual login activity detected - possible credential compromise or account sharing', be.security_email, 'high', true, 3, true FROM bank_emails be
    UNION ALL
    SELECT 'lock_account', 'Security', 'Multiple failed login attempts - account temporarily locked for your protection', be.security_email, 'medium', false, 4, true FROM bank_emails be
    UNION ALL
    SELECT 'force_password_reset', 'Security', 'Security audit triggered - password reset required for account safety', be.security_email, 'medium', false, 5, true FROM bank_emails be
    UNION ALL
    SELECT 'ban_user', 'Compliance', 'Account fails to comply with KYC (Know Your Customer) requirements - verification documents rejected', be.compliance_email, 'critical', true, 6, true FROM bank_emails be
    UNION ALL
    SELECT 'suspend_account', 'Compliance', 'Pending compliance review - transaction limits applied during verification period', be.compliance_email, 'high', false, 7, true FROM bank_emails be
    UNION ALL
    SELECT 'lock_account', 'Compliance', 'AML (Anti-Money Laundering) screening required - account restricted pending review', be.compliance_email, 'high', true, 8, true FROM bank_emails be
    UNION ALL
    SELECT 'ban_user', 'Fraud & Suspicious Activity', 'Confirmed fraud activity - account permanently closed and flagged in fraud prevention system', be.fraud_email, 'critical', true, 9, true FROM bank_emails be
    UNION ALL
    SELECT 'suspend_account', 'Fraud & Suspicious Activity', 'Suspicious transaction detected - account suspended pending fraud investigation', be.fraud_email, 'high', true, 10, true FROM bank_emails be
    UNION ALL
    SELECT 'lock_account', 'Fraud & Suspicious Activity', 'Potential fraudulent activity - account locked pending further investigation', be.fraud_email, 'high', true, 11, true FROM bank_emails be
    UNION ALL
    SELECT 'suspend_account', 'Verification', 'Identity verification failed - additional documentation required to restore access', be.verify_email, 'medium', false, 12, true FROM bank_emails be
    UNION ALL
    SELECT 'lock_account', 'Verification', 'Account verification expired - please update your information to continue', be.verify_email, 'low', false, 13, true FROM bank_emails be
    UNION ALL
    SELECT 'close_account', 'Policy Violation', 'Terms of Service violation detected - account closed per violation of acceptable use policy', be.compliance_email, 'high', false, 14, true FROM bank_emails be
    UNION ALL
    SELECT 'suspend_account', 'Policy Violation', 'Violation of banking terms - transaction restrictions applied pending review', be.compliance_email, 'medium', false, 15, true FROM bank_emails be
    UNION ALL
    SELECT 'sign_out_all_devices', 'Technical', 'Security protocol update - all sessions invalidated, please log in again', be.support_email, 'low', false, 16, true FROM bank_emails be
    UNION ALL
    SELECT 'lock_account', 'Technical', 'System maintenance - account temporarily restricted during scheduled updates', be.support_email, 'low', false, 17, true FROM bank_emails be
  ) data
  RETURNING id, reason_text, contact_email
),

-- ============================================================================
-- 3. INSERT DISPLAY MESSAGES for RESTRICTION REASONS with DYNAMIC EMAILS
-- ============================================================================

display_messages_insert AS (
  INSERT INTO public.restriction_display_messages (
    restriction_reason_id,
    reason_type,
    message_text,
    message_type,
    severity_level,
    is_default,
    display_order,
    is_active
  )
  SELECT
    ri.id,
    'restriction',
    REPLACE(
      CASE ri.reason_text
        WHEN 'Account compromised - unauthorized access detected from multiple locations and suspicious transactions initiated'
          THEN 'Your account has been temporarily suspended due to suspicious activity. We detected unauthorized access attempts from multiple locations and initiated unauthorized transactions. For your protection and security, your account is now locked. Please contact our security team at {{CONTACT_EMAIL}} to verify your identity and restore access. Do not share your login credentials with anyone.'
        WHEN 'Account flagged for potential money laundering activity - unusual transaction patterns detected'
          THEN 'Your account has been restricted pending a compliance review. We detected transaction patterns that require further investigation per regulatory requirements. This is a precautionary measure. Please contact {{CONTACT_EMAIL}} with any questions. Your account will be reviewed within 5-10 business days.'
        WHEN 'Unusual login activity detected - possible credential compromise or account sharing'
          THEN 'For your protection, your account has been temporarily suspended due to unusual login activity, which may indicate a security risk or unauthorized sharing of credentials. Please reset your password immediately and enable two-factor authentication. Contact {{CONTACT_EMAIL}} if you did not initiate this activity.'
        WHEN 'Multiple failed login attempts - account temporarily locked for your protection'
          THEN 'Your account has been temporarily locked after multiple failed login attempts. This is a standard security measure to protect your account. Please try again in 15 minutes, or reset your password if you''ve forgotten it. If you need assistance, contact {{CONTACT_EMAIL}}.'
        WHEN 'Security audit triggered - password reset required for account safety'
          THEN 'A security audit has been initiated on your account. For your protection, you are required to reset your password before continuing. This helps ensure your account remains secure. Your password must be at least 12 characters with uppercase, lowercase, numbers, and special characters. Contact {{CONTACT_EMAIL}} for assistance.'
        WHEN 'Account fails to comply with KYC (Know Your Customer) requirements - verification documents rejected'
          THEN 'Your account has been restricted due to failed identity verification. Your submitted documents were rejected or could not be verified. Please resubmit updated government-issued ID (passport, driver''s license, or national ID) through your account settings. Contact {{CONTACT_EMAIL}} for assistance.'
        WHEN 'Pending compliance review - transaction limits applied during verification period'
          THEN 'Your account is currently under compliance review. While this review is in progress, transaction limits have been applied. You can still access your account and view your balance. We expect to complete the review within 2-3 business days. For questions, contact {{CONTACT_EMAIL}}.'
        WHEN 'AML (Anti-Money Laundering) screening required - account restricted pending review'
          THEN 'Your account has been restricted pending an Anti-Money Laundering (AML) screening. This is a regulatory requirement and does not indicate wrongdoing. Please allow 5-10 business days for completion. If you have questions, contact {{CONTACT_EMAIL}}.'
        WHEN 'Confirmed fraud activity - account permanently closed and flagged in fraud prevention system'
          THEN 'Your account has been permanently closed due to confirmed fraudulent activity. Your account has been flagged in our fraud prevention system and cannot be reopened. If you believe this is an error, contact {{CONTACT_EMAIL}} with documentation within 30 days.'
        WHEN 'Suspicious transaction detected - account suspended pending fraud investigation'
          THEN 'Your account has been suspended due to suspicious transaction activity. We have initiated a fraud investigation to protect your account and funds. You will receive updates via email. Do not attempt to conduct additional transactions. Contact {{CONTACT_EMAIL}} if you can provide information about suspicious activity.'
        WHEN 'Potential fraudulent activity - account locked pending further investigation'
          THEN 'Your account has been locked due to potential fraudulent activity. We are conducting an investigation to ensure your account security. Please verify the recent transactions in your account. Contact {{CONTACT_EMAIL}} with any concerns. Investigation typically takes 3-5 business days.'
        WHEN 'Identity verification failed - additional documentation required to restore access'
          THEN 'Your account access has been limited due to failed identity verification. Please provide additional documentation including proof of address (utility bill or bank statement), proof of income, and a clear copy of your government-issued ID. Submit documents through your account portal or contact {{CONTACT_EMAIL}}.'
        WHEN 'Account verification expired - please update your information to continue'
          THEN 'Your account verification has expired. Please log in and update your personal information, contact details, and re-verify your identity. This is a quick process that typically takes less than 5 minutes. Verification is required annually for account security and compliance. Contact {{CONTACT_EMAIL}} for help.'
        WHEN 'Terms of Service violation detected - account closed per violation of acceptable use policy'
          THEN 'Your account has been closed due to violation of our Terms of Service and Acceptable Use Policy. We do not permit use of our banking services for prohibited activities. This closure is permanent. For details on the violation, contact {{CONTACT_EMAIL}}.'
        WHEN 'Violation of banking terms - transaction restrictions applied pending review'
          THEN 'Your account is under review due to suspected violation of our banking terms. Transaction restrictions have been applied while we complete our investigation. We will contact you within 3 business days with findings. Please do not attempt to circumvent restrictions or use multiple accounts. Contact {{CONTACT_EMAIL}} with questions.'
        WHEN 'Security protocol update - all sessions invalidated, please log in again'
          THEN 'We have completed a security protocol update. For your protection, all sessions have been ended. Please log in again with your credentials. If you experience any issues, contact {{CONTACT_EMAIL}}.'
        WHEN 'System maintenance - account temporarily restricted during scheduled updates'
          THEN 'Your account access is temporarily limited due to scheduled system maintenance. We apologize for any inconvenience. Maintenance typically completes within 2-4 hours. You will receive confirmation via email when full service is restored. Thank you for your patience. Contact {{CONTACT_EMAIL}} if issues persist.'
        ELSE 'Your account has been restricted. Please contact {{CONTACT_EMAIL}} for more information.'
      END,
      '{{CONTACT_EMAIL}}',
      ri.contact_email
    ),
    CASE ri.reason_text
      WHEN ri.reason_text LIKE '%compromised%' OR ri.reason_text LIKE '%money laundering%' OR ri.reason_text LIKE '%fraud%' THEN 'urgent'
      WHEN ri.reason_text LIKE '%compliance%' OR ri.reason_text LIKE '%AML%' THEN 'investigation'
      WHEN ri.reason_text LIKE '%temporary%' OR ri.reason_text LIKE '%maintenance%' THEN 'temporary'
      WHEN ri.reason_text LIKE '%closed%' OR ri.reason_text LIKE '%permanent%' THEN 'permanent'
      ELSE 'standard'
    END,
    CASE ri.reason_text
      WHEN ri.reason_text LIKE '%compromised%' OR ri.reason_text LIKE '%money laundering%' OR ri.reason_text LIKE '%Confirmed fraud%' THEN 'critical'
      WHEN ri.reason_text LIKE '%suspicious%' OR ri.reason_text LIKE '%compliance%' THEN 'high'
      WHEN ri.reason_text LIKE '%verification%' THEN 'medium'
      ELSE 'low'
    END,
    true,
    0,
    true
  FROM restriction_insert ri
)

-- ============================================================================
-- 4. INSERT RESTORATION REASONS with DYNAMIC EMAILS
-- ============================================================================

INSERT INTO public.account_restoration_reasons (
  action_type,
  category,
  reason_text,
  contact_email,
  severity_level,
  requires_immediate_action,
  display_order,
  is_active
)
SELECT
  action_type,
  category,
  reason_text,
  contact_email,
  severity_level,
  requires_immediate_action,
  display_order,
  is_active
FROM (
  SELECT
    'unban_user' as action_type,
    'Appeals' as category,
    'User submitted successful appeal - identity verified and account restored per appeal decision' as reason_text,
    be.compliance_email as contact_email,
    'high'::text as severity_level,
    false as requires_immediate_action,
    1 as display_order,
    true as is_active
  FROM bank_emails be
  UNION ALL
  SELECT 'lift_suspension', 'Appeals', 'Suspension appeal approved - verification requirements met, account access restored', be.compliance_email, 'high', false, 2, true FROM bank_emails be
  UNION ALL
  SELECT 'lift_suspension', 'Compliance', 'Compliance review completed - account passed all verification requirements', be.compliance_email, 'high', false, 3, true FROM bank_emails be
  UNION ALL
  SELECT 'unlock_account', 'Compliance', 'AML screening completed successfully - account restrictions lifted', be.compliance_email, 'high', false, 4, true FROM bank_emails be
  UNION ALL
  SELECT 'reactivate_account', 'Compliance', 'KYC verification completed - all documentation accepted and verified', be.compliance_email, 'medium', false, 5, true FROM bank_emails be
  UNION ALL
  SELECT 'unban_user', 'Legal', 'Legal review completed - account restored by legal department decision', be.legal_email, 'critical', false, 6, true FROM bank_emails be
  UNION ALL
  SELECT 'lift_suspension', 'Legal', 'Court order or legal mandate - account must be restored', be.legal_email, 'critical', true, 7, true FROM bank_emails be
  UNION ALL
  SELECT 'unlock_account', 'Security', 'Security verification completed - account re-secured and unlocked', be.security_email, 'high', false, 8, true FROM bank_emails be
  UNION ALL
  SELECT 'reactivate_account', 'Security', 'Security audit cleared - account fully restored with enhanced security', be.security_email, 'high', false, 9, true FROM bank_emails be
  UNION ALL
  SELECT 'unlock_account', 'Technical', 'System issue resolved - account lock removed by technical support', be.support_email, 'low', false, 10, true FROM bank_emails be
  UNION ALL
  SELECT 'reactivate_account', 'Technical', 'Scheduled maintenance completed - account restored to full functionality', be.support_email, 'low', false, 11, true FROM bank_emails be
) data;

-- ============================================================================
-- VERIFICATION: Check inserted data
-- ============================================================================

-- Uncomment below to verify data was inserted correctly:
-- SELECT COUNT(*) as restriction_reasons_count FROM public.account_restriction_reasons;
-- SELECT COUNT(*) as display_messages_count FROM public.restriction_display_messages;
-- SELECT COUNT(*) as restoration_reasons_count FROM public.account_restoration_reasons;
-- SELECT DISTINCT contact_email FROM public.account_restriction_reasons ORDER BY contact_email;
-- SELECT DISTINCT contact_email FROM public.account_restoration_reasons ORDER BY contact_email;
