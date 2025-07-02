import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/appContext.jsx';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

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
      console.error(error);
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
    <div className='mt-20 pb-16 max-w-6xl mx-auto px-4'>
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
          className='border px-4 py-2 rounded w-full md:w-1/2'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className='flex gap-4 w-full md:w-1/2'>
          <select
            className='border px-4 py-2 rounded w-full'
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value='All'>All Statuses</option>
            <option value='Pending'>Pending</option>
            <option value='Delivered'>Delivered</option>
            <option value='Cancelled'>Cancelled</option>
          </select>

          <select
            className='border px-4 py-2 rounded w-full'
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
        <p className='text-center text-gray-500'>No orders found.</p>
      )}

      {groupedArray.map((group) => (
        <div key={group.label}>
          <h3 className='text-lg font-semibold text-gray-700 mb-4'>
            {group.label} ({group.count} order{group.count > 1 ? 's' : ''})
          </h3>
          {group.orders.map((order, index) => (
            <div
              key={index}
              className='border border-gray-300 rounded-lg mb-6 p-4 py-5'
            >
              <div className='flex justify-between text-gray-600 text-sm font-medium mb-4 flex-wrap gap-2'>
                <span>OrderId: {order._id}</span>
                <span>Payment: {order.paymentType}</span>
                <span>Total: {currency} {order.amount.toFixed(2)}</span>
              </div>

              {(order.items || []).map((item, idx) => (
                <div
                  key={idx}
                  className="
                    grid
                    grid-cols-1
                    md:grid-cols-[auto_1fr_auto]
                    gap-4
                    py-4
                    border-t
                    border-gray-200
                    min-h-[110px]
                  "
                >
                  {/* IMAGE */}
                  <div className="flex justify-center md:justify-start items-center">
                    <img
                      src={item.product?.image?.[0] || 'https://via.placeholder.com/64'}
                      alt={item.product?.name || 'Product'}
                      className="w-24 h-24 rounded-lg object-cover cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => {
                        const productId = item.product?._id;
                        if (productId) navigate(`/product/${productId}`);
                        else toast.error("Product not found.");
                      }}
                    />
                  </div>

                  {/* DETAILS */}
                  <div className="
                    flex
                    justify-center
                    items-center
                    h-full
                  ">
                    <div className="space-y-2 text-left">
                      <h2 className="text-lg font-semibold text-gray-800">
                        {item.product?.name || 'Unnamed Product'}
                      </h2>
                      <p className="text-gray-500 text-sm">
                        Category: {item.product?.category || 'N/A'}
                      </p>
                      <p className="text-sm">Qty: {item.quantity}</p>
                      <p className="text-sm">Status: {order.status}</p>
                      <p className="text-sm">
                        Ordered On: {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* PRICE */}
                  <div className="flex justify-center items-center">
                    <p className="text-primary font-semibold text-lg">
                      ₹ {(item.product?.offerPrice * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default MyOrders;
