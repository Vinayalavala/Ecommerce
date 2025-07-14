import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/appContext';
import ProductCard from '../components/ProductCard';
import axios from 'axios';

const Wishlist = () => {
  const { user, currency, navigate } = useAppContext();
  const [wishlistProducts, setWishlistProducts] = useState([]);

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const { data } = await axios.get('/api/user/wishlist'); // Make sure this route exists
        if (data.success) {
          setWishlistProducts(data.products);
        }
      } catch (err) {
        console.error("Failed to load wishlist:", err.message);
      }
    };

    if (user?._id) {
      fetchWishlist();
    } else {
      navigate('/');
    }
  }, [user]);

  if (!user?._id) return null;

  return (
    <div className="px-4 py-6 mt-30 max-w-screen-lg mx-auto">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">Your Wishlist</h2>
      {wishlistProducts.length === 0 ? (
        <p className="text-gray-500">Your wishlist is empty.</p>
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
