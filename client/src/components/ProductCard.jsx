import React, { useState } from 'react';
import assets from '../assets/assets';
import { useAppContext } from '../context/appContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const ProductCard = ({ product }) => {
  const {
    currency,
    addToCart,
    removeFromCart,
    cartItems,
    navigate,
    user,
  } = useAppContext();

  const [liked, setLiked] = useState(user?.wishlist?.includes(product._id));

  if (!product) return null;

  const handleLikeToggle = async (e) => {
    e.stopPropagation();

    if (!user?._id) {
      toast.error("Login required to use wishlist");
      return;
    }

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
    }
  };

  return (
    <div
      onClick={() => {
        navigate(`/products/${product.category.toLowerCase()}/${product._id}`);
        scrollTo(0, 0);
      }}
      className="border border-gray-300 rounded-md bg-white flex flex-col 
                 transition hover:border-gray-400 cursor-pointer relative
                 w-full max-w-[180px] mx-auto"
    >
      {/* Image with Like Button */}
      <div className="h-24 sm:h-28 w-full relative overflow-hidden rounded-t-md">
        <img
          src={product.image[0]}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 ease-in-out"
        />
        <button
          onClick={handleLikeToggle}
          className="absolute top-1.5 right-1.5 z-10 bg-white/80 rounded-full p-1 backdrop-blur-sm hover:bg-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill={liked ? 'red' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4 text-red-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 21.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
            />
          </svg>
        </button>
      </div>

      {/* Product Info */}
      <div className="flex flex-col justify-between flex-1 px-2 py-2 text-gray-500/60 text-xs">
        <div>
          {/* Responsive Info Layout */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-0.5 md:gap-2">
            
            {/* Left Side: Category + Product Name */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-600">{product.category}</p>

              {/* Product Name */}
              <p className="text-gray-700 font-medium text-sm whitespace-normal break-words truncate md:whitespace-normal">
                {product.name}
              </p>
            </div>

            {/* Right Side: Quantity + Price on larger screens */}
            <div className="hidden md:flex flex-col items-end text-right">
              {product.quantity?.value && product.quantity?.unit && (
                <p className="text-gray-500 text-[11px] whitespace-normal break-words">
                  {product.quantity.value} {product.quantity.unit}
                </p>
              )}
              <p className="text-sm font-medium text-gray-800 mt-0.5">
                {currency} {product.offerPrice}{' '}
                <span className="text-gray-500/60 text-[10px] line-through">
                  {currency}{product.price}
                </span>
              </p>
            </div>
          </div>

          {/* On Mobile: Quantity and Price Stack */}
          <div className="md:hidden mt-0.5">
            {product.quantity?.value && product.quantity?.unit && (
              <p className="text-gray-500 text-[11px] whitespace-normal break-words">
                {product.quantity.value} {product.quantity.unit}
              </p>
            )}
            <p className="text-sm font-medium text-gray-800 mt-0.5">
              {currency} {product.offerPrice}{' '}
              <span className="text-gray-500/60 text-[10px] line-through">
                {currency}{product.price}
              </span>
            </p>
          </div>
        </div>

        {/* Full-width Add to Cart Button */}
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="text-primary mt-2"
        >
          {!cartItems[product._id] ? (
            <button
              onClick={() => addToCart(product._id)}
              className="flex items-center justify-center gap-1 bg-primary/10 
                         border border-primary/40 w-full h-[30px] rounded text-[11px]"
            >
              <img src={assets.cart_icon} alt="cart_icon" className="w-3" />
              Add
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 w-full h-[30px] 
                            bg-primary/15 rounded select-none text-[11px]">
              <button
                onClick={() => removeFromCart(product._id)}
                className="cursor-pointer px-2"
              >
                -
              </button>
              <span className="w-3 text-center">{cartItems[product._id]}</span>
              <button
                onClick={() => addToCart(product._id)}
                className="cursor-pointer px-2"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
