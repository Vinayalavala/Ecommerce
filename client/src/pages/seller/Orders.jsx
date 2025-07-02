import { useAppContext } from '../../context/appContext';
import { useState, useEffect } from 'react';
import assets from '../../assets/assets';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Orders = () => {
  const { currency, axios } = useAppContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get('/api/order/seller', {
        withCredentials: true,
      });

      if (data.success) {
        setOrders(data.orders);
      } else {
        toast.error(data.message || "Failed to fetch orders.");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Unauthorized. Please log in.");
        navigate("/seller-login");
      } else {
        toast.error(error?.message || "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const markOrderAsPaid = async (orderId) => {
    try {
      const { data } = await axios.patch(`/api/order/${orderId}/mark-paid`);

      if (data.success) {
        toast.success("Order marked as paid.");

        // Update state locally
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === orderId
              ? { ...order, isPaid: true }
              : order
          )
        );
      } else {
        toast.error(data.message || "Failed to mark order as paid.");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || "Failed to update order.");
    }
  };

  if (loading) {
    return <div className="p-10 text-center">Loading Orders...</div>;
  }

  if (orders.length === 0) {
    return <div className="p-10 text-center">No orders found.</div>;
  }

  return (
    <div className="no-scrollbar flex-1 h-[95vh] overflow-y-scroll">
      <div className="md:p-10 p-4 space-y-4">
        <h2 className="text-lg font-medium">Orders List</h2>
        {orders.map((order) => (
          <OrderCard
            key={order._id}
            order={order}
            currency={currency}
            onMarkAsPaid={markOrderAsPaid}
          />
        ))}
      </div>
    </div>
  );
};

const OrderCard = ({ order, currency, onMarkAsPaid }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localIsPaid, setLocalIsPaid] = useState(order.isPaid);

  const handleTogglePaid = async () => {
    if (localIsPaid || isUpdating) return;
    setIsUpdating(true);
    await onMarkAsPaid(order._id);
    setLocalIsPaid(true);
    setIsUpdating(false);
  };

  return (
    <div className="flex flex-col md:flex-row justify-between md:items-center gap-5 p-5 max-w-4xl rounded-md border border-gray-300">
      <div className="flex gap-5 max-w-80">
        <img
          className="w-12 h-12 object-cover"
          src={assets.box_icon}
          alt="boxIcon"
        />
        <div>
          {order.items?.map((item) => (
            <div
              key={item._id || item.product?._id || Math.random()}
              className="flex flex-col"
            >
              <p className="font-medium">
                {item.product?.name || 'Unnamed Product'}{" "}
                <span className="text-primary">
                  x {item.quantity}
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>

      <OrderAddress address={order.address} />

      <p className="font-medium text-lg my-auto text-black/70">
        {currency}{order.amount?.toFixed(2) || "0.00"}
      </p>

      <div className="flex flex-col text-sm md:text-base text-black/60 space-y-1">
        <p>Method: {order.paymentType || "N/A"}</p>
        <p>Date: {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "N/A"}</p>
        <p>Payment: {localIsPaid ? "Paid" : "Pending"}</p>

        <label className="mt-2 inline-flex items-center cursor-pointer">
          <span className="mr-2 text-sm text-gray-600">Mark as Paid</span>
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={localIsPaid}
              onChange={handleTogglePaid}
              disabled={localIsPaid || isUpdating}
            />
            <div className={`
              w-11 h-6 rounded-full peer-focus:ring-4
              ${localIsPaid ? "bg-green-600" : "bg-gray-300"}
              peer-checked:after:translate-x-full after:content-[''] after:absolute
              after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full
              after:h-5 after:w-5 after:transition-all after:duration-300
            `}></div>
          </div>
        </label>

        {isUpdating && <p className="text-xs text-blue-500">Updating...</p>}
      </div>
    </div>
  );
};

const OrderAddress = ({ address }) => {
  if (!address) return null;
  return (
    <div className="text-sm md:text-base text-black/60">
      <p className="text-black/80">
        {address.firstName || ""} {address.lastName || ""}
      </p>
      <p>
        {address.street || ""}, {address.city || ""}
      </p>
      <p>
        {address.state || ""}, {address.zipcode || ""}, {address.country || ""}
      </p>
      <p>{address.phone || ""}</p>
    </div>
  );
};

export default Orders;
