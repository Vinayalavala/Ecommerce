import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FiChevronLeft, FiChevronRight, FiArrowUpRight } from "react-icons/fi";

const SLIDE_MS = 5000;

const DisplayAds = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);

  // Fetch ads from backend
  const fetchAds = async () => {
    setLoading(true);
    try {
      // Use full backend URL to avoid "Network Error"
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

  const count = ads.length;
  const goTo = useCallback((i) => setCurrentIndex(((i % count) + count) % count), [count]);
  const next = useCallback(() => setCurrentIndex((p) => (p + 1) % count), [count]);
  const prev = useCallback(() => setCurrentIndex((p) => (p - 1 + count) % count), [count]);

  // Auto slide. Restarts on every slide change so the progress bar and timer stay in sync,
  // and pauses while hovering or touching.
  useEffect(() => {
    if (count < 2 || paused) return;
    const t = setTimeout(next, SLIDE_MS);
    return () => clearTimeout(t);
  }, [count, paused, currentIndex, next]);

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  };
  const onTouchEnd = (e) => {
    if (touchStartX.current !== null) {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
    }
    touchStartX.current = null;
    setPaused(false);
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="aspect-[16/9] w-full animate-pulse rounded-2xl bg-gray-200 sm:aspect-[21/9]" />
      </div>
    );
  }

  if (count === 0) return null;

  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 py-6"
      aria-roledescription="carousel"
      aria-label="Advertisements"
    >
      <div
        className="group relative aspect-[16/9] w-full select-none overflow-hidden rounded-2xl bg-gray-900 shadow-lg ring-1 ring-black/5 sm:aspect-[21/9]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") prev();
          if (e.key === "ArrowRight") next();
        }}
        tabIndex={0}
      >
        {ads.map((ad, index) => {
          const isActive = index === currentIndex;
          const isVideo = ad.media?.type === "video";
          const mediaUrl = ad.media?.url;

          return (
            <div
              key={ad._id || ad.id || index}
              aria-hidden={!isActive}
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${count}`}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
              }`}
            >
              {isVideo ? (
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className={`h-full w-full object-cover transition-transform duration-[6000ms] ease-out ${
                    isActive ? "scale-105" : "scale-100"
                  }`}
                  src={mediaUrl}
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt={ad.title || "Advertisement"}
                  loading={index === 0 ? "eager" : "lazy"}
                  draggable={false}
                  className={`h-full w-full object-cover transition-transform duration-[6000ms] ease-out ${
                    isActive ? "scale-105" : "scale-100"
                  }`}
                />
              )}

              {/* Readability gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

              {/* Caption */}
              {(ad.title || ad.description || ad.targetUrl) && (
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 pb-10 text-white sm:p-6 sm:pb-12 md:p-8 md:pb-12">
                  <div className="min-w-0 max-w-xl">
                    <span className="mb-2 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider backdrop-blur-sm">
                      Sponsored
                    </span>
                    {ad.title && (
                      <h3 className="line-clamp-2 text-lg font-semibold leading-tight drop-shadow sm:text-2xl md:text-3xl">
                        {ad.title}
                      </h3>
                    )}
                    {ad.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-white/85 sm:text-sm md:text-base">
                        {ad.description}
                      </p>
                    )}
                  </div>

                  {ad.targetUrl && (
                    <a
                      href={ad.targetUrl}
                      target="_self"
                      tabIndex={isActive ? 0 : -1}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-gray-900 shadow-md transition hover:scale-105 hover:bg-gray-100 sm:text-sm"
                    >
                      Shop now <FiArrowUpRight />
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Arrows: always visible on touch devices, fade in on hover for desktop */}
        {count > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-800 opacity-0 shadow-md backdrop-blur-sm transition hover:bg-white focus-visible:opacity-100 group-hover:opacity-100 sm:flex"
            >
              <FiChevronLeft size={20} />
            </button>
            <button
              onClick={next}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-800 opacity-0 shadow-md backdrop-blur-sm transition hover:bg-white focus-visible:opacity-100 group-hover:opacity-100 sm:flex"
            >
              <FiChevronRight size={20} />
            </button>

            {/* Progress indicators */}
            <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-1.5 px-4">
              {ads.map((_, idx) => {
                const active = currentIndex === idx;
                const done = idx < currentIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => goTo(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    aria-current={active}
                    className="relative h-1.5 w-8 overflow-hidden rounded-full bg-white/40 transition-all hover:bg-white/60 sm:w-10"
                  >
                    <span
                      key={active ? `a-${currentIndex}` : idx}
                      className={`absolute inset-y-0 left-0 rounded-full bg-white ${
                        done ? "w-full" : active ? "ad-progress" : "w-0"
                      }`}
                      style={
                        active
                          ? {
                              animationDuration: `${SLIDE_MS}ms`,
                              animationPlayState: paused ? "paused" : "running",
                            }
                          : undefined
                      }
                    />
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Local keyframes for the progress bar */}
      <style>{`
        @keyframes adProgress { from { width: 0%; } to { width: 100%; } }
        .ad-progress { width: 0%; animation-name: adProgress; animation-timing-function: linear; animation-fill-mode: forwards; }
        @media (prefers-reduced-motion: reduce) { .ad-progress { animation: none; width: 100%; } }
      `}</style>
    </section>
  );
};

export default DisplayAds;
