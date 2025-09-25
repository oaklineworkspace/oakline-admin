
export const SECURITY_CONFIG = {
  // Password requirements
  passwordMinLength: 12,
  passwordRequireNumbers: true,
  passwordRequireSpecialChars: true,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordMaxAge: 90, // days
  
  // Session management
  sessionTimeoutMinutes: 15,
  maxConcurrentSessions: 2,
  
  // Account lockout
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 30,
  
  // Admin security
  adminMfaRequired: true,
  adminSessionTimeoutMinutes: 10,
  
  // API rate limiting
  apiRateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // requests per window
    adminMax: 1000
  },
  
  // Encryption
  encryptionAlgorithm: 'AES-256-GCM',
  keyRotationDays: 30
};

export const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (password.length < SECURITY_CONFIG.passwordMinLength) {
    errors.push(`Password must be at least ${SECURITY_CONFIG.passwordMinLength} characters`);
  }
  
  if (SECURITY_CONFIG.passwordRequireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (SECURITY_CONFIG.passwordRequireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  if (SECURITY_CONFIG.passwordRequireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (SECURITY_CONFIG.passwordRequireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const encryptSensitiveData = (data, key) => {
  // Implementation for AES-256-GCM encryption
  // In production, use crypto.randomBytes for IV
  const crypto = require('crypto');
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, key);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};
