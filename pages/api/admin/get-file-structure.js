
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rootDir = process.cwd();
    const fileStructure = getDirectoryStructure(rootDir);

    return res.status(200).json({
      success: true,
      files: fileStructure
    });
  } catch (error) {
    console.error('Error reading file structure:', error);
    return res.status(500).json({ error: 'Failed to read file structure' });
  }
}

function getDirectoryStructure(dirPath, relativePath = '') {
  const items = [];
  const excludeDirs = ['node_modules', '.next', '.git', 'dist', 'build', '.replit'];

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (excludeDirs.includes(entry.name)) continue;

      const fullPath = path.join(dirPath, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        items.push({
          name: entry.name,
          type: 'directory',
          path: relPath,
          children: getDirectoryStructure(fullPath, relPath)
        });
      } else {
        const stats = fs.statSync(fullPath);
        items.push({
          name: entry.name,
          type: 'file',
          path: relPath,
          size: stats.size
        });
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }

  return items.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'directory' ? -1 : 1;
  });
}
