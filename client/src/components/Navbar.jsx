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
  } = useAppContext();

  const logout = async () => {
    try {
      const { data } = await axios.get('/api/user/logout');
      if (data.success) {
        localStorage.removeItem('authToken');
        toast.success(data.message);
        setUser(null);
        setDropdownOpen(false);
        setMobileProfileOpen(false);
        navigate('/');
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
  }, [searchQuery, navigate]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* TOP NAVBAR */}
      <nav className="z-50 fixed top-0 left-0 w-full flex items-center justify-between px-3 md:px-8 lg:px-15 py-4 border-b border-gray-300 bg-white/80 backdrop-blur-md">
        {/* Logo */}
        <NavLink to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img className="h-8" src={assets.logo} alt="Logo" />
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
          <img src={assets.search_icon} alt="search" className="w-4 h-4" />
        </div>

        {/* RIGHT SIDE - Desktop */}
        <div className="hidden lg:flex items-center gap-8">
          <NavLink
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={({ isActive }) =>
              isActive ? 'text-primary font-semibold' : ''
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/products"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={({ isActive }) =>
              isActive ? 'text-primary font-semibold' : ''
            }
          >
            Products
          </NavLink>
          <NavLink
            to="/contact"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={({ isActive }) =>
              isActive ? 'text-primary font-semibold' : ''
            }
          >
            Contact
          </NavLink>

          {!user ? (
            <div className="flex flex-col gap-2 items-start">
              <button
                onClick={() => setShowUserLogin(true)}
                className="flex items-center justify-center h-6 px-4 py-1.5 bg-primary hover:bg-primary-dull transition text-white rounded-full text-sm border-2"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/seller')}
                className="flex items-center justify-center h-6 px-4 py-1.5 bg-primary hover:bg-primary-dull transition text-white rounded-full text-sm border-2"
              >
                Seller
              </button>
            </div>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2">
                <img src={assets.profile_icon} alt="user" className="w-8 h-8" />
              </button>

              {dropdownOpen && (
                <ul className="absolute top-12 right-0 bg-white shadow-md border border-gray-200 py-2.5 z-51 rounded-md w-[220px] text-sm">
                  <li className="p-2 px-4 font-semibold text-gray-900 border-b border-gray-100">
                    Hello, {user.name}
                  </li>
                  <li className="px-4 pb-2 text-xs text-gray-500 border-b border-gray-100">
                    {user.email}
                  </li>
                  <li>
                    <button
                      onClick={() => handleNavigate('/my-orders')}
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
        <div className="lg:hidden flex flex-col gap-2 items-start">
          {!user && (
            <>
              <button
                onClick={() => setShowUserLogin(true)}
                className="flex items-center justify-center h-6 px-4 py-0.8 bg-primary hover:bg-primary-dull transition text-white rounded-full text-sm border-2"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/seller')}
                className="flex items-center justify-center h-6 px-4 py-0.8 bg-primary hover:bg-primary-dull transition text-white rounded-full text-sm border-2"
              >
                Seller
              </button>
            </>
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
        border border-gray-300
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="w-6 h-6 mb-1 text-gray-600"
            fill="currentColor"
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73zM12 3.25L18.6 7 12 10.75 5.4 7 12 3.25zM5 8.9l6.5 3.7v7.2L5 16.1V8.9zm8.5 10.9v-7.2L20 8.9v7.2l-6.5 3.7z" />
          </svg>
          <span>Products</span>
        </button>

        <button
          onClick={() => handleNavigate('/contact')}
          className="flex flex-col items-center text-xs text-gray-700 hover:text-primary"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6 mb-1 text-gray-600"
          >
            <path d="M14.828 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9.172a2 2 0 0 0-.586-1.414l-5.172-5.172A2 2 0 0 0 14.828 3zM12 17a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm1-7h-4v5h2v-3h2V10z" />
          </svg>
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
              <ul className="absolute bottom-12 right-0 bg-white shadow-lg border border-gray-200 rounded-md w-52 text-sm z-51">
                <li className="p-2 px-4 font-semibold text-gray-900 border-b border-gray-100">
                  Hello, {user.name}
                </li>
                <li className="px-4 pb-2 text-xs text-gray-500 border-b border-gray-100">
                  {user.email}
                </li>
                <li>
                  <button
                    onClick={() => handleNavigate('/my-orders')}
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
