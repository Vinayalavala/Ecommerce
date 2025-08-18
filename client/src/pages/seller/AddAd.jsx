import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
  });

const AddAd = () => {
  const [ads, setAds] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    targetUrl: "",
    placement: "homepage",
    startDate: "",
    endDate: "",
    priority: 0,
    isActive: true,
  });
  const [media, setMedia] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingAd, setEditingAd] = useState(null);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/ads?admin=true");
      if (res.data?.success) setAds(res.data.ads);
      else if (Array.isArray(res.data)) setAds(res.data);
    } catch (e) {
      console.error("Error fetching ads:", e);
      toast.error("Failed to load ads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleMediaChange = (e) => {
    const file = e.target.files?.[0];
    setMedia(file || null);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      return toast.error("Title and description are required");
    }

    try {
      setLoading(true);

      // Only include media if a new file is picked
      let mediaBase64 = undefined;
      if (media) {
        mediaBase64 = await toBase64(media);
      }

      // Build payload (avoid sending empty strings for dates)
      const payload = {
        title: formData.title,
        description: formData.description,
        targetUrl: formData.targetUrl || undefined,
        placement: formData.placement || "homepage",
        isActive: !!formData.isActive,
        priority:
          formData.priority === "" || isNaN(Number(formData.priority))
            ? 0
            : Number(formData.priority),
      };

      if (formData.startDate) payload.startDate = formData.startDate;
      if (formData.endDate) payload.endDate = formData.endDate;
      if (mediaBase64) payload.media = mediaBase64;

      let res;
      if (editingAd) {
        res = await axios.put(`/api/ads/${editingAd._id}`, payload);
      } else {
        if (!mediaBase64) {
          return toast.error("Please add an image or video");
        }
        res = await axios.post("/api/ads", payload);
      }

      if (res.data?.success) {
        toast.success(editingAd ? "Ad updated successfully" : "Ad created successfully");
        setFormData({
          title: "",
          description: "",
          targetUrl: "",
          placement: "homepage",
          startDate: "",
          endDate: "",
          priority: 0,
          isActive: true,
        });
        setMedia(null);
        setPreview(null);
        setEditingAd(null);
        fetchAds();
      } else {
        toast.error(res.data?.message || "Failed to save ad");
      }
    } catch (e) {
      console.error("Error saving ad:", e);
      toast.error(e?.response?.data?.message || "Failed to save ad");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (ad) => {
    setFormData({
      title: ad.title || "",
      description: ad.description || "",
      targetUrl: ad.targetUrl || "",
      placement: ad.placement || "homepage",
      startDate: ad.startDate ? ad.startDate.slice(0, 10) : "",
      endDate: ad.endDate ? ad.endDate.slice(0, 10) : "",
      priority: typeof ad.priority === "number" ? ad.priority : 0,
      isActive: !!ad.isActive,
    });
    setPreview(ad.mediaUrl || null);
    setEditingAd(ad);
    setMedia(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this ad?")) return;
    try {
      const res = await axios.delete(`/api/ads/${id}`);
      if (res.data?.success) {
        toast.success("Ad deleted successfully");
        fetchAds();
      } else {
        toast.error(res.data?.message || "Failed to delete ad");
      }
    } catch (e) {
      console.error("Error deleting ad:", e);
      toast.error("Failed to delete ad");
    }
  };

  const isVideoPreview = (src) => {
    if (!src) return false;
    if (typeof src === "string" && src.startsWith("data:video")) return true;
    // object URL fallback check from file.type (not available here), so use extension heuristics too
    return /\.(mp4|webm|ogg|mov|m4v)$/i.test(src);
  };

  return (
    <div className="no-scrollbar mb-15 flex-1 h-[95vh] overflow-y-scroll">
      {/* Form Section */}
      <div className="md:p-10 p-4 space-y-8">
        <h2 className="text-2xl font-semibold mb-6">
          {editingAd ? "Edit Ad" : "Add New Ad"}
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              placeholder="Target URL"
              value={formData.targetUrl}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1">Placement</label>
                <input
                  type="text"
                  name="placement"
                  value={formData.placement}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                />
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
                <label className="text-sm text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">Priority</label>
              <input
                type="number"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          {/* Media Upload */}
          <div
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer relative w-full h-60"
            onClick={() => document.getElementById("mediaUpload").click()}
          >
            {preview ? (
              isVideoPreview(preview) ? (
                <video src={preview} controls className="w-full h-full object-cover rounded-lg" />
              ) : (
                <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
              )
            ) : (
              <p className="text-gray-500 text-sm text-center">
                Click here to upload Image or Video
              </p>
            )}

            <input
              id="mediaUpload"
              type="file"
              accept="image/*,video/*"
              onChange={handleMediaChange}
              className="hidden"
            />
          </div>
        </form>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-6 w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition"
        >
          {loading ? (editingAd ? "Updating..." : "Adding...") : editingAd ? "Update Ad" : "Add Ad"}
        </button>
      </div>

      {/* Ads Grid */}
      {ads.length > 0 && (
        <div className="md:p-10 p-4 space-y-8">
          <h2 className="text-lg font-medium">Active Ads</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ads.map((ad) => (
              <div
                key={ad._id}
                className="bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden"
              >
                {ad.mediaType === "video" ? (
                  <video src={ad.mediaUrl} controls className="w-full h-40 object-cover" />
                ) : (
                  <img src={ad.mediaUrl} alt={ad.title} className="w-full h-40 object-cover" />
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-lg">{ad.title}</h3>
                  <p className="text-sm text-gray-600">{ad.description}</p>
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
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleEdit(ad)}
                      className="px-3 py-1 bg-primary text-white rounded-md hover:bg-primary-dull"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(ad._id)}
                      className="px-3 py-1 bg-primary text-white rounded-md hover:bg-primary-dull"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddAd;
