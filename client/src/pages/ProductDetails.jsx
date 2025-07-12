import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppContext } from '../context/appContext';
import assets from '../assets/assets';
import ProductCard from '../components/ProductCard';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { FaHeart, FaRegHeart, FaShoppingCart, FaBolt } from 'react-icons/fa';

const ProductDetails = () => {
  const { products, navigate, addToCart, currency, user } = useAppContext();
  const { id } = useParams();

  const [relatedProducts, setRelatedProducts] = useState([]);
  const [thumbnail, setThumbnail] = useState(null);
  const [liked, setLiked] = useState(false);

  const product = products.find((item) => item._id === id);

  useEffect(() => {
    if (product && user?.wishlist?.includes(product._id)) {
      setLiked(true);
    } else {
      setLiked(false);
    }
  }, [product, user]);

  useEffect(() => {
    if (products.length > 0 && product) {
      const filtered = products.filter(
        (item) => item.category === product.category && item._id !== product._id
      );
      setRelatedProducts(filtered.slice(0, 5));
    }
  }, [products, product]);

  useEffect(() => {
    if (product?.image?.length > 0) {
      setThumbnail(product.image[0]);
    }
  }, [product]);

  const handleToggleWishlist = async () => {
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
      toast.error("Failed to update wishlist");
    }
  };

  if (!product) {
    return (
      <div className="flex items-center justify-center h-screen text-xl font-medium">
        Product not found
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white text-gray-800 pt-20 px-4 sm:px-6 md:px-10 lg:px-16 xl:px-20">
      {/* Product Section */}
      <div className="flex flex-col lg:flex-row gap-12 w-full">
        {/* LEFT */}
        <div className="w-full lg:w-1/2 flex flex-col gap-4">
          {/* Desktop layout: thumbnails left, image right */}
          <div className="hidden lg:flex gap-3">
            <div className="flex flex-col gap-3">
              {product.image.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  onClick={() => setThumbnail(img)}
                  className={`w-20 h-20 object-cover rounded-md border cursor-pointer ${
                    thumbnail === img ? "border-primary" : "border-gray-300"
                  }`}
                />
              ))}
            </div>
            <div className="border border-gray-300 w-[400px] h-[400px] rounded-md overflow-hidden">
              <img
                src={thumbnail}
                alt="product"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Mobile layout: image first, breadcrumbs and thumbnails below */}
          <div className="lg:hidden flex flex-col gap-3 w-full">
            <div className="w-full h-[300px] sm:h-[350px] rounded-md border border-gray-300 overflow-hidden">
              <img
                src={thumbnail}
                alt="product"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="text-gray-500 text-sm">
              <Link to="/">Home</Link> / <Link to="/products">Products</Link> /{" "}
              <Link to={`/products/${product.category?.toLowerCase()}`}>{product.category}</Link> /{" "}
              <span className="text-primary">{product.name}</span>
            </div>

            <div className="flex gap-2 justify-center flex-wrap">
              {product.image.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  onClick={() => setThumbnail(img)}
                  className={`w-14 h-14 object-cover rounded-md border cursor-pointer ${
                    thumbnail === img ? "border-primary" : "border-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex-1 space-y-4 text-sm">
          <div className="hidden lg:block text-gray-500 text-sm mb-2">
            <Link to="/">Home</Link> / <Link to="/products">Products</Link> /{" "}
            <Link to={`/products/${product.category?.toLowerCase()}`}>{product.category}</Link> /{" "}
            <span className="text-primary">{product.name}</span>
          </div>

          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            <button onClick={handleToggleWishlist}>
              {liked ? (
                <FaHeart size={22} className="text-red-500" />
              ) : (
                <FaRegHeart size={22} className="text-gray-500 hover:text-red-400" />
              )}
            </button>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1">
            {Array(5).fill('').map((_, i) => (
              <img
                key={i}
                src={i < 4 ? assets.star_icon : assets.star_dull_icon}
                alt="rating"
                className="w-4"
              />
            ))}
            <span className="ml-2 text-gray-400 text-sm">(4)</span>
          </div>

          {/* Pricing */}
          <div>
            <p className="text-gray-400 line-through">MRP: {currency}{product.price}</p>
            <p className="text-2xl font-semibold">Price: {currency}{product.offerPrice}</p>
            <p className="text-sm text-gray-500">(Inclusive of all taxes)</p>
          </div>

          {/* Stock */}
          {product.inStock ? (
            <>
              <p className="text-green-600 font-medium">In Stock</p>
              {product.quantity <= 10 && (
                <p className="text-red-500 text-sm animate-pulse">
                  Hurry! Only {product.quantity} left.
                </p>
              )}
            </>
          ) : (
            <p className="text-red-500 font-medium">Out of Stock</p>
          )}

          {/* Description */}
          <div>
            <p className="font-medium mt-4">About this product</p>
            <ul className="text-gray-600 list-disc pl-5 mt-2 space-y-1">
              {product.description.map((desc, idx) => (
                <li key={idx}>{desc}</li>
              ))}
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <button
              onClick={() => addToCart(product._id)}
              disabled={!product.inStock}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md text-sm font-semibold transition ${
                product.inStock
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <FaShoppingCart /> Add to Cart
            </button>

            <button
              onClick={() => {
                addToCart(product._id);
                navigate("/cart");
              }}
              disabled={!product.inStock}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md text-sm font-semibold transition ${
                product.inStock
                  ? 'bg-primary hover:bg-primary-dull text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <FaBolt /> Buy Now
            </button>
          </div>
        </div>
      </div>

      {/* Related Products */}
      <div className="mt-20 w-full">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-semibold">Related Products</h2>
          <div className="w-16 h-0.5 bg-primary mx-auto mt-2"></div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 mt-6 gap-4">
          {relatedProducts
            .filter((relProduct) => relProduct.inStock)
            .map((relProduct) => (
              <ProductCard key={relProduct._id} product={relProduct} />
            ))}
        </div>

        <div className="flex justify-center mt-10">
          <button
            onClick={() => {
              navigate("/products");
              scrollTo(0, 0);
            }}
            className="px-8 py-2 border border-primary text-primary rounded hover:bg-primary/10 transition"
          >
            See more
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
