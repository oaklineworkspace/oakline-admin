
// Professional Email Templates for Oakline Bank
// Using official Zoho email addresses

export const EMAIL_ADDRESSES = {
  INFO: 'info@theoaklinebank.com',
  SUPPORT: 'support@theoaklinebank.com', 
  ADMIN: 'admin@theoaklinebank.com',
  FINANCE: 'finance@theoaklinebank.com'
};

export const createEnrollmentEmail = (userFullName, enrollLink) => {
  return {
    from: EMAIL_ADDRESSES.INFO,
    subject: "Complete Your Oakline Bank Account Enrollment",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Complete Your Enrollment - Oakline Bank</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%); padding: 32px 24px; text-align: center;">
            <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 8px;">
              🏦 Oakline Bank
            </div>
            <div style="color: #ffffff; opacity: 0.9; font-size: 16px;">
              Your Trusted Financial Partner
            </div>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 32px;">
            <h1 style="color: #1a365d; font-size: 28px; font-weight: 700; margin: 0 0 16px 0;">
              Welcome to Oakline Bank, ${userFullName}!
            </h1>
            
            <p style="color: #4a5568; font-size: 18px; line-height: 1.6; margin: 0 0 24px 0;">
              Your application has been processed and your accounts are ready for activation.
            </p>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
              To complete your enrollment and activate your accounts, please click the button below:
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${enrollLink}" 
                 style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #2c5aa0 100%); 
                        color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; 
                        font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);">
                Complete Your Enrollment
              </a>
            </div>
            
            <!-- Requirements -->
            <div style="background-color: #f7fafc; border-radius: 12px; padding: 24px; margin: 32px 0;">
              <h3 style="color: #1a365d; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
                📋 What You'll Need:
              </h3>
              <ul style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Set your secure account password</li>
                <li style="margin-bottom: 8px;">Provide your Social Security Number (SSN) or Government ID</li>
                <li style="margin-bottom: 8px;">Select one of your account numbers</li>
                <li style="margin-bottom: 8px;">Review and agree to our Terms of Service</li>
              </ul>
            </div>
            
            <!-- Security Notice -->
            <div style="background-color: #fef5e7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
              <p style="color: #92400e; font-size: 14px; font-weight: 500; margin: 0;">
                🔒 <strong>Security Notice:</strong> This enrollment link will expire in 7 days for your security. 
                If you did not request this account, please contact us immediately.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0;">
              Need help? Contact our support team:
            </p>
            <p style="color: #4a5568; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">
              📧 ${EMAIL_ADDRESSES.SUPPORT}
            </p>
            <p style="color: #718096; font-size: 14px; margin: 0 0 24px 0;">
              Available 24/7 for your assistance
            </p>
            
            <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 24px;">
              <p style="color: #718096; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br>
                This email was sent from a secure, monitored system.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

export const createWelcomeEmail = (userFullName, accountDetails) => {
  return {
    from: EMAIL_ADDRESSES.INFO,
    subject: "Welcome to Oakline Bank - Your Account is Ready!",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Oakline Bank</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%); padding: 32px 24px; text-align: center;">
            <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 8px;">
              🏦 Oakline Bank
            </div>
            <div style="color: #ffffff; opacity: 0.9; font-size: 16px;">
              Welcome to Your Financial Future
            </div>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 32px;">
            <h1 style="color: #1a365d; font-size: 28px; font-weight: 700; margin: 0 0 16px 0;">
              Congratulations, ${userFullName}!
            </h1>
            
            <p style="color: #4a5568; font-size: 18px; line-height: 1.6; margin: 0 0 32px 0;">
              Your Oakline Bank account has been successfully created. You're now part of our exclusive banking family.
            </p>
            
            <!-- Account Details -->
            <div style="background-color: #f7fafc; border-radius: 12px; padding: 24px; margin: 32px 0;">
              <h3 style="color: #1a365d; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
                💳 Your Account Information:
              </h3>
              ${accountDetails ? accountDetails.map(account => `
                <div style="margin-bottom: 16px; padding: 16px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
                  <div style="color: #1a365d; font-weight: 600; margin-bottom: 4px;">${account.type}</div>
                  <div style="color: #4a5568; font-family: monospace;">****${account.number.slice(-4)}</div>
                </div>
              `).join('') : ''}
            </div>
            
            <!-- Next Steps -->
            <div style="background-color: #ecfdf5; border-radius: 12px; padding: 24px; margin: 32px 0;">
              <h3 style="color: #065f46; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
                🚀 What's Next:
              </h3>
              <ul style="color: #047857; font-size: 16px; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Access your online banking dashboard</li>
                <li style="margin-bottom: 8px;">Set up mobile banking and notifications</li>
                <li style="margin-bottom: 8px;">Explore our investment and loan products</li>
                <li style="margin-bottom: 8px;">Contact us for personalized financial advice</li>
              </ul>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0;">
              Questions? We're here to help:
            </p>
            <p style="color: #4a5568; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">
              📧 ${EMAIL_ADDRESSES.SUPPORT} | 📞 1-800-OAKLINE
            </p>
            
            <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 24px;">
              <p style="color: #718096; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Oakline Bank. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

export const createPasswordResetEmail = (userFullName, resetLink) => {
  return {
    from: EMAIL_ADDRESSES.SUPPORT,
    subject: "Reset Your Oakline Bank Password",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - Oakline Bank</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%); padding: 32px 24px; text-align: center;">
            <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 8px;">
              🏦 Oakline Bank
            </div>
            <div style="color: #ffffff; opacity: 0.9; font-size: 16px;">
              Secure Password Reset
            </div>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 32px;">
            <h1 style="color: #1a365d; font-size: 28px; font-weight: 700; margin: 0 0 16px 0;">
              Password Reset Request
            </h1>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Hello ${userFullName}, we received a request to reset your Oakline Bank account password.
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${resetLink}" 
                 style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); 
                        color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; 
                        font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);">
                Reset My Password
              </a>
            </div>
            
            <!-- Security Notice -->
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0;">
              <p style="color: #991b1b; font-size: 14px; font-weight: 500; margin: 0;">
                🔒 <strong>Security Notice:</strong> This link expires in 1 hour. If you didn't request this reset, 
                please contact our security team immediately at ${EMAIL_ADDRESSES.SUPPORT}.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Oakline Bank. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };
};
