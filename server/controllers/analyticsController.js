import Order from "../models/Order.js";
import moment from "moment"; // Install via `npm install moment`

export const getSellerAnalytics = async (req, res) => {
  try {
    const orders = await Order.find().populate("items.product");

    let totalIncome = 0;
    let totalOrders = orders.length;
    let cancelledOrders = [];
    let productSales = {};

    // Initialize trend data
    let daily = {};
    let weekly = {};
    let monthly = {};

    for (let order of orders) {
      const createdAt = moment(order.createdAt);
      const day = createdAt.format("YYYY-MM-DD");
      const week = createdAt.startOf("week").format("YYYY-[W]WW");
      const month = createdAt.format("YYYY-MM");

      // Skip if cancelled
      if (order.status.toLowerCase() === "cancelled") {
        cancelledOrders.push(order);
        continue;
      }

      totalIncome += order.amount;

      // Track trends
      daily[day] = (daily[day] || 0) + order.amount;
      weekly[week] = (weekly[week] || 0) + order.amount;
      monthly[month] = (monthly[month] || 0) + order.amount;

      for (let item of order.items) {
        const productId = item.product._id.toString();
        if (!productSales[productId]) {
          productSales[productId] = {
            name: item.product.name,
            quantitySold: 0,
            totalRevenue: 0,
          };
        }
        productSales[productId].quantitySold += item.quantity;
        productSales[productId].totalRevenue += item.quantity * item.product.offerPrice;
      }
    }

    res.status(200).json({
  totalIncome,
  totalOrders,
  cancelledCount: cancelledOrders.length,
  cancelledOrders,
  allOrders: orders, // ✅ Include all orders here
  productSales: Object.values(productSales),
  trends: {
    daily,
    weekly,
    monthly,
  },
});

  } catch (err) {
    console.error("Analytics Error:", err);
    res.status(500).json({ error: "Failed to generate analytics" });
  }
};
