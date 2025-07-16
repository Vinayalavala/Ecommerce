import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../context/appContext";
import { useNavigate } from "react-router-dom";


const CartPreview = () => {
  const { cartItems, lastAddedItem, setLastAddedItem } = useContext(AppContext);
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (lastAddedItem) {
      setVisible(true);
      const timeout = setTimeout(() => {
        setVisible(false);
        setLastAddedItem(null);
      }, 4000);
      return () => clearTimeout(timeout);
    }
  }, [lastAddedItem]);

  if (!visible || !lastAddedItem) return null;

  const otherItems = Object.entries(cartItems).filter(
    ([id]) => id !== lastAddedItem._id
  );

  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-md bg-white shadow-lg border border-gray-200 rounded-xl p-4 animate-fadeIn">
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          <img
            src={lastAddedItem.image[0]}
            alt={lastAddedItem.name}
            className="w-14 h-14 rounded-md object-cover"
          />
          <div>
            <p className="text-sm font-semibold text-gray-800">{lastAddedItem.name}</p>
            <p className="text-xs text-gray-500">Added to cart</p>
          </div>
        </div>
        <button
          className="text-xs text-blue-600 hover:underline"
          onClick={() => navigate("/cart")}
        >
          View Cart
        </button>
      </div>

      {otherItems.length > 0 && (
        <div className="mt-3 border-t pt-3">
          <p className="text-xs font-medium text-gray-600 mb-2">Also in your cart:</p>
          <ul className="text-xs text-gray-500 space-y-1 max-h-24 overflow-auto">
            {otherItems.slice(0, 3).map(([id, qty]) => (
              <li key={id}>
                • ID: {id} × {qty}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CartPreview;
