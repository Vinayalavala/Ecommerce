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
  FaTruck,
  FaCheck,
  FaCopy,
  FaChevronRight,
  FaReceipt,
} from 'react-icons/fa';

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const CANCEL_WINDOW_MS = 5 * 60 * 1000;

const FILTERS = ['All', 'Order Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const STEPS = ['Order Placed', 'Processing', 'Shipped', 'Delivered'];

// Title / subtitle / tone for every status (Zepto-style plain-language states)
const STATUS_META = {
  'Order Placed': {
    title: 'Order placed',
    sub: "We've received your order",
    tone: 'active',
    icon: FaClock,
  },
  Processing: {
    title: 'Packing your order',
    sub: 'Your items are being packed',
    tone: 'active',
    icon: FaBoxOpen,
  },
  Shipped: {
    title: 'On the way',
    sub: 'Your order is out for delivery',
    tone: 'active',
    icon: FaTruck,
  },
  Delivered: {
    title: 'Order delivered',
    sub: 'Hope you loved it!',
    tone: 'success',
    icon: FaCheck,
  },
  Cancelled: {
    title: 'Order cancelled',
    sub: 'This order was cancelled',
    tone: 'danger',
    icon: FaTimes,
  },
};

const TONES = {
  active: { dot: 'bg-primary text-white', banner: 'bg-primary/10 text-primary' },
  success: { dot: 'bg-emerald-500 text-white', banner: 'bg-emerald-50 text-emerald-700' },
  danger: { dot: 'bg-red-500 text-white', banner: 'bg-red-50 text-red-600' },
};

const getMeta = (status) =>
  STATUS_META[status] || {
    title: status || 'Order',
    sub: '',
    tone: 'active',
    icon: FaClock,
  };

const formatDateTime = (d) =>
  new Date(d).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

const formatCountdown = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const itemsSummary = (items = []) => {
  const names = items.map((i) => i.product?.name || 'Item');
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
};

/* -------------------------------------------------------------------------- */
/*                              Small components                              */
/* -------------------------------------------------------------------------- */

const StatusDot = ({ status, size = 'h-9 w-9' }) => {
  const meta = getMeta(status);
  const Icon = meta.icon;
  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-full text-sm ${
        TONES[meta.tone].dot
      }`}
    >
      <Icon />
    </span>
  );
};

const Thumbs = ({ items = [] }) => {
  const visible = items.slice(0, 4);
  const extra = items.length - visible.length;
  return (
    <div className='flex items-center gap-2'>
      {visible.map((item, i) => (
        <div
          key={i}
          className='h-12 w-12 overflow-hidden rounded-xl border border-gray-100 bg-gray-50'
        >
          <img
            src={item.product?.image?.[0] || 'https://via.placeholder.com/64'}
            alt={item.product?.name || 'Product'}
            className='h-full w-full object-cover'
          />
        </div>
      ))}
      {extra > 0 && (
        <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-xs font-semibold text-gray-500'>
          +{extra}
        </div>
      )}
    </div>
  );
};

const StarRating = ({ value, canRate, onRate, onBlocked }) => {
  const [hover, setHover] = useState(0);
  const locked = Boolean(value);
  const shown = hover || value || 0;

  return (
    <div className='mt-1.5 flex items-center gap-0.5'>
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
            className={`text-sm transition-colors ${
              n <= shown ? 'text-amber-400' : 'text-gray-300'
            }`}
          />
        </button>
      ))}
      <span className='ml-1.5 text-[11px] text-gray-400'>
        {locked ? `You rated ${value}/5` : canRate ? 'Rate item' : 'Rate after delivery'}
      </span>
    </div>
  );
};

const Skeleton = () => (
  <div className='mb-3 animate-pulse rounded-2xl bg-white p-4 shadow-sm'>
    <div className='flex items-center gap-3'>
      <div className='h-9 w-9 rounded-full bg-gray-200' />
      <div className='flex-1 space-y-2'>
        <div className='h-3.5 w-1/3 rounded bg-gray-200' />
        <div className='h-3 w-1/2 rounded bg-gray-200' />
      </div>
      <div className='h-4 w-14 rounded bg-gray-200' />
    </div>
    <div className='mt-4 flex gap-2'>
      {[0, 1, 2].map((i) => (
        <div key={i} className='h-12 w-12 rounded-xl bg-gray-200' />
      ))}
    </div>
  </div>
);

const ProgressSteps = ({ status }) => {
  if (status === 'Cancelled') return null;
  const current = Math.max(STEPS.indexOf(status), 0);
  return (
    <div className='flex items-start px-1 pt-1'>
      {STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <React.Fragment key={step}>
            <div className='flex w-14 flex-col items-center text-center'>
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                  done ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'
                }`}
              >
                {done ? <FaCheck /> : i + 1}
              </span>
              <span
                className={`mt-1 text-[10px] leading-tight ${
                  done ? 'font-semibold text-gray-800' : 'text-gray-400'
                }`}
              >
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className={`mt-2.5 h-0.5 flex-1 rounded-full ${
                  i < current ? 'bg-primary' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */

const MyOrders = () => {
  const [myOrders, setMyOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [ratings, setRatings] = useState({});
  const [remainingTimes, setRemainingTimes] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

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
      const fetched = {};
      res.data.forEach((review) => {
        fetched[`${review.orderId}_${review.productId}`] = review.rating;
      });
      setRatings(fetched);
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
    if (!myOrders.some((o) => o.status === 'Order Placed')) {
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

  /* --------------------------- Details sheet helpers ----------------------- */

  const selectedOrder = useMemo(
    () => myOrders.find((o) => o._id === selectedId) || null,
    [myOrders, selectedId]
  );

  const closeSheet = () => {
    setSelectedId(null);
    setConfirmCancel(false);
  };

  useEffect(() => {
    if (!selectedOrder) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && closeSheet();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [selectedOrder]);

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
        setConfirmCancel(false);
        fetchMyOrders();
      } else {
        toast.error(data.message || 'Failed to cancel.');
      }
    } catch {
      toast.error('Error cancelling order.');
    }
  };

  const copyOrderId = async (id) => {
    try {
      await navigator.clipboard.writeText(String(id));
      toast.success('Order ID copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  /* -------------------------------- Filtering ------------------------------ */

  const filteredOrders = useMemo(() => {
    let updated = [...myOrders];
    if (statusFilter !== 'All') {
      updated = updated.filter((o) => o.status === statusFilter);
    }
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      updated = updated.filter((o) =>
        (o.items || []).some((i) => i.product?.name?.toLowerCase().includes(q))
      );
    }
    updated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return updated;
  }, [myOrders, search, statusFilter]);

  const filtersActive = search.trim() !== '' || statusFilter !== 'All';

  /* ------------------------------ Bill details ----------------------------- */

  const bill = useMemo(() => {
    if (!selectedOrder) return null;
    const itemsTotal = (selectedOrder.items || []).reduce(
      (sum, i) => sum + (i.product?.offerPrice || 0) * i.quantity,
      0
    );
    const diff = Number((selectedOrder.amount - itemsTotal).toFixed(2));
    return { itemsTotal, diff };
  }, [selectedOrder]);

  /* --------------------------------- Render -------------------------------- */

  return (
    <div className='mt-30 mx-auto min-h-[60vh] max-w-2xl px-4 pb-20'>
      {/* Header */}
      <div className='mb-5'>
        <h1 className='text-xl font-bold text-gray-900'>My Orders</h1>
        {!loading && myOrders.length > 0 && (
          <p className='text-xs text-gray-500'>
            {myOrders.length} order{myOrders.length !== 1 && 's'} in total
          </p>
        )}
      </div>

      {/* Search */}
      <div className='relative mb-3'>
        <FaSearch className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400' />
        <input
          type='text'
          placeholder='Search your orders by product'
          className='w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-10 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type='button'
            aria-label='Clear search'
            onClick={() => setSearch('')}
            className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
          >
            <FaTimes className='text-sm' />
          </button>
        )}
      </div>

      {/* Status chips */}
      <div className='-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
        {FILTERS.map((f) => (
          <button
            key={f}
            type='button'
            onClick={() => setStatusFilter(f)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
              statusFilter === f
                ? 'border-primary bg-primary text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <>
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </>
      )}

      {/* Empty */}
      {!loading && filteredOrders.length === 0 && (
        <div className='flex flex-col items-center rounded-3xl bg-white py-16 text-center shadow-sm'>
          <div className='mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-3xl text-primary'>
            <FaBoxOpen />
          </div>
          <p className='text-base font-bold text-gray-900'>
            {myOrders.length === 0 ? 'No orders yet' : 'No orders found'}
          </p>
          <p className='mt-1 max-w-xs text-sm text-gray-500'>
            {myOrders.length === 0
              ? 'Your orders will show up here once you place one.'
              : 'Try a different search or filter.'}
          </p>
          {myOrders.length === 0 ? (
            <button
              onClick={() => navigate('/products')}
              className='mt-5 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90'
            >
              Start shopping
            </button>
          ) : (
            filtersActive && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('All');
                }}
                className='mt-5 rounded-xl border border-primary px-6 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5'
              >
                Clear filters
              </button>
            )
          )}
        </div>
      )}

      {/* Order list */}
      {!loading &&
        filteredOrders.map((order) => {
          const meta = getMeta(order.status);
          const secondsLeft = remainingTimes[order._id];
          const canCancel = order.status === 'Order Placed' && secondsLeft > 0;

          return (
            <button
              key={order._id}
              type='button'
              onClick={() => setSelectedId(order._id)}
              className='mb-3 block w-full rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:shadow-md active:scale-[0.99]'
            >
              <div className='flex items-start gap-3'>
                <StatusDot status={order.status} />
                <div className='min-w-0 flex-1'>
                  <p className='text-sm font-bold text-gray-900'>{meta.title}</p>
                  <p className='text-xs text-gray-500'>
                    Placed at {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <div className='text-right'>
                  <p className='text-sm font-bold text-gray-900'>
                    {currency} {order.amount.toFixed(2)}
                  </p>
                  <p className='text-[11px] text-gray-400'>{order.paymentType || 'N/A'}</p>
                </div>
              </div>

              <div className='mt-4 flex items-center justify-between gap-3'>
                <Thumbs items={order.items} />
                <FaChevronRight className='shrink-0 text-xs text-gray-300' />
              </div>

              <div className='mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-gray-200 pt-3'>
                <p className='min-w-0 truncate text-xs text-gray-500'>
                  {itemsSummary(order.items)}
                </p>
                {canCancel ? (
                  <span className='flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600'>
                    <FaClock className='text-[10px]' />
                    Cancel in <span className='tabular-nums'>{formatCountdown(secondsLeft)}</span>
                  </span>
                ) : (
                  <span className='text-xs font-semibold text-primary'>View details</span>
                )}
              </div>
            </button>
          );
        })}

      {/* ------------------------- Order details sheet ------------------------ */}
      {selectedOrder && bill && (
        <div className='fixed inset-0 z-50 flex items-end justify-center sm:items-center'>
          <div className='absolute inset-0 bg-black/50' onClick={closeSheet} />

          <div className='relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-gray-50 shadow-2xl sm:max-w-lg sm:rounded-3xl'>
            {/* Sheet header */}
            <div className='flex items-center justify-between bg-white px-5 py-4 shadow-sm'>
              <div>
                <p className='text-base font-bold text-gray-900'>Order summary</p>
                <p className='text-xs text-gray-500'>
                  {(selectedOrder.items || []).length} item
                  {(selectedOrder.items || []).length !== 1 && 's'} ·{' '}
                  {formatDateTime(selectedOrder.createdAt)}
                </p>
              </div>
              <button
                type='button'
                aria-label='Close'
                onClick={closeSheet}
                className='rounded-full bg-gray-100 p-2.5 text-gray-600 transition hover:bg-gray-200'
              >
                <FaTimes className='text-sm' />
              </button>
            </div>

            <div className='flex-1 space-y-3 overflow-y-auto p-4'>
              {/* Status banner */}
              {(() => {
                const meta = getMeta(selectedOrder.status);
                return (
                  <div className={`rounded-2xl p-4 ${TONES[meta.tone].banner}`}>
                    <div className='flex items-center gap-3'>
                      <StatusDot status={selectedOrder.status} />
                      <div>
                        <p className='text-sm font-bold'>{meta.title}</p>
                        <p className='text-xs opacity-80'>{meta.sub}</p>
                      </div>
                    </div>
                    {selectedOrder.status !== 'Cancelled' && (
                      <div className='mt-4 rounded-xl bg-white/70 p-3 text-gray-700'>
                        <ProgressSteps status={selectedOrder.status} />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Items */}
              <div className='rounded-2xl bg-white p-4 shadow-sm'>
                <p className='mb-1 text-sm font-bold text-gray-900'>Items in this order</p>
                <div className='divide-y divide-gray-100'>
                  {(selectedOrder.items || []).map((item, idx) => {
                    const productId = item.product?._id;
                    const rating = ratings[`${selectedOrder._id}_${productId}`];
                    const unit = item.product?.offerPrice || 0;

                    return (
                      <div key={idx} className='flex gap-3 py-3'>
                        <button
                          type='button'
                          onClick={() =>
                            productId
                              ? navigate(`/product/${productId}`)
                              : toast.error('Product not found.')
                          }
                          className='h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50'
                        >
                          <img
                            src={item.product?.image?.[0] || 'https://via.placeholder.com/64'}
                            alt={item.product?.name || 'Product'}
                            className='h-full w-full object-cover'
                          />
                        </button>

                        <div className='min-w-0 flex-1'>
                          <p className='truncate text-sm font-semibold text-gray-900'>
                            {item.product?.name || 'Unnamed Product'}
                          </p>
                          <p className='text-xs text-gray-500'>
                            {item.product?.category || 'N/A'} · {item.quantity} × {currency}{' '}
                            {unit.toFixed(2)}
                          </p>
                          <StarRating
                            value={rating}
                            canRate={selectedOrder.status === 'Delivered'}
                            onRate={(n) => handleRatingChange(productId, selectedOrder._id, n)}
                            onBlocked={() => toast.error('You can only review after delivery.')}
                          />
                        </div>

                        <p className='text-sm font-bold text-gray-900'>
                          {currency} {(unit * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bill details */}
              <div className='rounded-2xl bg-white p-4 shadow-sm'>
                <p className='mb-3 flex items-center gap-2 text-sm font-bold text-gray-900'>
                  <FaReceipt className='text-gray-400' /> Bill details
                </p>
                <div className='space-y-2 text-sm text-gray-600'>
                  <div className='flex justify-between'>
                    <span>Item total</span>
                    <span>
                      {currency} {bill.itemsTotal.toFixed(2)}
                    </span>
                  </div>
                  {Math.abs(bill.diff) >= 0.01 && (
                    <div className='flex justify-between'>
                      <span>{bill.diff > 0 ? 'Taxes & other charges' : 'Discount'}</span>
                      <span className={bill.diff < 0 ? 'text-emerald-600' : ''}>
                        {bill.diff < 0 ? '-' : ''}
                        {currency} {Math.abs(bill.diff).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className='flex justify-between border-t border-dashed border-gray-200 pt-3 text-base font-bold text-gray-900'>
                    <span>Bill total</span>
                    <span>
                      {currency} {selectedOrder.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order details */}
              <div className='rounded-2xl bg-white p-4 shadow-sm'>
                <p className='mb-3 text-sm font-bold text-gray-900'>Order details</p>
                <div className='space-y-3 text-xs'>
                  <div>
                    <p className='text-gray-400'>Order ID</p>
                    <div className='mt-0.5 flex items-center gap-2'>
                      <p className='break-all font-medium text-gray-800'>{selectedOrder._id}</p>
                      <button
                        type='button'
                        aria-label='Copy order ID'
                        onClick={() => copyOrderId(selectedOrder._id)}
                        className='shrink-0 rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-primary'
                      >
                        <FaCopy />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className='text-gray-400'>Payment</p>
                    <p className='mt-0.5 font-medium text-gray-800'>
                      {selectedOrder.paymentType || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className='text-gray-400'>Order placed</p>
                    <p className='mt-0.5 font-medium text-gray-800'>
                      {new Date(selectedOrder.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cancel footer */}
            {selectedOrder.status === 'Order Placed' && (
              <div className='border-t border-gray-200 bg-white px-5 py-4'>
                {remainingTimes[selectedOrder._id] > 0 ? (
                  confirmCancel ? (
                    <div className='flex items-center gap-2'>
                      <p className='flex-1 text-xs text-gray-600'>Cancel this order?</p>
                      <button
                        className='rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50'
                        onClick={() => setConfirmCancel(false)}
                      >
                        Keep order
                      </button>
                      <button
                        className='rounded-xl bg-red-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-red-600'
                        onClick={() => handleCancelOrder(selectedOrder._id)}
                      >
                        Yes, cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className='flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50'
                      onClick={() => setConfirmCancel(true)}
                    >
                      Cancel order
                      <span className='rounded-full bg-red-100 px-2 py-0.5 text-[11px] tabular-nums'>
                        {formatCountdown(remainingTimes[selectedOrder._id])}
                      </span>
                    </button>
                  )
                ) : (
                  <p className='text-center text-xs text-gray-500'>
                    Cancellation window has expired.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrders;
