import { useEffect } from 'react';
import { useLocation, Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/appContext';
import assets from '../../assets/assets';
import { toast } from 'react-hot-toast';
import {
  FiShoppingBag,
  FiPlusSquare,
  FiList,
  FiBarChart2,
  FiImage,
  FiLogOut,
  FiExternalLink,
} from 'react-icons/fi';

// One consistent icon set; `short` is the label used in the mobile tab bar
const sidebarLinks = [
  { name: 'Orders', short: 'Orders', path: '/seller/orders', icon: FiShoppingBag },
  { name: 'Add Product', short: 'Add', path: '/seller/add-product', icon: FiPlusSquare },
  { name: 'Product List', short: 'Products', path: '/seller/product-list', icon: FiList },
  { name: 'Analytics', short: 'Analytics', path: '/seller/analytics', icon: FiBarChart2 },
  { name: 'Ads', short: 'Ads', path: '/seller/AddAd', icon: FiImage },
];

const SellerLayout = () => {
  const { axios } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const logout = async () => {
    try {
      const { data } = await axios.get('/api/seller/logout');
      if (data.success) {
        localStorage.removeItem('sellerToken'); // Clear token from localStorage
        toast.success(data.message);
        navigate('/');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center">
            <img src={assets.logo} alt="Store logo" className="h-8 w-auto object-contain" />
          </Link>
          <span className="hidden h-5 w-px bg-gray-200 sm:block" />
          <span className="hidden text-sm font-medium text-gray-500 sm:block">Seller panel</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/"
            className="hidden h-9 items-center gap-1.5 rounded-md px-3 text-sm text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 sm:flex"
          >
            <FiExternalLink size={15} /> View store
          </Link>

          <div className="flex items-center gap-2 px-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
              A
            </span>
            <span className="hidden text-sm font-medium text-gray-700 md:block">Admin</span>
          </div>

          <button
            onClick={logout}
            title="Log out"
            className="flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <FiLogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Desktop / tablet sidebar: icons only on tablet, labels from md up */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-16 shrink-0 flex-col border-r border-gray-200 bg-white p-2 sm:flex md:w-60 md:p-3">
          <p className="mb-2 hidden px-3 pt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 md:block">
            Manage
          </p>
          <nav className="flex flex-col gap-1">
            {sidebarLinks.map(({ name, path, icon: Icon }) => (
              <NavLink
                key={name}
                to={path}
                title={name}
                className={({ isActive }) =>
                  `group relative flex h-10 items-center justify-center gap-3 rounded-lg text-sm font-medium transition md:justify-start md:px-3 ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute -left-2 top-2 hidden h-6 w-1 rounded-r bg-primary md:-left-3 md:block" />
                    )}
                    <Icon size={18} className="shrink-0" />
                    <span className="hidden md:block">{name}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main content; bottom padding keeps content clear of the mobile tab bar */}
        <main className="min-w-0 flex-1 pb-16 sm:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-5">
          {sidebarLinks.map(({ name, short, path, icon: Icon }) => (
            <NavLink
              key={name}
              to={path}
              aria-label={name}
              className={({ isActive }) =>
                `relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${
                  isActive ? 'text-primary' : 'text-gray-500 active:bg-gray-50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute inset-x-4 top-0 h-0.5 rounded-b bg-primary" />}
                  <Icon size={20} />
                  <span>{short}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default SellerLayout;
