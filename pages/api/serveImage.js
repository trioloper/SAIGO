import fs from 'fs';
import path from 'path';
import { getLocalMenuDir } from './uploadImage';

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
};

export default function handler(req, res) {
  try {
    const rawPath = req.query.path || req.query.file || '';
    const fileParam = Array.isArray(rawPath) ? rawPath.join('/') : rawPath;

    // Prevent directory traversal attacks
    const safeFileName = path.basename(fileParam);
    if (!safeFileName) {
      return res.status(404).send('Not found');
    }

    const menuDir = getLocalMenuDir();
    const filePath = path.join(menuDir, safeFileName);

    if (!fs.existsSync(filePath)) {
      // Fallback to saigo.jpg or default.jpg if requested image not found
      const fallback = path.join(menuDir, 'saigo.jpg');
      if (fs.existsSync(fallback)) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=60');
        return fs.createReadStream(fallback).pipe(res);
      }
      return res.status(404).send('Image not found');
    }

    const ext = path.extname(safeFileName).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Cache-Control',
      'public, max-age=31536000, stale-while-revalidate=86400'
    );
    return fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('Error serving image:', err);
    return res.status(500).send('Error serving dynamic image');
  }
}
