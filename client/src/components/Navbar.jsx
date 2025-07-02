import React, { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import assets from '../assets/assets';
import { useAppContext } from '../context/appContext.jsx';
import { toast } from 'react-hot-toast';

const Navbar = () => {
    const [open, setOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const {
        axios,
        user,
        setUser,
        setShowUserLogin,
        navigate,
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
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <nav className="z-50 fixed top-0 left-0 w-full flex items-center justify-between px-6 md:px-16 lg:px-24 xl:px-32 py-4 border-b border-gray-300 bg-white transition-all">
            {/* Logo */}
            <NavLink to="/" onClick={() => setOpen(false)}>
                <img className="h-15" src={assets.logo} alt="Logo" />
            </NavLink>

            {/* Desktop Menu */}
            <div className="hidden sm:flex whitespace-nowrap items-center gap-8">
                <NavLink to='/'>Home</NavLink>
                <NavLink to='/products'>All Products</NavLink>
                <NavLink to='/contact'>Contact</NavLink>

                {/* Search */}
                <div className="hidden lg:flex items-center text-sm gap-2 border border-gray-300 px-3 rounded-full">
                    <input
                        onChange={(e) => setSearchQuery(e.target.value)}
                        value={searchQuery}
                        className="py-1.5 w-full bg-transparent outline-none placeholder-gray-500"
                        type="text"
                        placeholder="Search products"
                    />
                    <img src={assets.search_icon} alt="search" className='w-4 h-4' />
                </div>

                {/* Cart */}
                <div onClick={() => navigate("/cart")} className="relative cursor-pointer">
                    <img src={assets.nav_cart_icon} alt="cart" className='w-6 opacity-80' />
                    <button className="absolute -top-2 -right-3 text-xs text-white bg-primary w-[18px] h-[18px] rounded-full">
                        {getCartCount()}
                    </button>
                </div>

                {/* Show seller dashboard and login when user not logged in */}
                {!user ? (
                    <>
                        <button
                            onClick={() => navigate('/seller')}
                            className="w-20 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-full bg-transparent hover:bg-gray-100 active:scale-95 transition"
                        >
                            Seller
                        </button>
                        <button
                            onClick={() => setShowUserLogin(true)}
                            className="cursor-pointer px-8 py-2 bg-primary hover:bg-primary-dull transition text-white rounded-full"
                        >
                            Login
                        </button>
                    </>
                ) : (
                    <div className="relative" ref={dropdownRef}>
                        <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2">
                            <img src={assets.profile_icon} alt="user" className="w-10" />
                            <div className="text-left text-sm">
                                <div className="font-semibold">Hello, {user.name}</div>
                                <div className="text-gray-500 text-xs">{user.email}</div>
                            </div>
                        </button>

                        {dropdownOpen && (
                            <ul className="absolute top-14 right-0 bg-white shadow-md border border-gray-200 py-2.5 z-50 rounded-md w-[180px] text-sm">
                                <li
                                    onClick={() => {
                                        setDropdownOpen(false);
                                        navigate("/my-orders");
                                    }}
                                    className="p-2 px-4 hover:bg-primary/10 cursor-pointer"
                                >
                                    My Orders
                                </li>
                                <li
                                    onClick={() => {
                                        setDropdownOpen(false);
                                        logout();
                                    }}
                                    className="p-2 px-4 hover:bg-primary/10 cursor-pointer"
                                >
                                    Logout
                                </li>
                            </ul>
                        )}
                    </div>
                )}
            </div>

            {/* Mobile Controls */}
            <div className='flex items-center gap-6 sm:hidden'>
                {/* Seller Dashboard Button */}
                {!user && (
                    <button
                        onClick={() => navigate('/seller')}
                        className="w-40  py-1 text-sm text-gray-600 border border-gray-300 rounded-full bg-transparent hover:bg-gray-100 active:scale-95 transition"
                    >
                        Seller
                    </button>
                )}

                {/* Cart Icon */}
                <div onClick={() => navigate("/cart")} className="relative cursor-pointer">
                    <img src={assets.nav_cart_icon} alt="cart" className='w-6 opacity-80' />
                    <button className="absolute -top-2 -right-3 text-xs text-white bg-primary w-[18px] h-[18px] rounded-full">
                        {getCartCount()}
                    </button>
                </div>

                <button onClick={() => setOpen(!open)} aria-label="Menu">
                    <img src={assets.menu_icon} alt="menu" />
                </button>
            </div>

            {/* Mobile Menu Dropdown */}
            {open && (
                <div className="z-40 absolute top-[70px] left-0 w-full bg-white shadow-md py-4 flex flex-col items-start gap-2 px-5 text-sm md:hidden">
                    <NavLink to='/' onClick={() => setOpen(false)}>Home</NavLink>
                    <NavLink to='/products' onClick={() => setOpen(false)}>All Products</NavLink>
                    <NavLink to='/contact' onClick={() => setOpen(false)}>Contact</NavLink>

                    {/* If user is logged in, show their info */}
                    {user && (
                        <>
                            <div className="w-full border-t border-gray-200 pt-3">
                                <div className="text-sm font-medium">Hello, {user.name}</div>
                                <div className="text-xs text-gray-500">{user.email}</div>
                            </div>
                            <NavLink to='/my-orders' onClick={() => setOpen(false)}>My Orders</NavLink>
                            <button
                                onClick={() => {
                                    setOpen(false);
                                    logout();
                                }}
                                className="cursor-pointer px-6 py-2 mt-2 bg-primary hover:bg-primary-dull transition text-white rounded-full text-sm"
                            >
                                Logout
                            </button>
                        </>
                    )}

                    {!user && (
                        <button
                            onClick={() => {
                                setOpen(false);
                                setShowUserLogin(true);
                            }}
                            className="cursor-pointer px-6 py-2 mt-2 bg-primary hover:bg-primary-dull transition text-white rounded-full text-sm"
                        >
                            Login
                        </button>
                    )}
                </div>
            )}
        </nav>
    );
};

export default Navbar;
