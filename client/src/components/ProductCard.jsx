import React from 'react';
import assets from '../assets/assets';
import { useAppContext } from '../context/appContext';

const ProductCard = ({ product }) => {
  const { currency, addToCart, removeFromCart, cartItems, navigate } = useAppContext();

  if (!product) return null;

  const reviews = product.reviews || [];
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length
      : 0;

  return (
    <div
      onClick={() => {
        navigate(`/products/${product.category.toLowerCase()}/${product._id}`);
        scrollTo(0, 0);
      }}
      className="border border-gray-300 rounded-md bg-white min-w-auto max-w-auto w-full flex flex-col transition hover:border-gray-400 cursor-pointer"
    >
      {/* Image Container */}
      <div className="h-36 flex items-center justify-center px-2 overflow-hidden">
        <img
          src={product.image[0]}
          alt={product.name}
          className="max-h-full object-contain transform transition-transform duration-300 ease-in-out group-hover:scale-105"
        />
      </div>

      {/* Product Details */}
      <div className="flex flex-col justify-between flex-1 px-3 py-2 text-gray-500/60 text-sm">
        <div>
          <p>{product.category}</p>
          <p className="text-gray-700 font-medium text-lg truncate w-full">{product.name}</p>

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

        {/* Price and Cart */}
        <div className="flex items-end justify-between mt-3">
          <p className="md:text-xl text-base font-medium text-indigo-50">
            {currency} {product.offerPrice}{' '}
            <span className="text-gray-500/60 md:text-sm text-xs line-through">
              {currency}
              {product.price}
            </span>
          </p>
          <div
            onClick={(e) => e.stopPropagation()}
            className="text-primary"
          >
            {!cartItems[product._id] ? (
              <button
                className="flex items-center justify-center gap-1 bg-primary/10 border border-primary/40 md:w-[80px] w-[64px] h-[34px] rounded"
                onClick={() => addToCart(product._id)}
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
