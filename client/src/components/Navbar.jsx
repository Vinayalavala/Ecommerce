import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import assets from '../assets/assets';
import { useAppContext } from '../context/appContext.jsx';
import { toast } from 'react-hot-toast';

const Navbar = () => {
    const [open, setOpen] = React.useState(false);
    const { axios, user, setUser, setShowUserLogin, navigate, setSearchQuery, searchQuery, getCartCount } = useAppContext();

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

    return (
        <nav className="z-50 fixed top-0 left-0 w-full flex items-center justify-between px-6 md:px-16 lg:px-24 xl:px-32 py-4 border-b border-gray-300 bg-white transition-all">
            {/* Logo */}
            <NavLink to="/" onClick={() => setOpen(false)}>
                <img className="h-9" src={assets.logo} alt="Logo" />
            </NavLink>

            {/* Desktop Menu */}
            <div className="hidden sm:flex items-center gap-8">
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
                    <button className="absolute -top-2 -right-3 text-xs text-white bg-primary w-[18px] h-[18px] rounded-full">{getCartCount()}</button>
                </div>

                {/* User */}
                {!user ? (
                    <button
                        onClick={() => setShowUserLogin(true)}
                        className="cursor-pointer px-8 py-2 bg-primary hover:bg-primary-dull transition text-white rounded-full"
                    >
                        Login
                    </button>
                ) : (
                    <div className='relative group flex items-center gap-2'>
                        <img src={assets.profile_icon} alt="user" className='w-10' />
                        <span className="text-sm font-medium">{user.name}</span>
                        <ul className='hidden group-hover:block absolute top-12 right-0 bg-white shadow-md border border-gray-200 py-2.5 z-50 rounded-md w-[150px] text-sm'>
                            <li onClick={() => navigate("my-orders")} className='p-1.5 pl-3 hover:bg-primary/10 cursor-pointer'>My Orders</li>
                            <li onClick={logout} className='p-1.5 pl-3 hover:bg-primary/10 cursor-pointer'>Logout</li>
                        </ul>
                    </div>
                )}
            </div>

            {/* Mobile Menu Button */}
            <div className='flex items-center gap-6 sm:hidden'>
                <div onClick={() => navigate("/cart")} className="relative cursor-pointer">
                    <img src={assets.nav_cart_icon} alt="cart" className='w-6 opacity-80' />
                    <button className="absolute -top-2 -right-3 text-xs text-white bg-primary w-[18px] h-[18px] rounded-full">{getCartCount()}</button>
                </div>

                <button onClick={() => setOpen(!open)} aria-label="Menu">
                    <img src={assets.menu_icon} alt="menu" />
                </button>
            </div>

            {/* Mobile Dropdown Menu */}
            {open && (
                <div className="z-40 absolute top-[70px] left-0 w-full bg-white shadow-md py-4 flex flex-col items-start gap-3 px-5 text-sm md:hidden">
                    {user && (
                        <div className="flex items-center gap-2 mb-2">
                            <img src={assets.profile_icon} alt="user" className='w-8' />
                            <span className="font-medium">Hello, {user.name}</span>
                        </div>
                    )}
                    <NavLink to='/' onClick={() => setOpen(false)}>Home</NavLink>
                    <NavLink to='/products' onClick={() => setOpen(false)}>All Products</NavLink>
                    {user && <NavLink to='/orders' onClick={() => setOpen(false)}>My Orders</NavLink>}
                    <NavLink to='/contact' onClick={() => setOpen(false)}>Contact</NavLink>

                    {!user ? (
                        <button
                            onClick={() => {
                                setOpen(false);
                                setShowUserLogin(true);
                            }}
                            className="cursor-pointer px-6 py-2 mt-2 bg-primary hover:bg-primary-dull transition text-white rounded-full text-sm"
                        >
                            Login
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                setOpen(false);
                                logout();
                            }}
                            className="cursor-pointer px-6 py-2 mt-2 bg-primary hover:bg-primary-dull transition text-white rounded-full text-sm"
                        >
                            Logout
                        </button>
                    )}
                </div>
            )}
        </nav>
    );
};

export default Navbar;
