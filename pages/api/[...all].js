import path from 'path';
import fs from 'fs';
import withCors from '../../lib/withCors';

export default async function handler(req, res) {
  const { all } = req.query; // array of path segments
  const apiPath = path.join(process.cwd(), 'pages', 'api', ...all) + '.js';

  if (!fs.existsSync(apiPath)) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }

  const { default: apiHandler } = await import(`../../pages/api/${all.join('/')}.js`);
  return withCors(apiHandler)(req, res);
}
