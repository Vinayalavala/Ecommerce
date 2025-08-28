import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/appContext.jsx';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaStar } from 'react-icons/fa';

// Helper: format date labels
const getDateLabel = (dateString) => {
  const orderDate = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (d1, d2) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  if (isSameDay(orderDate, today)) return 'Today';
  if (isSameDay(orderDate, yesterday)) return 'Yesterday';

  return orderDate.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const MyOrders = () => {
  const [myOrders, setMyOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortOption, setSortOption] = useState('date_desc');
  const [ratings, setRatings] = useState({});
  const [remainingTimes, setRemainingTimes] = useState({});
  const [loading, setLoading] = useState(false);

  const { currency, axios, user } = useAppContext();
  const navigate = useNavigate();

  // ✅ Fetch Orders
  const fetchMyOrders = async () => {
    if (!user || !user._id) {
      toast.error("User ID is not available.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/order/user?userId=${user._id}`);
      setMyOrders(data.orders || []);
    } catch (error) {
      toast.error("Failed to fetch orders.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch Reviews
  const fetchReviews = async () => {
    if (!user || !user._id) return;
    try {
      const res = await axios.get(`/api/review?userId=${user._id}`);
      const fetchedRatings = {};
      res.data.forEach((review) => {
        const key = `${review.orderId}_${review.productId}`;
        fetchedRatings[key] = review.rating;
      });
      setRatings(fetchedRatings);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  // ✅ Load orders & reviews when user is ready
  useEffect(() => {
    if (user?._id) {
      fetchMyOrders();
      fetchReviews();
    }
  }, [user]);

  // ✅ Filter & Sort Orders
  useEffect(() => {
    let updated = [...myOrders];

    // Filter
    if (statusFilter !== 'All') {
      updated = updated.filter((order) => order.status === statusFilter);
    }
    if (search.trim() !== '') {
      updated = updated.filter((order) =>
        order.items.some((item) =>
          item.product?.name?.toLowerCase().includes(search.toLowerCase())
        )
      );
    }

    // Sort
    updated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    setFilteredOrders(updated);
  }, [search, statusFilter, myOrders, sortOption]);

  // ✅ Timer for Cancel Order
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const times = {};
      myOrders.forEach((order) => {
        const createdTime = new Date(order.createdAt).getTime();
        const diff = 5 * 60 * 1000 - (now - createdTime);
        if (diff > 0 && order.status === 'Order Placed') {
          times[order._id] = Math.floor(diff / 1000);
        }
      });
      setRemainingTimes(times);
    }, 1000);
    return () => clearInterval(interval);
  }, [myOrders]);

  // ✅ Handle Rating
  const handleRatingChange = async (productId, orderId, ratingValue) => {
    try {
      const payload = {
        userId: user._id,
        productId,
        orderId: String(orderId),
        rating: Number(ratingValue),
      };
      await axios.post('/api/review', payload);
      toast.success('Review submitted!');
      setRatings((prev) => ({
        ...prev,
        [`${orderId}_${productId}`]: ratingValue,
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit review");
    }
  };

  // ✅ Handle Cancel
  const handleCancelOrder = async (orderId) => {
    try {
      const { data } = await axios.put(`/api/order/cancel/${orderId}`);
      if (data.success) {
        toast.success("Order cancelled.");
        fetchMyOrders();
      } else {
        toast.error(data.message || "Failed to cancel.");
      }
    } catch {
      toast.error("Error cancelling order.");
    }
  };

  // ✅ Group Orders by Date
  const groupedOrders = filteredOrders.reduce((acc, order) => {
    const label = getDateLabel(order.createdAt);
    if (!acc[label]) acc[label] = [];
    acc[label].push(order);
    return acc;
  }, {});

  const groupedArray = Object.entries(groupedOrders).map(([label, orders]) => ({
    label,
    orders,
    count: orders.length,
    latestDate: orders.map((o) => new Date(o.createdAt)).sort((a, b) => b - a)[0],
    totalAmount: orders
      .filter((o) => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + o.amount, 0),
  }));

  // Sorting options
  if (sortOption === 'date_asc') groupedArray.sort((a, b) => a.latestDate - b.latestDate);
  if (sortOption === 'count_desc') groupedArray.sort((a, b) => b.count - a.count);
  if (sortOption === 'count_asc') groupedArray.sort((a, b) => a.count - b.count);

  return (
    <div className='mt-30 pb-16 max-w-6xl mx-auto px-4'>
      <div className='flex flex-col items-end mb-8'>
        <p className='text-2xl font-medium uppercase'>
          My <span className='text-primary'>Orders</span>
        </p>
        <div className='w-16 h-0.5 bg-primary rounded-full'></div>
      </div>

      {/* ✅ Loading Spinner */}
      {loading && (
        <div className="flex justify-center items-center h-40">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {!loading && (
        <>
          {/* Filters */}
          <div className='flex flex-col md:flex-row justify-between gap-4 mb-8'>
            <input
              type='text'
              placeholder='Search by product name...'
              className='border px-4 py-2 rounded w-full md:w-1/2 text-sm'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className='flex gap-4 w-full md:w-1/2'>
              <select
                className='border px-4 py-2 rounded w-full text-sm'
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
                className='border px-4 py-2 rounded w-full text-sm'
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

          {groupedArray.length === 0 && (
            <p className='text-center text-gray-500 text-sm'>No orders found.</p>
          )}

          {groupedArray.map((group) => (
            <div key={group.label}>
              <h3 className='text-base font-semibold text-gray-700 mb-4'>
                {group.label} ({group.count} order{group.count > 1 ? 's' : ''}) -
                <span className='text-primary ml-2'>
                  Total : {currency} {group.totalAmount.toFixed(2)}
                </span>
              </h3>

              {group.orders.map((order) => (
                <div key={order._id} className='border border-gray-300 rounded-lg mb-6 p-4 py-5'>
                  {/* Order Meta */}
                  <div className='flex flex-wrap justify-between text-gray-600 text-xs font-medium mb-4 gap-2'>
                    <span><span className='text-gray-500'>Order ID:</span> {order._id}</span>
                    <span><span className='text-gray-500'>Payment:</span> {order.paymentType || 'N/A'}</span>
                    <span><span className='text-gray-500'>Status:</span> {order.status || 'N/A'}</span>
                    <span><span className='text-gray-500'>Total:</span> {currency} {order.amount.toFixed(2)}</span>
                    {order.status === 'Order Placed' && (
                      <span className='text-red-500'>
                        {remainingTimes[order._id] > 0
                          ? `Cancel in: ${Math.floor(remainingTimes[order._id] / 60)}:${(remainingTimes[order._id] % 60).toString().padStart(2, '0')} mins`
                          : 'Cancellation expired'}
                      </span>
                    )}
                  </div>

                  {/* Order Items */}
                  {(order.items || []).map((item, idx) => {
                    const productId = item.product?._id;
                    const reviewKey = `${order._id}_${productId}`;
                    const rating = ratings[reviewKey];

                    return (
                      <div key={idx} className='grid grid-cols-[auto_1fr_auto] gap-4 py-4 border-t border-gray-200 items-center'>
                        {/* Product Image */}
                        <div className='group flex flex-col items-center md:items-start justify-center cursor-pointer'>
                          <img
                            src={item.product?.image?.[0] || 'https://via.placeholder.com/64'}
                            alt={item.product?.name || 'Product'}
                            className='w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover transition-transform duration-200 group-hover:scale-105'
                            onClick={() => productId ? navigate(`/product/${productId}`) : toast.error("Product not found.")}
                          />
                          <span className='text-xs text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
                            View Details
                          </span>
                        </div>

                        {/* Product Info */}
                        <div className='flex flex-col space-y-1 text-sm'>
                          <h2 className='font-semibold text-gray-800'>{item.product?.name || 'Unnamed Product'}</h2>
                          <p className='text-gray-500 text-xs'>Category: {item.product?.category || 'N/A'}</p>
                          <p className='text-xs'>Qty: {item.quantity}</p>
                          <p className='text-xs'>Ordered On: {new Date(order.createdAt).toLocaleString()}</p>

                          {/* Rating */}
                          <div className='flex items-center mt-2 gap-1'>
                            {[1, 2, 3, 4, 5].map((starIndex) => (
                              <FaStar
                                key={starIndex}
                                onClick={() => {
                                  if (order.status === 'Delivered' && !rating) {
                                    handleRatingChange(productId, order._id, starIndex);
                                  } else if (order.status !== 'Delivered') {
                                    toast.error("You can only review after delivery.");
                                  }
                                }}
                                color={starIndex <= (rating || 0) ? 'gold' : 'gray'}
                                className={`cursor-pointer ${rating ? 'pointer-events-none' : ''}`}
                              />
                            ))}
                            {rating && (
                              <span className="text-xs text-gray-500 ml-2">
                                You rated: {rating} ★
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Price */}
                        <p className='text-primary font-semibold text-sm sm:text-base'>
                          ₹ {(item.product?.offerPrice * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    );
                  })}

                  {/* Cancel Button */}
                  {order.status === 'Order Placed' && remainingTimes[order._id] > 0 && (
                    <button
                      className='mt-4 px-4 py-2 bg-red-500 text-white text-xs rounded hover:bg-red-600'
                      onClick={() => handleCancelOrder(order._id)}
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default MyOrders;
