import { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import StorageModal from "../components/StorageModal";
import ImagePickerModal from "../components/ImagePickerModal";

export default function MenuAdmin() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newItem, setNewItem] = useState({
    categoryId: null,
    name: "",
    image: "",
    imagePreview: "",
    imageFile: null,
    price: 0,
  });
  const [showAddItem, setShowAddItem] = useState(null);
  const [message, setMessage] = useState({ text: "", type: "" });
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);
  const [editImagePreview, setEditImagePreview] = useState("");
  const [editImageFile, setEditImageFile] = useState(null);

  // Storage & Image Picker states
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [imagePickerTarget, setImagePickerTarget] = useState(null);

  const handleImagePickerSelect = (url, fileName) => {
    if (!imagePickerTarget) return;

    if (imagePickerTarget.type === "new") {
      setNewItem((prev) => ({
        ...prev,
        image: url,
        imagePreview: url,
        imageFile: null,
      }));
    } else if (imagePickerTarget.type === "edit") {
      const input = document.getElementById(
        `edit-image-${imagePickerTarget.itemId}`,
      );
      if (input) input.value = url;
      setEditImagePreview(url);
      setEditImageFile(null);
    }
  };

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch("/api/menuHandler");
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data.success) {
          setCategories(data.categories || []);
        } else {
          showMessage(data.message || "Failed to load menu", "error");
        }
      } catch {
        console.error("API returned non-JSON:", text.substring(0, 200));
        showMessage("Server not ready. Please wait and refresh.", "error");
      }
    } catch (err) {
      console.error("Failed to fetch menu:", err);
      showMessage("Network error: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // Move category up or down
  const moveCategory = async (index, direction) => {
    const ids = categories.map((c) => c._id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setSaving(true);
    try {
      const res = await fetch("/api/menuHandler?action=reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: ids }),
      });
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories || []);
        showMessage("Order updated!");
      } else {
        showMessage(data.message || "Failed", "error");
      }
    } catch (err) {
      showMessage("Error: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // Toggle category hidden — optimistic update, revert on failure
  const toggleCategoryVisibility = async (categoryId, currentHidden) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat._id === categoryId ? { ...cat, hidden: !currentHidden } : cat,
      ),
    );
    try {
      const res = await fetch(`/api/menuHandler?categoryId=${categoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: !currentHidden }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage(
          currentHidden
            ? "Category is now visible!"
            : "Category hidden from customers.",
        );
      } else {
        setCategories((prev) =>
          prev.map((cat) =>
            cat._id === categoryId ? { ...cat, hidden: currentHidden } : cat,
          ),
        );
        showMessage(data.message || "Failed", "error");
      }
    } catch (err) {
      setCategories((prev) =>
        prev.map((cat) =>
          cat._id === categoryId ? { ...cat, hidden: currentHidden } : cat,
        ),
      );
      showMessage("Error: " + err.message, "error");
    }
  };

  // Toggle item hidden — optimistic update, revert on failure
  const toggleItemVisibility = async (categoryId, itemId, currentHidden) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat._id === categoryId
          ? {
              ...cat,
              items: cat.items.map((item) =>
                item._id === itemId
                  ? { ...item, hidden: !currentHidden }
                  : item,
              ),
            }
          : cat,
      ),
    );
    try {
      const res = await fetch(
        `/api/menuHandler?categoryId=${categoryId}&itemId=${itemId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hidden: !currentHidden }),
        },
      );
      const data = await res.json();
      if (data.success) {
        showMessage(
          currentHidden
            ? "Item is now visible!"
            : "Item hidden from customers.",
        );
      } else {
        setCategories((prev) =>
          prev.map((cat) =>
            cat._id === categoryId
              ? {
                  ...cat,
                  items: cat.items.map((item) =>
                    item._id === itemId
                      ? { ...item, hidden: currentHidden }
                      : item,
                  ),
                }
              : cat,
          ),
        );
        showMessage(data.message || "Failed", "error");
      }
    } catch (err) {
      setCategories((prev) =>
        prev.map((cat) =>
          cat._id === categoryId
            ? {
                ...cat,
                items: cat.items.map((item) =>
                  item._id === itemId
                    ? { ...item, hidden: currentHidden }
                    : item,
                ),
              }
            : cat,
        ),
      );
      showMessage("Error: " + err.message, "error");
    }
  };

  // Upload image to Supabase
  const uploadImage = async (file) => {
    if (!file) return null;
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
        return data.url;
      } else {
        showMessage("Upload failed: " + data.message, "error");
        return null;
      }
    } catch (err) {
      showMessage("Upload error: " + err.message, "error");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setNewItem({ ...newItem, imageFile: file, imagePreview: previewUrl });
    }
  };

  const handleEditFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setEditImageFile(file);
      setEditImagePreview(previewUrl);
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/menuHandler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage("Category added!");
        setNewCategoryName("");
        fetchMenu();
      } else {
        showMessage(data.message || "Failed", "error");
      }
    } catch (err) {
      showMessage("Error: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const updateCategory = async (categoryId, name) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/menuHandler?categoryId=${categoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage("Category updated!");
        setEditingCategory(null);
        fetchMenu();
      } else {
        showMessage(data.message || "Failed", "error");
      }
    } catch (err) {
      showMessage("Error: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (categoryId) => {
    if (!confirm("Delete this category and ALL its items?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/menuHandler?categoryId=${categoryId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showMessage("Category deleted!");
        fetchMenu();
      } else {
        showMessage(data.message || "Failed", "error");
      }
    } catch (err) {
      showMessage("Error: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const addItem = async (categoryId) => {
    if (!newItem.name.trim()) return;
    setSaving(true);
    try {
      let imageUrl = newItem.image.trim() || "/menu/default.jpg";
      if (newItem.imageFile) {
        const uploadedUrl = await uploadImage(newItem.imageFile);
        if (uploadedUrl) imageUrl = uploadedUrl;
      }

      const res = await fetch(
        `/api/menuHandler?categoryId=${categoryId}&items=true`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newItem.name.trim(),
            image: imageUrl,
            price: parseFloat(newItem.price) || 0,
          }),
        },
      );
      const data = await res.json();
      if (data.success) {
        showMessage("Item added successfully!");
        setNewItem({
          categoryId: null,
          name: "",
          image: "",
          imagePreview: "",
          imageFile: null,
          price: 0,
        });
        setShowAddItem(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchMenu();
      } else {
        showMessage(data.message || "Failed", "error");
      }
    } catch (err) {
      showMessage("Error: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const updateItem = async (
    categoryId,
    itemId,
    updates,
    hasNewImage = false,
  ) => {
    setSaving(true);
    try {
      if (hasNewImage && editImageFile) {
        const uploadedUrl = await uploadImage(editImageFile);
        if (uploadedUrl) updates.image = uploadedUrl;
      }

      const res = await fetch(
        `/api/menuHandler?categoryId=${categoryId}&itemId=${itemId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        },
      );
      const data = await res.json();
      if (data.success) {
        showMessage("Item updated!");
        setEditingItem(null);
        setEditImageFile(null);
        setEditImagePreview("");
        fetchMenu();
      } else {
        showMessage(data.message || "Failed", "error");
      }
    } catch (err) {
      showMessage("Error: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (categoryId, itemId) => {
    if (!confirm("Delete this item?")) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/menuHandler?categoryId=${categoryId}&itemId=${itemId}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.success) {
        showMessage("Item deleted!");
        fetchMenu();
      } else {
        showMessage(data.message || "Failed", "error");
      }
    } catch (err) {
      showMessage("Error: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a3a2e] to-[#152b23] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="spinner h-8 w-8 mx-auto mb-4" />
          <p>Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    console.log("Rendering MenuAdmin with categories:", categories),
    <>
      <Head>
        <title>Menu Admin | Restaurant</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-[#1a3a2e] via-[#1d3f32] to-[#152b23] text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
                Menu Admin
              </h1>
              <p className="text-white/60 text-sm mt-1">
                Manage categories &amp; items
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowStorageModal(true)}
                className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-200 text-sm hover:bg-emerald-500/30 transition flex items-center gap-2 font-semibold shadow-sm hover:scale-[1.02]"
              >
                📁 Storage
              </button>
              <Link
                href="/history"
                className="px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-200 text-sm hover:bg-amber-500/30 transition flex items-center gap-2"
              >
                📋 Order History
              </Link>
            </div>
          </div>

          {/* Message */}
          {message.text && (
            <div
              className={`mb-4 p-3 rounded-lg ${
                message.type === "error"
                  ? "bg-red-500/20 text-red-200 border border-red-500/30"
                  : "bg-green-500/20 text-green-200 border border-green-500/30"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Add Category */}
          <div className="premium-card p-4 mb-6">
            <h2 className="text-lg font-bold text-amber-200 mb-3">
              Add New Category
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
                placeholder="Category name..."
                className="flex-1 bg-[#0f1f1a] border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:border-amber-500/50 focus:outline-none"
              />
              <button
                onClick={addCategory}
                disabled={saving || !newCategoryName.trim()}
                className="btn-premium px-6 py-2 rounded-lg disabled:opacity-50"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Categories List */}
          <div className="space-y-6">
            {categories.length === 0 ? (
              <div className="premium-card p-8 text-center">
                <p className="text-white/60 mb-4">
                  No categories yet. Add one above.
                </p>
              </div>
            ) : (
              categories.map((cat, catIndex) => (
                <div
                  key={cat._id}
                  className="rounded-2xl overflow-hidden transition-all duration-300"
                  style={{
                    border: cat.hidden
                      ? "1px solid rgba(239,68,68,0.15)"
                      : "1px solid rgba(255,255,255,0.12)",
                    background: cat.hidden
                      ? "rgba(20,10,10,0.7)"
                      : "rgba(26,47,40,0.8)",
                  }}
                >
                  {/* Category Header */}
                  <div
                    className="p-4 flex items-center justify-between border-b"
                    style={{
                      background: cat.hidden ? "rgba(30,10,10,0.8)" : "#0f1f1a",
                      borderColor: cat.hidden
                        ? "rgba(239,68,68,0.15)"
                        : "rgba(255,255,255,0.10)",
                    }}
                  >
                    {/* Left: name + badge */}
                    <div className="flex items-center gap-2 min-w-0">
                      {editingCategory === cat._id ? (
                        <input
                          type="text"
                          defaultValue={cat.name}
                          autoFocus
                          onBlur={(e) => {
                            if (e.target.value.trim() !== cat.name) {
                              updateCategory(cat._id, e.target.value.trim());
                            } else {
                              setEditingCategory(null);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.target.blur();
                            else if (e.key === "Escape")
                              setEditingCategory(null);
                          }}
                          className="bg-transparent border-b border-amber-500 text-xl font-bold text-white focus:outline-none"
                        />
                      ) : (
                        <h3
                          className="text-xl font-bold truncate transition-colors duration-200"
                          style={{
                            color: cat.hidden
                              ? "rgba(255,255,255,0.35)"
                              : "white",
                          }}
                        >
                          {cat.name}
                        </h3>
                      )}
                      {cat.hidden && (
                        <span
                          className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold tracking-widest uppercase"
                          style={{
                            background: "rgba(239,68,68,0.15)",
                            color: "rgba(252,165,165,0.85)",
                            border: "1px solid rgba(239,68,68,0.25)",
                          }}
                        >
                          Hidden
                        </span>
                      )}
                    </div>

                    {/* Right: action buttons */}
                    <div className="flex gap-1 items-center flex-shrink-0 ml-3">
                      <button
                        onClick={() => moveCategory(catIndex, -1)}
                        disabled={catIndex === 0 || saving}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition disabled:opacity-30 text-white/70 text-sm"
                        title="Move up"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveCategory(catIndex, 1)}
                        disabled={catIndex === categories.length - 1 || saving}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition disabled:opacity-30 text-white/70 text-sm"
                        title="Move down"
                      >
                        ▼
                      </button>

                      {/* Visibility toggle button */}
                      <button
                        onClick={() =>
                          toggleCategoryVisibility(cat._id, cat.hidden)
                        }
                        title={
                          cat.hidden
                            ? "Make visible to customers"
                            : "Hide from customers"
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 hover:scale-105"
                        // style={
                        //   cat.hidden
                        //     ? {
                        //         background: "rgba(34,197,94,0.12)",
                        //         border: "1px solid rgba(34,197,94,0.28)",
                        //         color: "rgba(134,239,172,0.95)",
                        //       }
                        //     : {
                        //         background: "rgba(239,68,68,0.18)",
                        //         border: "1px solid rgba(239,68,68,0.35)",
                        //         color: "rgba(252,165,165,0.95)",
                        //       }
                        // }
                      >
                        <span style={{ fontSize: 13 }}>
                          {cat.hidden ? "👁️" : "🚫"}
                        </span>
                        {/* <span className="hidden sm:inline">{cat.hidden ? 'Hidden' : 'Visible'}</span> */}
                      </button>

                      <button
                        onClick={() => setEditingCategory(cat._id)}
                        className="p-2 hover:bg-white/10 rounded-lg transition"
                        title="Edit category name"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteCategory(cat._id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition text-red-400"
                        title="Delete category"
                      >
                        🗑️
                      </button>
                      <button
                        onClick={() =>
                          setShowAddItem(
                            showAddItem === cat._id ? null : cat._id,
                          )
                        }
                        className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-200 text-sm hover:bg-amber-500/30 transition"
                      >
                        + Add Item
                      </button>
                    </div>
                  </div>

                  {/* Hidden category notice banner */}
                  {cat.hidden && (
                    <div
                      className="px-4 py-2 flex items-center gap-2 text-xs"
                      style={{
                        background: "rgba(239,68,68,0.07)",
                        borderBottom: "1px solid rgba(239,68,68,0.12)",
                        color: "rgba(252,165,165,0.65)",
                      }}
                    >
                      <span>🚫</span>
                      <span>
                        This category and all its items are{" "}
                        <strong>hidden from customers</strong>. Click the Hidden
                        button above to make it visible.
                      </span>
                    </div>
                  )}

                  {/* Add Item Form */}
                  {showAddItem === cat._id && (
                    <div
                      className="p-4 border-b border-white/10"
                      style={{ background: "#152b23" }}
                    >
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div
                            className="w-24 h-24 rounded-lg border-2 border-dashed border-white/20 bg-[#0f1f1a] flex items-center justify-center cursor-pointer hover:border-amber-500/50 transition overflow-hidden"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {newItem.imagePreview ? (
                              <img
                                src={newItem.imagePreview}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-center">
                                <span className="text-2xl">📷</span>
                                <p className="text-[10px] text-white/40 mt-1">
                                  Click to upload
                                </p>
                              </div>
                            )}
                          </div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            placeholder="Food item name *"
                            value={newItem.name}
                            onChange={(e) =>
                              setNewItem({ ...newItem, name: e.target.value })
                            }
                            className="w-full bg-[#0f1f1a] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:border-amber-500/50 focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Image path e.g. /menu/01.jpg"
                              value={newItem.image}
                              onChange={(e) =>
                                setNewItem({
                                  ...newItem,
                                  image: e.target.value,
                                  imageFile: null,
                                  imagePreview: e.target.value,
                                })
                              }
                              className="flex-1 bg-[#0f1f1a] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:border-amber-500/50 focus:outline-none text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => setImagePickerTarget({ type: "new" })}
                              className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-amber-200 text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5"
                              title="Select from local assets"
                            >
                              🖼️ Select Image
                            </button>
                            <input
                              type="number"
                              placeholder="Price"
                              value={newItem.price}
                              onChange={(e) =>
                                setNewItem({
                                  ...newItem,
                                  price: e.target.value,
                                })
                              }
                              className="w-20 bg-[#0f1f1a] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:border-amber-500/50 focus:outline-none text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => addItem(cat._id)}
                              disabled={
                                saving || uploading || !newItem.name.trim()
                              }
                              className="btn-premium px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2"
                            >
                              {uploading ? (
                                <>
                                  <span className="spinner h-4 w-4" />{" "}
                                  Uploading...
                                </>
                              ) : saving ? (
                                "Saving..."
                              ) : (
                                "+ Add Item"
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setShowAddItem(null);
                                setNewItem({
                                  categoryId: null,
                                  name: "",
                                  image: "",
                                  imagePreview: "",
                                  imageFile: null,
                                  price: 0,
                                });
                              }}
                              className="px-4 py-2 bg-white/10 rounded-lg text-white/60 hover:bg-white/20 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Items Grid */}
                  <div className="p-4">
                    {cat.items.length === 0 ? (
                      <p className="text-white/40 text-center py-4">
                        No items in this category
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {cat.items.map((item) => (
                          <div
                            key={item._id}
                            className="rounded-xl overflow-hidden group transition-all duration-300"
                            style={{
                              border: item.hidden
                                ? "1px solid rgba(239,68,68,0.12)"
                                : "1px solid rgba(255,255,255,0.10)",
                              background: item.hidden
                                ? "rgba(20,10,10,0.6)"
                                : "#1a2f28",
                            }}
                          >
                            {/* Item Image */}
                            <div
                              className="relative h-24 sm:h-28 overflow-hidden"
                              style={{ background: "#0f1f1a" }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.image || "/menu/saigo.jpg"}
                                alt={item.name}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                style={{
                                  filter: item.hidden
                                    ? "grayscale(80%) brightness(0.45)"
                                    : "none",
                                }}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = "/menu/saigo.jpg";
                                }}
                              />

                              {/* HIDDEN label over image */}
                              {item.hidden && (
                                <div
                                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                  style={{ background: "rgba(0,0,0,0.35)" }}
                                >
                                  <span
                                    className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase"
                                    style={{
                                      background: "rgba(239,68,68,0.25)",
                                      color: "rgba(252,165,165,0.9)",
                                      border: "1px solid rgba(239,68,68,0.35)",
                                    }}
                                  >
                                    Hidden
                                  </span>
                                </div>
                              )}

                              {/* Hover action overlay */}
                              <div
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2"
                                style={{ background: "rgba(0,0,0,0.70)" }}
                              >
                                {/* Hide/Show toggle */}
                                <button
                                  onClick={() =>
                                    toggleItemVisibility(
                                      cat._id,
                                      item._id,
                                      item.hidden,
                                    )
                                  }
                                  title={
                                    item.hidden ? "Show item" : "Hide item"
                                  }
                                  className="flex flex-col items-center gap-0.5 p-2 rounded-xl transition-transform hover:scale-110"
                                  style={
                                    item.hidden
                                      ? {
                                          background: "rgba(34,197,94,0.2)",
                                          border:
                                            "1px solid rgba(34,197,94,0.45)",
                                        }
                                      : {
                                          background: "rgba(239,68,68,0.2)",
                                          border:
                                            "1px solid rgba(239,68,68,0.45)",
                                        }
                                  }
                                >
                                  <span style={{ fontSize: 15 }}>
                                    {item.hidden ? "👁️" : "🚫"}
                                  </span>
                                  {/* <span
                                    className="text-[8px] font-black tracking-wider"
                                    style={{
                                      color: item.hidden
                                        ? 'rgba(134,239,172,0.9)'
                                        : 'rgba(252,165,165,0.9)',
                                    }}
                                  >
                                    {item.hidden ? 'SHOW' : 'HIDE'}
                                  </span> */}
                                </button>

                                <button
                                  onClick={() => setEditingItem(item._id)}
                                  className="p-2 rounded-xl transition-transform hover:scale-110"
                                  style={{
                                    background: "rgba(255,255,255,0.12)",
                                    border: "1px solid rgba(255,255,255,0.22)",
                                  }}
                                >
                                  ✏️
                                </button>

                                <button
                                  onClick={() => deleteItem(cat._id, item._id)}
                                  className="p-2 rounded-xl transition-transform hover:scale-110"
                                  style={{
                                    background: "rgba(239,68,68,0.2)",
                                    border: "1px solid rgba(239,68,68,0.4)",
                                  }}
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>

                            {/* Item Info */}
                            <div
                              className="p-2"
                              style={{
                                background: item.hidden
                                  ? "rgba(15,8,8,0.6)"
                                  : "transparent",
                              }}
                            >
                              {editingItem === item._id ? (
                                <div className="space-y-2">
                                  <div
                                    className="w-full h-16 rounded border border-dashed border-white/20 bg-[#0f1f1a] flex items-center justify-center cursor-pointer hover:border-amber-500/50 transition overflow-hidden relative group"
                                    onClick={() =>
                                      editFileInputRef.current?.click()
                                    }
                                    title="Click to upload a new file from device"
                                  >
                                    <img
                                      src={editImagePreview || item.image || "/menu/saigo.jpg"}
                                      alt="Preview"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = "/menu/saigo.jpg";
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-medium">
                                      Upload photo
                                    </div>
                                  </div>
                                  <input
                                    ref={editFileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleEditFileSelect}
                                    className="hidden"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setImagePickerTarget({
                                        type: "edit",
                                        itemId: item._id,
                                      })
                                    }
                                    className="w-full py-1.5 px-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded text-amber-200 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                                  >
                                    🖼️ Select Local Image
                                  </button>
                                  <input
                                    type="text"
                                    defaultValue={item.name}
                                    placeholder="Name"
                                    className="w-full bg-[#0f1f1a] border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none"
                                    id={`edit-name-${item._id}`}
                                  />
                                  <input
                                    type="text"
                                    defaultValue={item.image}
                                    placeholder="Image path e.g. /menu/01.jpg"
                                    className="w-full bg-[#0f1f1a] border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none"
                                    id={`edit-image-${item._id}`}
                                    onChange={(e) => setEditImagePreview(e.target.value)}
                                  />
                                  <input
                                    type="number"
                                    defaultValue={item.price || 0}
                                    placeholder="Price"
                                    className="w-full bg-[#0f1f1a] border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none"
                                    id={`edit-price-${item._id}`}
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => {
                                        const name = document.getElementById(
                                          `edit-name-${item._id}`,
                                        ).value;
                                        const image = document.getElementById(
                                          `edit-image-${item._id}`,
                                        ).value;
                                        const price =
                                          parseFloat(
                                            document.getElementById(
                                              `edit-price-${item._id}`,
                                            ).value,
                                          ) || 0;
                                        updateItem(
                                          cat._id,
                                          item._id,
                                          { name, image, price },
                                          !!editImageFile,
                                        );
                                      }}
                                      disabled={saving || uploading}
                                      className="flex-1 bg-green-500/30 text-green-200 rounded py-1 text-xs hover:bg-green-500/40 disabled:opacity-50"
                                    >
                                      {uploading ? "..." : "Save"}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingItem(null);
                                        setEditImageFile(null);
                                        setEditImagePreview("");
                                      }}
                                      className="flex-1 bg-white/10 text-white/60 rounded py-1 text-xs hover:bg-white/20"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <p
                                    className="text-xs font-medium truncate transition-colors duration-200"
                                    style={{
                                      color: item.hidden
                                        ? "rgba(255,255,255,0.25)"
                                        : "white",
                                    }}
                                    title={item.name}
                                  >
                                    {item.name}
                                  </p>
                                  {item.price > 0 && (
                                    <p
                                      className="text-red-400 text-[10px] font-bold"
                                      style={{
                                        opacity: item.hidden ? 0.35 : 1,
                                      }}
                                    >
                                      +{item.price}KR
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-white/40 text-sm">
            <p>
              Total: {categories.length} categories,{" "}
              {categories.reduce((n, c) => n + c.items.length, 0)} items
            </p>
          </div>
        </div>
      </div>

      {/* Storage Manager Modal */}
      <StorageModal
        isOpen={showStorageModal}
        onClose={() => setShowStorageModal(false)}
        onRefreshMenu={fetchMenu}
      />

      {/* Image Picker Modal */}
      <ImagePickerModal
        isOpen={!!imagePickerTarget}
        onClose={() => setImagePickerTarget(null)}
        onSelect={handleImagePickerSelect}
        currentImage={
          imagePickerTarget?.type === "new"
            ? newItem.image
            : editImagePreview
        }
      />

      <style jsx global>{`
        .spinner {
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #fbbf24;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}
