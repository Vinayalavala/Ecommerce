import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
  const currency = import.meta.env.VITE_CURRENCY;
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [isSeller, setIsSeller] = useState(false);
  const [showUserLogin, setShowUserLogin] = useState(false);
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  /**
   * Set appropriate auth header for current role
   */
  const setAuthHeader = () => {
    const isSellerPath = location.pathname.startsWith('/seller');
    const token = isSellerPath
      ? localStorage.getItem('sellerToken')
      : localStorage.getItem('authToken');

    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const fetchSeller = async () => {
    try {
      setAuthHeader(); // ✅ set token
      const { data } = await axios.get('/api/seller/is-auth');
      setIsSeller(data.success);
    } catch (error) {
      setIsSeller(false);
      console.error("Seller auth error:", error?.message || error);
    }
  };

  const fetchUser = async () => {
    try {
      setAuthHeader(); // ✅ set token
      const { data } = await axios.get('/api/user/is-auth');
      if (data.success) {
        setUser(data.user);
        setCartItems(data.user.cartItems || {});
      } else {
        setUser(null);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log("User not logged in.");
        setUser(null);
      } else {
        console.error(error);
      }
    }
  };

  const fetchProducts = async () => {
    try {
      const { data } = await axios.get('/api/product/list');
      if (data.success) {
        setProducts(data.products);
      } else {
        toast.error(data.message || "Failed to load products.");
      }
    } catch (error) {
      toast.error(error.message || "Error loading products.");
    }
  };

  const addToCart = (itemId) => {
    setCartItems((prev) => {
      const newCart = { ...prev };
      newCart[itemId] = (newCart[itemId] || 0) + 1;
      toast.success("Item added to cart");
      return newCart;
    });
  };

  const updateCartItem = (itemId, quantity) => {
    setCartItems((prev) => {
      const newCart = { ...prev };
      newCart[itemId] = quantity;
      toast.success("Cart item updated");
      return newCart;
    });
  };

  const removeFromCart = (itemId) => {
    setCartItems((prev) => {
      const newCart = { ...prev };
      if (newCart[itemId]) {
        newCart[itemId] -= 1;
        if (newCart[itemId] <= 0) delete newCart[itemId];
      }
      toast.success("Item removed from cart");
      return newCart;
    });
  };

  const getCartCount = () => {
    return Object.values(cartItems).reduce((acc, qty) => acc + qty, 0);
  };

  const getCartAmount = () => {
    return products.reduce((acc, product) => {
      const quantity = cartItems[product._id] || 0;
      return acc + (product.offerPrice * quantity);
    }, 0).toFixed(2);
  };

  // ✅ Fetch data when route changes
  useEffect(() => {
    const runFetches = async () => {
      try {
        setAuthHeader();
        if (location.pathname.startsWith("/seller")) {
          await fetchSeller();
        } else {
          await fetchUser();
        }
        await fetchProducts();
      } finally {
        setLoading(false);
      }
    };

    runFetches();
  }, [location.pathname]);

  // ✅ Update cart in DB
  useEffect(() => {
    const updateCartInDB = async () => {
      if (!user?._id) return;

      try {
        const { data } = await axios.post('/api/cart/update', {
          userId: user._id,
          cartItems,
        });
        if (!data.success) {
          toast.error(data.message || "Failed to update cart.");
        }
      } catch (error) {
        toast.error(error.message || "Failed to sync cart.");
      }
    };

    if (user !== null) {
      updateCartInDB();
    }
  }, [cartItems, user]);

  const value = {
    navigate,
    user,
    setUser,
    isSeller,
    setIsSeller,
    showUserLogin,
    setShowUserLogin,
    products,
    currency,
    cartItems,
    addToCart,
    updateCartItem,
    setCartItems,
    fetchProducts,
    removeFromCart,
    searchQuery,
    setSearchQuery,
    getCartCount,
    getCartAmount,
    axios,
    loading,
    fetchUser,
    fetchSeller,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  return useContext(AppContext);
};
