import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import assets from '../assets/assets';
import { useAppContext } from '../context/appContext.jsx';
import { toast } from 'react-hot-toast';
import { FiShoppingCart } from "react-icons/fi";

const Navbar = () => {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [hideTopBar, setHideTopBar] = useState(false);
  const [hideBottomBar, setHideBottomBar] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  const placeholders = [
    'Milk / Fruits',
    'Snacks / Chips',
    'Vegetables / Fresh Items',
    'Bakery / Cakes',
    'Beverages / Juices'
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const {
    axios,
    user,
    setUser,
    setShowUserLogin,
    setSearchQuery,
    searchQuery,
  } = useAppContext();

  const navigate = useNavigate();

  const logout = async () => {
    try {
      const { data } = await axios.get('/api/user/logout');
      if (data.success) {
        localStorage.removeItem('authToken');
        toast.success(data.message);
        setUser(null);
        navigate('/');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getUserAddress = async () => {
    try {
      const { data } = await axios.get(`/api/address/get?userId=${user._id}`);
      if (data.success) {
        setAddresses(data.addresses);
        if (data.addresses.length > 0) {
          setSelectedAddress(data.addresses[0]);
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (searchQuery.length > 0) {
      navigate('/products');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [searchQuery]);

  useEffect(() => {
    if (user && user._id) {
      getUserAddress();
    }
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (window.innerWidth < 1024) {
        if (currentScrollY > lastScrollY && currentScrollY > 50) {
          setHideTopBar(true);
          setHideBottomBar(true);
        } else {
          setHideTopBar(false);
          setHideBottomBar(false);
        }
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Placeholder text rotation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* TOP NAVBAR */}
      <nav
        className={`z-50 fixed top-0 left-0 w-full transition-transform duration-500 ease-in-out bg-white/90 backdrop-blur-md border-b border-gray-300 py-3 px-3 md:px-8 lg:px-15 ${
          hideTopBar ? '-translate-y-12' : 'translate-y-0'
        }`}
      >
        {/* Hidden top part */}
        <div className={`transition-opacity duration-300 ease-in-out ${hideTopBar ? 'opacity-0 pointer-events-none' : 'opacity-100'} py-1`}>
          <div className="flex items-center justify-between w-full">
            {/* Logo */}
            <NavLink
              to="/"
              className="hidden sm:block"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <img src={assets.logo} alt="logo" className="h-10" />
            </NavLink>

            {/* Desktop Search with vertical animation */}
            <div className="hidden lg:flex flex-1 mx-4 items-center text-sm gap-2 border border-gray-300 px-3 rounded-full max-w-md bg-white relative overflow-hidden">
              <input
                onChange={(e) => setSearchQuery(e.target.value)}
                value={searchQuery}
                className="py-1.5 w-full bg-transparent outline-none placeholder-gray-500"
                type="text"
              />
              <div className="absolute left-4 flex items-center pointer-events-none select-none">
                <span className="text-gray-400">Search for&nbsp;</span>
                <div className="h-5 overflow-hidden relative">
                  <div
                    className="flex flex-col transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateY(-${placeholderIndex * 20}px)` }}
                  >
                    {placeholders.map((text, i) => (
                      <span key={i} className="h-5 text-gray-500">{text}</span>
                    ))}
                  </div>
                </div>
              </div>
              <img src={assets.search_icon} alt="search" className="w-4 h-4 ml-auto" />
            </div>

            {/* Desktop Links */}
            <div className="hidden lg:flex items-center gap-8">
              <NavLink to="/" className={({ isActive }) => isActive ? 'text-primary font-semibold' : ''}>Home</NavLink>
              <NavLink to="/products" className={({ isActive }) => isActive ? 'text-primary font-semibold' : ''}>Products</NavLink>
              <NavLink to="/contact" className={({ isActive }) => isActive ? 'text-primary font-semibold' : ''}>Contact</NavLink>

              {!user ? (
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => setShowUserLogin(true)}
                    className="px-4 py-1.5 bg-primary hover:bg-primary-dull text-white rounded-full text-sm"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => navigate('/seller')}
                    className="px-4 py-1.5 bg-primary hover:bg-primary-dull text-white rounded-full text-sm"
                  >
                    Seller
                  </button>
                </div>
              ) : (
                <img
                  src={assets.profile_icon}
                  alt="user"
                  className="w-8 h-8 cursor-pointer"
                  onClick={() => handleNavigate('/profile')}
                />
              )}
            </div>
          </div>

          {/* Mobile Profile Info */}
          {user && (
            <div className="lg:hidden flex items-center gap-3 mt-3 px-1">
              <div className="flex items-center gap-2" onClick={() => navigate('/profile')}>
                <img src={assets.profile_icon} alt="user" className="w-7 h-7" />
                <span className="text-sm font-medium">{user.name}</span>
              </div>
              {selectedAddress && (
                <span
                  onClick={() => navigate('/add-address')}
                  className="text-gray-500 text-xs truncate max-w-[250px] cursor-pointer"
                >
                  {selectedAddress.street}
                </span>
              )}
            </div>
          )}

          {!user && (
            <div className="lg:hidden flex flex-col items-start gap-2 mt-4 px-1 w-full">
              <button
                onClick={() => setShowUserLogin(true)}
                className="w-full py-2 bg-primary hover:bg-primary-dull text-white rounded-full text-sm"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/seller')}
                className="w-full py-2 bg-primary hover:bg-primary-dull text-white rounded-full text-sm"
              >
                Seller
              </button>
            </div>
          )}
        </div>

        {/* Mobile Search Bar with animation */}
        <div className={`lg:hidden mb-3 transition-all duration-300 ${hideTopBar ? 'flex justify-center items-center h-3' : 'mt-0'}`}>
          <div className="flex items-center text-sm gap-2 border border-gray-300 px-3 py-1.5 rounded-full w-full max-w-md bg-white shadow-sm relative overflow-hidden">
            <input
              onChange={(e) => setSearchQuery(e.target.value)}
              value={searchQuery}
              className="w-full bg-transparent outline-none placeholder-gray-500"
              type="text"
            />
            <div className="absolute left-4 flex items-center pointer-events-none select-none">
              <span className="text-gray-400">Search for&nbsp;</span>
              <div className="h-5 overflow-hidden relative">
                <div
                  className="flex flex-col transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateY(-${placeholderIndex * 20}px)` }}
                >
                  {placeholders.map((text, i) => (
                    <span key={i} className="h-5 text-gray-500">{text}</span>
                  ))}
                </div>
              </div>
            </div>
            <img src={assets.search_icon} alt="search" className="w-4 h-4 ml-auto" />
          </div>
        </div>
      </nav>

      {/* BOTTOM NAVBAR */}
      <div className={`sm:hidden fixed bottom-3 left-1/2 -translate-x-1/2 w-[95%] max-w-md rounded-2xl px-3 py-2 flex justify-between items-center bg-white/30 backdrop-blur-md border border-gray-300 z-50 shadow-xl transition-all duration-[800ms] ease-in-out ${
        hideBottomBar ? 'translate-y-20 opacity-0' : 'translate-y-0 opacity-100'
      }`}>
        <button onClick={() => handleNavigate('/')} className="flex flex-col items-center text-xs text-gray-700 hover:text-primary">
          <img src={assets.home_icon || assets.menu_icon} alt="home" className="w-6 h-6 mb-1" />
          <span>Home</span>
        </button>
        <button onClick={() => handleNavigate('/products')} className="flex flex-col items-center text-xs text-gray-700 hover:text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="w-6 h-6 mb-1 text-gray-600" viewBox="0 0 24 24">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73zM12 3.25L18.6 7 12 10.75 5.4 7 12 3.25zM5 8.9l6.5 3.7v7.2L5 16.1V8.9zm8.5 10.9v-7.2L20 8.9v7.2l-6.5 3.7z" />
          </svg>
          <span>Products</span>
        </button>
        <button
          onClick={() => handleNavigate('/cart')}
          className="flex flex-col items-center text-xs text-gray-700 hover:text-primary"
        >
          <FiShoppingCart className="w-6 h-6 mb-1" />
          <span>Cart</span>
        </button>
      </div>
    </>
  );
};

export default Navbar;
