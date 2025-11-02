
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const rootDir = process.cwd();
    const fullPath = path.join(rootDir, filePath);

    // Security check: ensure the file is within the project directory
    if (!fullPath.startsWith(rootDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if it's actually a file
    const stats = fs.statSync(fullPath);
    if (!stats.isFile()) {
      return res.status(400).json({ error: 'Path is not a file' });
    }

    // Read file content
    const content = fs.readFileSync(fullPath, 'utf8');

    return res.status(200).json({
      success: true,
      content,
      size: stats.size
    });
  } catch (error) {
    console.error('Error reading file:', error);
    return res.status(500).json({ error: 'Failed to read file' });
  }
}
