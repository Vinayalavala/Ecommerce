import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

const AddAd = () => {
  const [ads, setAds] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    targetUrl: "",
  });
  const [media, setMedia] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingAd, setEditingAd] = useState(null); // Track which ad is being edited

  // Fetch ads
  const fetchAds = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/ads?admin=true");
      if (res.data.success) {
        setAds(res.data.ads);
      } else if (Array.isArray(res.data)) {
        setAds(res.data);
      }
    } catch (error) {
      console.error("Error fetching ads:", error);
      toast.error("Failed to load ads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  // Handle input change
  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Handle media change
  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    setMedia(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  // Handle submit (add/update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      return toast.error("Title and description are required");
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append("title", formData.title);
      data.append("description", formData.description);
      data.append("targetUrl", formData.targetUrl);
      if (media) data.append("media", media);

      let res;
      if (editingAd) {
        // Update existing ad
        res = await axios.put(`/api/ads/${editingAd._id}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        // Add new ad
        res = await axios.post("/api/ads", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      if (res.data.success) {
        toast.success(editingAd ? "Ad updated successfully" : "Ad created successfully");
        setFormData({ title: "", description: "", targetUrl: "" });
        setMedia(null);
        setPreview(null);
        setEditingAd(null);
        fetchAds();
      }
    } catch (error) {
      console.error("Error saving ad:", error);
      toast.error("Failed to save ad");
    } finally {
      setLoading(false);
    }
  };

  // Handle edit button
  const handleEdit = (ad) => {
    setFormData({
      title: ad.title,
      description: ad.description,
      targetUrl: ad.targetUrl || "",
    });
    setPreview(ad.mediaUrl);
    setEditingAd(ad);
    setMedia(null);
  };

  // Handle delete button
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this ad?")) return;
    try {
      const res = await axios.delete(`/api/ads/${id}`);
      if (res.data.success) {
        toast.success("Ad deleted successfully");
        fetchAds();
      }
    } catch (error) {
      console.error("Error deleting ad:", error);
      toast.error("Failed to delete ad");
    }
  };

  return (
    <div className="no-scrollbar flex-1 h-[95vh] overflow-y-scroll">
      {/* Form Section */}
      <div className="md:p-10 p-4 space-y-8">
        <h2 className="text-lg font-medium">
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
            />
            <textarea
              name="description"
              placeholder="Ad Description"
              value={formData.description}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              rows="4"
            />
            <input
              type="text"
              name="targetUrl"
              placeholder="Target URL"
              value={formData.targetUrl}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Media Upload */}
          <div
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer relative w-full h-60"
            onClick={() => document.getElementById("mediaUpload").click()}
          >
            {preview ? (
              preview.includes(".mp4") || preview.includes("video") ? (
                <video
                  src={preview}
                  controls
                  className="w-full h-full object-cover rounded-lg"
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
              </p>
            )}
          
            {/* Hidden File Input */}
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
