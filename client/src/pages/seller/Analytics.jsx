// Analytics.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppContext } from "../../context/appContext";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  BarChart,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  FaBox,
  FaRupeeSign,
  FaChartLine,
  FaTrophy,
  FaTimesCircle,
  FaCoins,
  FaDownload,
  FaFilter,
  FaSyncAlt,
} from "react-icons/fa";

/* ------------------ Config ------------------ */
const PERIODS = [
  { value: "all", label: "All time" },
  { value: "daily", label: "Today" },
  { value: "weekly", label: "This week" },
  { value: "monthly", label: "This month" },
  { value: "yearly", label: "This year" },
];
const PERIOD_UNIT = { daily: "day", weekly: "week", monthly: "month", yearly: "year" };

const TABS = [
  { id: "performance", label: "Performance" },
  { id: "products", label: "Products" },
  { id: "customers", label: "Customers" },
  { id: "ops", label: "Operations" },
  { id: "recents", label: "Recent orders" },
];

const DEFAULT_MARGIN_PERCENT = 30; // fallback margin when a product has no costPrice
const LOW_STOCK_THRESHOLD = 10; // products with stock <= this are flagged
const MAX_GAP_FILL_DAYS = 400; // fill empty days in the revenue chart up to this span
const TARGET_STORAGE_KEY = "analytics:monthlyTarget";

const PALETTE = ["#0f172a", "#475569", "#94a3b8", "#cbd5e1", "#2563eb", "#7c3aed"];
const INK = "#0f172a";
const AXIS_TICK = { fontSize: 12, fill: "#64748b" };

/* ------------------ Helpers ------------------ */
const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (v) => inrFormatter.format(toNumber(v));

const compactINR = (v) => {
  const n = toNumber(v);
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
};

const isCancelled = (o) => String(o?.status || "").toLowerCase() === "cancelled";
const orderTotal = (o) => toNumber(o?.amount);

const customerName = (o) => `${o?.address?.firstName || ""} ${o?.address?.lastName || ""}`.trim();
const customerLabel = (o) => o?.address?.email || customerName(o) || o?.userId || "Guest";

const shorten = (s, n = 16) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s || "");

const statusColor = (name, i = 0) => {
  const s = String(name || "").toLowerCase();
  if (s.includes("deliver")) return "#16a34a";
  if (s.includes("cancel")) return "#dc2626";
  if (s.includes("ship") || s.includes("transit")) return "#7c3aed";
  if (s.includes("process") || s.includes("pack")) return "#d97706";
  if (s.includes("place") || s.includes("confirm")) return "#2563eb";
  return PALETTE[i % PALETTE.length];
};

const statusBadgeClass = (name) => {
  const s = String(name || "").toLowerCase();
  if (s.includes("deliver")) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (s.includes("cancel")) return "bg-red-50 text-red-700 ring-red-200";
  if (s.includes("ship") || s.includes("transit")) return "bg-violet-50 text-violet-700 ring-violet-200";
  if (s.includes("process") || s.includes("pack")) return "bg-amber-50 text-amber-700 ring-amber-200";
  if (s.includes("place") || s.includes("confirm")) return "bg-blue-50 text-blue-700 ring-blue-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
};

// Light slate -> slate-900
const getHeatColor = (val, max) => {
  if (!max) return "#f1f5f9";
  const t = Math.min(1, val / max);
  const start = [241, 245, 249];
  const end = [15, 23, 42];
  return `rgb(${start.map((s, i) => Math.round(s + (end[i] - s) * t)).join(",")})`;
};

// Guard against spreadsheet formula injection in exported CSVs
const csvCell = (c) => {
  let s = c === null || c === undefined ? "" : String(c);
  if (typeof c === "string" && /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

const downloadCSV = (rows, filename) => {
  const csv = "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/* ------------------ Component ------------------ */
const Analytics = () => {
  const { axios } = useAppContext();
  const navigate = useNavigate();
  const rootRef = useRef(null);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [period, setPeriod] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [customerFilter, setCustomerFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("performance");
  const [monthlyTarget, setMonthlyTarget] = useState(() => {
    try {
      const v = Number(localStorage.getItem(TARGET_STORAGE_KEY));
      return v > 0 ? v : 50000;
    } catch {
      return 50000;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(TARGET_STORAGE_KEY, String(monthlyTarget));
    } catch {
      /* storage unavailable */
    }
  }, [monthlyTarget]);

  /* ---- Fetch orders ---- */
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await axios.get("/api/order/seller", { withCredentials: true });
        if (!active) return;
        if (data?.success) {
          setOrders(Array.isArray(data.orders) ? data.orders : []);
        } else {
          setOrders([]);
          setError(data?.message || "Could not load orders.");
        }
      } catch (err) {
        if (!active) return;
        console.error("Analytics fetch error:", err);
        setOrders([]);
        setError(err?.response?.data?.message || "Could not load orders.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [axios, reloadKey]);

  /* ---- Aggregations (filtered view) ---- */
  const analytics = useMemo(() => {
    let filtered = orders;

    if (dateRange.from) {
      const f = moment(dateRange.from, "YYYY-MM-DD").startOf("day");
      filtered = filtered.filter((o) => moment(o.createdAt).isSameOrAfter(f));
    }
    if (dateRange.to) {
      const t = moment(dateRange.to, "YYYY-MM-DD").endOf("day");
      filtered = filtered.filter((o) => moment(o.createdAt).isSameOrBefore(t));
    }

    const cf = customerFilter.trim().toLowerCase();
    if (cf) {
      filtered = filtered.filter((o) => {
        const email = (o.address?.email || "").toLowerCase();
        const uid = String(o.userId || "").toLowerCase();
        return email.includes(cf) || uid.includes(cf);
      });
    }

    if (period !== "all") {
      const now = moment();
      const unit = PERIOD_UNIT[period];
      filtered = filtered.filter((o) => moment(o.createdAt).isSame(now, unit));
    }

    const sales = filtered.filter((o) => !isCancelled(o));
    const cancelled = filtered.filter(isCancelled);

    const totalOrders = filtered.length;
    const salesCount = sales.length;
    const cancelledCount = cancelled.length;
    const totalRevenue = sales.reduce((s, o) => s + orderTotal(o), 0);
    const cancelledValue = cancelled.reduce((s, o) => s + orderTotal(o), 0);
    const avgOrderValue = salesCount ? totalRevenue / salesCount : 0;
    const cancellationRate = totalOrders ? (cancelledCount / totalOrders) * 100 : 0;

    // Products (completed orders only, so revenue/profit are not inflated by cancellations)
    const productMap = {};
    sales.forEach((o) => {
      (o.items || []).forEach((it) => {
        const pid = it.product?._id || String(it.product || "unknown");
        const name = it.product?.name || it.name || "Unknown";
        const qty = toNumber(it.quantity);
        const unitPrice = toNumber(it.product?.offerPrice ?? it.offerPrice);
        const rawCost = it.product?.costPrice;
        const hasCost = rawCost !== undefined && rawCost !== null && rawCost !== "" && Number.isFinite(Number(rawCost));
        const costPerUnit = hasCost ? Number(rawCost) : (unitPrice * (100 - DEFAULT_MARGIN_PERCENT)) / 100;

        if (!productMap[pid]) {
          productMap[pid] = {
            productId: pid,
            name,
            quantitySold: 0,
            totalRevenue: 0,
            totalCost: 0,
            stock: typeof it.product?.stock === "number" ? it.product.stock : null,
          };
        }
        productMap[pid].quantitySold += qty;
        productMap[pid].totalRevenue += unitPrice * qty;
        productMap[pid].totalCost += costPerUnit * qty;
      });
    });
    const productSales = Object.values(productMap)
      .map((p) => ({ ...p, profit: p.totalRevenue - p.totalCost }))
      .sort((a, b) => b.quantitySold - a.quantitySold);

    const productRevenue = productSales.reduce((s, p) => s + p.totalRevenue, 0);
    const totalCost = productSales.reduce((s, p) => s + p.totalCost, 0);
    const estimatedProfit = productRevenue - totalCost;
    const profitMargin = productRevenue ? (estimatedProfit / productRevenue) * 100 : 0;

    const topByRevenue = [...productSales]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5)
      .map((p) => ({ ...p, short: shorten(p.name, 18) }));

    const lowStock = productSales
      .filter((p) => typeof p.stock === "number" && p.stock <= LOW_STOCK_THRESHOLD)
      .sort((a, b) => a.stock - b.stock);

    // Daily revenue + cumulative (gaps filled so the chart is continuous)
    const revMap = {};
    sales.forEach((o) => {
      const d = moment(o.createdAt).format("YYYY-MM-DD");
      revMap[d] = (revMap[d] || 0) + orderTotal(o);
    });
    const days = Object.keys(revMap).sort();
    let revenueTrend = [];
    if (days.length) {
      const first = moment(days[0]);
      const last = moment(days[days.length - 1]);
      const span = last.diff(first, "days");
      if (span <= MAX_GAP_FILL_DAYS) {
        for (let m = first.clone(); m.isSameOrBefore(last, "day"); m.add(1, "day")) {
          const d = m.format("YYYY-MM-DD");
          revenueTrend.push({ date: d, revenue: revMap[d] || 0 });
        }
      } else {
        revenueTrend = days.map((d) => ({ date: d, revenue: revMap[d] }));
      }
    }
    let running = 0;
    revenueTrend = revenueTrend.map((r) => {
      running += r.revenue;
      return { ...r, cumulative: running };
    });

    // Payment methods + statuses
    const paymentMap = {};
    sales.forEach((o) => {
      const p = o.paymentType || "Unknown";
      paymentMap[p] = (paymentMap[p] || 0) + 1;
    });
    const paymentData = Object.entries(paymentMap).map(([name, value]) => ({ name, value }));

    const statusMap = {};
    filtered.forEach((o) => {
      const s = o.status || "Unknown";
      statusMap[s] = (statusMap[s] || 0) + 1;
    });
    const statusData = Object.entries(statusMap).map(([name, value], i) => ({
      name,
      value,
      fill: statusColor(name, i),
    }));

    // Weekday revenue (Sun..Sat)
    const weekdayRev = [0, 0, 0, 0, 0, 0, 0];
    sales.forEach((o) => {
      weekdayRev[moment(o.createdAt).day()] += orderTotal(o);
    });
    const weekdayData = weekdayRev.map((revenue, idx) => ({
      idx,
      day: moment().day(idx).format("ddd"),
      revenue,
    }));

    // Customers (completed orders only)
    const custMap = {};
    sales.forEach((o) => {
      const key = o.address?.email || (o.userId ? String(o.userId) : "unknown");
      if (!custMap[key]) {
        custMap[key] = {
          key,
          display: customerName(o) || o.address?.email || (o.userId ? String(o.userId) : "Guest"),
          sub: o.address?.email || "",
          orders: 0,
          revenue: 0,
        };
      }
      custMap[key].orders += 1;
      custMap[key].revenue += orderTotal(o);
    });
    const customers = Object.values(custMap);
    const bestByOrders = [...customers].sort((a, b) => b.orders - a.orders).slice(0, 10);
    const bestByRevenue = [...customers].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    const recentOrders = [...filtered]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    // Average delivery time
    let totalDeliveryDays = 0;
    let deliveredCount = 0;
    filtered.forEach((o) => {
      if (o.deliveredAt && o.createdAt) {
        const d = moment(o.deliveredAt).diff(moment(o.createdAt), "days", true);
        if (d >= 0) {
          totalDeliveryDays += d;
          deliveredCount++;
        }
      }
    });
    const avgDeliveryDays = deliveredCount ? totalDeliveryDays / deliveredCount : null;

    return {
      filtered,
      totalOrders,
      salesCount,
      cancelledCount,
      totalRevenue,
      cancelledValue,
      avgOrderValue,
      cancellationRate,
      productSales,
      topByRevenue,
      lowStock,
      estimatedProfit,
      profitMargin,
      revenueTrend,
      paymentData,
      statusData,
      weekdayData,
      bestByOrders,
      bestByRevenue,
      recentOrders,
      avgDeliveryDays,
    };
  }, [orders, period, dateRange, customerFilter]);

  /* ---- Monthly target: always the current calendar month, regardless of filters ---- */
  const monthRevenue = useMemo(() => {
    const start = moment().startOf("month");
    return orders
      .filter((o) => !isCancelled(o) && moment(o.createdAt).isSameOrAfter(start))
      .reduce((s, o) => s + orderTotal(o), 0);
  }, [orders]);

  const targetPct = monthlyTarget > 0 ? (monthRevenue / monthlyTarget) * 100 : 0;
  const remaining = Math.max(0, monthlyTarget - monthRevenue);
  const daysLeft = Math.max(1, moment().endOf("month").diff(moment(), "days") + 1);

  /* ---- Actions ---- */
  const activeFilterCount =
    (period !== "all" ? 1 : 0) + (dateRange.from ? 1 : 0) + (dateRange.to ? 1 : 0) + (customerFilter.trim() ? 1 : 0);

  const clearFilters = () => {
    setPeriod("all");
    setDateRange({ from: "", to: "" });
    setCustomerFilter("");
  };

  const goToProduct = (pid) => {
    if (!pid || pid === "unknown") return;
    navigate(`/product/${pid}`);
  };
  const goToOrder = () => navigate("/seller/orders");

  const filterByCustomer = (key) => {
    if (!key || key === "unknown") return;
    setCustomerFilter(key);
    setFiltersOpen(true);
    rootRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const exportProductsCSV = () => {
    const rows = [
      ["ProductId", "ProductName", "QtySold", "Revenue", "Cost", "EstProfit"],
      ...analytics.productSales.map((p) => [
        p.productId,
        p.name,
        p.quantitySold,
        p.totalRevenue.toFixed(2),
        p.totalCost.toFixed(2),
        p.profit.toFixed(2),
      ]),
    ];
    downloadCSV(rows, "product_sales.csv");
  };

  const exportOrdersCSV = () => {
    const rows = [
      ["OrderId", "Date", "Customer", "Amount", "Status", "Payment", "Products"],
      ...analytics.filtered.map((o) => [
        o._id,
        moment(o.createdAt).format("YYYY-MM-DD HH:mm"),
        customerLabel(o),
        orderTotal(o).toFixed(2),
        o.status || "",
        o.paymentType || "",
        (o.items || []).map((i) => `${i.product?.name || i.name || "Unknown"} (x${i.quantity})`).join(" | "),
      ]),
    ];
    downloadCSV(rows, "orders.csv");
  };

  /* ---- Early states ---- */
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm font-medium text-slate-900">{error}</p>
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          <FaSyncAlt className="text-xs" /> Try again
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-2 p-8 text-center">
        <FaBox className="text-3xl text-slate-300" />
        <p className="text-sm font-medium text-slate-900">No orders yet</p>
        <p className="text-sm text-slate-500">Analytics will appear here once you receive your first order.</p>
      </div>
    );
  }

  const maxWeek = Math.max(...analytics.weekdayData.map((d) => d.revenue), 0);
  const noMatches = analytics.totalOrders === 0;

  /* ------------------ Render ------------------ */
  return (
    <div ref={rootRef} className="no-scrollbar h-[95vh] w-full flex-1 overflow-y-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500">
            {period === "all" && !dateRange.from && !dateRange.to
              ? "All-time performance of your store"
              : "Showing a filtered view of your store"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportProductsCSV}
            disabled={noMatches}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaDownload /> Products CSV
          </button>
          <button
            onClick={exportOrdersCSV}
            disabled={noMatches}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaDownload /> Orders CSV
          </button>
          <button
            onClick={() => setFiltersOpen((s) => !s)}
            aria-expanded={filtersOpen}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium shadow-sm ${
              filtersOpen || activeFilterCount
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <FaFilter /> Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-white px-1.5 text-[10px] font-semibold text-slate-900">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Period quick-select */}
      <div className="mb-4 inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              period === p.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {filtersOpen && (
        <Card className="mb-5 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="From">
              <input
                type="date"
                value={dateRange.from}
                max={dateRange.to || undefined}
                onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="To">
              <input
                type="date"
                value={dateRange.to}
                min={dateRange.from || undefined}
                onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Customer (email or user id)">
              <input
                placeholder="e.g. jane@example.com"
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Monthly target (₹)">
              <input
                type="number"
                min="0"
                value={monthlyTarget}
                onChange={(e) => setMonthlyTarget(Math.max(0, Number(e.target.value) || 0))}
                className="input"
              />
            </Field>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={clearFilters}
              disabled={!activeFilterCount}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Clear filters
            </button>
          </div>
          <style>{`
            .input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; color: #1e293b; background: #fff; }
            .input:focus { outline: none; border-color: #0f172a; box-shadow: 0 0 0 3px rgba(15,23,42,0.08); }
          `}</style>
        </Card>
      )}

      {noMatches && (
        <div className="mb-5 flex flex-col items-start justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 sm:flex-row sm:items-center">
          <span>No orders match the current filters.</span>
          <button onClick={clearFilters} className="font-medium underline">
            Clear filters
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KPI
          title="Orders"
          value={analytics.totalOrders}
          hint={`${analytics.salesCount} completed`}
          icon={<FaBox />}
        />
        <KPI
          title="Revenue"
          value={formatCurrency(analytics.totalRevenue)}
          hint="Excludes cancelled"
          icon={<FaRupeeSign />}
        />
        <KPI
          title="Avg order value"
          value={formatCurrency(analytics.avgOrderValue)}
          hint="Per completed order"
          icon={<FaChartLine />}
        />
        <KPI
          title="Top product"
          value={analytics.productSales[0]?.name || "N/A"}
          hint={analytics.productSales[0] ? `${analytics.productSales[0].quantitySold} sold` : "—"}
          icon={<FaTrophy />}
          truncate
        />
        <KPI
          title="Cancelled"
          value={analytics.cancelledCount}
          hint={`${analytics.cancellationRate.toFixed(1)}% of orders`}
          icon={<FaTimesCircle />}
        />
        <KPI
          title="Est. profit"
          value={formatCurrency(analytics.estimatedProfit)}
          hint={`${analytics.profitMargin.toFixed(1)}% margin`}
          icon={<FaCoins />}
        />
      </div>

      {/* Monthly target */}
      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Monthly target · {moment().format("MMMM")}
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {formatCurrency(monthRevenue)}{" "}
              <span className="text-sm font-normal text-slate-500">of {formatCurrency(monthlyTarget)}</span>
            </div>
          </div>
          <div className="w-full sm:w-1/2">
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${targetPct >= 100 ? "bg-emerald-600" : "bg-slate-900"}`}
                style={{ width: `${Math.min(100, Math.max(0, targetPct))}%` }}
              />
            </div>
            <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-xs text-slate-500">
              <span>{monthlyTarget > 0 ? `${targetPct.toFixed(1)}% achieved` : "Set a target in Filters"}</span>
              {monthlyTarget > 0 && (
                <span>
                  {remaining > 0
                    ? `${formatCurrency(remaining / daysLeft)}/day needed for ${daysLeft} more day${daysLeft > 1 ? "s" : ""}`
                    : "Target reached 🎉"}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="mb-5 overflow-x-auto">
        <nav className="inline-flex gap-1 rounded-lg bg-slate-100 p-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className={`whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                activeTab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ---------------- Performance ---------------- */}
      {activeTab === "performance" && (
        <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="p-4 lg:col-span-2">
            <CardHeader title="Revenue over time" subtitle="Daily revenue (bars) and running total (line)" />
            {analytics.revenueTrend.length === 0 ? (
              <Empty text="No revenue data for this selection." />
            ) : (
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <ComposedChart data={analytics.revenueTrend} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => moment(d).format("DD MMM")}
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={28}
                    />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={compactINR}
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={false}
                      width={56}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={compactINR}
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={false}
                      width={56}
                    />
                    <Tooltip
                      content={<ChartTooltip labelFormatter={(d) => moment(d).format("dddd, DD MMM YYYY")} />}
                      cursor={{ fill: "rgba(148,163,184,0.12)" }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      yAxisId="left"
                      dataKey="revenue"
                      name="Daily revenue"
                      fill="#cbd5e1"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="cumulative"
                      name="Cumulative"
                      stroke={INK}
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title="Completed vs cancelled" subtitle="Share of orders" />
            {analytics.totalOrders === 0 ? (
              <Empty text="No orders in this selection." />
            ) : (
              <>
                <div style={{ width: "100%", height: 200 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Completed", value: analytics.salesCount, fill: INK },
                          { name: "Cancelled", value: analytics.cancelledCount, fill: "#dc2626" },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={82}
                        paddingAngle={2}
                        stroke="none"
                      >
                        <Cell fill={INK} />
                        <Cell fill="#dc2626" />
                      </Pie>
                      <Tooltip content={<ChartTooltip valueFormatter={(v) => v} />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <dl className="mt-2 space-y-2 text-sm">
                  <Row
                    dot={INK}
                    label={`Completed (${analytics.salesCount})`}
                    value={formatCurrency(analytics.totalRevenue)}
                  />
                  <Row
                    dot="#dc2626"
                    label={`Cancelled (${analytics.cancelledCount})`}
                    value={formatCurrency(analytics.cancelledValue)}
                  />
                </dl>
              </>
            )}
          </Card>
        </div>
      )}

      {/* ---------------- Products ---------------- */}
      {activeTab === "products" && (
        <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Card className="p-4">
              <CardHeader title="Top 5 by revenue" />
              {analytics.topByRevenue.length === 0 ? (
                <Empty text="No product sales yet." />
              ) : (
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={analytics.topByRevenue}
                      layout="vertical"
                      margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis
                        type="number"
                        tickFormatter={compactINR}
                        tick={AXIS_TICK}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="short"
                        width={120}
                        tick={AXIS_TICK}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
                      <Bar dataKey="totalRevenue" name="Revenue" fill={INK} radius={[0, 4, 4, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card className="p-4">
              <CardHeader title="All products" subtitle="Sorted by units sold · click a row to open the product" />
              {analytics.productSales.length === 0 ? (
                <Empty text="No product sales yet." />
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="space-y-3 sm:hidden">
                    {analytics.productSales.map((p, idx) => (
                      <div key={p.productId || idx} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate font-medium text-slate-900">{p.name}</div>
                          <div className="text-xs text-slate-500">#{idx + 1}</div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-1 text-sm text-slate-600">
                          <div>Qty: {p.quantitySold}</div>
                          <div>Stock: {p.stock !== null ? p.stock : "N/A"}</div>
                          <div>Revenue: {formatCurrency(p.totalRevenue)}</div>
                          <div>Profit: {formatCurrency(p.profit)}</div>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => goToProduct(p.productId)}
                            className="rounded-md bg-slate-900 px-3 py-1 text-xs text-white"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden max-h-[460px] overflow-auto sm:block">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <Th>#</Th>
                          <Th>Product</Th>
                          <Th right>Qty</Th>
                          <Th right>Revenue</Th>
                          <Th right>Est. profit</Th>
                          <Th right>Margin</Th>
                          <Th right>Stock</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analytics.productSales.map((p, idx) => {
                          const low = typeof p.stock === "number" && p.stock <= LOW_STOCK_THRESHOLD;
                          const margin = p.totalRevenue ? (p.profit / p.totalRevenue) * 100 : 0;
                          return (
                            <tr
                              key={p.productId || idx}
                              className="cursor-pointer hover:bg-slate-50"
                              onClick={() => goToProduct(p.productId)}
                            >
                              <td className="px-3 py-2.5 text-slate-500">{idx + 1}</td>
                              <td className="px-3 py-2.5 font-medium text-slate-900">{p.name}</td>
                              <td className="px-3 py-2.5 text-right text-slate-700">{p.quantitySold}</td>
                              <td className="px-3 py-2.5 text-right text-slate-700">
                                {formatCurrency(p.totalRevenue)}
                              </td>
                              <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(p.profit)}</td>
                              <td className="px-3 py-2.5 text-right text-slate-500">{margin.toFixed(0)}%</td>
                              <td className="px-3 py-2.5 text-right">
                                {p.stock === null ? (
                                  <span className="text-slate-400">N/A</span>
                                ) : (
                                  <span
                                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                      low ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"
                                    }`}
                                  >
                                    {p.stock}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Card>
          </div>

          <Card className="h-fit p-4">
            <CardHeader title="Low stock" subtitle={`Sold products with ${LOW_STOCK_THRESHOLD} or fewer in stock`} />
            <LowStockList items={analytics.lowStock} onView={goToProduct} />
          </Card>
        </div>
      )}

      {/* ---------------- Customers ---------------- */}
      {activeTab === "customers" && (
        <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="p-4">
            <CardHeader title="Top customers by orders" subtitle="Click a customer to filter" />
            <CustomerList items={analytics.bestByOrders} metric="orders" onPick={filterByCustomer} />
          </Card>

          <Card className="p-4">
            <CardHeader title="Top customers by revenue" subtitle="Click a customer to filter" />
            <CustomerList items={analytics.bestByRevenue} metric="revenue" onPick={filterByCustomer} />
          </Card>

          <Card className="p-4">
            <CardHeader title="Payment methods" subtitle="Completed orders" />
            {analytics.paymentData.length === 0 ? (
              <Empty text="No payment data." />
            ) : (
              <>
                <div style={{ width: "100%", height: 200 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={analytics.paymentData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {analytics.paymentData.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v} orders`} />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <dl className="mt-2 space-y-2 text-sm">
                  {analytics.paymentData.map((p, i) => (
                    <Row key={p.name} dot={PALETTE[i % PALETTE.length]} label={p.name} value={p.value} />
                  ))}
                </dl>
              </>
            )}
          </Card>
        </div>
      )}

      {/* ---------------- Operations ---------------- */}
      {activeTab === "ops" && (
        <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="p-4 lg:col-span-2">
            <CardHeader title="Orders by status" />
            {analytics.statusData.length === 0 ? (
              <Empty text="No orders in this selection." />
            ) : (
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={analytics.statusData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={32} />
                    <Tooltip
                      content={<ChartTooltip valueFormatter={(v) => `${v} orders`} />}
                      cursor={{ fill: "rgba(148,163,184,0.12)" }}
                    />
                    <Bar dataKey="value" name="Orders" radius={[4, 4, 0, 0]} maxBarSize={56}>
                      {analytics.statusData.map((s) => (
                        <Cell key={s.name} fill={s.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Average delivery time:{" "}
              <span className="font-medium text-slate-900">
                {analytics.avgDeliveryDays !== null
                  ? `${analytics.avgDeliveryDays.toFixed(1)} days`
                  : "N/A (no deliveredAt data)"}
              </span>
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="p-4">
              <CardHeader title="Revenue by weekday" subtitle="Darker = more revenue" />
              <div className="grid grid-cols-7 gap-1.5">
                {analytics.weekdayData.map((d) => {
                  const t = maxWeek ? d.revenue / maxWeek : 0;
                  return (
                    <div key={d.idx} className="flex flex-col items-center">
                      <div
                        title={`${d.day}: ${formatCurrency(d.revenue)}`}
                        className="flex aspect-square w-full items-center justify-center rounded-md text-[11px] font-medium"
                        style={{ background: getHeatColor(d.revenue, maxWeek), color: t > 0.5 ? "#fff" : "#334155" }}
                      >
                        {d.day}
                      </div>
                      <div className="mt-1 text-[10px] text-slate-500">{compactINR(d.revenue)}</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-4">
              <CardHeader title="Low stock" />
              <LowStockList items={analytics.lowStock.slice(0, 6)} onView={goToProduct} />
            </Card>
          </div>
        </div>
      )}

      {/* ---------------- Recents ---------------- */}
      {activeTab === "recents" && (
        <Card className="mb-6 p-4">
          <CardHeader
            title="Recent orders"
            subtitle={`Latest ${analytics.recentOrders.length} in this selection`}
          />
          {analytics.recentOrders.length === 0 ? (
            <Empty text="No orders in this selection." />
          ) : (
            <>
              {/* Mobile */}
              <div className="space-y-3 sm:hidden">
                {analytics.recentOrders.map((o) => (
                  <div key={o._id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">{o._id}</div>
                        <div className="text-xs text-slate-500">{moment(o.createdAt).format("DD MMM YYYY, HH:mm")}</div>
                      </div>
                      <div className="text-sm font-medium text-slate-900">{formatCurrency(o.amount)}</div>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-slate-600">
                      <div className="truncate">{customerLabel(o)}</div>
                      <div className="truncate">{productsSummary(o)}</div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <StatusBadge status={o.status} />
                      <button onClick={goToOrder} className="rounded-md bg-slate-900 px-3 py-1 text-xs text-white">
                        Open
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <Th>Order ID</Th>
                      <Th>Date</Th>
                      <Th>Customer</Th>
                      <Th>Products</Th>
                      <Th right>Amount</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics.recentOrders.map((o) => (
                      <tr key={o._id} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5">
                          <button onClick={goToOrder} className="font-medium text-blue-600 hover:underline">
                            {shorten(String(o._id), 12)}
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                          {moment(o.createdAt).format("DD MMM YYYY, HH:mm")}
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-2.5 text-slate-700">{customerLabel(o)}</td>
                        <td className="max-w-[260px] truncate px-3 py-2.5 text-slate-600">{productsSummary(o)}</td>
                        <td className="px-3 py-2.5 text-right font-medium text-slate-900">
                          {formatCurrency(o.amount)}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={o.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

/* ------------------ Small components ------------------ */
const productsSummary = (o) => {
  const items = o.items || [];
  const names = items.slice(0, 3).map((i) => i.product?.name || i.name || "Unknown");
  return names.join(", ") + (items.length > 3 ? `, +${items.length - 3} more` : "");
};

const Card = ({ className = "", children }) => (
  <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>
);

const CardHeader = ({ title, subtitle }) => (
  <div className="mb-3">
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
  </div>
);

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
    {children}
  </label>
);

const Empty = ({ text }) => (
  <div className="flex min-h-[120px] items-center justify-center rounded-lg bg-slate-50 px-4 text-center text-sm text-slate-500">
    {text}
  </div>
);

const Th = ({ children, right }) => (
  <th className={`px-3 py-2 font-medium ${right ? "text-right" : "text-left"}`}>{children}</th>
);

const Row = ({ dot, label, value }) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="flex items-center gap-2 text-slate-600">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: dot }} />
      {label}
    </dt>
    <dd className="font-medium text-slate-900">{value}</dd>
  </div>
);

const StatusBadge = ({ status }) => (
  <span
    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(status)}`}
  >
    {status || "Unknown"}
  </span>
);

const KPI = ({ title, value, hint, icon, truncate }) => (
  <Card className="flex items-start gap-3 p-3.5">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm text-white">
      <span aria-hidden>{icon}</span>
    </div>
    <div className="min-w-0">
      <div className="text-xs text-slate-500">{title}</div>
      <div
        title={truncate ? String(value) : undefined}
        className={`text-lg font-semibold leading-tight text-slate-900 ${truncate ? "truncate" : ""}`}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 truncate text-[11px] text-slate-500">{hint}</div>}
    </div>
  </Card>
);

const ChartTooltip = ({ active, payload, label, labelFormatter, valueFormatter = formatCurrency }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      {label !== undefined && label !== null && label !== "" && (
        <div className="mb-1 font-medium text-slate-900">{labelFormatter ? labelFormatter(label) : label}</div>
      )}
      {payload.map((p, i) => (
        <div key={`${p.dataKey || p.name}-${i}`} className="flex items-center gap-2 text-slate-600">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: p.color || p.fill || p.payload?.fill || INK }}
          />
          {p.name}: <span className="font-medium text-slate-900">{valueFormatter(p.value, p)}</span>
        </div>
      ))}
    </div>
  );
};

const LowStockList = ({ items, onView }) => {
  if (!items.length) {
    return <div className="text-sm text-slate-500">Nothing running low (threshold: {LOW_STOCK_THRESHOLD}).</div>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((p) => (
        <li key={p.productId} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-slate-900">{p.name}</div>
            <div className={`text-xs ${p.stock === 0 ? "font-medium text-red-600" : "text-slate-500"}`}>
              {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
            </div>
          </div>
          <button
            onClick={() => onView(p.productId)}
            className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            View
          </button>
        </li>
      ))}
    </ul>
  );
};

const CustomerList = ({ items, metric, onPick }) => {
  if (!items.length) return <Empty text="No customer data." />;
  return (
    <ol className="divide-y divide-slate-100">
      {items.map((c, i) => {
        const clickable = c.key !== "unknown";
        return (
          <li key={c.key}>
            <button
              onClick={() => onPick(c.key)}
              disabled={!clickable}
              className="flex w-full items-center gap-3 py-2.5 text-left enabled:hover:bg-slate-50 disabled:cursor-default"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900">{c.display}</span>
                {c.sub && c.sub !== c.display && (
                  <span className="block truncate text-xs text-slate-500">{c.sub}</span>
                )}
              </span>
              <span className="shrink-0 text-sm font-medium text-slate-900">
                {metric === "orders" ? `${c.orders} order${c.orders > 1 ? "s" : ""}` : formatCurrency(c.revenue)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
};

export default Analytics;
