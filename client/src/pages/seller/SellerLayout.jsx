import { useAppContext } from '../../context/appContext';
import assets from '../../assets/assets';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const SellerLayout = () => {

  const { axios, navigate } = useAppContext();

  const sidebarLinks = [
    { name: "Add Product", path: "/seller", icon: assets.add_icon },
    { name: "Product List", path: "/seller/product-list", icon: assets.product_list_icon },
    { name: "Orders", path: "/seller/orders", icon: assets.order_icon },
  ];

  const logout = async () => {
    try {
      const { data } = await axios.get('/api/seller/logout');
      if (data.success) {
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
      {/* Top header bar */}
      <div className="flex items-center justify-between px-4 md:px-8 border-b border-gray-300 py-3 bg-white">
        <Link to='/'>
          <img src={assets.logo} alt="logo" className='cursor-pointer w-34 md:w-38' />
        </Link>
        <div className="flex items-center gap-5 text-gray-500">
          <p>Hi! Admin</p>
          <button
            onClick={logout}
            className='border rounded-full text-sm px-4 py-1'
          >
            Logout
          </button>
        </div>
      </div>

      <div className='flex'>

        {/* Desktop Sidebar */}
        <div className="hidden md:flex md:w-64 border-r h-[95vh] text-base border-gray-300 pt-4 flex-col">
          {sidebarLinks.map((item) => (
            <NavLink
              to={item.path}
              key={item.name}
              end={item.path === '/seller'}
              className={({ isActive }) =>
                `flex items-center py-3 px-4 gap-3 
                ${isActive
                  ? "border-r-4 md:border-r-[6px] bg-primary/10 border-primary text-primary"
                  : "hover:bg-gray-100/90 border-white"
                }`
              }
            >
              <img src={item.icon} alt="" className='w-7 h-7' />
              <p className="md:block hidden text-center">{item.name}</p>
            </NavLink>
          ))}
        </div>

        {/* Outlet for pages */}
        <Outlet />
      </div>

      {/* Mobile Floating Navbar */}
      <div
        className="
          md:hidden
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
          shadow-xl
          z-50
        "
      >
        {sidebarLinks.map((item) => (
          <NavLink
            to={item.path}
            key={item.name}
            end={item.path === '/seller'}
            className={({ isActive }) =>
              `flex flex-col items-center text-xs text-gray-700 hover:text-primary ${isActive ? 'text-primary' : ''}`
            }
          >
            <img
              src={item.icon}
              alt={item.name}
              className="w-6 h-6 mb-1"
            />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </div>
    </>
  );
};

export default SellerLayout;
