import { useState, useEffect, useMemo, useRef } from "react";

export default function ImagePickerModal({ isOpen, onClose, onSelect, currentImage }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    loadImages();
  }, [isOpen]);

  const loadImages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/storageHandler");
      const data = await res.json();
      if (data.success) {
        setImages(data.files || []);
      }
    } catch (err) {
      console.error("Failed to load local assets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const res = await fetch("/api/uploadImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: base64Data,
          fileName: file.name,
          contentType: file.type,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await loadImages();
        // Automatically select the freshly uploaded image
        onSelect(data.url, data.fileName);
        onClose();
      } else {
        alert("Upload failed: " + data.message);
      }
    } catch (err) {
      alert("Upload error: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredImages = useMemo(() => {
    if (!search.trim()) return images;
    const q = search.toLowerCase().trim();
    return images.filter((img) => img.name.toLowerCase().includes(q));
  }, [images, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#152b23] border border-white/20 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0f1f1a]">
          <div>
            <h2 className="text-xl font-bold text-amber-200 flex items-center gap-2">
              <span>🖼️</span> Select Local Image
            </h2>
            <p className="text-xs text-white/60">
              Browse public/menu assets or upload a new photo
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            ✕
          </button>
        </div>

        {/* Toolbar: Search + Quick Upload */}
        <div className="p-4 border-b border-white/10 flex flex-wrap gap-3 items-center justify-between bg-[#13251e]">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search images (e.g. 01, 24, saigo)..."
              className="w-full bg-[#0f1f1a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/40 focus:border-amber-500/50 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <span className="spinner h-3 w-3" /> Uploading...
                </>
              ) : (
                <>
                  <span>+</span> Upload New Asset
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleQuickUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Images Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="text-center py-12 text-white/50">
              <div className="spinner h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Loading local image assets...</p>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              <p className="text-sm">No images match your search</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {filteredImages.map((file) => {
                const isSelected =
                  currentImage === file.url ||
                  currentImage === file.name ||
                  currentImage?.endsWith("/" + file.name);

                return (
                  <button
                    key={file.name}
                    type="button"
                    onClick={() => {
                      onSelect(file.url, file.name);
                      onClose();
                    }}
                    className={`group relative flex flex-col rounded-xl overflow-hidden border text-left transition-all duration-200 hover:scale-[1.03] ${
                      isSelected
                        ? "border-amber-400 ring-2 ring-amber-400/50 bg-amber-400/10"
                        : "border-white/10 hover:border-amber-400/40 bg-[#0f1f1a]"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-square w-full bg-black/40 overflow-hidden">
                      <img
                        src={file.url}
                        alt={file.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/menu/saigo.jpg";
                        }}
                      />
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-amber-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow">
                          ✓ Selected
                        </div>
                      )}
                    </div>

                    {/* Label */}
                    <div className="p-1.5 bg-[#0f1f1a]">
                      <p
                        className="text-[11px] font-medium text-white truncate"
                        title={file.name}
                      >
                        {file.name}
                      </p>
                      <p className="text-[9px] text-white/40">
                        {(file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 flex items-center justify-between bg-[#0f1f1a] text-xs text-white/50">
          <span>{filteredImages.length} images available</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
