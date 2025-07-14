import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/appContext';
import { useNavigate } from 'react-router-dom';
import { FiLogOut, FiUser, FiHeart, FiMapPin, FiShare2, FiPackage } from 'react-icons/fi';
import assets from '../assets/assets';
import { toast } from 'react-hot-toast';
import { MdKeyboardArrowRight } from 'react-icons/md';

const Profile = () => {
  const { axios, user, setUser } = useAppContext();
  const [phone, setPhone] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const getPhoneNumber = async () => {
      if (!user) return;
      try {
        const { data } = await axios.get(`/api/address/get?userId=${user._id}`);
        if (data.success && data.addresses.length > 0) {
          setPhone(data.addresses[0].phone);
        }
      } catch (error) {
        console.error('Error fetching phone number:', error);
      }
    };
    getPhoneNumber();
  }, [user]);

  const logout = async () => {
    try {
      const { data } = await axios.get('/api/user/logout');
      if (data.success) {
        localStorage.removeItem('authToken');
        toast.success(data.message);
        setUser(null);
        navigate('/');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const listItems = [
    {
      label: 'Your Orders',
      icon: <FiPackage className="text-black w-5 h-5" />,
      action: () => navigate('/my-orders'),
    },
    {
      label: 'Your Wishlist',
      icon: <FiHeart className="text-black w-5 h-5" />,
      action: () => navigate('/wishlist'),
    },
    {
      label: 'Address Book',
      icon: <FiMapPin className="text-black w-5 h-5" />,
      action: () => navigate('/add-address'),
    },
    {
      label: 'Share the Application',
      icon: <FiShare2 className="text-black w-5 h-5" />,
      action: () => toast('Link copied to clipboard!'),
    },
    {
      label: 'Logout',
      icon: <FiLogOut className="text-black w-5 h-5" />,
      action: logout,
    },
  ];

  return (
    <div className="mt-30 pb-16 px-4 md:px-8">
      {/* Title */}
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Information</h2>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: Account block */}
        <div className="w-full md:w-1/3">
          <div className="p-4 bg-white border border-gray-200 rounded-lg shadow flex items-center gap-4">
            <img src={assets.profile_icon} alt="Profile" className="w-12 h-12" />
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Your Account</h2>
              <p className="text-gray-500 text-sm">{phone || 'No phone found'}</p>
            </div>
          </div>
        </div>

        {/* Right: List options */}
        <div className="flex-1 space-y-3">
          {listItems.map((item, idx) => (
            <div
              key={idx}
              onClick={item.action}
              className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 p-2 rounded-full">{item.icon}</div>
                <span className="text-gray-800">{item.label}</span>
              </div>
              <MdKeyboardArrowRight className="text-gray-400 w-5 h-5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;
