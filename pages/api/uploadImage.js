import { supabase, BUCKET_NAME } from '../../lib/supabase';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

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

    // Check if Supabase is configured
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey || !supabase) {
      // No Supabase configured — return the base64 data URL directly
      return res.json({
        success: true,
        url: imageData,
        path: 'inline',
      });
    }

    // Convert base64 to buffer (handle all MIME types like svg+xml, jpeg, png, etc.)
    const base64Data = imageData.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const ext = fileName.split('.').pop() || 'jpg';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const filePath = `foods/${uniqueName}`;

    // Upload to Supabase Storage
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

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    res.json({
      success: true,
      url: urlData.publicUrl,
      path: filePath,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}
