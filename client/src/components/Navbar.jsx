import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import assets from '../assets/assets';
import { useAppContext } from '../context/appContext.jsx';
import { toast } from 'react-hot-toast';

const Navbar = () => {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [hideTopBar, setHideTopBar] = useState(false);
  const [hideBottomBar, setHideBottomBar] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

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

  return (
    <>
      {/* TOP NAVBAR */}
      <nav
        className={`z-50 fixed top-0 left-0 w-full transition-transform duration-500 ease-in-out bg-white/90 backdrop-blur-md border-b border-gray-300 px-3 md:px-8 lg:px-15 ${
          hideTopBar ? '-translate-y-12' : 'translate-y-0'
        }`}
      >
        {/* Hidden top part */}
        <div className={`transition-opacity duration-300 ease-in-out ${hideTopBar ? 'opacity-0 pointer-events-none' : 'opacity-100'} py-3`}>
          <div className="flex items-center justify-between w-full">
            {/* Logo */}
            <NavLink
              to="/"
              className="hidden sm:block"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <img src={assets.logo} alt="logo" className="h-10" />
            </NavLink>

            {/* Desktop Search */}
            <div className="hidden lg:flex flex-1 mx-4 items-center text-sm gap-2 border border-gray-300 px-3 rounded-full max-w-md bg-white">
              <input
                onChange={(e) => setSearchQuery(e.target.value)}
                value={searchQuery}
                className="py-1.5 w-full bg-transparent outline-none placeholder-gray-500"
                type="text"
                placeholder="Search products"
              />
              <img src={assets.search_icon} alt="search" className="w-4 h-4" />
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

        {/* Mobile Search Bar (Always visible & centered when navbar is hidden) */}
        <div className={`lg:hidden mb-3 transition-all duration-300 ${hideTopBar ? 'flex justify-center items-center h-5' : 'mt-0'}`}>
          <div className="flex items-center text-sm gap-2 border border-gray-300 px-3 py-1.5 rounded-full w-full max-w-md bg-white shadow-sm">
            <input
              onChange={(e) => setSearchQuery(e.target.value)}
              value={searchQuery}
              className="w-full bg-transparent outline-none placeholder-gray-500"
              type="text"
              placeholder="Search products..."
            />
            <img src={assets.search_icon} alt="search" className="w-4 h-4" />
          </div>
        </div>
      </nav>

      {/* BOTTOM NAVBAR */}
      <div className={`sm:hidden fixed bottom-3 left-1/2 -translate-x-1/2 w-[95%] max-w-md rounded-2xl px-3 py-2 flex justify-between items-center bg-white/30 backdrop-blur-md border border-gray-300 z-50 shadow-xl transition-transform duration-500 ease-in-out ${hideBottomBar ? 'translate-y-20 opacity-0' : 'translate-y-0 opacity-100'}`}>
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
        <button onClick={() => handleNavigate('/contact')} className="flex flex-col items-center text-xs text-gray-700 hover:text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="w-6 h-6 mb-1 text-gray-600" viewBox="0 0 24 24">
            <path d="M14.828 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9.172a2 2 0 0 0-.586-1.414l-5.172-5.172A2 2 0 0 0 14.828 3zM12 17a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm1-7h-4v5h2v-3h2V10z" />
          </svg>
          <span>Contact</span>
        </button>
      </div>
    </>
  );
};

export default Navbar;
