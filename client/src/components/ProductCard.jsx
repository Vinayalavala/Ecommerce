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

  const reviews = product.reviews || [];
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length
      : 0;

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
      console.error("Failed to update wishlist:", data.message);
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
      className="border border-gray-300 rounded-md bg-white w-full flex flex-col transition hover:border-gray-400 cursor-pointer relative"
    >
      {/* Image with Like Button */}
      <div className="h-36 w-full relative overflow-hidden rounded-t-md">
        <img
          src={product.image[0]}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 ease-in-out"
        />
        <button
          onClick={handleLikeToggle}
          className="absolute top-2 right-2 z-10 bg-white/80 rounded-full p-1 backdrop-blur-sm hover:bg-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill={liked ? 'red' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            className="w-5 h-5 text-red-500"
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
      <div className="flex flex-col justify-between flex-1 px-3 py-2 text-gray-500/60 text-sm">
        <div>
          <p>{product.category}</p>
          <p className="text-gray-700 font-medium text-lg truncate">{product.name}</p>

          {/* Star Rating */}
          <div className="flex items-center gap-0.5 mt-1">
            {Array(5)
              .fill('')
              .map((_, i) => (
                <img
                  key={i}
                  className="md:w-3.5 w-3"
                  src={i < Math.round(averageRating) ? assets.star_icon : assets.star_dull_icon}
                  alt=""
                />
              ))}
            <p className="text-gray-400 text-xs">({reviews.length})</p>
          </div>
        </div>

        {/* Price & Cart */}
        <div className="flex items-end justify-between mt-3">
          <p className="md:text-xl text-base font-medium text-gray-800">
            {currency} {product.offerPrice}{' '}
            <span className="text-gray-500/60 md:text-sm text-xs line-through">
              {currency}{product.price}
            </span>
          </p>

          <div onClick={(e) => e.stopPropagation()} className="text-primary">
            {!cartItems[product._id] ? (
              <button
                onClick={() => addToCart(product._id)}
                className="flex items-center justify-center gap-1 bg-primary/10 border border-primary/40 md:w-[80px] w-[64px] h-[34px] rounded"
              >
                <img src={assets.cart_icon} alt="cart_icon" />
                Add
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 md:w-20 w-16 h-[34px] bg-primary/15 rounded select-none">
                <button
                  onClick={() => removeFromCart(product._id)}
                  className="cursor-pointer text-md px-2 h-full"
                >
                  -
                </button>
                <span className="w-5 text-center">{cartItems[product._id]}</span>
                <button
                  onClick={() => addToCart(product._id)}
                  className="cursor-pointer text-md px-2 h-full"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
