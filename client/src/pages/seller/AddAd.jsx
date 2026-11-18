import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useAppContext } from "../../context/appContext";

const MAX_MEDIA_MB = 25;
const PLACEMENT_SUGGESTIONS = ["homepage", "category", "product-page", "cart"];

const STATUS_META = {
  live: { label: "Live", className: "bg-green-100 text-green-700" },
  scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-700" },
  expired: { label: "Expired", className: "bg-red-100 text-red-700" },
  inactive: { label: "Inactive", className: "bg-gray-200 text-gray-600" },
};

const emptyForm = {
  title: "",
  description: "",
  targetUrl: "",
  placement: "homepage",
  startDate: "",
  endDate: "",
  priority: 0,
  isActive: true,
};

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
  });

// Date -> "YYYY-MM-DD" using LOCAL time (avoids off-by-one from UTC slicing)
const toInputDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

const getStatus = (ad) => {
  if (!ad.isActive) return "inactive";
  const now = new Date();
  if (ad.startDate && new Date(ad.startDate) > now) return "scheduled";
  if (ad.endDate && new Date(ad.endDate) < now) return "expired";
  return "live";
};

const AddAd = () => {
  const { axios } = useAppContext();

  const [ads, setAds] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [media, setMedia] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewType, setPreviewType] = useState("image");
  const [editingAd, setEditingAd] = useState(null);

  const [listLoading, setListLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null); // toggle / delete in progress

  // List controls
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [placementFilter, setPlacementFilter] = useState("all");

  const formRef = useRef(null);
  const fileInputRef = useRef(null);
  const objectUrlRef = useRef(null);

  // ---------- Data ----------
  const fetchAds = async () => {
    try {
      const { data } = await axios.get("/api/ads?admin=true");
      if (data?.success) setAds(data.ads);
      else if (Array.isArray(data)) setAds(data);
    } catch (e) {
      console.error("Error fetching ads:", e);
      toast.error("Failed to load ads");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Revoke any object URL on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  // ---------- Form helpers ----------
  const clearObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setMedia(null);
    clearObjectUrl();
    setPreview(null);
    setPreviewType("image");
    setEditingAd(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleMediaChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      e.target.value = "";
      return toast.error("Please choose an image or video file");
    }
    if (file.size > MAX_MEDIA_MB * 1024 * 1024) {
      e.target.value = "";
      return toast.error(`File is too large (max ${MAX_MEDIA_MB} MB)`);
    }

    clearObjectUrl();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;

    setMedia(file);
    setPreview(url);
    setPreviewType(isVideo ? "video" : "image");
  };

  const handleEdit = (ad) => {
    clearObjectUrl();
    setFormData({
      title: ad.title || "",
      description: ad.description || "",
      targetUrl: ad.targetUrl || "",
      placement: ad.placement || "homepage",
      startDate: toInputDate(ad.startDate),
      endDate: toInputDate(ad.endDate),
      priority: typeof ad.priority === "number" ? ad.priority : 0,
      isActive: !!ad.isActive,
    });
    setPreview(ad.mediaUrl || null);
    setPreviewType(ad.mediaType === "video" ? "video" : "image");
    setEditingAd(ad);
    setMedia(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ---------- Submit ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const title = formData.title.trim();
    const description = formData.description.trim();

    if (!title || !description) {
      return toast.error("Title and description are required");
    }
    if (
      formData.startDate &&
      formData.endDate &&
      formData.endDate < formData.startDate
    ) {
      return toast.error("End date can't be before the start date");
    }
    if (!editingAd && !media) {
      return toast.error("Please add an image or video");
    }

    try {
      setSaving(true);

      const priorityNumber = Number(formData.priority);
      const payload = {
        title,
        description,
        targetUrl: formData.targetUrl.trim() || undefined,
        placement: formData.placement.trim() || "homepage",
        isActive: !!formData.isActive,
        priority: Number.isFinite(priorityNumber) ? priorityNumber : 0,
      };

      // Start = beginning of the chosen day, End = END of the chosen day (local time)
      if (formData.startDate) {
        payload.startDate = new Date(`${formData.startDate}T00:00:00`).toISOString();
      } else if (editingAd) {
        payload.startDate = null; // let the server clear it
      }
      if (formData.endDate) {
        payload.endDate = new Date(`${formData.endDate}T23:59:59`).toISOString();
      } else if (editingAd) {
        payload.endDate = null;
      }

      if (media) payload.media = await toBase64(media);

      const { data } = editingAd
        ? await axios.put(`/api/ads/${editingAd._id}`, payload)
        : await axios.post("/api/ads", payload);

      if (data?.success) {
        toast.success(editingAd ? "Ad updated successfully" : "Ad created successfully");
        resetForm();
        fetchAds();
      } else {
        toast.error(data?.message || "Failed to save ad");
      }
    } catch (err) {
      console.error("Error saving ad:", err);
      toast.error(err?.response?.data?.message || "Failed to save ad");
    } finally {
      setSaving(false);
    }
  };

  // ---------- Row actions ----------
  const handleToggleActive = async (ad) => {
    try {
      setBusyId(ad._id);
      const { data } = await axios.put(`/api/ads/${ad._id}`, {
        isActive: !ad.isActive,
      });
      if (data?.success) {
        toast.success(!ad.isActive ? "Ad activated" : "Ad deactivated");
        // Keep an open edit form in sync
        if (editingAd?._id === ad._id) {
          setFormData((prev) => ({ ...prev, isActive: !ad.isActive }));
        }
        fetchAds();
      } else {
        toast.error(data?.message || "Failed to update ad");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update ad");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this ad?")) return;
    try {
      setBusyId(id);
      const { data } = await axios.delete(`/api/ads/${id}`);
      if (data?.success) {
        toast.success("Ad deleted successfully");
        if (editingAd?._id === id) resetForm();
        fetchAds();
      } else {
        toast.error(data?.message || "Failed to delete ad");
      }
    } catch (err) {
      console.error("Error deleting ad:", err);
      toast.error(err?.response?.data?.message || "Failed to delete ad");
    } finally {
      setBusyId(null);
    }
  };

  // ---------- Derived list data ----------
  const statusCounts = useMemo(() => {
    const counts = { all: ads.length, live: 0, scheduled: 0, expired: 0, inactive: 0 };
    ads.forEach((ad) => {
      counts[getStatus(ad)] += 1;
    });
    return counts;
  }, [ads]);

  const placements = useMemo(() => {
    const set = new Set(ads.map((a) => a.placement).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [ads]);

  const filteredAds = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return ads.filter((ad) => {
      if (term) {
        const haystack = `${ad.title || ""} ${ad.description || ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (statusFilter !== "all" && getStatus(ad) !== statusFilter) return false;
      if (placementFilter !== "all" && ad.placement !== placementFilter) return false;
      return true;
    });
  }, [ads, searchTerm, statusFilter, placementFilter]);

  const hasActiveFilters =
    searchTerm || statusFilter !== "all" || placementFilter !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPlacementFilter("all");
  };

  // ---------- Render ----------
  return (
    <div className="no-scrollbar mb-15 flex-1 h-[95vh] overflow-y-scroll">
      {/* Form Section */}
      <div ref={formRef} className="md:p-10 p-4 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-semibold">
            {editingAd ? "Edit Ad" : "Add New Ad"}
          </h2>
          {editingAd && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              Cancel editing
            </button>
          )}
        </div>

        <form
          id="ad-form"
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="flex flex-col gap-4">
            <input
              type="text"
              name="title"
              placeholder="Ad Title"
              value={formData.title}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
            <textarea
              name="description"
              placeholder="Ad Description"
              value={formData.description}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              rows="4"
              required
            />
            <input
              type="url"
              name="targetUrl"
              placeholder="Target URL (https://...)"
              value={formData.targetUrl}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1" htmlFor="placement">
                  Placement
                </label>
                <input
                  id="placement"
                  type="text"
                  name="placement"
                  list="placement-options"
                  value={formData.placement}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                />
                <datalist id="placement-options">
                  {PLACEMENT_SUGGESTIONS.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  id="isActive"
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Active
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1" htmlFor="startDate">
                  Start Date
                </label>
                <input
                  id="startDate"
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1" htmlFor="endDate">
                  End Date
                </label>
                <input
                  id="endDate"
                  type="date"
                  name="endDate"
                  min={formData.startDate || undefined}
                  value={formData.endDate}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1" htmlFor="priority">
                Priority <span className="text-gray-400">(higher shows first)</span>
              </label>
              <input
                id="priority"
                type="number"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          {/* Media Upload */}
          <div className="flex flex-col gap-2">
            <div
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer relative w-full h-60 overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                previewType === "video" ? (
                  <video
                    src={preview}
                    controls
                    className="w-full h-full object-cover rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-lg"
                  />
                )
              ) : (
                <p className="text-gray-500 text-sm text-center">
                  Click here to upload Image or Video
                  <br />
                  <span className="text-xs text-gray-400">Max {MAX_MEDIA_MB} MB</span>
                </p>
              )}

              <input
                ref={fileInputRef}
                id="mediaUpload"
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaChange}
                className="hidden"
              />
            </div>
            {editingAd && (
              <p className="text-xs text-gray-500">
                Leave the media as is to keep the current file, or pick a new one to
                replace it.
              </p>
            )}
          </div>
        </form>

        <button
          type="submit"
          form="ad-form"
          disabled={saving}
          className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving
            ? editingAd
              ? "Updating..."
              : "Adding..."
            : editingAd
            ? "Update Ad"
            : "Add Ad"}
        </button>
      </div>

      {/* Ads List */}
      <div className="md:p-10 p-4 pt-0 space-y-5">
        <h2 className="text-lg font-medium">All Ads</h2>

        {/* Status chips */}
        <div className="flex flex-wrap gap-2">
          {["all", "live", "scheduled", "expired", "inactive"].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`text-sm px-3 py-1 rounded-full border transition ${
                statusFilter === key
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            >
              {key === "all" ? "All" : STATUS_META[key].label} ({statusCounts[key]})
            </button>
          ))}
        </div>

        {/* Search + placement filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            type="text"
            placeholder="Search by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-full sm:w-1/2"
          />
          <select
            value={placementFilter}
            onChange={(e) => setPlacementFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-full sm:w-1/3"
          >
            {placements.map((p) => (
              <option key={p} value={p}>
                {p === "all" ? "All placements" : p}
              </option>
            ))}
          </select>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-primary underline hover:text-primary-dull text-left"
            >
              Clear filters
            </button>
          )}
        </div>

        {listLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredAds.length === 0 ? (
          <p className="text-gray-500 text-sm py-6">
            {ads.length === 0 ? "No ads created yet." : "No ads match your filters."}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredAds.map((ad) => {
              const status = getStatus(ad);
              const meta = STATUS_META[status];
              const busy = busyId === ad._id;
              const start = formatDate(ad.startDate);
              const end = formatDate(ad.endDate);

              return (
                <div
                  key={ad._id}
                  className={`bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden ${
                    editingAd?._id === ad._id ? "ring-2 ring-black" : ""
                  }`}
                >
                  <div className="relative">
                    {ad.mediaType === "video" ? (
                      <video
                        src={ad.mediaUrl}
                        controls
                        className="w-full h-40 object-cover"
                      />
                    ) : (
                      <img
                        src={ad.mediaUrl}
                        alt={ad.title}
                        className="w-full h-40 object-cover"
                      />
                    )}
                    <span
                      className={`absolute top-2 left-2 text-xs font-medium px-2 py-0.5 rounded-full ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-lg">{ad.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-3">{ad.description}</p>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mt-3">
                      <span>Placement: {ad.placement || "homepage"}</span>
                      <span>Priority: {ad.priority ?? 0}</span>
                      {(start || end) && (
                        <span>
                          {start || "…"} → {end || "…"}
                        </span>
                      )}
                    </div>

                    {ad.targetUrl && (
                      <a
                        href={ad.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 text-sm mt-2 inline-block"
                      >
                        Visit Link
                      </a>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-4">
                      <button
                        onClick={() => handleEdit(ad)}
                        disabled={busy}
                        className="px-3 py-1 bg-primary text-white rounded-md hover:bg-primary-dull disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(ad._id)}
                        disabled={busy}
                        className="px-3 py-1 bg-primary text-white rounded-md hover:bg-primary-dull disabled:opacity-50"
                      >
                        Delete
                      </button>

                      {/* Quick active toggle */}
                      <label
                        className="relative inline-flex items-center cursor-pointer ml-auto"
                        title={ad.isActive ? "Deactivate" : "Activate"}
                      >
                        <input
                          type="checkbox"
                          checked={!!ad.isActive}
                          disabled={busy}
                          onChange={() => handleToggleActive(ad)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 border border-gray-400 bg-gray-300 rounded-full peer-checked:bg-green-600 transition-colors duration-300"></div>
                        <span className="absolute left-[2px] top-[2px] w-5 h-5 bg-white border border-gray-400 rounded-full transition-transform duration-300 peer-checked:translate-x-5"></span>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddAd;
