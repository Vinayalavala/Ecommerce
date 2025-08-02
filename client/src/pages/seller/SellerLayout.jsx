import { useEffect } from 'react';
import { useLocation, Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/appContext';
import assets from '../../assets/assets';
import { toast } from 'react-hot-toast';
import { FiBarChart2 } from "react-icons/fi";

const SellerLayout = () => {
  const { axios } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const sidebarLinks = [
    { name: "Add Product", path: "/seller", icon: assets.add_icon },
    { name: "Product List", path: "/seller/product-list", icon: assets.product_list_icon },
    { name: "Orders", path: "/seller/orders", icon: assets.order_icon },
    { name: "Analytics", path: "/seller/analytics", icon: FiBarChart2 },
  ];

  const logout = async () => {
    try {
      const { data } = await axios.get('/api/seller/logout');
      if (data.success) {
        localStorage.removeItem("sellerToken"); // ✅ Clear token from localStorage
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
    <>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 md:px-8 border-b border-gray-300 py-3 bg-white">
        <Link to='/'>
          <img src={assets.logo} alt="logo" className='cursor-pointer w-15 md:w-15' />
        </Link>
        <div className="flex items-center gap-5 text-gray-500">
          <p>Hi! Admin</p>
          <button
            onClick={() => navigate('/seller/analytics')}
            className='border rounded-full text-sm px-4 py-1 hover:bg-gray-100'
          >
            Analytics
          </button>
          <button
            onClick={logout}
            className='border rounded-full text-sm px-4 py-1'
          >
            Logout
          </button>
        </div>
      </div>

      {/* Layout Body */}
      <div className='flex'>
        {/* Mobile Bottom Sidebar */}
        <div className="
          fixed bottom-3 left-1/2 transform -translate-x-1/2
          sm:hidden
          w-[95%] max-w-md
          rounded-2xl
          px-3 py-2
          flex justify-around items-center
          bg-white/30
          backdrop-blur-md
          border border-gray-300
          z-50
          shadow-xl
        ">
          {sidebarLinks.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/seller'}
              className={({ isActive }) =>
                `flex flex-col items-center text-xs ${
                  isActive
                    ? "text-primary"
                    : "text-gray-700 hover:text-primary"
                }`
              }
            >
              {({ isActive }) =>
                <>
                  {typeof item.icon === "string" ? (
                    <img
                      src={item.icon}
                      alt={item.name}
                      className='w-6 h-6 mb-1'
                    />
                  ) : (
                    <item.icon
                      size={24}
                      className={`mb-1 ${isActive ? "text-primary" : "text-gray-700"}`}
                    />
                  )}
                  <span>{item.name}</span>
                </>
              }
            </NavLink>
          ))}
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden sm:flex md:w-64 w-16 border-r h-[95vh] text-base border-gray-300 pt-4 flex-col">
          {sidebarLinks.map((item) => (
            <NavLink
              to={item.path}
              key={item.name}
              end={item.path === '/seller'}
              className={({ isActive }) =>
                `flex items-center py-3 px-4 gap-3 ${
                  isActive
                    ? "border-r-4 md:border-r-[6px] bg-primary/10 border-primary text-primary"
                    : "hover:bg-gray-100/90 border-white text-gray-700"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {typeof item.icon === "string" ? (
                    <img
                      src={item.icon}
                      alt={item.name}
                      className='w-7 h-7'
                    />
                  ) : (
                    <item.icon
                      size={28}
                      className={`${isActive ? "text-primary" : "text-gray-700"}`}
                    />
                  )}
                  <p className="md:block hidden text-center">{item.name}</p>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </>
  );
};

export default SellerLayout;
