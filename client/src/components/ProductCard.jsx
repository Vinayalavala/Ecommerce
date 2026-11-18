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

  // Keep the heart in sync when the user (or their wishlist) loads after the card renders
  useEffect(() => {
    setLiked(Boolean(user?.wishlist?.includes(product?._id)));
  }, [user?.wishlist, product?._id]);

  if (!product) return null;

  const handleLikeToggle = async (e) => {
    e.stopPropagation();

    if (!user?._id) {
      toast.error("Login required to use wishlist");
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
        toast.success(isNowLiked ? "Added to wishlist" : "Removed from wishlist");
      } else {
        toast.error(data.message || "Wishlist update failed");
      }
    } catch (err) {
      console.error('Wishlist toggle failed', err);
      toast.error("Failed to update wishlist");
    } finally {
      setLikeBusy(false);
    }
  };

  const qtyInCart = cartItems?.[product._id] || 0;
  const hasDiscount = product.price > product.offerPrice;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.offerPrice) / product.price) * 100)
    : 0;
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
      className="group relative mx-auto flex w-full max-w-[200px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-lg"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-50">
        <img
          src={product.image?.[0] || assets.placeholder_image}
          alt={product.name}
          loading="lazy"
          className={`h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 ${
            outOfStock ? 'opacity-50 grayscale' : ''
          }`}
        />

        {/* Discount badge */}
        {discountPercent > 0 && !outOfStock && (
          <span className="absolute left-2 top-2 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white shadow-sm">
            {discountPercent}% OFF
          </span>
        )}

        {/* Wishlist */}
        <button
          onClick={handleLikeToggle}
          disabled={likeBusy}
          aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition hover:scale-110 hover:bg-white active:scale-90 disabled:opacity-60"
        >
          {liked ? (
            <FaHeart className="text-[13px] text-rose-500" />
          ) : (
            <FaRegHeart className="text-[13px] text-gray-500" />
          )}
        </button>

        {outOfStock && (
          <span className="absolute inset-x-0 bottom-0 bg-gray-900/70 py-1 text-center text-[11px] font-medium text-white">
            Out of stock
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
        {product.category && (
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
            {product.category}
          </p>
        )}

        <p className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5 text-gray-800">
          {product.name}
        </p>

        {sizeLabel && (
          <span className="mt-1 w-fit rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
            {sizeLabel}
          </span>
        )}

        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-base font-semibold text-gray-900">
            {currency}
            {product.offerPrice}
          </span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">
              {currency}
              {product.price}
            </span>
          )}
        </div>

        {/* Add to cart / stepper */}
        <div onClick={(e) => e.stopPropagation()} className="mt-3">
          {outOfStock ? (
            <button
              disabled
              className="h-9 w-full cursor-not-allowed rounded-lg bg-gray-100 text-xs font-medium text-gray-400"
            >
              Unavailable
            </button>
          ) : qtyInCart === 0 ? (
            <button
              onClick={() => addToCart(product._id)}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-primary bg-white text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary hover:text-white active:scale-95"
            >
              <FiPlus className="text-sm" />
              Add
            </button>
          ) : (
            <div className="flex h-9 w-full select-none items-center justify-between rounded-lg bg-primary text-white shadow-sm">
              <button
                onClick={() => removeFromCart(product._id)}
                aria-label="Decrease quantity"
                className="flex h-full w-10 items-center justify-center rounded-l-lg transition hover:bg-black/10 active:scale-90"
              >
                <FiMinus />
              </button>
              <span className="text-sm font-semibold">{qtyInCart}</span>
              <button
                onClick={() => addToCart(product._id)}
                aria-label="Increase quantity"
                className="flex h-full w-10 items-center justify-center rounded-r-lg transition hover:bg-black/10 active:scale-90"
              >
                <FiPlus />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
