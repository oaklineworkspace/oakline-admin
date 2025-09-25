
export const SIEM_CONFIG = {
  endpoint: process.env.SIEM_ENDPOINT || 'https://your-siem-provider.com/api/events',
  apiKey: process.env.SIEM_API_KEY,
  enabled: process.env.NODE_ENV === 'production' && process.env.SIEM_ENDPOINT,
  
  // Backup SIEM providers
  fallback: {
    splunk: process.env.SPLUNK_ENDPOINT,
    datadog: process.env.DATADOG_ENDPOINT,
    elasticsearch: process.env.ELASTICSEARCH_ENDPOINT
  },
  
  // Event severity levels
  severity: {
    CRITICAL: 'critical',
    HIGH: 'high', 
    MEDIUM: 'medium',
    LOW: 'low',
    INFO: 'info'
  }
};
