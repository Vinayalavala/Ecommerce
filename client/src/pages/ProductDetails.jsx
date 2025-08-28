
import { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppContext } from '../context/appContext';
import assets from '../assets/assets';
import ProductCard from '../components/ProductCard';

import { toast } from 'react-hot-toast';
import { FaHeart, FaRegHeart, FaShoppingCart, FaBolt, FaShareAlt } from 'react-icons/fa';

const ProductDetails = () => {
  const { products = [], navigate, addToCart, currency = '₹', user, axios } = useAppContext();
  const { id } = useParams();

  const [relatedProducts, setRelatedProducts] = useState([]);
  const [allRelated, setAllRelated] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [thumbnail, setThumbnail] = useState(null);
  const [liked, setLiked] = useState(false);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  const product = products.find((item) => item?._id === id);
  const mounted = useRef(true);

  // Session id for guest ad tracking
  const getSessionId = () => {
    const key = 'ads_session_id';
    let s = localStorage.getItem(key);
    if (!s) {
      s = `sess_${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(key, s);
    }
    return s;
  };

  useEffect(() => {
    if (products.length > 0) {
      setLoading(false); 
    }
  }, [products]);

  const sessionId = getSessionId();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Record view for personalized ads (uses app axios to pick up auth headers)
  useEffect(() => {
    if (!product || !product._id) return;
    const record = async () => {
      try {
        // Use axios from context (auth + baseURL)
        await axios.post('/api/ads/view', { productId: product._id, sessionId });
      } catch (err) {
        // non-fatal
        // console.debug('ads view err', err);
      }
    };
    record();
    // only when product id changes
  }, [product && product._id, axios, sessionId]);

  // set liked state from user wishlist
  useEffect(() => {
    setLiked(Boolean(product && user?.wishlist?.includes(product._id)));
  }, [product, user]);

  // related products
  useEffect(() => {
    if (!product || products.length === 0) {
      setRelatedProducts([]);
      setAllRelated([]);
      return;
    }
    const filtered = products.filter(
      (item) => item && item.category === product.category && item._id !== product._id
    );
    setAllRelated(filtered);
    setRelatedProducts(filtered.slice(0, 5));
    setShowAll(false);
  }, [products, product]);

  // Share Product Handler
  const handleShareProduct = () => {
    const shareData = {
      title: product.name,
      text: `Check out this product: ${product.name} for just ${currency}${product.offerPrice}`,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData).catch((err) => {
        console.error('Share failed:', err);
        toast.error('Failed to share product');
      });
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          toast.success('Product link copied to clipboard');
        })
        .catch(() => {
          toast.error('Failed to copy link');
        });
    }
  };

  // initial thumbnail
  useEffect(() => {
    if (!product) return;
    if (Array.isArray(product.video) && product.video.length > 0) {
      setThumbnail({ url: product.video[0], type: 'video' });
    } else if (Array.isArray(product.image) && product.image.length > 0) {
      setThumbnail({ url: product.image[0], type: 'image' });
    } else {
      setThumbnail(null);
    }
  }, [product]);

  const handleToggleWishlist = async () => {
    if (!user?._id) {
      toast.error('Login required to use wishlist');
      return;
    }
    if (!product || !product._id) {
      toast.error('Invalid product');
      return;
    }

    try {
      const { data } = await axios.post('/api/user/toggle-wishlist', { productId: product._id });
      if (data?.success) {
        const isNowLiked = Array.isArray(data.wishlist) && data.wishlist.includes(product._id);
        setLiked(Boolean(isNowLiked));
        toast.success(isNowLiked ? 'Added to wishlist' : 'Removed from wishlist');
      } else {
        toast.error(data?.message || 'Wishlist update failed');
      }
    } catch (err) {
      console.error('Wishlist error', err);
      toast.error('Failed to update wishlist');
    }
  };

  const handleSeeMore = () => {
    setRelatedProducts(allRelated);
    setShowAll(true);
  };

  const goToCategory = () => {
    if (!product?.category) return;
    navigate(`/products/${product.category?.toLowerCase()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddToCart = async (prodId) => {
    if (!prodId) return;
    if (adding) return;
    setAdding(true);
    try {
      await addToCart(prodId);
      toast.success('Added to cart');
    } catch (err) {
      console.error('Add to cart error', err);
      toast.error('Failed to add to cart');
    } finally {
      if (mounted.current) setAdding(false);
    }
  };

  const handleBuyNow = async (prodId) => {
    if (!prodId) return;
    try {
      await addToCart(prodId);
      navigate('/cart');
    } catch (err) {
      console.error('Buy now error', err);
      toast.error('Failed to initiate purchase');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 👉 Show Not Found if product is missing AFTER loading
  if (!product) {
    return (
      <div className="flex items-center justify-center h-screen text-xl font-medium">
        Product not found
      </div>
    );
  }

  // safe description rendering
  const descriptionItems = Array.isArray(product.description)
    ? product.description
    : product.description
    ? [String(product.description)]
    : [];

  return (
    <div className="min-h-screen w-full bg-white text-gray-800 pt-28 px-4 sm:px-6 lg:px-16">
      {/* Product Section */}
      <div className="flex flex-col lg:flex-row gap-10">
        {/* LEFT - Gallery */}
        <div className="w-full lg:w-1/2 flex flex-col gap-4">
          {/* Desktop */}
          <div className="hidden lg:flex gap-4">
            <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto no-scrollbar">
              {(Array.isArray(product.image) ? product.image : []).map((img, idx) => (
                <button
                  key={`img-${idx}`}
                  onClick={() => setThumbnail({ url: img, type: 'image' })}
                  className={`p-0 border-0 bg-transparent`}
                  aria-label={`Show image ${idx + 1}`}
                >
                  <img
                    src={img}
                    alt={`${product.name} thumbnail ${idx + 1}`}
                    className={`w-20 h-20 object-cover  rounded-md border cursor-pointer ${
                      thumbnail?.url === img ? 'border-primary' : 'border-gray-300'
                    }`}
                  />
                </button>
              ))}

              {(Array.isArray(product.video) ? product.video : []).map((vid, idx) => (
                <button
                  key={`vid-${idx}`}
                  onClick={() => setThumbnail({ url: vid, type: 'video' })}
                  className="p-0 border-0 bg-transparent"
                  aria-label={`Play video ${idx + 1}`}
                >
                  <video
                    src={vid}
                    muted
                    className={`w-20 h-20 object-cover rounded-md border cursor-pointer ${
                      thumbnail?.url === vid ? 'border-primary' : 'border-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="border border-gray-300 w-[460px] h-[460px] rounded-md overflow-hidden flex items-center justify-center bg-gray-50">
              {thumbnail?.type === "image" && (
                <img
                  src={thumbnail.url}
                  alt={product.name}
                  className="max-h-full max-w-full object-contain"
                  style={{ width: "auto", height: "auto" }}
                />
              )}
              {thumbnail?.type === "video" && (
                <video
                  src={thumbnail.url}
                  controls
                  className="max-h-full max-w-full object-contain"
                  style={{ width: "auto", height: "auto" }}
                />
              )}
            </div>

          </div>

          {/* Mobile */}
          <div className="lg:hidden flex flex-col gap-3">
            <div className="w-full h-[340px] rounded-md border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
              {thumbnail?.type === 'image' && (
                <img src={thumbnail.url} alt={product.name} className="w-full h-full object-contain" />
              )}
              {thumbnail?.type === 'video' && (
                <video src={thumbnail.url} controls className="w-full h-full object-contain" />
              )}
              {!thumbnail && <div className="text-gray-400">No media</div>}
            </div>

            <div className="text-gray-500 text-sm">
              <Link to="/">Home</Link> / <Link to="/products">Products</Link> /{' '}
              <Link to={`/products/${product.category?.toLowerCase()}`}>{product.category}</Link> /{' '}
              <span className="text-primary">{product.name}</span>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {(Array.isArray(product.image) ? product.image : []).map((img, idx) => (
                <button key={`mob-img-${idx}`} onClick={() => setThumbnail({ url: img, type: 'image' })} className="p-0 border-0 bg-transparent">
                  <img
                    src={img}
                    alt={`${product.name} mobile ${idx + 1}`}
                    className={`w-16 h-16 object-cover flex-shrink-0 rounded-md border cursor-pointer ${
                      thumbnail?.url === img ? 'border-primary' : 'border-gray-300'
                    }`}
                  />
                </button>
              ))}
              {(Array.isArray(product.video) ? product.video : []).map((vid, idx) => (
                <button key={`mob-vid-${idx}`} onClick={() => setThumbnail({ url: vid, type: 'video' })} className="p-0 border-0 bg-transparent">
                  <video
                    src={vid}
                    muted
                    className={`w-16 h-16 object-cover flex-shrink-0 rounded-md border cursor-pointer ${
                      thumbnail?.url === vid ? 'border-primary' : 'border-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT - Details */}
        <div className="flex-1 space-y-4 text-sm">
          <div className="hidden lg:block text-gray-500 text-sm mb-2">
            <Link to="/">Home</Link> / <Link to="/products">Products</Link> /{' '}
            <Link to={`/products/${product.category?.toLowerCase()}`}>{product.category}</Link> /{' '}
            <span className="text-primary">{product.name}</span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            <button
              onClick={handleToggleWishlist}
              aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              {liked ? <FaHeart size={22} className="text-red-500" /> : <FaRegHeart size={22} className="text-gray-500" />}
            </button>

            {/* Share Button */}
              <button
                onClick={handleShareProduct}
                aria-label="Share this product"
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <FaShareAlt size={20} className="text-gray-500" />
              </button>
          </div>

          {product.quantity?.value && product.quantity?.unit && (
            <p className="text-gray-600">Net Quantity: {product.quantity.value} {product.quantity.unit}</p>
          )}

          {/* Pricing */}
          <div>
            {product.price != null && (
              <p className="text-gray-400 line-through">MRP: {currency}{product.price}</p>
            )}
            <p className="text-2xl font-semibold">{currency}{product.offerPrice ?? product.price ?? '0.00'}</p>
            <p className="text-xs text-gray-500">(Inclusive of all taxes)</p>
          </div>

          {/* Stock */}
          {product.inStock ? (
            <>
              <p className="text-green-600 font-medium">In Stock</p>
              {typeof product.stock === 'number' && product.stock <= 10 && (
                <p className="text-red-500 text-sm animate-pulse">Hurry! Only {product.stock} left.</p>
              )}
            </>
          ) : (
            <p className="text-red-500 font-medium">Out of Stock</p>
          )}

          {/* Description */}
          <div>
            <p className="font-medium mt-4">About this product</p>
            <ul className="text-gray-600 list-disc pl-5 mt-2 space-y-1">
              {descriptionItems.length > 0
                ? descriptionItems.map((desc, idx) => <li key={idx}>{desc}</li>)
                : <li>No description available.</li>}
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <button
              onClick={() => handleAddToCart(product._id)}
              disabled={!product.inStock || adding}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-semibold transition ${
                product.inStock ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <FaShoppingCart /> Add to Cart
            </button>

            <button
              onClick={() => handleBuyNow(product._id)}
              disabled={!product.inStock}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-semibold transition ${
                product.inStock ? 'bg-primary hover:bg-primary-dull text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <FaBolt /> Buy Now
            </button>
          </div>
        </div>
      </div>

      {/* Related Products */}
      <div className="mt-16">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-semibold">Related Products</h2>
          <div className="w-16 h-0.5 bg-primary mx-auto mt-2"></div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
          {relatedProducts.filter((rel) => rel?.inStock).map((rel) => (
            <ProductCard key={rel._id} product={rel} />
          ))}
        </div>

        <div className="flex justify-center mt-10 gap-4 flex-wrap">
          {!showAll && allRelated.length > relatedProducts.length && (
            <button
              onClick={handleSeeMore}
              className="px-8 py-2 border border-primary text-primary rounded hover:bg-primary/10 transition text-sm sm:text-base"
            >
              See more
            </button>
          )}

          <button
            onClick={goToCategory}
            className="px-8 py-2 border border-primary text-primary rounded hover:bg-primary/10 transition text-sm sm:text-base"
          >
            More in {product.category}
          </button>
        </div>
      </div>

      {/* Sticky bottom bar for mobile (Add to cart / Buy now) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 sm:hidden">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs text-gray-500">Price</div>
            <div className="font-semibold">{currency}{product.offerPrice ?? product.price ?? '0.00'}</div>
          </div>
          <div className="flex gap-2 w-1/2">
            <button
              onClick={() => handleAddToCart(product._id)}
              disabled={!product.inStock || adding}
              className="flex-1 py-3 rounded-md bg-gray-100 text-sm font-semibold"
            >
              Add
            </button>
            <button
              onClick={() => handleBuyNow(product._id)}
              disabled={!product.inStock}
              className="flex-1 py-3 rounded-md bg-primary text-white text-sm font-semibold"
            >
              Buy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
