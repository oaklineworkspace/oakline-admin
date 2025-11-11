
# Email Provider Setup Guide

This application supports multiple email providers with automatic fallback. If one provider fails or hits rate limits, it automatically tries the next one.

## Supported Providers (in priority order)

### 1. Brevo (Primary - Recommended)
**Status:** ✅ Ready to configure  
**Free Tier:** 300 emails/day (9,000 emails/month)  
**Signup:** https://www.brevo.com/

**Required Secrets:**
- `BREVO_API_KEY` - Your Brevo API key (starts with `xkeysib-`)

**Setup Steps:**
1. Sign up at Brevo (formerly Sendinblue)
2. Verify your email and complete setup
3. Go to Settings → SMTP & API → API Keys
4. Create a new API key or use existing one
5. Add to Replit Secrets:
   - Key: `BREVO_API_KEY`
   - Value: Your API key from Brevo

**Notes:**
- No SMTP credentials needed - works via REST API
- Very reliable and fast
- Great for transactional emails
- Free tier is generous for most use cases

### 2. Resend (Second Provider - Already Configured)
**Status:** ✅ Already configured  
**Free Tier:** 3,000 emails/month, 100 emails/day  
**Required Secrets:**
- `RESEND_API_KEY` - Configured in Replit Secrets (API key starts with `re_`)

**Notes:**
- No additional SMTP credentials needed
- Works via REST API
- Very reliable and fast
- Great for transactional emails

### 3. Primary SMTP (Fallback)
**Status:** ✅ Already configured  
**Required Secrets:**
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## Alternative Providers

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
1. **Brevo API** (primary) ✅ Configured
2. **Resend API** (fallback #1) ✅ Configured
3. **Primary SMTP** (fallback #2) ✅ Configured

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
📧 Attempting to send email via Brevo...
✅ Email sent successfully via Brevo: <message-id>
```

## Recommendations

For best reliability, you currently have:
1. ✅ Brevo API (Priority 1) - free 300 emails/day, easy setup
2. ✅ Resend API (Priority 2) - already configured
3. ✅ Primary SMTP (Priority 3) - already configured

This gives you 3 independent providers with generous limits, ensuring your emails always get through!
