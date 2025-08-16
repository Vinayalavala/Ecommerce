import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppContext } from "../../context/appContext";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  FaBox,
  FaRupeeSign,
  FaChartPie,
  FaTimesCircle,
  FaDownload,
  FaFilter,
  FaUser,
  FaBell,
  FaClock,
  FaWarehouse,
} from "react-icons/fa";

/**
 * Analytics.jsx — Mobile-optimized full version (~700 lines)
 * ---------------------------------------------------------
 * You asked for the full corrected code without deleting any of your existing
 * code. This file:
 *  - Preserves your data logic and UI structure.
 *  - Adds robust mobile layout handling with Tailwind responsive utilities.
 *  - Improves small-screen usability: wrapping buttons, horizontal scroll for
 *    wide tables, touch-friendly spacing, sticky tabs on mobile, etc.
 *  - Keeps all imports (even the ones you weren't using) to honor “no delete”.
 *
 * Notes:
 *  - Tailwind classes are additive only — nothing removed.
 *  - Recharts areas now have ResponsiveContainer everywhere (already present).
 *  - Minor accessibility tweaks (aria-* where it helps, button labels).
 */

/* ------------------ Config ------------------ */
const COLORS = ["#2563EB", "#F97316", "#10B981", "#EC4899", "#9333EA", "#F59E0B", "#14B8A6"];
const TREND_OPTIONS = ["all", "daily", "weekly", "monthly", "yearly"];
const DEFAULT_MARGIN_PERCENT = 30; // fallback margin if no costPrice
const LOW_STOCK_THRESHOLD = 10; // products with stock <= this are shown in warnings

/* ------------------ Helpers ------------------ */
const formatCurrency = (v) => (typeof v === "number" ? `₹${v.toFixed(2)}` : "₹0.00");

const useOnScreen = (ref, rootMargin = "0px") => {
  // returns boolean when element is visible - for lazy rendering charts
  const [isIntersecting, setIntersecting] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIntersecting(entry.isIntersecting),
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, rootMargin]);
  return isIntersecting;
};

/* ------------------ Component ------------------ */
const Analytics = () => {
  const { axios } = useAppContext();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [trend, setTrend] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [customerFilter, setCustomerFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);

  // UI state
  const [activeTab, setActiveTab] = useState("performance"); // performance/products/customers/ops/recents
  const [monthlyTarget, setMonthlyTarget] = useState(50000); // editable monthly goal (₹)
  const mountedRef = useRef(true);

  // refs for lazy rendering
  const perfRef = useRef(null);
  const prodRef = useRef(null);
  const custRef = useRef(null);
  const opsRef = useRef(null);
  const recRef = useRef(null);

  const perfVisible = useOnScreen(perfRef, "0px");
  const prodVisible = useOnScreen(prodRef, "0px");
  const custVisible = useOnScreen(custRef, "0px");
  const opsVisible = useOnScreen(opsRef, "0px");
  const recVisible = useOnScreen(recRef, "0px");

  // Fetch orders (seller)
  useEffect(() => {
    mountedRef.current = true;
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get("/api/order/seller", { withCredentials: true });
        if (data?.success) setOrders(data.orders || []);
        else setOrders([]);
      } catch (err) {
        console.error("Analytics fetch error:", err);
        setOrders([]);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };
    fetch();
    return () => { mountedRef.current = false; };
  }, [axios]);

  /* ------------------ Aggregations ------------------ */
  const analytics = useMemo(() => {
    if (!orders || orders.length === 0) return null;

    // apply date range filters
    let filtered = [...orders];
    if (dateRange.from) {
      const f = new Date(dateRange.from);
      filtered = filtered.filter((o) => new Date(o.createdAt) >= f);
    }
    if (dateRange.to) {
      const t = new Date(dateRange.to); t.setHours(23,59,59,999);
      filtered = filtered.filter((o) => new Date(o.createdAt) <= t);
    }

    // customer filter (email or userId)
    if (customerFilter && customerFilter.trim() !== "") {
      const cf = customerFilter.trim().toLowerCase();
      filtered = filtered.filter((o) => {
        const email = (o.address?.email || "").toLowerCase();
        const uid = String(o.userId || "").toLowerCase();
        return email.includes(cf) || uid.includes(cf);
      });
    }

    // trend filter relative to now
    const now = moment();
    if (trend !== "all") {
      filtered = filtered.filter((o) => {
        const od = moment(o.createdAt);
        if (trend === "daily") return od.isSame(now, "day");
        if (trend === "weekly") return od.isSame(now, "week");
        if (trend === "monthly") return od.isSame(now, "month");
        if (trend === "yearly") return od.isSame(now, "year");
        return true;
      });
    }

    // Basic KPIs
    const totalOrders = filtered.length;
    const totalRevenue = filtered.filter(o => o.status !== "Cancelled").reduce((s,o) => s + Number(o.amount || 0), 0);
    const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

    // Product sales + cost aggregation
    const productMap = {};
    filtered.forEach((o) => {
      (o.items || []).forEach((it) => {
        const pid = it.product?._id || String(it.product || "unknown");
        const name = it.product?.name || it.name || "Unknown";
        const unitPrice = Number(it.product?.offerPrice ?? it.offerPrice ?? 0);
        const costPrice = Number(it.product?.costPrice ?? NaN);

        if (!productMap[pid]) productMap[pid] = { productId: pid, name, quantitySold: 0, totalRevenue: 0, totalCost: 0, stock: it.product?.stock ?? null };
        productMap[pid].quantitySold += Number(it.quantity || 0);
        productMap[pid].totalRevenue += unitPrice * Number(it.quantity || 0);

        const assumedCostPerUnit = !isNaN(costPrice) ? costPrice : (unitPrice * (100 - DEFAULT_MARGIN_PERCENT) / 100);
        productMap[pid].totalCost += assumedCostPerUnit * Number(it.quantity || 0);
      });
    });
    const productSales = Object.values(productMap).sort((a,b)=> b.quantitySold - a.quantitySold);

    // revenue trend by day
    const revMap = {};
    filtered.forEach((o) => {
      const d = moment(o.createdAt).format("YYYY-MM-DD");
      if (!revMap[d]) revMap[d] = 0;
      if (o.status !== "Cancelled") revMap[d] += Number(o.amount || 0);
    });
    const revenueTrend = Object.entries(revMap).map(([date, revenue]) => ({ date, revenue })).sort((a,b)=> new Date(a.date)-new Date(b.date));

    // cumulative revenue
    const cumulative = [];
    let running = 0;
    revenueTrend.forEach((r) => { running += r.revenue; cumulative.push({ date: r.date, cumulative: running, revenue: r.revenue }); });

    // sales vs cancelled counts & values
    let salesCount = 0, salesValue = 0, cancelledCount = 0, cancelledValue = 0;
    filtered.forEach((o) => {
      if (o.status === "Cancelled") { cancelledCount++; cancelledValue += Number(o.amount || 0); }
      else { salesCount++; salesValue += Number(o.amount || 0); }
    });

    // payment methods breakdown
    const paymentMap = {};
    filtered.forEach(o => {
      const p = o.paymentType || "Unknown";
      paymentMap[p] = (paymentMap[p] || 0) + 1;
    });
    const paymentData = Object.entries(paymentMap).map(([name, value]) => ({ name, value }));

    // status breakdown
    const statusMap = {};
    filtered.forEach(o => { const s = o.status || "Unknown"; statusMap[s] = (statusMap[s]||0)+1; });
    const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    // weekday heatmap revenue
    const weekdayRev = [0,0,0,0,0,0,0]; // Sun..Sat
    filtered.forEach(o => { weekdayRev[new Date(o.createdAt).getDay()] += Number(o.amount || 0); });
    const weekdayData = weekdayRev.map((rev, idx) => ({ idx, day: moment().day(idx).format("ddd"), revenue: rev }));

    // best customers by orders & revenue
    const custMap = {};
    filtered.forEach(o => {
      const key = o.address?.email || o.userId || "unknown";
      const display = o.address?.email || `${o.address?.firstName || ""} ${o.address?.lastName || ""}`.trim() || o.userId || "Guest";
      if (!custMap[key]) custMap[key] = { key, display, orders: 0, revenue: 0 };
      custMap[key].orders += 1; custMap[key].revenue += Number(o.amount || 0);
    });
    const bestByOrders = Object.values(custMap).sort((a,b)=> b.orders - a.orders).slice(0,10);
    const bestByRevenue = Object.values(custMap).sort((a,b)=> b.revenue - a.revenue).slice(0,10);

    // recent orders (latest 10)
    const recentOrders = [...filtered].sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)).slice(0,10);

    // low stock warnings (from product info in productSales)
    const lowStock = productSales.filter(p => p.stock !== null && typeof p.stock === "number" && p.stock <= LOW_STOCK_THRESHOLD);

    // avg processing/delivery time (if deliveredAt exists)
    let totalDeliveryDays = 0, deliveredCount = 0;
    filtered.forEach(o => {
      if (o.deliveredAt && o.createdAt) {
        const days = moment(o.deliveredAt).diff(moment(o.createdAt), "days", true);
        totalDeliveryDays += days; deliveredCount++;
      }
    });
    const avgDeliveryDays = deliveredCount ? (totalDeliveryDays / deliveredCount) : null;

    // estimated profit
    const totalCost = productSales.reduce((s,p) => s + (p.totalCost || 0), 0);
    const estimatedProfit = totalRevenue - totalCost;

    return {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      productSales,
      revenueTrend,
      cumulative,
      salesCount, salesValue, cancelledCount, cancelledValue,
      paymentData,
      statusData,
      weekdayData,
      bestByOrders,
      bestByRevenue,
      recentOrders,
      lowStock,
      avgDeliveryDays,
      estimatedProfit
    };
  }, [orders, trend, dateRange, customerFilter]);

  /* ------------------ Exports ------------------ */
  const downloadCSV = (rows, filename = "export.csv") => {
const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.setAttribute("download", filename); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const exportProductsCSV = () => {
    if (!analytics?.productSales) return;
    const rows = [["ProductId","ProductName","QtySold","Revenue","Cost","EstProfit"], ...analytics.productSales.map(p=>[p.productId, p.name, p.quantitySold, p.totalRevenue.toFixed(2), (p.totalCost||0).toFixed(2), (p.totalRevenue - (p.totalCost||0)).toFixed(2)])];
    downloadCSV(rows, "product_sales.csv");
  };

  const exportOrdersCSV = () => {
    const rows = [["OrderId","Date","Customer","Amount","Status","Payment","Products"], ...(orders || []).map(o=>[
      o._id, moment(o.createdAt).format("YYYY-MM-DD HH:mm"), o.address?.email || `${o.address?.firstName||""} ${o.address?.lastName||""}`.trim(), Number(o.amount||0).toFixed(2), o.status || "", o.paymentType || "", (o.items||[]).map(i => `${i.product?.name || i.name || "Unknown"} (x${i.quantity})`).join(" | ")
    ])];
    downloadCSV(rows, "all_orders.csv");
  };

  /* ------------------ UI helpers ------------------ */
  const goToProduct = (pid) => { if (!pid) return; navigate(`/product/${pid}`); };
  const goToOrder = (id) => { if(!id) return; navigate(`/seller/orders`); /* you could pass search param to jump */ };

  const clearFilters = () => { setTrend("all"); setDateRange({ from: "", to: "" }); setCustomerFilter(""); };

  /* ------------------ Render ------------------ */
  if (loading) return <div className="p-8 text-center">Loading analytics...</div>;
  if (!analytics) return <div className="p-8 text-center text-gray-600">No data available.</div>;

  /* heatmap color */
  const maxWeek = Math.max(...analytics.weekdayData.map(d=>d.revenue), 0);

  return (
    <div className="p-4 sm:p-6 min-h-screen bg-gradient-to-br from-[#F1F5F9] to-white">
      {/* Header + Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Seller Analytics Hub</h1>
          <p className="text-sm text-[#475569]">Comprehensive insights for your store — updated client-side.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={exportProductsCSV} className="px-3 py-2 bg-[#2563EB] text-white rounded hover:opacity-95 flex items-center gap-2"><FaDownload aria-hidden/> <span className="text-sm">Export Products</span></button>
          <button onClick={exportOrdersCSV} className="px-3 py-2 bg-[#10B981] text-white rounded hover:opacity-95 flex items-center gap-2"><FaDownload aria-hidden/> <span className="text-sm">Export Orders</span></button>
          <button onClick={() => setFiltersOpen(s=>!s)} className="px-3 py-2 bg-white border rounded flex items-center gap-2"><FaFilter aria-hidden/> <span className="text-sm">Filters</span></button>
        </div>
      </div>

      {/* Filters */}
      {filtersOpen && (
        <div className="bg-white rounded shadow p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="text-xs font-medium text-[#1E293B]">Trend</label>
              <select className="w-full p-2 border rounded" value={trend} onChange={e=>setTrend(e.target.value)}>
                {TREND_OPTIONS.map(opt => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase()+opt.slice(1)}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-[#1E293B]">From</label>
              <input type="date" value={dateRange.from} onChange={e=>setDateRange(prev=>({...prev, from:e.target.value}))} className="w-full p-2 border rounded" />
            </div>

            <div>
              <label className="text-xs font-medium text-[#1E293B]">To</label>
              <input type="date" value={dateRange.to} onChange={e=>setDateRange(prev=>({...prev, to:e.target.value}))} className="w-full p-2 border rounded" />
            </div>

            <div>
              <label className="text-xs font-medium text-[#1E293B]">Customer (email/id)</label>
              <input placeholder="email or user id" value={customerFilter} onChange={e=>setCustomerFilter(e.target.value)} className="w-full p-2 border rounded" />
            </div>

            <div>
              <label className="text-xs font-medium text-[#1E293B]">Monthly Target (₹)</label>
              <input type="number" value={monthlyTarget} onChange={e=>setMonthlyTarget(Number(e.target.value||0))} className="w-full p-2 border rounded" />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end mt-3 gap-2">
            <button className="px-3 py-1 border rounded bg-white text-sm" onClick={clearFilters}>Clear</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 -mx-4 sm:mx-0">
        {/* sticky tab bar on mobile */}
        <div className="sticky top-0 z-10 bg-gradient-to-b from-white/95 to-white/75 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="overflow-x-auto scrollbar-thin">
            <nav className="flex gap-2 min-w-max px-4 py-1">
              <Tab name="performance" active={activeTab==="performance"} onClick={()=>setActiveTab("performance")}>Performance</Tab>
              <Tab name="products" active={activeTab==="products"} onClick={()=>setActiveTab("products")}>Products</Tab>
              <Tab name="customers" active={activeTab==="customers"} onClick={()=>setActiveTab("customers")}>Customers</Tab>
              <Tab name="ops" active={activeTab==="ops"} onClick={()=>setActiveTab("ops")}>Operations</Tab>
              <Tab name="recents" active={activeTab==="recents"} onClick={()=>setActiveTab("recents")}>Recents</Tab>
            </nav>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <KPI title="Total Orders" value={analytics.totalOrders} icon={<FaBox />} color="#2563EB" />
        <KPI title="Total Revenue" value={formatCurrency(analytics.totalRevenue)} icon={<FaRupeeSign />} color="#10B981" />
        <KPI title="Avg Order Value" value={formatCurrency(analytics.avgOrderValue)} icon={<FaRupeeSign />} color="#9333EA" />
        <KPI title="Top Product" value={analytics.productSales[0]?.name || "N/A"} icon={<FaChartPie />} color="#F97316" />
        <KPI title="Cancelled Orders" value={analytics.statusData.find(s=>s.name==='Cancelled')?.value||0} icon={<FaTimesCircle />} color="#EF4444" />
        <KPI title="Est. Profit" value={formatCurrency(analytics.estimatedProfit)} icon={<FaRupeeSign />} color="#F59E0B" />
      </div>

      {/* Monthly Target Progress */}
      <div className="bg-white rounded p-4 shadow mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-sm text-[#475569]">Monthly Target</div>
            <div className="text-lg font-semibold">{formatCurrency(monthlyTarget)}</div>
          </div>
          <div className="w-full sm:w-2/3">
            <div className="h-4 bg-gray-200 rounded overflow-hidden">
              <div style={{ width: `${Math.min(100, (analytics.totalRevenue / monthlyTarget) * 100)}%` }} className="h-full bg-[#2563EB]"></div>
            </div>
            <div className="text-xs text-gray-600 mt-1">{((analytics.totalRevenue / monthlyTarget) * 100).toFixed(1)}% achieved</div>
          </div>
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {/* Performance Tab */}
        <section ref={perfRef} style={{ display: activeTab==="performance" ? "block" : "none" }}>
          {perfVisible || activeTab==="performance" ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Revenue + Cumulative */}
              <div className="bg-white rounded p-4 shadow col-span-2">
                <h3 className="font-semibold mb-2">Revenue Over Time & Cumulative</h3>
                {analytics.revenueTrend.length === 0 ? <div className="text-sm text-gray-500">No revenue data.</div> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={analytics.cumulative} margin={{ left: 8, right: 8, top: 8 }}>
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(d)=>moment(d).format("DD MMM")} minTickGap={24} />
                      <YAxis />
                      <Tooltip formatter={(v)=>formatCurrency(v)} labelFormatter={(d)=>moment(d).format("MMMM DD, YYYY")} />
                      <Legend />
                      <Area type="monotone" dataKey="cumulative" stroke="#2563EB" fill="url(#revenueGrad)" name="Cumulative Revenue" />
                      <Line type="monotone" dataKey="revenue" stroke="#10B981" dot={false} name="Daily Revenue" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Sales vs Cancelled */}
              <div className="bg-white rounded p-4 shadow">
                <h3 className="font-semibold mb-2">Sales vs Cancelled</h3>
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{ name: "Orders", Sales: analytics.salesCount, Cancelled: analytics.cancelledCount, "SalesValue": analytics.salesValue, "CancelledValue": analytics.cancelledValue }]}> 
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(v)=> (Number.isFinite(v) ? v : v)} />
                      <Legend />
                      <Bar dataKey="Sales" fill="#2563EB" />
                      <Bar dataKey="Cancelled" fill="#EF4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-3 text-sm text-gray-600">
                  <div>Sales value: {formatCurrency(analytics.salesValue)}</div>
                  <div>Cancelled value: {formatCurrency(analytics.cancelledValue)}</div>
                </div>
              </div>
            </div>
          ) : <div style={{minHeight:200}}></div>}
        </section>

        {/* Products Tab */}
        <section ref={prodRef} style={{ display: activeTab==="products" ? "block" : "none" }}>
          {prodVisible || activeTab==="products" ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded p-4 shadow lg:col-span-2">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="font-semibold">Top Products</h3>
                  <button onClick={exportProductsCSV} className="px-3 py-1.5 text-xs sm:text-sm bg-[#2563EB] text-white rounded flex items-center gap-2"><FaDownload/> Export CSV</button>
                </div>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full text-xs sm:text-sm min-w-[720px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left">#</th>
                        <th className="p-2 text-left">Product</th>
                        <th className="p-2">Qty Sold</th>
                        <th className="p-2">Revenue</th>
                        <th className="p-2">Est. Profit</th>
                        <th className="p-2">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.productSales.map((p, idx) => (
                        <tr key={p.productId} className="hover:bg-gray-50 cursor-pointer" onClick={()=>goToProduct(p.productId)}>
                          <td className="p-2">{idx+1}</td>
                          <td className="p-2 max-w-[220px] truncate" title={p.name}>{p.name}</td>
                          <td className="p-2 text-center">{p.quantitySold}</td>
                          <td className="p-2 text-center">{formatCurrency(p.totalRevenue)}</td>
                          <td className="p-2 text-center">{formatCurrency(p.totalRevenue - (p.totalCost||0))}</td>
                          <td className={`p-2 text-center ${p.stock !== null && p.stock <= LOW_STOCK_THRESHOLD ? "text-red-600 font-semibold" : ""}`}>{p.stock !== null ? p.stock : "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded p-4 shadow">
                <h3 className="font-semibold mb-3">Low Stock Warnings</h3>
                {analytics.lowStock.length === 0 ? <div className="text-sm text-gray-500">No low stock items (threshold: {LOW_STOCK_THRESHOLD})</div> : (
                  <ul className="text-sm divide-y">
                    {analytics.lowStock.map(p => (
                      <li key={p.productId} className="py-2 flex justify-between items-center">
                        <div className="min-w-0">
                          <div className="font-medium truncate" title={p.name}>{p.name}</div>
                          <div className="text-xs text-gray-500">Stock: {p.stock}</div>
                        </div>
                        <button className="px-2 py-1 bg-[#F97316] text-white rounded" onClick={()=>goToProduct(p.productId)}>View</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : <div style={{minHeight:200}}></div>}
        </section>

        {/* Customers Tab */}
        <section ref={custRef} style={{ display: activeTab==="customers" ? "block" : "none" }}>
          {custVisible || activeTab==="customers" ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded p-4 shadow">
                <h3 className="font-semibold mb-2">Best Customers (by Orders)</h3>
                <ol className="list-decimal ml-5 text-sm">
                  {analytics.bestByOrders.map(c => (
                    <li key={c.key} className="mb-2">
                      <button onClick={()=>{ setCustomerFilter(c.key); window.scrollTo({top:0, behavior:"smooth"}); }} className="text-left">
                        <div className="font-medium truncate" title={c.display}>{c.display}</div>
                        <div className="text-xs text-gray-500">{c.orders} orders</div>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-white rounded p-4 shadow">
                <h3 className="font-semibold mb-2">Best Customers (by Revenue)</h3>
                <ol className="list-decimal ml-5 text-sm">
                  {analytics.bestByRevenue.map(c => (
                    <li key={c.key} className="mb-2">
                      <button onClick={()=>{ setCustomerFilter(c.key); window.scrollTo({top:0, behavior:"smooth"}); }} className="text-left">
                        <div className="font-medium truncate" title={c.display}>{c.display}</div>
                        <div className="text-xs text-gray-500">{formatCurrency(c.revenue)}</div>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-white rounded p-4 shadow">
                <h3 className="font-semibold mb-2">Payment Method Breakdown</h3>
                {analytics.paymentData.length === 0 ? <div className="text-sm text-gray-500">No payment data</div> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={analytics.paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                        {analytics.paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          ) : <div style={{minHeight:200}}></div>}
        </section>

        {/* Operations Tab */}
        <section ref={opsRef} style={{ display: activeTab==="ops" ? "block" : "none" }}>
          {opsVisible || activeTab==="ops" ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded p-4 shadow lg:col-span-2">
                <h3 className="font-semibold mb-3">Order Status & Avg Delivery Time</h3>
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.statusData}>
                      <XAxis dataKey="name"/>
                      <YAxis/>
                      <Tooltip/>
                      <Bar dataKey="value" fill="#2563EB"/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-3 text-sm">
                  <div>Avg delivery days: {analytics.avgDeliveryDays ? analytics.avgDeliveryDays.toFixed(2)+" days" : "N/A (deliveredAt missing)"}</div>
                </div>
              </div>

              <div className="bg-white rounded p-4 shadow">
                <h3 className="font-semibold mb-3">Sales Heatmap (Weekdays)</h3>
                <div className="grid grid-cols-7 gap-2">
                  {analytics.weekdayData.map(d => (
                    <div key={d.idx} className="flex flex-col items-center">
                      <div title={`${d.day}: ${formatCurrency(d.revenue)}`} style={{ width:48, height:48, borderRadius:8, background: getHeatColor(d.revenue, maxWeek), display:"flex", alignItems:"center", justifyContent:"center"}}>
                        <div className="text-xs font-medium text-[#0f172a]">{d.day}</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{Math.round(d.revenue)}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <h4 className="font-medium text-sm mb-1">Low Stock Items</h4>
                  {analytics.lowStock.length === 0 ? <div className="text-sm text-gray-500">No low stock</div> : (
                    <ul className="text-sm">
                      {analytics.lowStock.slice(0,6).map(p => (
                        <li key={p.productId} className="flex justify-between items-center mb-2">
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-gray-500">Stock: {p.stock}</div>
                          </div>
                          <button onClick={()=>goToProduct(p.productId)} className="px-2 py-1 bg-[#F97316] text-white rounded">View</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ) : <div style={{minHeight:200}}></div>}
        </section>

        {/* Recents Tab */}
        <section ref={recRef} style={{ display: activeTab==="recents" ? "block" : "none" }}>
          {recVisible || activeTab==="recents" ? (
            <div className="bg-white rounded p-4 shadow mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <h3 className="font-semibold">Recent Orders</h3>
                <div className="text-xs sm:text-sm text-gray-500">Showing {analytics.recentOrders.length} recent orders</div>
              </div>

              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-xs sm:text-sm min-w-[880px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Order ID</th>
                      <th className="p-2">Date</th>
                      <th className="p-2">Customer</th>
                      <th className="p-2">Products</th>
                      <th className="p-2">Amount</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recentOrders.map(o => (
                      <tr key={o._id} className="hover:bg-gray-50">
                        <td className="p-2"><button className="text-blue-600 underline" onClick={()=>goToOrder(o._id)}>{o._id}</button></td>
                        <td className="p-2">{moment(o.createdAt).format("YYYY-MM-DD HH:mm")}</td>
                        <td className="p-2 max-w-[220px] truncate" title={o.address?.email || `${o.address?.firstName||""} ${o.address?.lastName||""}`.trim() || "Guest"}>{o.address?.email || `${o.address?.firstName||""} ${o.address?.lastName||""}`.trim() || "Guest"}</td>
                        <td className="p-2 max-w-[320px] truncate" title={(o.items||[]).map(i=>i.product?.name||i.name||"Unknown").join(", ")}>{(o.items||[]).map(i=>i.product?.name||i.name||"Unknown").slice(0,3).join(", ")}{(o.items||[]).length>3?"...":""}</td>
                        <td className="p-2 text-center">{formatCurrency(o.amount)}</td>
                        <td className="p-2 text-center">{o.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : <div style={{minHeight:200}}></div>}
        </section>
      </div>
    </div>
  );
};

/* ------------------ Small components ------------------ */

const Tab = ({  active, onClick, children }) => (
  <button
    aria-pressed={active}
    onClick={onClick}
    className={`px-3 py-2 rounded-t text-sm whitespace-nowrap ${active ? "bg-white border-t border-l border-r text-[#1E293B] font-semibold" : "bg-transparent text-[#475569] hover:text-[#111827]"}`}
  >
    {children}
  </button>
);

const KPI = ({ title, value, icon, color }) => (
  <div className="bg-white rounded p-3 shadow flex items-start gap-3">
    <div style={{background: color, color:"white"}} className="p-2 rounded"><span aria-hidden>{icon}</span></div>
    <div>
      <div className="text-xs text-[#475569]">{title}</div>
      <div className="text-lg font-semibold text-[#0f172a]">{value}</div>
    </div>
  </div>
);

/* heatmap color util */
const getHeatColor = (val, max) => {
  if (max === 0) return "#F8FAFC";
  const t = Math.min(1, val / max);
  // interpolate between light and primary
  const start = [241,245,249]; // #F1F5F9
  const end = [37,99,235]; // #2563EB
  const rgb = start.map((s,i)=> Math.round(s + (end[i]-s)*t));
  return `rgb(${rgb.join(",")})`;
};

export default Analytics;
