import Order from "../models/Order.js";
import moment from "moment"; 

export const getSellerAnalytics = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("items.product")
      .sort({ createdAt: -1 })
      .lean();

    let totalIncome = 0;
    const totalOrders = orders.length;
    const cancelledOrders = [];
    const productSales = {};

    const daily = {};
    const weekly = {};
    const monthly = {};

    for (const order of orders) {
      // clone() everywhere: startOf() mutates a moment, which previously
      // shifted the month key to the wrong month for early-month orders.
      const createdAt = moment(order.createdAt);
      const day = createdAt.format("YYYY-MM-DD");
      const week = createdAt.clone().startOf("isoWeek").format("GGGG-[W]WW");
      const month = createdAt.format("YYYY-MM");

      if (String(order.status || "").toLowerCase() === "cancelled") {
        cancelledOrders.push(order);
        continue;
      }

      const amount = Number(order.amount) || 0;
      totalIncome += amount;

      daily[day] = (daily[day] || 0) + amount;
      weekly[week] = (weekly[week] || 0) + amount;
      monthly[month] = (monthly[month] || 0) + amount;

      for (const item of order.items || []) {
        const product = item.product;
        // product is null if it was deleted after the order was placed
        if (!product?._id) continue;

        const productId = product._id.toString();
        if (!productSales[productId]) {
          productSales[productId] = {
            productId,
            name: product.name,
            quantitySold: 0,
            totalRevenue: 0,
          };
        }
        const qty = Number(item.quantity) || 0;
        productSales[productId].quantitySold += qty;
        productSales[productId].totalRevenue += qty * (Number(product.offerPrice) || 0);
      }
    }

    const cancelledValue = cancelledOrders.reduce((s, o) => s + (Number(o.amount) || 0), 0);

    res.status(200).json({
      success: true,
      totalIncome,
      totalOrders,
      cancelledCount: cancelledOrders.length,
      cancelledValue,
      cancelledOrders,
      allOrders: orders,
      productSales: Object.values(productSales),
      trends: { daily, weekly, monthly },
    });
  } catch (err) {
    console.error("Analytics Error:", err);
    res.status(500).json({ success: false, error: "Failed to generate analytics" });
  }
};
