import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/appContext.jsx';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaStar } from 'react-icons/fa';

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

  const { currency, axios, user } = useAppContext();
  const navigate = useNavigate();

  const fetchMyOrders = async () => {
    if (!user || !user._id) {
      toast.error("User ID is not available.");
      return;
    }

    try {
      const { data } = await axios.get(`/api/order/user?userId=${user._id}`);
      if (data.success) {
        setMyOrders(data.orders);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to fetch orders.");
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyOrders();
    }
  }, [user]);

  useEffect(() => {
    let updated = [...myOrders];

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

    setFilteredOrders(updated);
  }, [search, statusFilter, myOrders]);

  const handleRatingChange = (productId, value) => {
    setRatings((prev) => ({
      ...prev,
      [productId]: value,
    }));
    toast.success(`This feature is not implemented yet. Please check back later!`);
  };

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
    latestDate: orders
      .map((o) => new Date(o.createdAt))
      .sort((a, b) => b - a)[0],
    totalAmount: orders
      .filter((o) => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + o.amount, 0),
  }));

  if (sortOption === 'date_desc') {
    groupedArray.sort((a, b) => b.latestDate - a.latestDate);
  } else if (sortOption === 'date_asc') {
    groupedArray.sort((a, b) => a.latestDate - b.latestDate);
  } else if (sortOption === 'count_desc') {
    groupedArray.sort((a, b) => b.count - a.count);
  } else if (sortOption === 'count_asc') {
    groupedArray.sort((a, b) => a.count - b.count);
  }

  return (
    <div className='mt-30 pb-16 max-w-6xl mx-auto px-4'>
      <div className='flex flex-col items-end mb-8'>
        <p className='text-2xl font-medium uppercase'>
          My <span className='text-primary'>Orders</span>
        </p>
        <div className='w-16 h-0.5 bg-primary rounded-full'></div>
      </div>

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

          {group.orders.map((order, index) => (
            <div key={index} className='border justify-center border-gray-300 rounded-lg mb-6 p-4 py-5'>
              <div className='flex flex-wrap justify-between text-gray-600 text-xs font-medium mb-4 gap-2'>
                <span><span className='text-gray-500'>Order ID:</span> {order._id}</span>
                <span><span className='text-gray-500'>Payment:</span> {order.paymentType || 'N/A'}</span>
                <span><span className='text-gray-500'>Status:</span> {order.status || 'N/A'}</span>
                <span><span className='text-gray-500'>Total:</span> {currency} {order.amount.toFixed(2)}</span>
              </div>

              {(order.items || []).map((item, idx) => {
                const productId = item.product?._id;
                const currentRating = ratings[productId] || 0;

                return (
                  <div
                    key={idx}
                    className='grid grid-cols-[auto_1fr_auto] gap-4 py-4 border-t border-gray-200 items-center'
                  >
                    <div className='group flex flex-col items-center md:items-start justify-center cursor-pointer'>
                        <img
                          src={item.product?.image?.[0] || 'https://via.placeholder.com/64'}
                          alt={item.product?.name || 'Product'}
                          className='w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover transition-transform duration-200 group-hover:scale-105'
                          onClick={() => {
                            if (productId) navigate(`/product/${productId}`);
                            else toast.error("Product not found.");
                          }}
                        />
                        <span className='text-xs text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
                          View Details
                        </span>
                    </div>
                    <div className='flex flex-col justify-center space-y-1 text-left text-sm'>
                      <h2 className='text-sm font-semibold text-gray-800'>
                        {item.product?.name || 'Unnamed Product'}
                      </h2>
                      <p className='text-gray-500 text-xs'>
                        Category: {item.product?.category || 'N/A'}
                      </p>
                      <p className='text-xs'>Qty: {item.quantity}</p>
                      <p className='text-xs'>
                        Ordered On: {new Date(order.createdAt).toLocaleString()}
                      </p>

                      <div className='flex items-center mt-2 gap-1'>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FaStar
                            key={star}
                            className={`cursor-pointer text-sm ${
                              currentRating >= star ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                            onClick={() => handleRatingChange(productId, star)}
                          />
                        ))}
                      </div>
                    </div>

                    <div className='flex justify-center items-center'>
                      <p className='text-primary font-semibold text-sm sm:text-base'>
                        ₹ {(item.product?.offerPrice * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default MyOrders;
