import { useAppContext } from '../../context/appContext';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  FiShoppingBag,
  FiBox,
  FiTruck,
  FiCreditCard,
} from 'react-icons/fi';
import { FaMotorcycle } from 'react-icons/fa';
import { MdLogin } from 'react-icons/md';

const SellerLogin = () => {
  const { isSeller, setIsSeller, navigate, axios } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmitHandler = async (event) => {
    event.preventDefault();

    try {
      const { data } = await axios.post('/api/seller/login', {
        email,
        password,
      });

      if (data.success && data.token) {
        localStorage.setItem('sellerToken', data.token);
        setIsSeller(true);
        toast.success(data.message);
        navigate('/seller');
      } else {
        toast.error(data.message || "Login failed");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    if (isSeller) {
      navigate('/seller');
    }
  }, [isSeller, navigate]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-50 overflow-hidden px-4">

      {/* ICON DECORATION BACKGROUND */}
      <div className="absolute inset-0 -z-10 grid grid-cols-3 gap-10 opacity-20 text-gray-300 pointer-events-none">
        <div className="flex flex-col items-center justify-around h-screen">
          <FiShoppingBag className="text-[80px]" />
          <FiBox className="text-[70px]" />
        </div>
        <div className="flex flex-col items-center justify-around h-screen">
          <FaMotorcycle className="text-[90px]" />
          <FiCreditCard className="text-[75px]" />
        </div>
        <div className="flex flex-col items-center justify-around h-screen">
          <FiTruck className="text-[85px]" />
          <FiShoppingBag className="text-[70px]" />
        </div>
      </div>

      {/* LOGIN CARD */}
      <form
        onSubmit={onSubmitHandler}
        className="w-full max-w-md bg-white shadow-xl rounded-xl border border-gray-200 p-8 space-y-6 backdrop-blur-md"
      >
        <div className="flex items-center gap-3 text-2xl font-semibold text-primary">
          <FiShoppingBag /> Seller Login
        </div>

        <p className="text-sm text-gray-500">
          Access your seller dashboard, manage products and track your orders.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              placeholder="seller@example.com"
              className="w-full border border-gray-300 px-4 py-2 rounded-md outline-primary focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              placeholder="••••••••"
              className="w-full border border-gray-300 px-4 py-2 rounded-md outline-primary focus:ring-2 focus:ring-primary"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-primary text-white py-2 rounded-md flex items-center justify-center gap-2 hover:bg-primary-dark transition"
        >
          <MdLogin size={20} />
          Login as Seller
        </button>
      </form>
    </div>
  );
};

export default SellerLogin;
