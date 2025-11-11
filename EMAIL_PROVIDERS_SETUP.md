
# Email Provider Setup Guide

This application supports multiple email providers with automatic fallback. If one provider fails or hits rate limits, it automatically tries the next one.

## Supported Providers (in priority order)

### 1. Primary SMTP (Your Current Provider)
**Status:** ✅ Already configured  
**Required Secrets:**
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

### 2. Resend (Recommended - Already Configured)
**Status:** ✅ Already configured  
**Free Tier:** 3,000 emails/month, 100 emails/day  
**Required Secrets:**
- `RESEND_API_KEY` - Configured in Replit Secrets (API key starts with `re_`)

**Notes:**
- No additional SMTP credentials needed
- Works via REST API
- Very reliable and fast
- Great for transactional emails

### 3. SendPulse (Recommended Third Provider)
**Status:** ⚠️ Needs configuration  
**Free Tier:** 12,000 emails/month forever  
**Signup:** https://sendpulse.com/

**Setup Steps:**
1. Sign up at SendPulse
2. Verify your email
3. Go to Settings → SMTP
4. Create SMTP credentials or use existing ones
5. Add to Replit Secrets:
   - Key: `SENDPULSE_SMTP_HOST`
   - Value: `smtp-pulse.com`
   - Key: `SENDPULSE_SMTP_PORT`
   - Value: `465` (or `587` for TLS)
   - Key: `SENDPULSE_SMTP_USER`
   - Value: Your SendPulse email or SMTP ID
   - Key: `SENDPULSE_SMTP_PASS`
   - Value: Your SMTP password

## Alternative Third Providers

### Option A: Mailgun
**Free Tier:** 5,000 emails/month for 3 months  
**Signup:** https://signup.mailgun.com/

**Required Secrets:**
```
MAILGUN_SMTP_HOST=smtp.mailgun.org
MAILGUN_SMTP_PORT=587
MAILGUN_SMTP_USER=postmaster@your-domain.mailgun.org
MAILGUN_SMTP_PASS=your-mailgun-password
```

### Option B: Amazon SES
**Free Tier:** 62,000 emails/month (when sent from EC2)  
**Pricing:** $0.10 per 1,000 emails after free tier  
**Signup:** https://aws.amazon.com/ses/

**Required Secrets:**
```
AWS_SES_SMTP_HOST=email-smtp.us-east-1.amazonaws.com
AWS_SES_SMTP_PORT=587
AWS_SES_SMTP_USER=Your-SES-SMTP-Username
AWS_SES_SMTP_PASS=Your-SES-SMTP-Password
```

### Option C: Postmark
**Free Trial:** 100 emails  
**Pricing:** $15/month for 10,000 emails  
**Signup:** https://postmarkapp.com/

**Required Secrets:**
```
POSTMARK_SMTP_HOST=smtp.postmarkapp.com
POSTMARK_SMTP_PORT=587
POSTMARK_SMTP_USER=your-server-token
POSTMARK_SMTP_PASS=your-server-token
```

## Current Configuration

Your system will try providers in this order:
1. **Resend API** (primary) ✅ Configured
2. **Primary SMTP** (fallback #1) ✅ Configured
3. **SendPulse SMTP** (fallback #2) ⚠️ Recommended to add

## How It Works

The system automatically:
- ✅ Tries each provider in order
- ✅ Retries failed attempts (2 times per provider)
- ✅ Falls back to next provider if one fails
- ✅ Logs which provider successfully sent each email
- ✅ Throws error only if ALL providers fail

## Monitoring

Check your logs for messages like:
```
📧 Attempting to send email via primary (attempt 1/2)
✅ Email sent successfully via resend: msg_abc123
```

## Recommendations

For best reliability, I recommend:
1. ✅ Keep Resend API (Priority 1) - already configured
2. ✅ Keep your current SMTP (Priority 2) - already configured
3. ➕ Add SendPulse (Priority 3) - free 12,000 emails/month forever

This gives you 3 independent providers with generous limits, ensuring your emails always get through!
