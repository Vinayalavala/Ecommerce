import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;

/**
 * Attach the correct token to EVERY request, at request time.
 * Reading localStorage + window.location here means the first request
 * after login (e.g. the Orders page) already carries the token,
 * regardless of React effect ordering.
 */
axios.interceptors.request.use((config) => {
  const isSellerPath = window.location.pathname.startsWith('/seller');
  const token = isSellerPath
    ? localStorage.getItem('sellerToken')
    : localStorage.getItem('authToken');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

/**
 * If a seller request comes back 401 (expired/invalid token),
 * clear the token and send the seller back to the login page.
 * The is-auth probe is excluded to avoid a redirect loop.
 */
axios.interceptors.response.use(
  (res) => res,
  (error) => {
    if (
      error.response?.status === 401 &&
      window.location.pathname.startsWith('/seller') &&
      window.location.pathname !== '/seller' &&
      error.config?.url !== '/api/seller/is-auth'
    ) {
      localStorage.removeItem('sellerToken');
      window.location.href = '/seller';
    }
    return Promise.reject(error);
  }
);

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

  const fetchSeller = async () => {
    try {
      const { data } = await axios.get('/api/seller/is-auth');
      setIsSeller(data.success);
    } catch (error) {
      setIsSeller(false);
      console.error('Seller auth error:', error?.message || error);
    }
  };

  const fetchUser = async () => {
    try {
      const { data } = await axios.get('/api/user/is-auth');
      if (data.success) {
        setUser(data.user);
        setCartItems(data.user.cartItems || {});
      } else {
        setUser(null);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('User not logged in.');
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
        toast.error(data.message || 'Failed to load products.');
      }
    } catch (error) {
      toast.error(error.message || 'Error loading products.');
    }
  };

  const addToCart = (itemId) => {
    setCartItems((prev) => {
      const newCart = { ...prev };
      newCart[itemId] = (newCart[itemId] || 0) + 1;
      toast.success('Item added to cart');
      return newCart;
    });
  };

  const updateCartItem = (itemId, quantity) => {
    setCartItems((prev) => {
      const newCart = { ...prev };
      newCart[itemId] = quantity;
      toast.success('Cart item updated');
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
      toast.success('Item removed from cart');
      return newCart;
    });
  };

  const getCartCount = () => {
    return Object.values(cartItems).reduce((acc, qty) => acc + qty, 0);
  };

  const getCartAmount = () => {
    return products
      .reduce((acc, product) => {
        const quantity = cartItems[product._id] || 0;
        return acc + product.offerPrice * quantity;
      }, 0)
      .toFixed(2);
  };

  // Fetch data when route changes
  useEffect(() => {
    const runFetches = async () => {
      try {
        if (location.pathname.startsWith('/seller')) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Update cart in DB
  useEffect(() => {
    const updateCartInDB = async () => {
      if (!user?._id) return;

      try {
        const { data } = await axios.post('/api/cart/update', {
          userId: user._id,
          cartItems,
        });
        if (!data.success) {
          toast.error(data.message || 'Failed to update cart.');
        }
      } catch (error) {
        toast.error(error.message || 'Failed to sync cart.');
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

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  return useContext(AppContext);
};
