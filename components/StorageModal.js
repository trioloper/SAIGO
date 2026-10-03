import { useState, useEffect, useMemo, useRef } from "react";
import { compressFileToDataUrl } from "../lib/clientImageCompress";

export default function StorageModal({ isOpen, onClose, onRefreshMenu }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });
  const [driver, setDriver] = useState("local");
  const [editingFile, setEditingFile] = useState(null);
  const [newNameInput, setNewNameInput] = useState("");
  const [previewImage, setPreviewImage] = useState(null);

  const fileInputRef = useRef(null);

  const showStatus = (text, type = "success") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: "", type: "" }), 5000);
  };

  const loadStorage = async () => {
    setLoading(true);
    try {
      // Use timestamp cache buster and no-store to prevent browser cache
      const res = await fetch(`/api/storageHandler?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      });
      const data = await res.json();
      if (data.success) {
        setFiles(data.files || []);
        if (data.driver) setDriver(data.driver);
      } else {
        showStatus(data.message || "Failed to load storage", "error");
      }
    } catch (err) {
      showStatus("Error loading assets: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStorage();
    }
  }, [isOpen]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Compress in browser: shrinks 5-15MB phone photos to ~100KB, preventing Nginx 413 limits
      const base64Data = await compressFileToDataUrl(file);

      const res = await fetch("/api/uploadImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: base64Data,
          fileName: file.name,
          contentType: file.type || "image/jpeg",
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        if (res.status === 413) {
          throw new Error("File too large for server proxy. Try a smaller image.");
        }
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      if (data.success) {
        showStatus(`Uploaded ${data.fileName || file.name} successfully!`);
        // Immediately reload storage without needing to close/reopen modal
        await loadStorage();
        if (onRefreshMenu) onRefreshMenu();
      } else {
        showStatus("Upload failed: " + (data.message || "Unknown error"), "error");
      }
    } catch (err) {
      showStatus("Upload error: " + err.message, "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (fileName) => {
    if (!confirm(`Are you sure you want to delete ${fileName} from local storage?`)) return;

    try {
      // Optimistically remove from view immediately
      setFiles((prev) => prev.filter((f) => f.name !== fileName));

      const res = await fetch(`/api/storageHandler?fileName=${encodeURIComponent(fileName)}&t=${Date.now()}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showStatus(`Deleted ${fileName}`);
        await loadStorage();
        if (onRefreshMenu) onRefreshMenu();
      } else {
        showStatus(data.message || "Delete failed", "error");
        await loadStorage();
      }
    } catch (err) {
      showStatus("Delete error: " + err.message, "error");
      await loadStorage();
    }
  };

  const startRename = (file) => {
    setEditingFile(file.name);
    setNewNameInput(file.name);
  };

  const handleRename = async (oldName) => {
    if (!newNameInput.trim() || newNameInput.trim() === oldName) {
      setEditingFile(null);
      return;
    }

    try {
      const res = await fetch(`/api/storageHandler?t=${Date.now()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldName,
          newName: newNameInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showStatus(`Renamed to ${data.newName}`);
        setEditingFile(null);
        await loadStorage();
        if (onRefreshMenu) onRefreshMenu();
      } else {
        showStatus(data.message || "Rename failed", "error");
      }
    } catch (err) {
      showStatus("Rename error: " + err.message, "error");
    }
  };

  const handleLinkLocal = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/storageHandler?t=${Date.now()}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "link-local", force: true }),
      });
      const data = await res.json();
      if (data.success) {
        showStatus(data.message || "Menu items updated to use local assets!");
        await loadStorage();
        if (onRefreshMenu) onRefreshMenu();
      } else {
        showStatus(data.message || "Sync failed", "error");
      }
    } catch (err) {
      showStatus("Sync error: " + err.message, "error");
    } finally {
      setSyncing(false);
    }
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    showStatus(`Copied "${url}" to clipboard!`);
  };

  const filteredFiles = useMemo(() => {
    if (!search.trim()) return files;
    const q = search.toLowerCase().trim();
    return files.filter((f) => f.name.toLowerCase().includes(q));
  }, [files, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-[#152b23] border border-white/20 rounded-xl sm:rounded-2xl w-full max-w-5xl h-[94vh] sm:h-auto sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-3 sm:p-4 border-b border-white/10 flex items-center justify-between bg-[#0f1f1a]">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-amber-200">
                📁 Storage Manager
              </h2>
              <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Driver: {driver.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-white/60 mt-0.5 truncate">
              Manage food images stored directly on your server
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white active:bg-white/10 rounded-lg transition text-lg flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Status Message */}
        {statusMessage.text && (
          <div
            className={`px-3 sm:px-4 py-2 text-xs font-medium flex items-center justify-between ${
              statusMessage.type === "error"
                ? "bg-red-500/20 text-red-200 border-b border-red-500/30"
                : "bg-emerald-500/20 text-emerald-200 border-b border-emerald-500/30"
            }`}
          >
            <span className="truncate pr-2">{statusMessage.text}</span>
            <button onClick={() => setStatusMessage({ text: "", type: "" })}>
              ✕
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="p-3 sm:p-4 border-b border-white/10 flex flex-col sm:flex-row gap-2.5 sm:gap-3 sm:items-center justify-between bg-[#13251e]">
          {/* Search */}
          <div className="w-full sm:flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search images (name, number)..."
              className="w-full bg-[#0f1f1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:border-amber-500/50 focus:outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={loadStorage}
              disabled={loading}
              title="Refresh local storage list"
              className="px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white/90 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
            >
              <span className={loading ? "animate-spin" : ""}>🔄</span>
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleLinkLocal}
              disabled={syncing}
              title="Fix broken items in database by linking them to local image files"
              className="flex-1 sm:flex-initial px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-200 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
            >
              {syncing ? (
                <>
                  <span className="spinner h-3 w-3" /> Linking...
                </>
              ) : (
                <>
                  <span>🔗</span> Link to Local
                </>
              )}
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-premium flex-1 sm:flex-initial px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
            >
              {uploading ? (
                <>
                  <span className="spinner h-3 w-3" /> Uploading...
                </>
              ) : (
                <>
                  <span>+</span> Upload Image
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Images Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="text-center py-16 text-white/50">
              <div className="spinner h-8 w-8 mx-auto mb-3" />
              <p className="text-sm">Reading storage directory...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-16 text-white/40">
              <p className="text-sm">No image files found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {filteredFiles.map((file) => (
                <div
                  key={file.name}
                  className="group bg-[#0f1f1a] border border-white/10 hover:border-amber-500/40 rounded-xl overflow-hidden transition-all duration-200 flex flex-col"
                >
                  {/* Thumbnail */}
                  <div
                    className="relative aspect-square w-full bg-black/50 cursor-pointer overflow-hidden"
                    onClick={() => setPreviewImage(file.url)}
                  >
                    <img
                      src={file.url}
                      alt={file.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/menu/saigo.jpg";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-xs bg-black/60 px-2 py-1 rounded text-white font-medium">
                        🔍 Preview
                      </span>
                    </div>
                  </div>

                  {/* Info & Actions */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                    {editingFile === file.name ? (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={newNameInput}
                          onChange={(e) => setNewNameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(file.name);
                            if (e.key === "Escape") setEditingFile(null);
                          }}
                          autoFocus
                          className="w-full bg-[#152b23] border border-amber-500 text-white text-xs rounded px-2 py-1 focus:outline-none"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleRename(file.name)}
                            className="flex-1 bg-green-500/30 text-green-200 text-[10px] rounded py-1 hover:bg-green-500/40 font-bold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingFile(null)}
                            className="px-2 bg-white/10 text-white/60 text-[10px] rounded py-1 hover:bg-white/20"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0">
                          <p
                            className="text-xs font-semibold text-white truncate"
                            title={file.name}
                          >
                            {file.name}
                          </p>
                          <p className="text-[10px] text-white/40 mt-0.5">
                            {(file.size / 1024).toFixed(0)} KB •{" "}
                            {new Date(file.modified).toLocaleDateString()}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between gap-1">
                          <button
                            onClick={() => copyUrl(file.url)}
                            title="Copy image URL"
                            className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center bg-white/5 hover:bg-white/10 active:bg-white/20 text-white/70 hover:text-white rounded-lg text-xs transition"
                          >
                            📋
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startRename(file)}
                              title="Rename file"
                              className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center bg-white/5 hover:bg-white/10 active:bg-white/20 text-white/70 hover:text-amber-300 rounded-lg text-xs transition"
                            >
                              ✏️
                            </button>

                            {!file.isProtected ? (
                              <button
                                onClick={() => handleDelete(file.name)}
                                title="Delete file"
                                className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center bg-red-500/15 hover:bg-red-500/25 active:bg-red-500/40 text-red-400 hover:text-red-300 rounded-lg text-xs transition"
                              >
                                🗑️
                              </button>
                            ) : (
                              <span
                                title="Protected system logo"
                                className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center text-white/25 text-xs select-none"
                              >
                                🔒
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 flex items-center justify-between bg-[#0f1f1a] text-xs text-white/50">
          <span>
            Total assets: <strong>{files.length}</strong> (showing {filteredFiles.length})
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* Full Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh]">
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-lg hover:bg-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
