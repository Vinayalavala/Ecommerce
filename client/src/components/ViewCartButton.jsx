import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { FiShoppingCart, FiChevronRight } from "react-icons/fi";
import { AppContext } from "../context/appContext";
import { useLocation, useNavigate } from "react-router-dom";

const HIDDEN_ON = ["/cart", "/add-address", "/seller"];

const ViewCartButton = () => {
  const { cartItems, products, currency } = useContext(AppContext);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const itemCount = useMemo(
    () => Object.values(cartItems || {}).reduce((sum, qty) => sum + qty, 0),
    [cartItems]
  );

  const total = useMemo(() => {
    if (!products?.length) return null;
    return Object.entries(cartItems || {}).reduce((sum, [id, qty]) => {
      const product = products.find((p) => p._id === id);
      return product ? sum + Number(product.offerPrice) * qty : sum;
    }, 0);
  }, [cartItems, products]);

  const [visible, setVisible] = useState(false);
  const [bump, setBump] = useState(false);
  const prevCount = useRef(0);

  useEffect(() => {
    if (itemCount > 0) {
      const t = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(t);
    }
    setVisible(false);
  }, [itemCount]);

  useEffect(() => {
    if (itemCount > 0 && prevCount.current !== itemCount) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 200);
      prevCount.current = itemCount;
      return () => clearTimeout(t);
    }
    prevCount.current = itemCount;
  }, [itemCount]);

  if (itemCount === 0) return null;
  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4">
      <button
        onClick={() => navigate("/cart")}
        aria-label={`View cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
        className={`pointer-events-auto flex w-full max-w-sm items-center justify-between gap-4 rounded-2xl bg-primary px-4 py-3 text-white shadow-xl shadow-primary/30 transition-all duration-300 ease-out hover:bg-primary-dull active:scale-95 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        } ${bump ? "scale-105" : "scale-100"}`}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <FiShoppingCart size={18} />
          </span>
          <span className="text-left leading-tight">
            <span className="block text-xs text-white/80">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
            {total !== null && (
              <span className="block text-sm font-semibold">
                {currency}
                {total.toFixed(2)}
              </span>
            )}
          </span>
        </div>

        <span className="flex items-center gap-1 text-sm font-semibold">
          View Cart
          <FiChevronRight size={16} />
        </span>
      </button>
    </div>
  );
};

export default ViewCartButton;
