import React, { useContext } from "react";
import { FiShoppingCart, FiChevronRight } from "react-icons/fi";
import { AppContext } from "../context/appContext";
import { useNavigate } from "react-router-dom";

const ViewCartButton = () => {
  const { cartItems } = useContext(AppContext);
  const navigate = useNavigate();

  const itemCount = Object.values(cartItems || {}).reduce((sum, qty) => sum + qty, 0);

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
      <button
        onClick={() => navigate("/cart")}
        className="flex items-center cursor-pointer hover:scale-105 gap-2 px-4 py-2 rounded-full shadow-md border border-gray-300 backdrop-blur-md bg-white/10 text-black text-sm"
      >
        <div className="relative">
          <FiShoppingCart size={18} />
          <span className="absolute -top-2 -right-2 text-[10px] font-bold bg-white text-black rounded-full px-1.5 py-0.5">
            {itemCount}
          </span>
        </div>

        <span className="font-medium">View Cart</span>
        <FiChevronRight size={12} />
      </button>
    </div>
  );
};

export default ViewCartButton;
