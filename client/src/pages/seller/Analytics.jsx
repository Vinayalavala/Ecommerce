import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, PieChart, Pie, Cell,
} from "recharts";
import moment from "moment";
import { FaBox, FaRupeeSign, FaChartPie, FaTimesCircle } from "react-icons/fa";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#845EC2'];
const TREND_OPTIONS = ["daily", "weekly", "monthly", "yearly", "all"];

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [trend, setTrend] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const query = `?trend=${trend}&from=${dateRange.from}&to=${dateRange.to}`;
        const res = await axios.get(`/api/seller-analytics${query}`);
        setAnalytics(res.data);
      } catch (err) {
        console.error("Failed to load analytics", err);
      }
    };
    fetchAnalytics();
  }, [trend, dateRange]);

  return (
    <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100 h-screen overflow-y-auto">
      <h1 className="text-lg sm:text-xl font-bold mb-4 text-gray-800">Analytics Dashboard</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
          <label className="font-semibold text-sm">Trend:</label>
          <select
            className="p-2 rounded border bg-white text-sm shadow-sm"
            value={trend}
            onChange={(e) => setTrend(e.target.value)}
          >
            {TREND_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
          <label className="font-semibold text-sm">From:</label>
          <input
            type="date"
            className="p-2 rounded border bg-white text-sm shadow-sm"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
          />
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
          <label className="font-semibold text-sm">To:</label>
          <input
            type="date"
            className="p-2 rounded border bg-white text-sm shadow-sm"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
          />
        </div>
      </div>

      {!analytics ? (
        <div className="text-center py-20 text-gray-600 text-base animate-pulse">Fetching your analytics...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <SummaryCard title="Total Orders" value={analytics.totalOrders} icon={<FaBox />} color="text-blue-600" />
            <SummaryCard title="Total Revenue" value={`₹${analytics.totalIncome}`} icon={<FaRupeeSign />} color="text-green-600" />
            <SummaryCard title="Top Product" value={analytics.productSales[0]?.name || 'N/A'} icon={<FaChartPie />} color="text-indigo-600" />
            <SummaryCard title="Cancelled Orders" value={analytics.cancelledOrders.length} icon={<FaTimesCircle />} color="text-red-500" />
          </div>

          {/* Charts */}
          <ChartBlock title="Revenue by Product">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.productSales}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalRevenue" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </ChartBlock>

          <ChartBlock title="Quantity Sold per Product">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.productSales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="quantitySold" stroke="#10b981" />
              </LineChart>
            </ResponsiveContainer>
          </ChartBlock>

          <ChartBlock title="Sales Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.productSales}
                  dataKey="totalRevenue"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={window.innerWidth < 640 ? 70 : 100}
                  label
                >
                  {analytics.productSales.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartBlock>

          {/* Cancelled Orders List (mobile-friendly stack) */}
          <ChartBlock title="Cancelled Orders List">
            {analytics.cancelledOrders.length === 0 ? (
              <p className="text-sm text-gray-600">No cancelled orders.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {analytics.cancelledOrders.map((order) => (
                  <div
                    key={order._id}
                    className="bg-white rounded-lg shadow border p-4 text-sm flex flex-col gap-1"
                  >
                    <div><span className="font-semibold">Order ID:</span> {order._id}</div>
                    <div><span className="font-semibold">Product:</span> {order.name || "N/A"}</div>
                    <div><span className="font-semibold">Quantity:</span> {order.quantity}</div>
                    <div><span className="font-semibold">Reason:</span> {order.reason || "Not specified"}</div>
                    <div><span className="font-semibold">Date:</span> {moment(order.createdAt).format("DD MMM YYYY")}</div>
                  </div>
                ))}
              </div>
            )}
          </ChartBlock>
        </>
      )}
    </div>
  );
};

const SummaryCard = ({ title, value, icon, color }) => (
  <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition duration-300 flex flex-col items-center text-center text-sm">
    <div className={`text-2xl mb-1 ${color}`}>{icon}</div>
    <h2 className="font-semibold text-gray-600">{title}</h2>
    <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
  </div>
);

const ChartBlock = ({ title, children, className = "" }) => (
  <div className={`bg-white p-4 rounded-xl shadow mb-8 ${className}`}>
    <h3 className="text-lg font-semibold mb-3 text-gray-800">{title}</h3>
    {children}
  </div>
);

export default Analytics;
