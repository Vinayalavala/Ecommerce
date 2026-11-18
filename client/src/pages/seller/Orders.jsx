import { useAppContext } from '../../context/appContext';
import { useState, useEffect, useMemo } from 'react';
import assets from '../../assets/assets';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  FaStar,
  FaSearch,
  FaTimes,
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaRegClock,
  FaCreditCard,
  FaBoxOpen,
  FaRupeeSign,
  FaCheckCircle,
  FaHourglassHalf,
  FaShoppingBag,
} from 'react-icons/fa';

const STATUS_STYLES = {
  'Order Placed': 'bg-blue-50 text-blue-700 ring-blue-200',
  Processing: 'bg-amber-50 text-amber-700 ring-amber-200',
  Shipped: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  Delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const STATUS_STEPS = ['Order Placed', 'Processing', 'Shipped', 'Delivered'];

const Orders = () => {
  const { currency, axios } = useAppContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [ratings, setRatings] = useState({});
  const navigate = useNavigate();

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get('/api/order/seller', {
        withCredentials: true,
      });
      if (data.success) {
        setOrders(data.orders || []);
      } else {
        toast.error(data.message || 'Failed to fetch orders.');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Unauthorized. Please log in.');
        navigate('/seller');
      } else {
        toast.error(error?.message || 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build ratings map whenever orders change.
  // map key: `${orderId}_${productId}`
  useEffect(() => {
    const map = {};
    if (!orders || orders.length === 0) {
      setRatings({});
      return;
    }

    for (const order of orders) {
      const orderId = order._id;
      if (Array.isArray(order.reviews)) {
        for (const r of order.reviews) {
          if (r && r.productId) {
            map[`${orderId}_${String(r.productId)}`] = Number(r.rating || r.score || 0);
          }
        }
      }

      for (const item of order.items || []) {
        const productId =
          item?.product?._id ||
          item?.productId ||
          (typeof item?.product === 'string' ? item.product : undefined);

        if (Array.isArray(item.reviews) && item.reviews.length > 0) {
          const matched =
            item.reviews.find((rv) => {
              if (!rv) return false;
              const ored = rv.orderId || rv.order || rv.order_id;
              return ored ? String(ored) === String(orderId) : false;
            }) || item.reviews[0];

          if (matched && productId) {
            map[`${orderId}_${String(productId)}`] = Number(matched.rating || matched.score || 0);
          }
        }

        if (item.product && Array.isArray(item.product.reviews) && item.product.reviews.length > 0) {
          const matchedProdReview =
            item.product.reviews.find((rv) => {
              if (!rv) return false;
              const ored = rv.orderId || rv.order || rv.order_id;
              return ored ? String(ored) === String(orderId) : false;
            }) || item.product.reviews[0];

          if (matchedProdReview && productId) {
            const key = `${orderId}_${String(productId)}`;
            if (!map[key]) {
              map[key] = Number(matchedProdReview.rating || matchedProdReview.score || 0);
            }
          }
        }
      }
    }

    setRatings(map);
  }, [orders]);

  const markOrderAsPaid = async (orderId) => {
    try {
      const { data } = await axios.patch(`/api/order/${orderId}/mark-paid`);
      if (data.success) {
        toast.success('Order marked as paid.');
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, isPaid: true, status: 'Delivered' } : o))
        );

        // Also update status to Delivered - note: if this fails, UI already changed.
        await axios.put(`/api/order/${orderId}/status`, { status: 'Delivered' });
      } else {
        toast.error(data.message || 'Failed to mark order as paid.');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Failed to update order.');
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const { data } = await axios.put(`/api/order/${orderId}/status`, { status: newStatus });
      if (data.success) {
        toast.success('Order status updated.');
        setOrders((prev) =>
          prev.map((o) =>
            o._id === orderId
              ? {
                  ...o,
                  status: newStatus,
                  isPaid:
                    newStatus === 'Delivered'
                      ? true
                      : newStatus === 'Cancelled'
                      ? false
                      : o.isPaid,
                }
              : o
          )
        );

        if (newStatus === 'Delivered') {
          await axios.patch(`/api/order/${orderId}/mark-paid`);
        }
      } else {
        toast.error(data.message || 'Failed to update order status.');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Failed to update order status.');
    }
  };

  // Group safely (guard for missing createdAt)
  const groupedOrders = orders.reduce((acc, order) => {
    const created = order.createdAt ? new Date(order.createdAt) : new Date();
    const dateStr = created.toDateString();
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(order);
    return acc;
  }, {});

  const formatHeading = (dateStr) => {
    const now = new Date();
    const inputDate = new Date(dateStr);
    const isToday = now.toDateString() === inputDate.toDateString();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = yesterday.toDateString() === inputDate.toDateString();
    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return inputDate.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const allCategories = Array.from(
    new Set(
      orders
        .flatMap((order) =>
          (order.items || []).map((item) => item.product?.category || item.category || 'Unknown')
        )
        .filter(Boolean)
    )
  );

  const filterOrder = (order) => {
    const search = searchTerm.toLowerCase();
    const fullName = `${order.address?.firstName || ''} ${order.address?.lastName || ''}`.toLowerCase();
    const createdIso = order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : '';

    const matchesText =
      String(order._id || '').toLowerCase().includes(search) ||
      String(order.orderId || order.orderNumber || '').toLowerCase().includes(search) ||
      fullName.includes(search) ||
      createdIso.includes(search);

    const matchesPayment =
      paymentFilter === 'all' ||
      (paymentFilter === 'paid' && order.isPaid) ||
      (paymentFilter === 'pending' && !order.isPaid);

    const categoriesInOrder = (order.items || []).map(
      (item) => item.product?.category || item.category || 'Unknown'
    );
    const matchesCategory = categoryFilter === 'all' || categoriesInOrder.includes(categoryFilter);

    return matchesText && matchesPayment && matchesCategory;
  };

  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status !== 'Cancelled');
    return {
      total: orders.length,
      revenue: active.filter((o) => o.isPaid).reduce((s, o) => s + (Number(o.amount) || 0), 0),
      pending: active.filter((o) => !o.isPaid).length,
      delivered: orders.filter((o) => o.status === 'Delivered').length,
    };
  }, [orders]);

  const hasActiveFilters = searchTerm || paymentFilter !== 'all' || categoryFilter !== 'all';
  const visibleGroups = Object.keys(groupedOrders)
    .sort((a, b) => new Date(b) - new Date(a))
    .map((dateKey) => ({ dateKey, items: groupedOrders[dateKey].filter(filterOrder) }))
    .filter((g) => g.items.length > 0);

  if (loading) {
    return (
      <div className="flex-1 h-[95vh] overflow-y-auto">
        <div className="md:p-10 p-4 space-y-6 max-w-6xl">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-6">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
          <FaBoxOpen className="text-3xl text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">No orders yet</h2>
        <p className="text-gray-500 mt-1 max-w-sm">
          When customers place orders, they will show up here for you to manage.
        </p>
      </div>
    );
  }

  return (
    <div className="no-scrollbar flex-1 h-[95vh] overflow-y-scroll bg-gray-50/60">
      <div className="md:p-10 p-4 space-y-8 max-w-6xl">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Orders</h2>
          <p className="text-sm text-gray-500 mt-1">Track, filter and update every order in one place.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<FaShoppingBag />}
            label="Total orders"
            value={stats.total}
            tone="bg-blue-50 text-blue-600"
          />
          <StatCard
            icon={<FaRupeeSign />}
            label="Paid revenue"
            value={`${currency}${stats.revenue.toFixed(2)}`}
            tone="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            icon={<FaHourglassHalf />}
            label="Pending payment"
            value={stats.pending}
            tone="bg-amber-50 text-amber-600"
          />
          <StatCard
            icon={<FaCheckCircle />}
            label="Delivered"
            value={stats.delivered}
            tone="bg-indigo-50 text-indigo-600"
          />
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          <div className="relative w-full sm:w-80">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by customer, order ID, date..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
          </div>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          >
            <option value="all">All Categories</option>
            {allCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchTerm('');
                setPaymentFilter('all');
                setCategoryFilter('all');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition"
            >
              <FaTimes className="text-xs" /> Clear
            </button>
          )}
        </div>

        {/* Orders grouped by date */}
        {visibleGroups.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl py-14 text-center">
            <p className="font-medium text-gray-700">No orders match your filters</p>
            <p className="text-sm text-gray-500 mt-1">Try a different search or clear the filters.</p>
          </div>
        ) : (
          visibleGroups.map(({ dateKey, items }) => (
            <section key={dateKey} className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-gray-800">{formatHeading(dateKey)}</h3>
                <span className="text-xs font-medium text-gray-500 bg-gray-200/70 px-2 py-0.5 rounded-full">
                  {items.length} order{items.length > 1 ? 's' : ''}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="space-y-4">
                {items.map((order) => (
                  <OrderCard
                    key={order._id}
                    order={order}
                    currency={currency}
                    onMarkAsPaid={markOrderAsPaid}
                    onUpdateStatus={updateOrderStatus}
                    ratings={ratings}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, tone }) => (
  <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${tone}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900 truncate">{value}</p>
    </div>
  </div>
);

const OrderCard = ({ order, currency, onMarkAsPaid, onUpdateStatus, ratings }) => {
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [localIsPaid, setLocalIsPaid] = useState(Boolean(order.isPaid));
  const [localStatus, setLocalStatus] = useState(order.status || 'Order Placed');

  useEffect(() => {
    setLocalIsPaid(Boolean(order.isPaid));
    setLocalStatus(order.status || 'Order Placed');
  }, [order.isPaid, order.status]);

  const handleTogglePaid = async () => {
    if (localIsPaid || isUpdating || localStatus === 'Cancelled') return;
    setIsUpdating(true);
    await onMarkAsPaid(order._id);
    setLocalIsPaid(true);
    if (localStatus !== 'Delivered') {
      setLocalStatus('Delivered');
    }
    setIsUpdating(false);
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;

    if (localStatus === 'Delivered' || localStatus === 'Cancelled') {
      toast.error("Status cannot be changed after it's Delivered or Cancelled.");
      return;
    }

    setLocalStatus(newStatus);
    setIsUpdating(true);

    await onUpdateStatus(order._id, newStatus);

    if (newStatus === 'Delivered') {
      setLocalIsPaid(true);
    } else if (newStatus === 'Cancelled') {
      setLocalIsPaid(false);
    }

    setIsUpdating(false);
  };

  const timeStr = order.createdAt
    ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  const locked = localStatus === 'Delivered' || localStatus === 'Cancelled';
  const stepIndex = STATUS_STEPS.indexOf(localStatus);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/70">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-gray-500">Order</span>
          <span className="font-mono text-xs text-gray-700 bg-white border border-gray-200 rounded-md px-2 py-1 break-all">
            {order.orderId || order.orderNumber || order._id}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-gray-500">
            <FaRegClock /> {timeStr}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset ${
              localIsPaid
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : 'bg-amber-50 text-amber-700 ring-amber-200'
            }`}
          >
            {localIsPaid ? 'Paid' : 'Payment pending'}
          </span>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset ${
              STATUS_STYLES[localStatus] || 'bg-gray-50 text-gray-700 ring-gray-200'
            }`}
          >
            {localStatus}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5">
        {/* Items */}
        <div className="lg:col-span-5 space-y-3">
          {(order.items || []).map((item, idx) => {
            const productId =
              item.product?._id ||
              item.productId ||
              (typeof item.product === 'string' ? item.product : undefined);
            const imageSrc = item.product?.image?.[0] || assets.box_icon;
            const productName = item.product?.name || item.name || 'Unnamed Product';
            const key = `${order._id}_${String(productId || idx)}`;
            const existingRating = Number(ratings?.[key] || 0);

            return (
              <div
                key={item._id || productId || idx}
                className="flex items-center gap-3 p-2 -m-2 rounded-xl hover:bg-gray-50 transition"
              >
                <img
                  src={imageSrc}
                  alt={productName}
                  title="View details"
                  className="w-16 h-16 object-cover rounded-xl border border-gray-200 cursor-pointer hover:scale-105 hover:shadow-md transition duration-300 shrink-0"
                  onClick={() => {
                    if (productId) {
                      const category = item.product?.category || item.category;
                      if (category) {
                        navigate(`/products/${category}/${productId}`);
                      } else {
                        navigate(`/products/${productId}`);
                      }
                    } else {
                      toast.error('No product ID found.');
                    }
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-800 break-words leading-snug">{productName}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Qty <span className="text-primary font-semibold">{item.quantity}</span>
                  </p>
                  <div className="flex items-center mt-1 gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FaStar
                        key={star}
                        size={13}
                        color={star <= existingRating ? '#facc15' : '#e5e7eb'}
                        className="cursor-default"
                      />
                    ))}
                    {existingRating === 0 && (
                      <span className="text-[11px] text-gray-400 ml-1.5">No review</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Customer */}
        <div className="lg:col-span-4">
          <OrderAddress address={order.address} />
        </div>

        {/* Amount + payment */}
        <div className="lg:col-span-3 flex flex-col gap-3 lg:items-end lg:text-right">
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-2xl font-semibold text-gray-900">
              {currency}
              {typeof order.amount === 'number' ? order.amount.toFixed(2) : '0.00'}
            </p>
          </div>
          <p className="inline-flex items-center gap-1.5 text-sm text-gray-500">
            <FaCreditCard className="text-gray-400" /> {order.paymentType || 'N/A'}
          </p>
        </div>
      </div>

      {/* Progress */}
      {localStatus !== 'Cancelled' && (
        <div className="px-5 pb-4">
          <div className="flex items-center">
            {STATUS_STEPS.map((step, i) => {
              const done = i <= stepIndex;
              return (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full border-2 transition ${
                        done ? 'bg-primary border-primary' : 'bg-white border-gray-300'
                      }`}
                    />
                    <span
                      className={`hidden sm:block text-[11px] mt-1 ${
                        done ? 'text-gray-700 font-medium' : 'text-gray-400'
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-1 sm:-mt-4 rounded ${
                        i < stepIndex ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 border-t border-gray-100 bg-gray-50/70">
        <label
          className={`inline-flex items-center gap-3 ${
            localIsPaid || localStatus === 'Cancelled' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
          }`}
        >
          <span className="relative">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={localIsPaid}
              onChange={handleTogglePaid}
              disabled={localIsPaid || isUpdating || localStatus === 'Cancelled'}
            />
            <span className="block w-11 h-6 rounded-full bg-gray-300 peer-checked:bg-emerald-500 peer-focus-visible:ring-4 peer-focus-visible:ring-emerald-200 transition-colors" />
            <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 peer-checked:translate-x-5" />
          </span>
          <span className="text-sm text-gray-700">{localIsPaid ? 'Paid' : 'Mark as paid'}</span>
        </label>

        <div className="flex items-center gap-3">
          {isUpdating && (
            <span className="inline-flex items-center gap-2 text-xs text-blue-600">
              <span className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Updating...
            </span>
          )}
          <label className="text-sm text-gray-600" htmlFor={`status-${order._id}`}>
            Status
          </label>
          <select
            id={`status-${order._id}`}
            value={localStatus}
            onChange={handleStatusChange}
            disabled={isUpdating || locked}
            className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed transition"
          >
            <option value="Order Placed">Order Placed</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>
    </div>
  );
};

const OrderAddress = ({ address }) => {
  if (!address) return null;
  const fullName = `${address.firstName || ''} ${address.lastName || ''}`.trim();
  return (
    <div className="space-y-1.5 text-sm text-gray-600">
      <p className="font-semibold text-gray-900">{fullName || 'Customer'}</p>
      <p className="flex items-start gap-2">
        <FaMapMarkerAlt className="mt-1 text-gray-400 shrink-0" />
        <span>
          {[address.street, address.city].filter(Boolean).join(', ')}
          <br />
          {[address.state, address.zipcode, address.country].filter(Boolean).join(', ')}
        </span>
      </p>
      {address.phone && (
        <a
          href={`tel:${address.phone}`}
          className="flex items-center gap-2 text-primary hover:underline w-fit"
        >
          <FaPhoneAlt className="text-xs" /> {address.phone}
        </a>
      )}
      <p className="flex items-center gap-2 text-xs text-gray-500 break-all">
        <FaEnvelope className="text-gray-400 shrink-0" />
        {address.email || 'No email provided'}
      </p>
    </div>
  );
};

export default Orders;
