import { useAppContext } from '../../context/appContext';
import { useState, useEffect } from 'react';
import assets from '../../assets/assets';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Orders = () => {
  const { currency, axios } = useAppContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
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

  /** Group orders by date string (Today / Yesterday / formatted date) */
  const groupOrders = (orders) => {
    const grouped = {};

    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    for (let order of orders) {
      const date = new Date(order.createdAt);
      let label = date.toDateString();

      if (date.toDateString() === now.toDateString()) {
        label = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        label = "Yesterday";
      } else {
        label = date.toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }

      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(order);
    }
    return grouped;
  };

  /** Filter logic */
  const filterOrder = (order) => {
    const search = searchTerm.toLowerCase();

    const matchesText =
      order._id.toLowerCase().includes(search) ||
      `${order.address?.firstName || ""} ${order.address?.lastName || ""}`
        .toLowerCase()
        .includes(search) ||
      new Date(order.createdAt)
        .toISOString()
        .split("T")[0]
        .includes(search);

    const matchesPayment =
      paymentFilter === "all" ||
      (paymentFilter === "paid" && order.isPaid) ||
      (paymentFilter === "pending" && !order.isPaid);

    return matchesText && matchesPayment;
  };

  const groupedOrders = groupOrders(orders);

  if (loading) {
    return <div className="p-10 text-center">Loading Orders...</div>;
  }

  if (orders.length === 0) {
    return <div className="p-10 text-center">No orders found.</div>;
  }

  return (
    <div className="no-scrollbar flex-1 h-[95vh] overflow-y-scroll">
      <div className="md:p-10 p-4 space-y-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Orders List</h2>

        {/* Search + Filter UI */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer, order ID, date..."
            className="border border-gray-300 rounded px-4 py-2 w-full sm:w-80 focus:outline-none focus:ring focus:border-primary"
          />

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 text-gray-700 focus:outline-none focus:ring focus:border-primary"
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>

          {(searchTerm || paymentFilter !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setPaymentFilter("all");
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
            >
              Clear
            </button>
          )}
        </div>

        {/* Orders grouped by date */}
        {Object.entries(groupedOrders)
          .sort((a, b) => new Date(b[1][0].createdAt) - new Date(a[1][0].createdAt))
          .map(([dateLabel, orders]) => {
            const filtered = orders.filter(filterOrder);
            if (filtered.length === 0) return null;

            return (
              <div key={dateLabel}>
                <h3 className="text-xl font-semibold text-primary mt-8 mb-4">
                  {dateLabel}
                  <span className="text-gray-500 text-sm ml-2">
                    ({filtered.length} {filtered.length === 1 ? "order" : "orders"})
                  </span>
                </h3>
                <div className="space-y-4">
                  {filtered.map((order) => (
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
          })}
      </div>
    </div>
  );
};

const OrderCard = ({ order, currency, onMarkAsPaid }) => {
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [localIsPaid, setLocalIsPaid] = useState(order.isPaid);

  const handleTogglePaid = async () => {
    if (localIsPaid || isUpdating) return;
    setIsUpdating(true);
    await onMarkAsPaid(order._id);
    setLocalIsPaid(true);
    setIsUpdating(false);
  };

  const timeStr = new Date(order.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-col md:flex-row justify-between md:items-center gap-5 p-5 max-w-5xl rounded-md border border-gray-300 shadow-sm hover:shadow-md transition bg-white">
      {/* ORDER HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center w-full mb-2 gap-2">
        <div className="text-gray-500 text-sm break-all">
          <span className="font-semibold text-gray-600">Order ID:</span>{" "}
          <span className="text-gray-700">{order._id}</span>
        </div>
        <div className="text-gray-500 text-sm">
          Payment: <span className="text-gray-700 font-medium">{order.paymentType || "N/A"}</span>
        </div>
        <div className="text-gray-500 text-sm">
          Total Amount:{" "}
          <span className="text-gray-700 font-medium">
            {currency}
            {typeof order.amount === "number" ? order.amount.toFixed(2) : "0.00"}
          </span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between md:items-center gap-5">
        {/* Product images & names */}
        <div className="flex gap-5 max-w-96">
          <div className="flex flex-col gap-3">
            {order.items?.map((item) => {
              const productId = item.product?._id;
              const imageSrc = item.product?.image?.[0] || assets.box_icon;
              const productName = item.product?.name || item.name || 'Unnamed Product';

              return (
                <div
                  key={item._id || productId || Math.random()}
                  className="group relative"
                >
                  <img
                    src={imageSrc}
                    alt={productName}
                    title={productName}
                    className="w-16 h-16 object-cover rounded border border-gray-300 cursor-pointer shadow-sm hover:shadow-lg hover:scale-105 transition duration-300 ease-in-out"
                    onClick={() => {
                      if (productId) {
                        navigate(`/product/${productId}`);
                      } else {
                        toast.error("No product ID found.");
                      }
                    }}
                  />
                  <div className="absolute left-0 right-0 bottom-[-1.5rem] text-xs text-center text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    View Details
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col justify-center">
            {order.items?.map((item) => (
              <p
                key={item._id || item.product?._id || Math.random()}
                className="font-medium text-gray-800"
              >
                {item.product?.name || item.name || 'Unnamed Product'}{" "}
                <span className="text-primary">
                  x {item.quantity}
                </span>
              </p>
            ))}
            <p className="text-sm text-gray-500 mt-2">
              Category: {order.items?.[0]?.product?.category || "Unknown"}
            </p>
          </div>
        </div>

        {/* Address */}
        <OrderAddress address={order.address} />

        {/* Right block: payment info */}
        <div className="flex flex-col text-sm md:text-base text-black/60 space-y-1">
          <p>Time: {timeStr}</p>
          <p>Status: {order.status || "N/A"}</p>
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
