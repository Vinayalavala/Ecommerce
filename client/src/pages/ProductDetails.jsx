import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppContext } from '../context/appContext';
import assets from '../assets/assets';
import ProductCard from '../components/ProductCard';

import { toast } from 'react-hot-toast';
import {
  FaHeart,
  FaRegHeart,
  FaShoppingCart,
  FaBolt,
  FaShareAlt,
  FaChevronLeft,
  FaChevronRight,
  FaPlay,
} from 'react-icons/fa';

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

const LOW_STOCK = 10;
const RELATED_PAGE = 5;
const LOAD_TIMEOUT_MS = 6000;
// The backend adds 2% GST when the order is placed, so don't claim "inclusive of all taxes".
const TAX_NOTE = 'GST is added at checkout';

// Session id for guest ad tracking (read lazily, never during render)
const getSessionId = () => {
  const key = 'ads_session_id';
  try {
    let s = localStorage.getItem(key);
    if (!s) {
      s = `sess_${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(key, s);
    }
    return s;
  } catch {
    return 'sess_anonymous';
  }
};

/* -------------------------------------------------------------------------- */
/*                       Presentational pieces (outside)                      */
/* -------------------------------------------------------------------------- */

const Spinner = ({ dark = false }) => (
  <span
    aria-hidden="true"
    className={`inline-block w-4 h-4 rounded-full border-2 animate-spin ${
      dark ? 'border-gray-400/40 border-t-gray-700' : 'border-white/40 border-t-white'
    }`}
  />
);

const IconButton = ({ label, onClick, disabled, pressed, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    aria-pressed={pressed}
    className="w-10 h-10 grid place-items-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
  >
    {children}
  </button>
);

const PageSkeleton = () => (
  <div className="min-h-screen w-full bg-white pt-28 px-4 sm:px-6 lg:px-16" aria-busy="true">
    <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mb-6" />
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="h-[320px] sm:h-[420px] lg:h-[520px] rounded-2xl bg-gray-100 animate-pulse" />
      <div className="space-y-4">
        <div className="h-8 w-3/4 bg-gray-100 rounded animate-pulse" />
        <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
        <div className="h-44 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    </div>
  </div>
);

/**
 * Gallery: thumbnails + fixed-size stage with arrows, swipe, keyboard and hover zoom.
 * Thumbnails sit left on desktop and below the stage on mobile.
 * The stage has a fixed height per breakpoint, so every photo/video fits
 * inside the same window (object-contain, never stretching the layout).
 */
const Gallery = ({ media, name, index, onChange, badge }) => {
  const [zoom, setZoom] = useState(null); // { x, y } in percent
  const touchStartX = useRef(null);

  const count = media.length;
  const safeIndex = Math.min(index, Math.max(count - 1, 0));
  const current = media[safeIndex];

  const go = (dir) => {
    if (count > 1) onChange((safeIndex + dir + count) % count);
  };

  const onPointerMove = (e) => {
    if (e.pointerType !== 'mouse' || current?.type !== 'image') return;
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    });
  };

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-3 w-full min-w-0">
      {count > 1 && (
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:h-[520px] no-scrollbar py-1 lg:py-0 lg:pr-1">
          {media.map((m, i) => (
            <button
              key={`${m.type}-${m.url}-${i}`}
              type="button"
              onClick={() => onChange(i)}
              aria-label={`Show ${m.type} ${i + 1} of ${count}`}
              aria-current={i === safeIndex}
              className={`relative shrink-0 w-16 h-16 lg:w-[72px] lg:h-[72px] rounded-lg overflow-hidden border-2 bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                i === safeIndex ? 'border-primary' : 'border-transparent hover:border-gray-300'
              }`}
            >
              {m.type === 'image' ? (
                <img src={m.url} alt="" loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <>
                  <video src={m.url} muted preload="metadata" className="w-full h-full object-cover" />
                  <span className="absolute inset-0 grid place-items-center bg-black/30 text-white">
                    <FaPlay size={14} />
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      )}

      <div
        role="group"
        aria-roledescription="carousel"
        aria-label={`${name} gallery`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') go(-1);
          if (e.key === 'ArrowRight') go(1);
        }}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        }}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setZoom(null)}
        className={`relative flex-1 min-w-0 h-[320px] sm:h-[420px] lg:h-[520px] rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          current?.type === 'image' ? 'cursor-zoom-in' : ''
        }`}
      >
        {current?.type === 'image' && (
          <img
            key={current.url}
            src={current.url}
            alt={name}
            draggable={false}
            decoding="async"
            className="w-full h-full object-contain p-4 transition-transform duration-150 ease-out"
            style={zoom ? { transform: 'scale(2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
        )}
        {current?.type === 'video' && (
          <video
            key={current.url}
            src={current.url}
            controls
            playsInline
            className="w-full h-full object-contain bg-black"
          />
        )}
        {!current && (
          <div className="w-full h-full grid place-items-center">
            <img src={assets.upload_area} alt="" className="w-20 opacity-40" />
          </div>
        )}

        {badge && (
          <span className="absolute top-3 left-3 bg-primary text-white text-xs font-semibold px-2.5 py-1 rounded-md">
            {badge}
          </span>
        )}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center rounded-full bg-white/90 shadow text-gray-700 hover:bg-white"
            >
              <FaChevronLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center rounded-full bg-white/90 shadow text-gray-700 hover:bg-white"
            >
              <FaChevronRight size={13} />
            </button>
            <span className="absolute bottom-3 right-3 text-xs bg-gray-900/70 text-white px-2 py-1 rounded-md" aria-live="polite">
              {safeIndex + 1} / {count}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                    Page                                    */
/* -------------------------------------------------------------------------- */

const ProductDetails = () => {
  const { products = [], navigate, addToCart, currency = '₹', user, axios } = useAppContext();
  const { id } = useParams();

  const product = useMemo(() => products.find((item) => item?._id === id), [products, id]);
  const productId = product?._id;

  const [mediaIndex, setMediaIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [liked, setLiked] = useState(false);
  const [wishBusy, setWishBusy] = useState(false);
  const [action, setAction] = useState(null); // null | 'cart' | 'buy'
  const [timedOut, setTimedOut] = useState(false);
  const [showBar, setShowBar] = useState(false);

  const mounted = useRef(true);
  const actionsRef = useRef(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Loading: wait for products, but don't spin forever if they never arrive
  useEffect(() => {
    setTimedOut(false);
    if (product || products.length > 0) return;
    const t = setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [product, products.length]);

  const isLoading = !product && products.length === 0 && !timedOut;

  // New product: reset gallery, related paging and scroll position
  useEffect(() => {
    setMediaIndex(0);
    setShowAll(false);
    window.scrollTo({ top: 0 });
  }, [id]);

  // Record view for personalized ads (non-fatal)
  useEffect(() => {
    if (!productId) return;
    axios.post('/api/ads/view', { productId, sessionId: getSessionId() }).catch(() => {});
  }, [productId, axios]);

  // Wishlist state from user
  useEffect(() => {
    setLiked(Boolean(productId && user?.wishlist?.includes(productId)));
  }, [productId, user]);

  // Show the mobile buy bar only once the main buttons scroll out of view
  useEffect(() => {
    const el = actionsRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setShowBar(!entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [productId, isLoading]);

  /* ------------------------------ Derived data ------------------------------ */

  const media = useMemo(() => {
    const images = (Array.isArray(product?.image) ? product.image : []).filter(Boolean);
    const videos = (Array.isArray(product?.video) ? product.video : []).filter(Boolean);
    return [
      ...images.map((url) => ({ url, type: 'image' })),
      ...videos.map((url) => ({ url, type: 'video' })),
    ];
  }, [product]);

  const relatedAll = useMemo(
    () =>
      product
        ? products.filter(
            (item) =>
              item && item.inStock && item.category === product.category && item._id !== product._id
          )
        : [],
    [products, product]
  );
  const relatedVisible = showAll ? relatedAll : relatedAll.slice(0, RELATED_PAGE);

  /* -------------------------------- Handlers -------------------------------- */

  const handleShare = async () => {
    const price = product.offerPrice ?? product.price;
    const shareData = {
      title: product.name,
      text: `Check out ${product.name}${price != null ? ` for ${currency}${price}` : ''}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(shareData.url);
      toast.success('Link copied');
    } catch (err) {
      if (err?.name === 'AbortError') return; // user closed the share sheet
      toast.error(navigator.share ? "Couldn't share this product" : "Couldn't copy the link");
    }
  };

  const handleToggleWishlist = async () => {
    if (!user?._id) {
      toast.error('Log in to use your wishlist');
      return;
    }
    if (!productId || wishBusy) return;

    const previous = liked;
    setLiked(!previous); // optimistic
    setWishBusy(true);
    try {
      const { data } = await axios.post('/api/user/toggle-wishlist', { productId });
      if (data?.success) {
        const now = Array.isArray(data.wishlist) ? data.wishlist.includes(productId) : !previous;
        setLiked(now);
        toast.success(now ? 'Added to wishlist' : 'Removed from wishlist');
      } else {
        setLiked(previous);
        toast.error(data?.message || "Couldn't update your wishlist");
      }
    } catch (err) {
      console.error('Wishlist error', err);
      setLiked(previous);
      toast.error("Couldn't update your wishlist");
    } finally {
      if (mounted.current) setWishBusy(false);
    }
  };

  const handleAddToCart = async () => {
    if (!productId || action) return;

    setAction('cart');

    try {
      await addToCart(productId);
    } catch (err) {
      console.error('Add to cart error', err);
      toast.error("Couldn't add to cart");
    } finally {
      if (mounted.current) setAction(null);
    }
  };

  const handleBuyNow = async () => {
    if (!productId || action) return;
    setAction('buy');
    try {
      await addToCart(productId);
      navigate('/cart');
    } catch (err) {
      console.error('Buy now error', err);
      toast.error("Couldn't start checkout");
      if (mounted.current) setAction(null);
    }
  };

  const goToCategory = () => {
    if (!product?.category) return;
    navigate(`/products/${product.category.toLowerCase()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* --------------------------------- States --------------------------------- */

  if (isLoading) return <PageSkeleton />;

  if (!product) {
    return (
      <div className="min-h-screen grid place-items-center px-4 pt-28">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-semibold">
            {timedOut ? "Couldn't load products" : 'Product not found'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {timedOut
              ? 'Check your connection and refresh the page.'
              : 'It may have been removed or the link is wrong.'}
          </p>
          <Link
            to="/products"
            className="inline-block mt-5 px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dull transition-colors"
          >
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  /* ------------------------------ Price + stock ----------------------------- */

  const fmt = (n) => `${currency}${Number(n).toLocaleString('en-IN')}`;
  const mrp = Number(product.price);
  const sale = Number(product.offerPrice ?? product.price ?? 0);
  const hasDiscount = Number.isFinite(mrp) && sale > 0 && mrp > sale;
  const savings = hasDiscount ? mrp - sale : 0;
  const percentOff = hasDiscount ? Math.round((savings / mrp) * 100) : 0;

  const stockCount = typeof product.stock === 'number' ? product.stock : null;
  const available = Boolean(product.inStock) && (stockCount === null || stockCount > 0);
  const lowStock = available && stockCount !== null && stockCount <= LOW_STOCK;

  const descriptionItems = Array.isArray(product.description)
    ? product.description.filter(Boolean)
    : product.description
    ? [String(product.description)]
    : [];

  const categoryPath = `/products/${product.category?.toLowerCase()}`;
  const hasQuantity = product.quantity?.value && product.quantity?.unit;

  return (
    <div className="min-h-screen w-full bg-white text-gray-800 pt-28 pb-28 sm:pb-16 px-4 sm:px-6 lg:px-16">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
        <Link to="/" className="hover:text-primary">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to="/products" className="hover:text-primary">Products</Link>
        {product.category && (
          <>
            <span aria-hidden="true">/</span>
            <Link to={categoryPath} className="hover:text-primary">{product.category}</Link>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-gray-800 truncate max-w-[60vw]">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* ------------------------------ Gallery ------------------------------ */}
        <Gallery
          media={media}
          name={product.name}
          index={mediaIndex}
          onChange={setMediaIndex}
          badge={percentOff > 0 && available ? `${percentOff}% off` : null}
        />

        {/* ------------------------------ Details ------------------------------ */}
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {product.category && (
                <Link to={categoryPath} className="text-sm text-primary hover:underline">
                  {product.category}
                </Link>
              )}
              <h1 className="text-2xl sm:text-3xl font-semibold leading-tight mt-1 break-words">
                {product.name}
              </h1>
            </div>
            <div className="flex gap-2 shrink-0">
              <IconButton
                label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
                pressed={liked}
                onClick={handleToggleWishlist}
                disabled={wishBusy}
              >
                {liked ? <FaHeart size={18} className="text-red-500" /> : <FaRegHeart size={18} />}
              </IconButton>
              <IconButton label="Share this product" onClick={handleShare}>
                <FaShareAlt size={16} />
              </IconButton>
            </div>
          </div>

          {hasQuantity && (
            <p className="inline-block mt-3 text-sm text-gray-600 border border-gray-200 rounded-full px-3 py-1">
              Net quantity {product.quantity.value} {product.quantity.unit}
            </p>
          )}

          {/* Buy box */}
          <div className="mt-6 rounded-2xl border border-gray-200 p-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-3xl font-semibold text-gray-900">{fmt(sale)}</span>
              {hasDiscount && (
                <>
                  <span className="text-base text-gray-400 line-through">MRP {fmt(mrp)}</span>
                  <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    Save {fmt(savings)} ({percentOff}%)
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">{TAX_NOTE}</p>

            <p
              className={`mt-4 flex items-center gap-2 text-sm font-medium ${
                !available ? 'text-red-600' : lowStock ? 'text-amber-700' : 'text-green-700'
              }`}
              role="status"
            >
              <span
                aria-hidden="true"
                className={`w-2 h-2 rounded-full ${
                  !available ? 'bg-red-500' : lowStock ? 'bg-amber-500' : 'bg-green-500'
                }`}
              />
              {!available ? 'Out of stock' : lowStock ? `Only ${stockCount} left` : 'In stock'}
            </p>

            <div ref={actionsRef} className="mt-5 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!available || Boolean(action)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-lg border border-primary text-primary text-sm font-semibold hover:bg-primary/5 transition-colors disabled:border-gray-200 disabled:text-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
              >
                {action === 'cart' ? <Spinner dark /> : <FaShoppingCart />}
                Add to cart
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!available || Boolean(action)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dull transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {action === 'buy' ? <Spinner /> : <FaBolt />}
                Buy now
              </button>
            </div>
          </div>

          {/* About */}
          <div className="mt-8">
            <h2 className="text-base font-semibold">About this product</h2>
            {descriptionItems.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-gray-600 leading-relaxed list-disc pl-5 marker:text-primary">
                {descriptionItems.map((desc, idx) => (
                  <li key={idx}>{desc}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-gray-500">The seller hasn't added a description yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------ Related ------------------------------ */}
      {relatedAll.length > 0 && (
        <section className="mt-16" aria-labelledby="related-heading">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h2 id="related-heading" className="text-xl sm:text-2xl font-semibold">
              More from {product.category}
            </h2>
            <button
              type="button"
              onClick={goToCategory}
              className="text-sm font-medium text-primary hover:underline"
            >
              View all in {product.category}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
            {relatedVisible.map((rel) => (
              <ProductCard key={rel._id} product={rel} />
            ))}
          </div>

          {!showAll && relatedAll.length > RELATED_PAGE && (
            <div className="flex justify-center mt-8">
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="px-8 py-2.5 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Show {relatedAll.length - RELATED_PAGE} more
              </button>
            </div>
          )}
        </section>
      )}

      {/* Mobile buy bar: appears when the main buttons scroll out of view */}
      <div
        className={`sm:hidden fixed inset-x-0 bottom-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] transition-transform duration-200 ${
          showBar ? 'translate-y-0' : 'translate-y-full invisible'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="font-semibold leading-tight">{fmt(sale)}</p>
            {hasDiscount && <p className="text-xs text-gray-400 line-through">{fmt(mrp)}</p>}
          </div>
          {available ? (
            <div className="flex flex-1 gap-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={Boolean(action)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border border-primary text-primary text-sm font-semibold disabled:opacity-60"
              >
                {action === 'cart' && <Spinner dark />}
                Add to cart
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={Boolean(action)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60"
              >
                {action === 'buy' && <Spinner />}
                Buy now
              </button>
            </div>
          ) : (
            <p className="flex-1 text-center py-3 rounded-lg bg-gray-100 text-sm font-medium text-gray-500">
              Out of stock
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
