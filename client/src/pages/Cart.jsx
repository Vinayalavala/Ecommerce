import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../context/appContext";
import toast from "react-hot-toast";
import assets from "../assets/assets";
import {
  FiTrash2,
  FiMinus,
  FiPlus,
  FiMapPin,
  FiTruck,
  FiShield,
  FiArrowLeft,
  FiCheck,
  FiCreditCard,
  FiShoppingBag,
  FiTag,
} from "react-icons/fi";

const formatAddress = (a) =>
  [a.street, a.city, a.state, a.country].filter(Boolean).join(", ") +
  (a.zipcode ? ` - ${a.zipcode}` : "");

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
    axios,
  } = useAppContext();

  const [addresses, setAddresses] = useState([]);
  const [showAddress, setShowAddress] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentOption, setPaymentOption] = useState("COD");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isPlacing, setIsPlacing] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);

  // Derived from context, so there is no empty-cart flash on first render
  const cartArray = useMemo(() => {
    if (!cartItems) return [];
    return Object.keys(cartItems)
      .map((key) => {
        const product = products.find((item) => item._id === key);
        return product ? { ...product, quantity: cartItems[key] } : null;
      })
      .filter((item) => item && item.quantity > 0);
  }, [products, cartItems]);

  const cartTotal = useMemo(
    () => cartArray.reduce((sum, item) => sum + item.offerPrice * item.quantity, 0),
    [cartArray]
  );

  const savings = useMemo(
    () =>
      cartArray.reduce(
        (sum, item) =>
          item.price > item.offerPrice ? sum + (item.price - item.offerPrice) * item.quantity : sum,
        0
      ),
    [cartArray]
  );

  const tax = cartTotal * 0;
  const grandTotal = cartTotal ;

  const getUserAddress = async () => {
    try {
      const { data } = await axios.get(`/api/address/get?userId=${user._id}`);
      if (data.success) {
        setAddresses(data.addresses);
        if (data.addresses.length > 0) {
          setSelectedAddress(data.addresses[0]);
        }
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const goToThankYou = () => {
    setCartItems({});
    setShowThankYou(true);
    setTimeout(() => {
      setShowThankYou(false);
      navigate("/my-orders");
    }, 5000);
  };

  const placeOrder = async () => {
    if (!selectedAddress) {
      toast.error("Please select an address");
      return;
    }
    if (isPlacing) return;
    setIsPlacing(true);

    if (paymentOption === "COD") {
      // COD flow
      try {
        const { data } = await axios.post("/api/order/cod", {
          userId: user._id,
          items: cartArray.map((item) => ({
            product: { _id: item._id, price: item.offerPrice },
            quantity: item.quantity,
          })),
          address: selectedAddress._id,
        });

        if (data.success) {
          toast.success("Order placed successfully");
          goToThankYou();
        } else {
          toast.error(data.message);
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || error.message);
      } finally {
        setIsPlacing(false);
      }
    } else {
      // Razorpay payment flow
      try {
        const { data } = await axios.post("/api/order/razorpay/create-order", {
          items: cartArray.map((item) => ({
            product: item._id,
            quantity: item.quantity,
          })),
          address: selectedAddress._id,
          userId: user._id,
        });

        if (!data.success) {
          toast.error("Failed to initiate payment");
          setIsPlacing(false);
          return;
        }

        if (!window.Razorpay) {
          toast.error("Payment gateway failed to load. Please refresh and try again.");
          setIsPlacing(false);
          return;
        }

        const options = {
          key: data.key,
          amount: data.amount * 100, // Razorpay expects paise
          currency: data.currency,
          name: "My Shop",
          description: "Order Payment",
          order_id: data.razorpayOrder.id,
          handler: async function (response) {
            try {
              const verifyRes = await axios.post("/api/order/razorpay/verify", {
                ...response,
                items: cartArray.map((item) => ({
                  product: item._id,
                  quantity: item.quantity,
                })),
                address: selectedAddress._id,
                userId: user._id,
              });

              if (verifyRes.data.success) {
                toast.success("Payment successful! Order placed.");
                goToThankYou();
              } else {
                toast.error("Payment verification failed");
              }
            } catch (error) {
              toast.error(error?.response?.data?.message || error.message);
            } finally {
              setIsPlacing(false);
            }
          },
          modal: { ondismiss: () => setIsPlacing(false) },
          prefill: {
            name: user.name,
            email: user.email,
          },
          theme: { color: "#3399cc" },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (error) {
        toast.error(error.message);
        setIsPlacing(false);
      }
    }
  };

  useEffect(() => {
    if (user) {
      getUserAddress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setInterval(() => {
        setCooldownSeconds((prev) => {
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

  const ctaDisabled = cooldownSeconds > 0 || isPlacing;
  const ctaLabel = isPlacing
    ? "Processing..."
    : cooldownSeconds > 0
    ? `Please wait ${cooldownSeconds}s`
    : paymentOption === "COD"
    ? `Place Order · ${currency}${grandTotal.toFixed(2)}`
    : `Pay ${currency}${grandTotal.toFixed(2)}`;

  // Thank you overlay
  if (showThankYou) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6 text-center animate-fade-in">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/60">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
            <FiCheck className="text-4xl" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">Order confirmed!</h2>
        <p className="mt-2 text-gray-600">Thanks for shopping with us. Your items will be delivered soon.</p>
        <button
          onClick={() => {
            setShowThankYou(false);
            navigate("/my-orders");
          }}
          className="mt-8 rounded-full bg-primary px-8 py-3 font-medium text-white transition hover:bg-primary-dull"
        >
          View my orders
        </button>
        <p className="mt-4 text-xs text-gray-400">Redirecting automatically...</p>
      </div>
    );
  }

  if (!(products.length > 0 && cartItems)) return null;

  // Empty state
  if (cartArray.length === 0) {
    return (
      <div className="mt-30 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
          <FiShoppingBag className="text-4xl text-gray-400" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Your cart is empty</h1>
        <p className="mt-2 max-w-sm text-gray-500">
          Looks like you have not added anything yet. Browse our products and find something you like.
        </p>
        <button
          onClick={() => {
            navigate("/products");
            window.scrollTo(0, 0);
          }}
          className="mt-8 rounded-full bg-primary px-8 py-3 font-medium text-white transition hover:bg-primary-dull"
        >
          Start shopping
        </button>
      </div>
    );
  }

  return (
    <div className="mt-30 w-full max-w-6xl pb-32 lg:pb-16">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Shopping Cart</h1>
          <p className="mt-1 text-sm text-gray-500">
            {getCartCount()} {getCartCount() === 1 ? "item" : "items"} in your cart
          </p>
        </div>
        <button
          onClick={() => {
            navigate("/products");
            window.scrollTo(0, 0);
          }}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <FiArrowLeft /> Continue shopping
        </button>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Left: items */}
        <div className="flex-1 space-y-4">
          {savings > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <FiTag />
              You are saving{" "}
              <span className="font-semibold">
                {currency}
                {savings.toFixed(2)}
              </span>{" "}
              on this order
            </div>
          )}

          {cartArray.map((product) => (
            <div
              key={product._id}
              className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md sm:p-4"
            >
              <div
                onClick={() => {
                  navigate(`/products/${product.category?.toLowerCase()}/${product._id}`);
                  window.scrollTo(0, 0);
                }}
                className="flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-gray-50 sm:h-28 sm:w-28"
              >
                <img
                  className="h-full w-full object-cover"
                  src={product.image?.[0] || assets.placeholder_image}
                  alt={product.name}
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-semibold leading-snug text-gray-800">{product.name}</p>
                    {product.category && (
                      <p className="mt-0.5 text-xs capitalize text-gray-400">{product.category}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      <span className="font-medium text-gray-700">
                        {currency}
                        {product.offerPrice}
                      </span>
                      {product.price > product.offerPrice && (
                        <span className="ml-2 text-xs text-gray-400 line-through">
                          {currency}
                          {product.price}
                        </span>
                      )}
                      <span className="text-xs text-gray-400"> / unit</span>
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromCart(product._id)}
                    title="Remove item"
                    aria-label={`Remove ${product.name}`}
                    className="rounded-full p-2 text-gray-400 transition hover:bg-rose-50 hover:text-rose-500"
                  >
                    <FiTrash2 />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  {/* Quantity stepper */}
                  <div className="inline-flex items-center rounded-full border border-gray-300 bg-white">
                    <button
                      onClick={() =>
                        product.quantity <= 1
                          ? removeFromCart(product._id)
                          : updateCartItem(product._id, product.quantity - 1)
                      }
                      aria-label="Decrease quantity"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100"
                    >
                      {product.quantity <= 1 ? <FiTrash2 className="text-sm" /> : <FiMinus />}
                    </button>
                    <span className="w-8 select-none text-center text-sm font-semibold text-gray-800">
                      {product.quantity}
                    </span>
                    <button
                      onClick={() => updateCartItem(product._id, product.quantity + 1)}
                      aria-label="Increase quantity"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-primary transition hover:bg-primary/10"
                    >
                      <FiPlus />
                    </button>
                  </div>

                  <p className="text-lg font-semibold text-gray-900">
                    {currency}
                    {(product.offerPrice * product.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right: summary */}
        <aside className="w-full space-y-4 lg:sticky lg:top-28 lg:w-[380px]">
          {/* Address */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-gray-800">
                <FiMapPin className="text-primary" /> Delivery address
              </h3>
              {addresses.length > 1 && (
                <button
                  onClick={() => setShowAddress((v) => !v)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {showAddress ? "Close" : "Change"}
                </button>
              )}
            </div>

            {selectedAddress ? (
              <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm">
                <p className="font-medium text-gray-800">
                  {selectedAddress.firstName} {selectedAddress.lastName}
                </p>
                <p className="mt-0.5 text-gray-600">{formatAddress(selectedAddress)}</p>
                {selectedAddress.phone && <p className="mt-0.5 text-gray-500">Phone: {selectedAddress.phone}</p>}
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-500">
                No address found. Add one to place your order.
              </p>
            )}

            {showAddress && (
              <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                {addresses.map((address) => {
                  const active = selectedAddress?._id === address._id;
                  return (
                    <button
                      key={address._id}
                      onClick={() => {
                        setSelectedAddress(address);
                        setShowAddress(false);
                      }}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition ${
                        active ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          active ? "border-primary bg-primary text-white" : "border-gray-300"
                        }`}
                      >
                        {active && <FiCheck className="text-[10px]" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium text-gray-800">
                          {address.firstName} {address.lastName}
                        </span>
                        <span className="block text-gray-500">{formatAddress(address)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <button
              onClick={() =>
                user ? navigate("/add-address") : toast.error("Please login to add an address")
              }
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <FiPlus /> Add new address
            </button>
          </section>

          {/* Payment */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="flex items-center gap-2 font-semibold text-gray-800">
              <FiCreditCard className="text-primary" /> Payment method
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {[
                { id: "COD", title: "Cash on Delivery", sub: "Pay when your order arrives", icon: <FiTruck /> },
                { id: "Online", title: "Pay Online", sub: "UPI, cards and net banking", icon: <FiCreditCard /> },
              ].map((opt) => {
                const active = paymentOption === opt.id;
                return (
                  <button
                    key={opt.id}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setPaymentOption(opt.id)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                      active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${
                        active ? "bg-primary text-white" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {opt.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-800">{opt.title}</span>
                      <span className="block text-xs text-gray-500">{opt.sub}</span>
                    </span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        active ? "border-primary bg-primary text-white" : "border-gray-300"
                      }`}
                    >
                      {active && <FiCheck className="text-xs" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Price details */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800">Price details</h3>
            <div className="mt-3 space-y-2 text-sm text-gray-600">
              <p className="flex justify-between">
                <span>
                  Price ({getCartCount()} {getCartCount() === 1 ? "item" : "items"})
                </span>
                <span>
                  {currency}
                  {cartTotal.toFixed(2)}
                </span>
              </p>
              <p className="flex justify-between">
                <span>Shipping fee</span>
                <span className="font-medium text-emerald-600">Free</span>
              </p>
            </div>
            <div className="my-3 border-t border-dashed border-gray-300" />
            <p className="flex items-center justify-between text-lg font-semibold text-gray-900">
              <span>Total amount</span>
              <span>
                {currency}
                {grandTotal.toFixed(2)}
              </span>
            </p>

            <button
              onClick={placeOrder}
              disabled={ctaDisabled}
              className={`mt-4 hidden w-full items-center justify-center gap-2 rounded-xl py-3 font-medium transition lg:flex ${
                ctaDisabled
                  ? "cursor-not-allowed bg-gray-300 text-white"
                  : "bg-primary text-white shadow-md hover:bg-primary-dull hover:shadow-lg"
              }`}
            >
              {isPlacing && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {ctaLabel}
            </button>

            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <FiShield /> Secure checkout
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FiTruck /> Free delivery
              </span>
            </div>
          </section>
        </aside>
      </div>

      {/* Mobile sticky checkout bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] lg:hidden">
        <div>
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg font-semibold text-gray-900">
            {currency}
            {grandTotal.toFixed(2)}
          </p>
        </div>
        <button
          onClick={placeOrder}
          disabled={ctaDisabled}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-medium transition ${
            ctaDisabled ? "cursor-not-allowed bg-gray-300 text-white" : "bg-primary text-white hover:bg-primary-dull"
          }`}
        >
          {isPlacing && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {isPlacing
            ? "Processing..."
            : cooldownSeconds > 0
            ? `Wait ${cooldownSeconds}s`
            : paymentOption === "COD"
            ? "Place Order"
            : "Pay Now"}
        </button>
      </div>
    </div>
  );
};

export default Cart;
