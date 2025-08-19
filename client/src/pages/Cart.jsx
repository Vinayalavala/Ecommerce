import { useEffect, useState } from "react";
import { useAppContext } from "../context/appContext";
import toast from "react-hot-toast";
import assets from "../assets/assets";


const Cart = () => {
  const {
    products,
    currency,
    cartItems,
    user,
    removeFromCart,
    getCartCount,
    navigate,
    updateCartItem,
    setCartItems,
    axios
  } = useAppContext();

  const [cartArray, setCartArray] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [showAddress, setShowAddress] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentOption, setPaymentOption] = useState("COD");
  const [cartTotal, setCartTotal] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [showThankYou, setShowThankYou] = useState(false); // ✅ Added

  const getCart = () => {
    let tempArray = [];
    let total = 0;
    for (const key in cartItems) {
      const product = products.find((item) => item._id === key);
      if (product) {
        product.quantity = cartItems[key];
        tempArray.push(product);
        total += product.offerPrice * cartItems[key];
      }
    }
    setCartArray(tempArray);
    setCartTotal(total);
  };

  const getUserAddress = async () => {
    try {
      const { data } = await axios.get(`/api/address/get?userId=${user._id}`);
      if (data.success) {
        setAddresses(data.addresses);
        if (data.addresses.length > 0) {
          setSelectedAddress(data.addresses[0]);
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const placeOrder = async () => {
  // ✅ Disable button immediately to prevent double click
  if (cooldownSeconds > 0) return; // Prevent double call manually (extra safety)
  setCooldownSeconds(60);

  try {
    if (!selectedAddress) {
      toast.error("Please select a delivery address.");
      return;
    }

    if (paymentOption === "COD") {
      const { data } = await axios.post("/api/order/cod", {
        userId: user._id,
        items: cartArray.map(item => ({
          product: item._id,
          quantity: item.quantity
        })),
        address: selectedAddress._id,
        isPaid: false,
      });

      if (data.success) {
        toast.success(data.message);
        setCartItems({});
        setShowThankYou(true);

        setTimeout(() => {
          setShowThankYou(false);
          navigate("/my-orders");
        }, 5000);
      } else {
        toast.error(data.message);
      }
    } else {
      const { data } = await axios.post("/api/order/stripe", {
        userId: user._id,
        items: cartArray.map(item => ({
          product: item._id,
          quantity: item.quantity
        })),
        address: selectedAddress._id,
      });

      if (data.success) {
        window.location.href = data.url;
      } else {
        toast.error(data.message);
      }
    }
  } catch (error) {
    toast.error(error.message);
    setCooldownSeconds(0);
  }
};


  useEffect(() => {
    if (products.length > 0 && cartItems) {
      getCart();
    }
  }, [products, cartItems]);

  useEffect(() => {
    if (user) {
      getUserAddress();
    }
  }, [user]);

  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setInterval(() => {
        setCooldownSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownSeconds]);

  // ✅ Thank You Overlay
  if (showThankYou) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50 animate-fade-in">
          <img
            src={assets.success_icon || assets.logo}
            alt="success"
            className="w-20 mb-4"
          />
          <p className="text-gray-600 text-lg">Thanks for shopping with us!</p>
          <p className="text-gray-600 text-lg mt-1">
            Your items will be delivered & we hope to see you again soon!
          </p>
          <p></p>
          <p>You're being redirected to "My Orders" page.....</p>
        </div>
      );

  }

  return products.length > 0 && cartItems ? (
    <div className="flex flex-col md:flex-row mt-30">
      {/* Left Section */}
      <div className="flex-1 max-w-4xl">
        <h1 className="text-3xl font-medium mb-6">
          Shopping Cart{" "}
          <span className="text-sm text-primary">{getCartCount()} Items</span>
        </h1>

        {/* Header */}
        <div className="grid grid-cols-[2fr_1fr_1fr] text-gray-500 text-base font-medium pb-3">
          <p className="text-left">Product Details</p>
          <p className="text-center">Subtotal</p>
          <p className="text-center">Action</p>
        </div>

        {/* Cart Items */}
        {cartArray.map((product, index) => (
          <div
            key={index}
            className="grid grid-cols-[2fr_1fr_1fr] text-gray-500 items-center text-sm md:text-base font-medium pt-3"
          >
            <div className="flex items-center md:gap-6 gap-3">
              <div
                onClick={() => {
                  navigate(
                    `/products/${product.category.toLowerCase()}/${product._id}`
                  );
                  window.scrollTo(0, 0);
                }}
                className="cursor-pointer w-24 h-24 flex items-center justify-center border border-gray-300 rounded"
              >
                <img
                  className="max-w-full h-full object-cover"
                  src={product.image?.[0] || assets.placeholder_image}
                  alt={product.name}
                />
              </div>
              <div>
                <p className="hidden md:block font-semibold">{product.name}</p>
                <div className="font-normal text-gray-500/70">
                  <p>
                    Weight: <span>{product.quantity || "N/A"}</span>
                  </p>
                  <div className="flex items-center">
                    <p>Qty:</p>
                    <select
                      className="outline-none"
                      value={product.quantity}
                      onChange={(e) =>
                        updateCartItem(product._id, Number(e.target.value))
                      }
                    >
                      {Array(Math.max(9, cartItems[product._id] || 0))
                        .fill("")
                        .map((_, index) => (
                          <option key={index} value={index + 1}>
                            {index + 1}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-center">
              {currency}
              {(product.offerPrice * product.quantity).toFixed(2)}
            </p>
            <button
              onClick={() => removeFromCart(product._id)}
              className="cursor-pointer mx-auto"
            >
              <img
                src={assets.remove_icon}
                alt="remove"
                className="inline-block w-6"
              />
            </button>
          </div>
        ))}

        <button
          onClick={() => {
            navigate("/products");
            window.scrollTo(0, 0);
          }}
          className="group cursor-pointer flex items-center mt-8 gap-2 text-primary font-medium"
        >
          <img
            className="group-hover:-translate-x-1 transition"
            src={assets.arrow_right_icon_colored}
            alt="arrow"
          />
          Continue Shopping
        </button>
      </div>

      {/* Right Section: Order Summary */}
      <div className="max-w-[360px] w-full bg-gray-100/40 p-5 max-md:mt-16 border border-gray-300/70">
        <h2 className="text-xl md:text-xl font-medium">Order Summary</h2>
        <hr className="border-gray-300 my-5" />

        {/* Address */}
        <div className="mb-6">
          <p className="text-sm font-medium uppercase">Delivery Address</p>
          <div className="relative flex justify-between items-start mt-2">
            <p className="text-gray-500">
              {selectedAddress
                ? `${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.state}, ${selectedAddress.country}`
                : "No address found"}
            </p>
            <button
              onClick={() => setShowAddress(!showAddress)}
              className="text-primary hover:underline cursor-pointer"
            >
              Change
            </button>
            {showAddress && (
              <div className="absolute top-12 py-1 bg-white border border-gray-300 text-sm w-full max-h-40 overflow-y-auto z-10">
                {addresses.map((address, index) => (
                  <p
                    key={index}
                    onClick={() => {
                      setSelectedAddress(address);
                      setShowAddress(false);
                    }}
                    className="text-gray-500 p-2 hover:bg-gray-100 cursor-pointer"
                  >
                    {address.street}, {address.city}, {address.state},{" "}
                    {address.country}
                  </p>
                ))}
                <p
                  onClick={() => navigate("/add-address")}
                  className="text-primary text-center cursor-pointer p-2 hover:bg-indigo-500/10"
                >
                  Add address
                </p>
              </div>
            )}
          </div>

          {/* Payment Option */}
          <p className="text-sm font-medium uppercase mt-6">Payment Method</p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-gray-600">Cash On Delivery</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox disabled disabled={cooldownSeconds > 0}"
                checked={paymentOption === "Online"}
                onChange={() =>
                  setPaymentOption((prev) =>
                    prev === "COD" ? "Online" : "COD"
                  )
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary 
                rounded-full peer dark:bg-gray-300 peer-checked:bg-green-600
                peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] 
                after:left-[2px] after:bg-white after:border-gray-300 after:border 
                after:rounded-full after:h-5 after:w-5 after:transition-all"
              ></div>
            </label>
            <span className="text-sm text-gray-600">Online Payment</span>
          </div>
        </div>

        <hr className="border-gray-300" />

        {/* Order Summary */}
        <div className="text-gray-500 mt-4 space-y-2">
          <p className="flex justify-between">
            <span>Price</span>
            <span>
              {currency}
              {cartTotal.toFixed(2)}
            </span>
          </p>
          <p className="flex justify-between">
            <span>Shipping Fee</span>
            <span className="text-green-600">Free</span>
          </p>
          <p className="flex justify-between">
            <span>Tax (2%)</span>
            <span>
              {currency}
              {(cartTotal * 0.02).toFixed(2)}
            </span>
          </p>
          <p className="flex justify-between text-lg font-medium mt-3">
            <span>Total Amount:</span>
            <span>
              {currency}
              {(cartTotal * 1.02).toFixed(2)}
            </span>
          </p>
        </div>
        <button
          onClick={placeOrder}
          disabled={cooldownSeconds > 0}
          className={`w-full py-2 mt-6 rounded-md transition ${
            cooldownSeconds > 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-primary text-white hover:bg-primary-dull"
          }`}
        >
          {cooldownSeconds > 0
            ? `Please wait ${cooldownSeconds}s`
            : paymentOption === "COD"
              ? "Place Order"
              : "Proceed to Payment"}
        </button>

      </div>
    </div>
  ) : null;
};

export default Cart;
