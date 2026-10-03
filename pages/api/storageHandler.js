import fs from 'fs';
import path from 'path';
import { getLocalMenuDir } from './uploadImage';

const SERVER =
  process.env.SERVER_BASE_URL ||
  process.env.NEXT_PUBLIC_SERVER_BASE_URL ||
  'http://localhost:8000';

const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif'];

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

export default async function handler(req, res) {
  const menuDir = getLocalMenuDir();
  const driver = (
    process.env.IMAGE_STORAGE_DRIVER ||
    process.env.NEXT_PUBLIC_IMAGE_STORAGE_DRIVER ||
    'local'
  ).toLowerCase();

  // 1. GET: List all local images
  if (req.method === 'GET') {
    try {
      if (!fs.existsSync(menuDir)) {
        return res.json({ success: true, files: [], count: 0, driver });
      }

      const rawFiles = fs.readdirSync(menuDir);
      const files = rawFiles
        .filter((file) => {
          const ext = path.extname(file).toLowerCase();
          return ALLOWED_EXTS.includes(ext);
        })
        .map((file) => {
          const fullPath = path.join(menuDir, file);
          let stats = { size: 0, mtime: new Date() };
          try {
            stats = fs.statSync(fullPath);
          } catch {
            // Ignore stat read error
          }
          return {
            name: file,
            url: `/menu/${encodeURIComponent(file)}`,
            size: stats.size,
            modified: stats.mtime,
            isProtected: ['saigo.jpg', 'default.jpg'].includes(file.toLowerCase()),
          };
        })
        .sort((a, b) => {
          // Sort numbered files naturally (01.jpg, 02.jpg...)
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });

      return res.json({
        success: true,
        files,
        count: files.length,
        driver,
        menuDir,
      });
    } catch (err) {
      console.error('Storage list error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // 2. PUT: Rename an image
  if (req.method === 'PUT') {
    try {
      const { oldName, newName } = req.body;
      if (!oldName || !newName) {
        return res.status(400).json({ success: false, message: 'Both oldName and newName are required' });
      }

      const safeOldName = path.basename(oldName);
      let safeNewName = path.basename(newName);

      // Ensure extension remains valid
      const oldExt = path.extname(safeOldName).toLowerCase();
      let newExt = path.extname(safeNewName).toLowerCase();
      if (!newExt) {
        safeNewName = `${safeNewName}${oldExt}`;
        newExt = oldExt;
      }

      if (!ALLOWED_EXTS.includes(newExt)) {
        return res.status(400).json({ success: false, message: 'Invalid file extension' });
      }

      const oldPath = path.join(menuDir, safeOldName);
      const newPath = path.join(menuDir, safeNewName);

      if (!fs.existsSync(oldPath)) {
        return res.status(404).json({ success: false, message: 'Source file does not exist' });
      }

      if (fs.existsSync(newPath) && safeOldName.toLowerCase() !== safeNewName.toLowerCase()) {
        return res.status(400).json({ success: false, message: 'A file with that name already exists' });
      }

      fs.renameSync(oldPath, newPath);

      // Attempt to update database references if any food item pointed to oldName
      try {
        const menuRes = await fetch(`${SERVER}/api/menu`);
        const menuData = await menuRes.json();
        if (menuData?.success && Array.isArray(menuData.categories)) {
          const oldUrl = `/menu/${safeOldName}`;
          const newUrl = `/menu/${safeNewName}`;
          for (const cat of menuData.categories) {
            for (const it of cat.items || []) {
              if (it.image === oldUrl) {
                await fetch(`${SERVER}/api/menu/categories/${cat._id}/items/${it._id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ image: newUrl }),
                });
              }
            }
          }
        }
      } catch (dbErr) {
        console.warn('Could not auto-update DB references after rename:', dbErr.message);
      }

      return res.json({
        success: true,
        message: 'File renamed successfully',
        oldName: safeOldName,
        newName: safeNewName,
        url: `/menu/${encodeURIComponent(safeNewName)}`,
      });
    } catch (err) {
      console.error('Storage rename error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // 3. DELETE: Remove an image
  if (req.method === 'DELETE') {
    try {
      const fileNameParam = req.query.fileName || req.body?.fileName;
      if (!fileNameParam) {
        return res.status(400).json({ success: false, message: 'fileName is required' });
      }

      const safeName = path.basename(fileNameParam);
      if (['saigo.jpg', 'default.jpg'].includes(safeName.toLowerCase())) {
        return res.status(400).json({ success: false, message: 'Core system assets cannot be deleted' });
      }

      const filePath = path.join(menuDir, safeName);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      fs.unlinkSync(filePath);

      return res.json({
        success: true,
        message: `Deleted ${safeName}`,
        deletedFile: safeName,
      });
    } catch (err) {
      console.error('Storage delete error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // 4. PATCH: Link existing DB items to local public/menu images
  if (req.method === 'PATCH' && req.body?.action === 'link-local') {
    try {
      const staticMenu = require('../../data/menu.json');
      const staticMap = new Map();
      for (const cat of staticMenu) {
        for (const it of cat.items || []) {
          staticMap.set(it.name.toLowerCase().trim(), it.image);
        }
      }

      const menuRes = await fetch(`${SERVER}/api/menu`);
      const menuData = await menuRes.json();
      if (!menuData?.success || !Array.isArray(menuData.categories)) {
        return res.status(500).json({ success: false, message: 'Failed to fetch categories from backend' });
      }

      let updatedCount = 0;
      for (const cat of menuData.categories) {
        for (const it of cat.items || []) {
          // Check if item image is dead Supabase URL or empty
          const isSupabaseOrMissing =
            !it.image ||
            it.image.includes('supabase.co') ||
            it.image.includes('undefined') ||
            it.image === '/menu/default.jpg';

          if (isSupabaseOrMissing) {
            const matchedLocal = staticMap.get(it.name.toLowerCase().trim());
            const targetImage = matchedLocal || '/menu/saigo.jpg';

            await fetch(`${SERVER}/api/menu/categories/${cat._id}/items/${it._id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: targetImage }),
            });
            updatedCount++;
          }
        }
      }

      return res.json({
        success: true,
        message: `Updated ${updatedCount} items to use local images!`,
        updatedCount,
      });
    } catch (err) {
      console.error('Link local error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
