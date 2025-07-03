import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import assets from '../assets/assets';
import { useAppContext } from '../context/appContext.jsx';
import { toast } from 'react-hot-toast';

const Navbar = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const dropdownRef = useRef(null);
  const mobileProfileRef = useRef(null);

  const navigate = useNavigate();

  const {
    axios,
    user,
    setUser,
    setShowUserLogin,
    setSearchQuery,
    searchQuery,
    getCartCount
  } = useAppContext();

  const logout = async () => {
    try {
      const { data } = await axios.get('/api/user/logout');
      if (data.success) {
        toast.success(data.message);
        setUser(null);
        setDropdownOpen(false);
        setMobileProfileOpen(false);
        navigate("/");
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
    }
  }, [searchQuery, navigate]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setDropdownOpen(false);
      }
      if (
        mobileProfileRef.current &&
        !mobileProfileRef.current.contains(e.target)
      ) {
        setMobileProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNavigate = (path) => {
    setDropdownOpen(false);
    setMobileProfileOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* TOP NAVBAR */}
      <nav className="z-50 fixed top-0 left-0 w-full flex items-center justify-between px-4 md:px-8 lg:px-16 py-4 border-b border-gray-300 bg-white/80 backdrop-blur-md">
        {/* Logo */}
        <NavLink to="/">
          <img className="h-9" src={assets.logo} alt="Logo" />
        </NavLink>

        {/* Search Bar */}
        <div className="flex-1 mx-4 flex items-center text-sm gap-2 border border-gray-300 px-3 rounded-full max-w-xl">
          <input
            onChange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
            className="py-1.5 w-full bg-transparent outline-none placeholder-gray-500"
            type="text"
            placeholder="Search products"
          />
          <img src={assets.search_icon} alt="search" className='w-4 h-4' />
        </div>

        {/* RIGHT SIDE - Desktop */}
        <div className="hidden lg:flex items-center gap-8">
          <NavLink to='/' className={({ isActive }) => isActive ? 'text-primary font-semibold' : ''}>
            Home
          </NavLink>
          <NavLink to='/products' className={({ isActive }) => isActive ? 'text-primary font-semibold' : ''}>
            Products
          </NavLink>
          <NavLink to='/contact' className={({ isActive }) => isActive ? 'text-primary font-semibold' : ''}>
            Contact
          </NavLink>

          <div onClick={() => navigate("/cart")} className="relative cursor-pointer">
            <img src={assets.nav_cart_icon} alt="cart" className='w-6 opacity-80' />
            <button className="absolute -top-2 -right-3 text-xs text-white bg-primary w-[18px] h-[18px] rounded-full">
              {getCartCount()}
            </button>
          </div>

          {!user ? (
            <button
              onClick={() => setShowUserLogin(true)}
              className="cursor-pointer px-6 py-2 bg-primary hover:bg-primary-dull transition text-white rounded-full"
            >
              Login
            </button>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2">
                <img src={assets.profile_icon} alt="user" className="w-8 h-8" />
              </button>

              {dropdownOpen && (
                <ul className="absolute top-12 right-0 bg-white shadow-md border border-gray-200 py-2.5 z-50 rounded-md w-[220px] text-sm">
                  <li className="p-2 px-4 font-semibold text-gray-900 border-b border-gray-100">
                    Hello, {user.name}
                  </li>
                  <li className="px-4 pb-2 text-xs text-gray-500 border-b border-gray-100">
                    {user.email}
                  </li>
                  <li>
                    <button
                      onClick={() => handleNavigate("/my-orders")}
                      className="w-full text-left p-2 px-4 hover:bg-primary/10"
                    >
                      My Orders
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={logout}
                      className="w-full text-left p-2 px-4 hover:bg-primary/10"
                    >
                      Logout
                    </button>
                  </li>
                </ul>
              )}
            </div>
          )}
        </div>

        {/* RIGHT SIDE - Mobile */}
        <div className="lg:hidden">
          {!user && (
            <button
              onClick={() => setShowUserLogin(true)}
              className="cursor-pointer px-4 py-2 bg-primary hover:bg-primary-dull transition text-white rounded-full text-sm"
            >
              Login
            </button>
          )}
        </div>
      </nav>

      {/* MOBILE BOTTOM NAVBAR */}
      <div className="
        sm:hidden
        fixed
        bottom-3
        left-1/2
        -translate-x-1/2
        w-[95%]
        max-w-md
        rounded-2xl
        px-3 py-2
        flex justify-between items-center
        bg-white/30
        backdrop-blur-md
        border border-white/40
        z-50
        shadow-xl
      ">
        <button
          onClick={() => handleNavigate('/')}
          className="flex flex-col items-center text-xs text-gray-700 hover:text-primary"
        >
          <img src={assets.home_icon || assets.menu_icon} alt="home" className="w-6 h-6 mb-1" />
          <span>Home</span>
        </button>

        <button
          onClick={() => handleNavigate('/products')}
          className="flex flex-col items-center text-xs text-gray-700 hover:text-primary"
        >
          <img src={assets.box_icon || assets.products_icon || assets.nav_cart_icon} alt="products" className="w-6 h-6 mb-1" />
          <span>Products</span>
        </button>

        <button
          onClick={() => handleNavigate('/cart')}
          className="relative flex flex-col items-center text-xs text-gray-700 hover:text-primary"
        >
          <img src={assets.nav_cart_icon} alt="cart" className="w-6 h-6 mb-1" />
          <span>Cart</span>
          <span className="absolute -top-1 -right-2 text-[10px] bg-primary text-white rounded-full w-[18px] h-[18px] flex items-center justify-center">
            {getCartCount()}
          </span>
        </button>

        <button
          onClick={() => handleNavigate('/contact')}
          className="flex flex-col items-center text-xs text-gray-700 hover:text-primary"
        >
          <img src={assets.call_icon || assets.contact_icon || assets.menu_icon} alt="contact" className="w-6 h-6 mb-1" />
          <span>Contact</span>
        </button>

        {user && (
          <div className="relative" ref={mobileProfileRef}>
            <button
              onClick={() => setMobileProfileOpen(!mobileProfileOpen)}
              className="flex flex-col items-center text-xs text-gray-700 hover:text-primary"
            >
              <img src={assets.profile_icon} alt="profile" className="w-6 h-6 mb-1" />
              <span>Profile</span>
            </button>

            {mobileProfileOpen && (
              <ul className="absolute bottom-12 right-0 bg-white shadow-lg border border-gray-200 rounded-md w-52 text-sm z-50">
                <li className="p-2 px-4 font-semibold text-gray-900 border-b border-gray-100">
                  Hello, {user.name}
                </li>
                <li className="px-4 pb-2 text-xs text-gray-500 border-b border-gray-100">
                  {user.email}
                </li>
                <li>
                  <button
                    onClick={() => handleNavigate("/my-orders")}
                    className="w-full text-left p-2 px-4 hover:bg-primary/10"
                  >
                    My Orders
                  </button>
                </li>
                <li>
                  <button
                    onClick={logout}
                    className="w-full text-left p-2 px-4 hover:bg-primary/10"
                  >
                    Logout
                  </button>
                </li>
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Navbar;
