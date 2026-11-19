import React, { useEffect, useState } from 'react';
import assets from '../assets/assets';
import { useAppContext } from '../context/appContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { FiPlus, FiMinus } from 'react-icons/fi';

const ProductCard = ({ product }) => {
  const {
    currency,
    addToCart,
    removeFromCart,
    cartItems,
    navigate,
    user,
  } = useAppContext();

  const [liked, setLiked] = useState(Boolean(user?.wishlist?.includes(product?._id)));
  const [likeBusy, setLikeBusy] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [popHeart, setPopHeart] = useState(false);

  // Keep the heart in sync when the user (or their wishlist) loads after the card renders
  useEffect(() => {
    setLiked(Boolean(user?.wishlist?.includes(product?._id)));
  }, [user?.wishlist, product?._id]);

  if (!product) return null;

  const handleLikeToggle = async (e) => {
    e.stopPropagation();

    if (!user?._id) {
      toast.error('Login required to use wishlist');
      return;
    }
    if (likeBusy) return;
    setLikeBusy(true);

    try {
      const { data } = await axios.post('/api/user/toggle-wishlist', {
        productId: product._id,
      });

      if (data.success) {
        const isNowLiked = data.wishlist.includes(product._id);
        setLiked(isNowLiked);
        if (isNowLiked) {
          setPopHeart(true);
          setTimeout(() => setPopHeart(false), 400);
        }
        toast.success(isNowLiked ? 'Added to wishlist' : 'Removed from wishlist');
      } else {
        toast.error(data.message || 'Wishlist update failed');
      }
    } catch (err) {
      console.error('Wishlist toggle failed', err);
      toast.error('Failed to update wishlist');
    } finally {
      setLikeBusy(false);
    }
  };

  const qtyInCart = cartItems?.[product._id] || 0;
  const hasDiscount = product.price > product.offerPrice;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.offerPrice) / product.price) * 100)
    : 0;
  const savings = hasDiscount ? product.price - product.offerPrice : 0;
  const outOfStock = product.inStock === false;
  const sizeLabel =
    product.quantity?.value && product.quantity?.unit
      ? `${product.quantity.value} ${product.quantity.unit}`
      : '';

  return (
    <div
      onClick={() => {
        navigate(`/products/${product.category?.toLowerCase()}/${product._id}`);
        window.scrollTo(0, 0);
      }}
      className="group relative mx-auto flex w-full max-w-[220px] cursor-pointer flex-col rounded-3xl bg-white p-2 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-gray-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_-8px_rgba(0,0,0,0.18)] hover:ring-primary/20"
    >
      {/* ---------------------------- Image area ---------------------------- */}
      <div className="relative">
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100">
          {/* Skeleton shimmer until the image loads */}
          {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-gray-200/70" />}

          <img
            src={product.image?.[0] || assets.placeholder_image}
            alt={product.name}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgLoaded(true)}
            className={`h-full w-full object-cover transition-all duration-500 ease-out group-hover:scale-110 ${
              imgLoaded ? 'opacity-100' : 'opacity-0'
            } ${outOfStock ? 'opacity-50 grayscale' : ''}`}
          />

          {/* Soft bottom fade so the floating button always pops */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/10 to-transparent" />

          {/* Out-of-stock veil */}
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
              <span className="rounded-full bg-gray-900/80 px-3 py-1 text-[11px] font-semibold tracking-wide text-white">
                Out of stock
              </span>
            </div>
          )}
        </div>

        {/* Discount badge */}
        {discountPercent > 0 && !outOfStock && (
          <span className="absolute left-2 top-2 flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white shadow-md">
            {discountPercent}% OFF
          </span>
        )}

        {/* Wishlist */}
        <button
          onClick={handleLikeToggle}
          disabled={likeBusy}
          aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-md backdrop-blur transition-all duration-200 hover:scale-110 active:scale-90 disabled:opacity-60 ${
            popHeart ? 'scale-125' : ''
          }`}
        >
          {liked ? (
            <FaHeart className="text-[14px] text-rose-500 drop-shadow-sm" />
          ) : (
            <FaRegHeart className="text-[14px] text-gray-500 transition-colors group-hover:text-rose-400" />
          )}
        </button>

        {/* Floating add-to-cart / stepper */}
        {!outOfStock && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-2 right-2 z-10"
          >
            {qtyInCart === 0 ? (
              <button
                onClick={() => addToCart(product._id)}
                aria-label="Add to cart"
                className="flex h-9 items-center gap-1 rounded-xl border border-primary/20 bg-white px-3.5 text-xs font-bold uppercase tracking-wide text-primary shadow-lg transition-all duration-200 hover:bg-primary hover:text-white active:scale-90"
              >
                <FiPlus className="text-sm" strokeWidth={3} />
                Add
              </button>
            ) : (
              <div className="flex h-9 select-none items-center overflow-hidden rounded-xl bg-primary text-white shadow-lg">
                <button
                  onClick={() => removeFromCart(product._id)}
                  aria-label="Decrease quantity"
                  className="flex h-full w-8 items-center justify-center transition hover:bg-black/15 active:scale-90"
                >
                  <FiMinus className="text-sm" />
                </button>
                <span className="min-w-[1.25rem] text-center text-sm font-bold tabular-nums">
                  {qtyInCart}
                </span>
                <button
                  onClick={() => addToCart(product._id)}
                  aria-label="Increase quantity"
                  className="flex h-full w-8 items-center justify-center transition hover:bg-black/15 active:scale-90"
                >
                  <FiPlus className="text-sm" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------ Info ------------------------------- */}
      <div className="flex flex-1 flex-col px-1.5 pb-1.5 pt-3">
        {/* Price row */}
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-lg font-extrabold leading-none text-gray-900">
            {currency}
            {product.offerPrice}
          </span>
          {hasDiscount && (
            <span className="text-xs font-medium text-gray-400 line-through">
              {currency}
              {product.price}
            </span>
          )}
        </div>

        {hasDiscount && (
          <span className="mt-1.5 w-fit rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
            You save {currency}
            {savings}
          </span>
        )}

        {/* Name */}
        <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-[13px] font-semibold leading-5 text-gray-800">
          {product.name}
        </p>

        {/* Meta */}
        <div className="mt-1.5 flex items-center gap-2">
          {sizeLabel && (
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
              {sizeLabel}
            </span>
          )}
          {product.category && (
            <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {product.category}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
