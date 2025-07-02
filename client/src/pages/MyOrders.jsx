import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/appContext.jsx';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const MyOrders = () => {
  const [myOrders, setMyOrders] = useState([]);
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
      console.log(error);
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyOrders();
    }
  }, [user]);

  return (
    <div className='mt-20 pb-16'>
      <div className='flex flex-col items-end w-max mb-8'>
        <p className='text-2xl font-medium uppercase'>
          My <span className='text-primary'>Orders</span>
        </p>
        <div className='w-16 h-0.5 bg-primary rounded-full'></div>
      </div>

      {myOrders.map((order, index) => (
        <div
          key={index}
          className='border border-gray-300 rounded-lg mb-10 p-4 py-5 max-w-4xl'
        >
          <p className='flex justify-between md:items-center text-gray-400 md:font-medium max-md:flex-col'>
            <span>OrderId: {order?._id || "N/A"}</span>
            <span>Payment: {order?.paymentType || "N/A"}</span>
            <span>
              Total Amount: {currency}{" "}
              {order?.amount?.toFixed(2) || "0.00"}
            </span>
          </p>

          {(order?.items || []).map((item, index) => (
            <div
              key={index}
              className={`relative bg-white text-gray-500/70 ${
                order.items.length === index + 1 ? "" : "border-b"
              } border-gray-300 flex flex-col md:flex-row md:items-center justify-between p-4 py-5 md:gap-16 w-full`}
            >
              <div className='flex items-center mb-4 md:mb-0'>
                <div className='bg-primary/10 p-4 rounded-lg'>
                  <img
                    src={
                      item?.product?.image?.[0]
                        ? item.product.image[0]
                        : "https://via.placeholder.com/64"
                    }
                    alt={item?.product?.name || "Product"}
                    className='w-16 h-16 cursor-pointer hover:scale-105 transition-transform duration-200 rounded'
                    onClick={() => {
                      const productId = item?.product?._id;
                      if (productId) {
                        navigate(`/product/${productId}`);
                      } else {
                        toast.error("Product not found or deleted.");
                      }
                    }}
                  />
                </div>
                <div className='ml-4'>
                  <h2 className='text-xl font-medium text-gray-800'>
                    {item?.product?.name || "Unknown Product"}
                  </h2>
                  <p>Category: {item?.product?.category || "Unknown"}</p>
                </div>
              </div>

              <div className='flex flex-col justify-center md:ml-8 mb-4 md:mb-0'>
                <p>Quantity: {item?.quantity || "1"}</p>
                <p>Status: {order?.status || "Unknown"}</p>
                <p>
                  Date:{" "}
                  {order?.createdAt
                    ? new Date(order.createdAt).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>

              <p className='text-primary text-lg font-medium'>
                Amount: {currency}
                {(item?.product?.offerPrice && item?.quantity)
                  ? (item.product.offerPrice * item.quantity).toFixed(2)
                  : "0.00"}
              </p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default MyOrders;

