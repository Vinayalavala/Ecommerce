import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

const DisplayAds = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch ads from backend
  const fetchAds = async () => {
    setLoading(true);
    try {
      // ✅ Use full backend URL to avoid "Network Error"
      const res = await axios.get(
        "https://quickcommerce-backend-five.vercel.app/api/ads?admin=true",
        { withCredentials: false }
      );

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

  // Auto slide every 5 seconds
  useEffect(() => {
    if (ads.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [ads]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="w-full h-80 bg-gray-200 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (ads.length === 0) return null;

  const nextSlide = () =>
    setCurrentIndex((prev) => (prev + 1) % ads.length);
  const prevSlide = () =>
    setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);

  return (
    <div className="max-w-3xl mx-auto p-6 relative">
      <h2 className="text-2xl font-bold mb-4 text-center">Advertisements</h2>

      <div className="relative w-full h-80 overflow-hidden rounded-2xl shadow-xl">
        {ads.map((ad, index) => {
          const isActive = index === currentIndex;

          // ✅ Use new schema fields
          const isVideo = ad.media?.type === "video";
          const mediaUrl = ad.media?.url;

          return (
            <div
              key={ad._id || ad.id}
              className={`absolute inset-0 transform transition-all duration-700 ease-in-out ${
                isActive
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 translate-x-10"
              }`}
            >
              {isVideo ? (
                <video
                  autoPlay
                  muted
                  loop
                  className="w-full h-80 object-cover rounded-2xl"
                  src={mediaUrl}
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt={ad.title}
                  className="w-full h-80 object-cover rounded-2xl"
                />
              )}

              {/* Overlay Info */}
              <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/70 via-black/40 to-transparent text-white p-4 rounded-b-2xl">
                <h3 className="text-lg font-semibold">{ad.title}</h3>
                <p className="text-sm line-clamp-2">{ad.description}</p>
                {ad.targetUrl && (
                  <a
                    href={ad.targetUrl}
                    target="_self" // ✅ opens in same page
                    className="inline-block mt-2 text-sm font-medium text-blue-300 hover:text-blue-400 transition"
                  >
                    Visit Link →
                  </a>
                )}
              </div>
            </div>
          );
        })}

        {/* Left & Right Arrows (SVG) */}
        <button
          onClick={prevSlide}
          className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 p-2 rounded-full text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 p-2 rounded-full text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Navigation dots */}
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {ads.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-3 h-3 rounded-full transition transform ${
                currentIndex === idx
                  ? "bg-white scale-125"
                  : "bg-gray-400"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DisplayAds;
