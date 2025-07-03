import { useEffect, useState } from "react";
import axios from "axios";

const SellerDashboard = () => {
  const [data, setData] = useState({
    totalOrders: 0,
    totalTransactions: 0,
    totalIncome: 0
  });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axios.get("/api/seller/dashboard"); // Adjust URL as needed
        setData(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDashboard();
  }, []);


  return (
    <div className="p-6 bg-white rounded-lg shadow-xl w-full">
      <h2 className="text-xl font-bold mb-4">Seller Overview</h2>


      <div className="mt-6 flex justify-around text-center">
        <div>
          <p className="text-lg font-semibold">{data.totalOrders}</p>
          <p className="text-gray-500">Total Orders</p>
        </div>
        <div>
          <p className="text-lg font-semibold">{data.totalTransactions}</p>
          <p className="text-gray-500">Successful Transactions</p>
        </div>
        <div>
          <p className="text-lg font-semibold">₹{data.totalIncome}</p>
          <p className="text-gray-500">Total Income</p>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
