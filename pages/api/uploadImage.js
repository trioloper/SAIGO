import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { supabase, BUCKET_NAME } from '../../lib/supabase';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

export function getLocalMenuDir() {
  const dir = path.join(process.cwd(), 'public', 'menu');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { imageData, fileName, contentType } = req.body;

    if (!imageData || !fileName) {
      return res
        .status(400)
        .json({ success: false, message: 'Image data and filename required' });
    }

    const driver = (
      process.env.IMAGE_STORAGE_DRIVER ||
      process.env.NEXT_PUBLIC_IMAGE_STORAGE_DRIVER ||
      'local'
    ).toLowerCase();

    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:[^;]+;base64,/, '');
    const rawBuffer = Buffer.from(base64Data, 'base64');

    // Extract safe extension and base name
    const rawExt = fileName.split('.').pop() || 'jpg';
    const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '');
    const baseRaw = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
    const cleanBase = baseRaw
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();

    // Auto-optimize with sharp: max 800px, 82% quality (shrinks 5MB-20MB down to ~30-50KB)
    let buffer = rawBuffer;
    try {
      let pipeline = sharp(rawBuffer).resize({
        width: 800,
        height: 800,
        fit: 'inside',
        withoutEnlargement: true,
      });
      if (ext === 'png') {
        buffer = await pipeline.png({ quality: 85, compressionLevel: 8 }).toBuffer();
      } else {
        buffer = await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      }
    } catch (sharpErr) {
      console.warn('Sharp compression skipped:', sharpErr.message);
    }

    // --- SUPABASE STORAGE DRIVER ---
    if (driver === 'supabase') {
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!anonKey || !supabase) {
        return res.status(500).json({
          success: false,
          message: 'Supabase driver chosen but credentials not configured',
        });
      }

      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${cleanBase}.${ext}`;
      const filePath = `foods/${uniqueName}`;

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, buffer, {
          contentType: contentType || 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        return res.status(500).json({ success: false, message: error.message });
      }

      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      return res.json({
        success: true,
        url: urlData.publicUrl,
        path: filePath,
        fileName: uniqueName,
        driver: 'supabase',
      });
    }

    // --- LOCAL STORAGE DRIVER (DEFAULT for DigitalOcean VPS / local) ---
    const menuDir = getLocalMenuDir();
    let finalFileName = `${cleanBase}.${ext}`;
    let targetPath = path.join(menuDir, finalFileName);

    // If a file with the same name exists, add timestamp prefix
    if (fs.existsSync(targetPath)) {
      finalFileName = `${Date.now()}_${cleanBase}.${ext}`;
      targetPath = path.join(menuDir, finalFileName);
    }

    fs.writeFileSync(targetPath, buffer);

    return res.json({
      success: true,
      url: `/menu/${finalFileName}`,
      fileName: finalFileName,
      driver: 'local',
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}
