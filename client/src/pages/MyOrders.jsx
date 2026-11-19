import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/appContext.jsx';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FaStar,
  FaSearch,
  FaTimes,
  FaBoxOpen,
  FaClock,
  FaCog,
  FaTruck,
  FaCheckCircle,
  FaTimesCircle,
  FaChevronDown,
  FaRegCalendarAlt,
} from 'react-icons/fa';

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const CANCEL_WINDOW_MS = 5 * 60 * 1000;

const STATUS_STEPS = ['Order Placed', 'Processing', 'Shipped', 'Delivered'];

const STATUS_STYLES = {
  'Order Placed': { icon: FaClock, badge: 'bg-amber-50 text-amber-700 ring-amber-200' },
  Processing: { icon: FaCog, badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
  Shipped: { icon: FaTruck, badge: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  Delivered: { icon: FaCheckCircle, badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  Cancelled: { icon: FaTimesCircle, badge: 'bg-red-50 text-red-700 ring-red-200' },
};

const isSameDay = (d1, d2) =>
  d1.getDate() === d2.getDate() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getFullYear() === d2.getFullYear();

const getDateLabel = (dateString) => {
  const orderDate = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(orderDate, today)) return 'Today';
  if (isSameDay(orderDate, yesterday)) return 'Yesterday';

  return orderDate.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatCountdown = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const shortId = (id = '') => `#${String(id).slice(-8).toUpperCase()}`;

/* -------------------------------------------------------------------------- */
/*                              Small components                              */
/* -------------------------------------------------------------------------- */

const StatusBadge = ({ status }) => {
  const cfg = STATUS_STYLES[status] || {
    icon: FaClock,
    badge: 'bg-gray-50 text-gray-600 ring-gray-200',
  };
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cfg.badge}`}
    >
      <Icon className='text-[11px]' />
      {status || 'N/A'}
    </span>
  );
};

const ProgressTracker = ({ status }) => {
  if (status === 'Cancelled') return null;
  const current = Math.max(STATUS_STEPS.indexOf(status), 0);

  return (
    <div className='px-5 pt-4 pb-2'>
      <div className='flex items-center'>
        {STATUS_STEPS.map((step, i) => {
          const done = i <= current;
          return (
            <React.Fragment key={step}>
              <div className='flex flex-col items-center min-w-0'>
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                    done ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {done ? '✓' : i + 1}
                </div>
                <span
                  className={`mt-1.5 hidden text-[11px] sm:block ${
                    done ? 'font-medium text-gray-800' : 'text-gray-400'
                  }`}
                >
                  {step}
                </span>
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 rounded-full transition-colors sm:-mt-5 ${
                    i < current ? 'bg-primary' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

const StarRating = ({ value, canRate, onRate, onBlocked }) => {
  const [hover, setHover] = useState(0);
  const locked = Boolean(value);
  const shown = hover || value || 0;

  return (
    <div className='mt-2 flex items-center gap-1'>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type='button'
          disabled={locked}
          aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
          onMouseEnter={() => !locked && canRate && setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => (canRate ? onRate(n) : onBlocked())}
          className={`p-0.5 transition-transform ${
            locked ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          }`}
        >
          <FaStar
            className={`text-base transition-colors ${
              n <= shown ? 'text-amber-400' : 'text-gray-300'
            }`}
          />
        </button>
      ))}
      {locked ? (
        <span className='ml-2 text-xs text-gray-500'>You rated {value}/5</span>
      ) : (
        <span className='ml-2 text-xs text-gray-400'>
          {canRate ? 'Rate this product' : 'Available after delivery'}
        </span>
      )}
    </div>
  );
};

const OrderSkeleton = () => (
  <div className='mb-5 animate-pulse rounded-2xl border border-gray-200 bg-white p-5'>
    <div className='mb-5 flex justify-between'>
      <div className='h-4 w-32 rounded bg-gray-200' />
      <div className='h-6 w-24 rounded-full bg-gray-200' />
    </div>
    <div className='flex gap-4'>
      <div className='h-20 w-20 rounded-xl bg-gray-200' />
      <div className='flex-1 space-y-3'>
        <div className='h-4 w-1/2 rounded bg-gray-200' />
        <div className='h-3 w-1/3 rounded bg-gray-200' />
        <div className='h-3 w-1/4 rounded bg-gray-200' />
      </div>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */

const MyOrders = () => {
  const [myOrders, setMyOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortOption, setSortOption] = useState('date_desc');
  const [ratings, setRatings] = useState({});
  const [remainingTimes, setRemainingTimes] = useState({});
  const [loading, setLoading] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [collapsed, setCollapsed] = useState({});

  const { currency, axios, user } = useAppContext();
  const navigate = useNavigate();

  /* ------------------------------- Data fetch ------------------------------ */

  const fetchMyOrders = async () => {
    if (!user || !user._id) {
      toast.error('User ID is not available.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/order/user?userId=${user._id}`);
      setMyOrders(data.orders || []);
    } catch (error) {
      toast.error('Failed to fetch orders.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (!user || !user._id) return;
    try {
      const res = await axios.get(`/api/review?userId=${user._id}`);
      const fetchedRatings = {};
      res.data.forEach((review) => {
        fetchedRatings[`${review.orderId}_${review.productId}`] = review.rating;
      });
      setRatings(fetchedRatings);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  useEffect(() => {
    if (user?._id) {
      fetchMyOrders();
      fetchReviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* ------------------------- Cancel countdown timer ------------------------ */

  useEffect(() => {
    const hasCancellable = myOrders.some((o) => o.status === 'Order Placed');
    if (!hasCancellable) {
      setRemainingTimes({});
      return;
    }

    const tick = () => {
      const now = Date.now();
      const times = {};
      myOrders.forEach((order) => {
        if (order.status !== 'Order Placed') return;
        const diff = CANCEL_WINDOW_MS - (now - new Date(order.createdAt).getTime());
        if (diff > 0) times[order._id] = Math.floor(diff / 1000);
      });
      setRemainingTimes(times);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [myOrders]);

  /* -------------------------------- Actions -------------------------------- */

  const handleRatingChange = async (productId, orderId, ratingValue) => {
    try {
      await axios.post('/api/review', {
        userId: user._id,
        productId,
        orderId: String(orderId),
        rating: Number(ratingValue),
      });
      toast.success('Review submitted!');
      setRatings((prev) => ({ ...prev, [`${orderId}_${productId}`]: ratingValue }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      const { data } = await axios.put(`/api/order/cancel/${orderId}`);
      if (data.success) {
        toast.success('Order cancelled.');
        setConfirmCancelId(null);
        fetchMyOrders();
      } else {
        toast.error(data.message || 'Failed to cancel.');
      }
    } catch {
      toast.error('Error cancelling order.');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setSortOption('date_desc');
  };

  /* --------------------------- Filter, group, sort -------------------------- */

  const filteredOrders = useMemo(() => {
    let updated = [...myOrders];

    if (statusFilter !== 'All') {
      updated = updated.filter((order) => order.status === statusFilter);
    }
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      updated = updated.filter((order) =>
        (order.items || []).some((item) => item.product?.name?.toLowerCase().includes(q))
      );
    }

    updated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return updated;
  }, [myOrders, search, statusFilter]);

  const groupedArray = useMemo(() => {
    const grouped = filteredOrders.reduce((acc, order) => {
      const label = getDateLabel(order.createdAt);
      if (!acc[label]) acc[label] = [];
      acc[label].push(order);
      return acc;
    }, {});

    const arr = Object.entries(grouped).map(([label, orders]) => ({
      label,
      orders,
      count: orders.length,
      latestDate: orders.map((o) => new Date(o.createdAt)).sort((a, b) => b - a)[0],
      totalAmount: orders
        .filter((o) => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + o.amount, 0),
    }));

    if (sortOption === 'date_desc') arr.sort((a, b) => b.latestDate - a.latestDate);
    if (sortOption === 'date_asc') arr.sort((a, b) => a.latestDate - b.latestDate);
    if (sortOption === 'count_desc') arr.sort((a, b) => b.count - a.count);
    if (sortOption === 'count_asc') arr.sort((a, b) => a.count - b.count);
    return arr;
  }, [filteredOrders, sortOption]);

  const filtersActive = search.trim() !== '' || statusFilter !== 'All' || sortOption !== 'date_desc';

  /* --------------------------------- Render -------------------------------- */

  return (
    <div className='mt-30 mx-auto max-w-5xl px-4 pb-20'>
      {/* Header */}
      <div className='mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-2xl font-semibold uppercase tracking-wide'>
            My <span className='text-primary'>Orders</span>
          </p>
          <div className='mt-1 h-0.5 w-16 rounded-full bg-primary' />
        </div>
        {!loading && (
          <p className='text-sm text-gray-500'>
            {filteredOrders.length} order{filteredOrders.length !== 1 && 's'}
            {filtersActive && ` of ${myOrders.length}`}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className='sticky top-16 z-10 -mx-4 mb-8 bg-white/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/70'>
        <div className='flex flex-col gap-3 md:flex-row'>
          <div className='relative flex-1'>
            <FaSearch className='pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400' />
            <input
              type='text'
              placeholder='Search by product name...'
              className='w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type='button'
                aria-label='Clear search'
                onClick={() => setSearch('')}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
              >
                <FaTimes className='text-sm' />
              </button>
            )}
          </div>

          <select
            className='rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 md:w-48'
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value='All'>All Statuses</option>
            <option value='Order Placed'>Order Placed</option>
            <option value='Processing'>Processing</option>
            <option value='Shipped'>Shipped</option>
            <option value='Delivered'>Delivered</option>
            <option value='Cancelled'>Cancelled</option>
          </select>

          <select
            className='rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 md:w-52'
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value='date_desc'>Newest Date First</option>
            <option value='date_asc'>Oldest Date First</option>
            <option value='count_desc'>Most Orders Per Day</option>
            <option value='count_asc'>Fewest Orders Per Day</option>
          </select>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div>
          <OrderSkeleton />
          <OrderSkeleton />
          <OrderSkeleton />
        </div>
      )}

      {/* Empty state */}
      {!loading && groupedArray.length === 0 && (
        <div className='flex flex-col items-center rounded-2xl border border-dashed border-gray-300 py-16 text-center'>
          <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-2xl text-gray-400'>
            <FaBoxOpen />
          </div>
          <p className='text-base font-semibold text-gray-800'>
            {myOrders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
          </p>
          <p className='mt-1 max-w-xs text-sm text-gray-500'>
            {myOrders.length === 0
              ? 'When you place an order, it will show up here.'
              : 'Try a different search term or clear your filters.'}
          </p>
          {myOrders.length === 0 ? (
            <button
              onClick={() => navigate('/products')}
              className='mt-5 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition hover:opacity-90'
            >
              Start shopping
            </button>
          ) : (
            filtersActive && (
              <button
                onClick={clearFilters}
                className='mt-5 rounded-lg border border-primary px-5 py-2 text-sm font-medium text-primary transition hover:bg-primary/5'
              >
                Clear filters
              </button>
            )
          )}
        </div>
      )}

      {/* Order groups */}
      {!loading &&
        groupedArray.map((group) => (
          <section key={group.label} className='mb-10'>
            <div className='mb-4 flex flex-wrap items-center gap-x-3 gap-y-1'>
              <FaRegCalendarAlt className='text-gray-400' />
              <h3 className='text-base font-semibold text-gray-800'>{group.label}</h3>
              <span className='rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600'>
                {group.count} order{group.count > 1 ? 's' : ''}
              </span>
              <span className='ml-auto rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary'>
                Total: {currency} {group.totalAmount.toFixed(2)}
              </span>
            </div>

            {group.orders.map((order) => {
              const isOpen = !collapsed[order._id];
              const secondsLeft = remainingTimes[order._id];
              const canCancel = order.status === 'Order Placed' && secondsLeft > 0;
              const isDelivered = order.status === 'Delivered';

              return (
                <article
                  key={order._id}
                  className='mb-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md'
                >
                  {/* Order header */}
                  <header className='flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/60 px-5 py-3.5'>
                    <div className='flex flex-wrap items-center gap-x-6 gap-y-2 text-xs'>
                      <div>
                        <p className='text-gray-400'>Order ID</p>
                        <p className='font-semibold text-gray-800' title={order._id}>
                          {shortId(order._id)}
                        </p>
                      </div>
                      <div>
                        <p className='text-gray-400'>Placed on</p>
                        <p className='font-medium text-gray-700'>
                          {new Date(order.createdAt).toLocaleString(undefined, {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div>
                        <p className='text-gray-400'>Payment</p>
                        <p className='font-medium text-gray-700'>{order.paymentType || 'N/A'}</p>
                      </div>
                      <div>
                        <p className='text-gray-400'>Total</p>
                        <p className='font-semibold text-gray-900'>
                          {currency} {order.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className='flex items-center gap-3'>
                      <StatusBadge status={order.status} />
                      <button
                        type='button'
                        aria-label={isOpen ? 'Collapse order' : 'Expand order'}
                        onClick={() => setCollapsed((p) => ({ ...p, [order._id]: isOpen }))}
                        className='rounded-full p-1.5 text-gray-500 transition hover:bg-gray-200'
                      >
                        <FaChevronDown
                          className={`text-xs transition-transform duration-200 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </header>

                  {isOpen && (
                    <>
                      <ProgressTracker status={order.status} />

                      {/* Items */}
                      <div className='divide-y divide-gray-100 px-5'>
                        {(order.items || []).map((item, idx) => {
                          const productId = item.product?._id;
                          const reviewKey = `${order._id}_${productId}`;
                          const rating = ratings[reviewKey];
                          const lineTotal = (item.product?.offerPrice || 0) * item.quantity;

                          return (
                            <div
                              key={idx}
                              className='grid grid-cols-[auto_1fr_auto] items-start gap-4 py-5'
                            >
                              <button
                                type='button'
                                className='group relative flex flex-col items-center'
                                onClick={() =>
                                  productId
                                    ? navigate(`/product/${productId}`)
                                    : toast.error('Product not found.')
                                }
                              >
                                <img
                                  src={item.product?.image?.[0] || 'https://via.placeholder.com/80'}
                                  alt={item.product?.name || 'Product'}
                                  className='h-16 w-16 rounded-xl border border-gray-100 object-cover transition-transform duration-200 group-hover:scale-105 sm:h-20 sm:w-20'
                                />
                                <span className='mt-1 text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100'>
                                  View details
                                </span>
                              </button>

                              <div className='min-w-0 space-y-1 text-sm'>
                                <h2 className='truncate font-semibold text-gray-900'>
                                  {item.product?.name || 'Unnamed Product'}
                                </h2>
                                <div className='flex flex-wrap items-center gap-2 text-xs text-gray-500'>
                                  <span className='rounded-md bg-gray-100 px-2 py-0.5'>
                                    {item.product?.category || 'N/A'}
                                  </span>
                                  <span>Qty: {item.quantity}</span>
                                </div>

                                <StarRating
                                  value={rating}
                                  canRate={isDelivered}
                                  onRate={(n) => handleRatingChange(productId, order._id, n)}
                                  onBlocked={() =>
                                    toast.error('You can only review after delivery.')
                                  }
                                />
                              </div>

                              <p className='text-sm font-semibold text-primary sm:text-base'>
                                {currency} {lineTotal.toFixed(2)}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Cancel footer */}
                      {order.status === 'Order Placed' && (
                        <footer className='flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-red-50/40 px-5 py-3'>
                          {canCancel ? (
                            <>
                              <p className='flex items-center gap-2 text-xs font-medium text-red-600'>
                                <FaClock />
                                You can cancel for another{' '}
                                <span className='tabular-nums'>{formatCountdown(secondsLeft)}</span>
                              </p>

                              {confirmCancelId === order._id ? (
                                <div className='flex items-center gap-2'>
                                  <span className='text-xs text-gray-600'>Cancel this order?</span>
                                  <button
                                    className='rounded-lg bg-red-500 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-red-600'
                                    onClick={() => handleCancelOrder(order._id)}
                                  >
                                    Yes, cancel
                                  </button>
                                  <button
                                    className='rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50'
                                    onClick={() => setConfirmCancelId(null)}
                                  >
                                    Keep order
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className='rounded-lg border border-red-300 bg-white px-4 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-500 hover:text-white'
                                  onClick={() => setConfirmCancelId(order._id)}
                                >
                                  Cancel Order
                                </button>
                              )}
                            </>
                          ) : (
                            <p className='text-xs text-gray-500'>Cancellation window has expired.</p>
                          )}
                        </footer>
                      )}
                    </>
                  )}
                </article>
              );
            })}
          </section>
        ))}
    </div>
  );
};

export default MyOrders;
