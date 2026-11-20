import { useAppContext } from '../../context/appContext';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  FiShoppingBag,
  FiBox,
  FiTruck,
  FiCreditCard,
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiLoader,
} from 'react-icons/fi';
import { FaMotorcycle } from 'react-icons/fa';
import { MdLogin } from 'react-icons/md';

const FEATURES = [
  { icon: FiBox, title: 'Manage products', text: 'Add, edit and stock your catalogue in seconds.' },
  { icon: FiTruck, title: 'Track orders', text: 'Follow every order from packing to doorstep.' },
  { icon: FaMotorcycle, title: 'Fast delivery', text: 'Keep customers happy with quick fulfilment.' },
  { icon: FiCreditCard, title: 'Secure payments', text: 'Transparent payouts and payment status.' },
];

const SellerLogin = () => {
  const { isSeller, setIsSeller, navigate, axios } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const { data } = await axios.post('/api/seller/login', {
        email,
        password,
      });

      if (data.success && data.token) {
        localStorage.setItem('sellerToken', data.token);
        setIsSeller(true);
        toast.success(data.message);
        navigate('/seller/orders');
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSeller) {
      navigate('/seller/orders');
    }
  }, [isSeller, navigate]);

  const inputBase =
    'w-full h-12 rounded-xl border border-gray-300 bg-white pl-11 text-base text-gray-900 ' +
    'placeholder:text-gray-400 outline-none transition ' +
    'focus:border-primary focus:ring-4 focus:ring-primary/15';

  return (
    <div className="min-h-screen min-h-[100dvh] grid lg:grid-cols-2 bg-gray-50">
      {/* ───────── BRAND PANEL (desktop only) ───────── */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-primary p-12 text-white">
        {/* decorative icons */}
        <FiShoppingBag className="pointer-events-none absolute -right-10 -top-10 text-[240px] text-white/10" />
        <FiTruck className="pointer-events-none absolute -bottom-12 -left-10 text-[260px] text-white/10" />

        <div className="relative flex items-center gap-3 text-2xl font-semibold">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <FiShoppingBag />
          </span>
          Alavala's Root and Craft
        </div>

        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-tight">
            Grow your business, one order at a time.
          </h2>
          <p className="mt-3 text-white/80">
            Everything you need to sell, ship and get paid — in one dashboard.
          </p>

          <ul className="mt-10 grid grid-cols-2 gap-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm ring-1 ring-white/10"
              >
                <Icon className="mb-2 text-2xl" />
                <p className="font-medium">{title}</p>
                <p className="mt-1 text-sm text-white/75">{text}</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/60">
          © {new Date().getFullYear()} Seller Hub. All rights reserved.
        </p>
      </aside>

      {/* ───────── FORM PANEL ───────── */}
      <main className="relative flex items-center justify-center overflow-hidden px-4 py-8 sm:px-8">
        {/* soft background icons (mobile / tablet) */}
        <div className="pointer-events-none absolute inset-0 -z-0 text-gray-200 lg:hidden" aria-hidden="true">
          <FiShoppingBag className="absolute -left-6 top-10 text-[110px] rotate-[-12deg]" />
          <FiBox className="absolute -right-4 top-1/4 text-[90px] rotate-12" />
          <FaMotorcycle className="absolute -left-4 bottom-1/4 text-[100px]" />
          <FiTruck className="absolute -right-6 bottom-8 text-[110px] rotate-[8deg]" />
        </div>

        <div className="relative z-10 w-full max-w-md">
          {/* compact brand header (mobile only) */}
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-2xl text-white shadow-lg shadow-primary/30">
              <FiShoppingBag />
            </span>
            <h1 className="text-2xl font-bold text-gray-900">Seller Hub</h1>
          </div>

          <form
            onSubmit={onSubmitHandler}
            className="space-y-6 rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-xl shadow-gray-200/60 backdrop-blur sm:p-8"
          >
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                Welcome back
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Sign in to manage products and track your orders.
              </p>
            </div>

            <div className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="seller-email" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <FiMail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-400" />
                  <input
                    id="seller-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    onChange={(e) => setEmail(e.target.value)}
                    value={email}
                    placeholder="seller@example.com"
                    className={`${inputBase} pr-4`}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="seller-password" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <FiLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-400" />
                  <input
                    id="seller-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    onChange={(e) => setPassword(e.target.value)}
                    value={password}
                    placeholder="••••••••"
                    className={`${inputBase} pr-12`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200"
                  >
                    {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-medium text-white shadow-md shadow-primary/30 transition hover:bg-primary-dark active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <FiLoader size={20} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <MdLogin size={20} />
                  Login as Seller
                </>
              
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400 lg:hidden">
            © {new Date().getFullYear()} Alavala's Root and Craft
          </p>
        </div>
      </main>
    </div>
  );
};

export default SellerLogin;
