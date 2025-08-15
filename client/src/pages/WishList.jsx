import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/appContext';
import ProductCard from '../components/ProductCard';
import axios from 'axios';
import { FaHeartBroken } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Wishlist = () => {
  const { user, currency, navigate } = useAppContext();
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get('/api/user/wishlist');
        if (data.success) {
          setWishlistProducts(data.products);
        }
      } catch (err) {
        console.error('Failed to load wishlist:', err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user?._id) {
      fetchWishlist();
    } else {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user?._id) return null;

  return (
    <div className="px-4 py-6 mt-20 max-w-screen-lg mx-auto">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Your Wishlist</h2>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-500"></div>
        </div>
      ) : wishlistProducts.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center text-gray-500">
          <FaHeartBroken className="text-5xl mb-3 text-red-400" />
          <p className="mb-3">Your wishlist is empty.</p>
          <Link
            to="/products"
            className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {wishlistProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
