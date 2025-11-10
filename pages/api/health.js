export default function handler(req, res) {
  // Set CORS headers
  const allowedOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'https://theoaklinebank.com';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight (OPTIONS) requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Normal response
  res.status(200).json({
    status: 'ok',
    message: 'Render backend reachable!',
    timestamp: new Date().toISOString()
  });
}
