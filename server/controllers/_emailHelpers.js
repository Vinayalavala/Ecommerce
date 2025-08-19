import transporter from "../configs/email.js";
import User from "../models/user.js";
import Address from "../models/Address.js";

/* ---------------------- helpers ---------------------- */

const formatINR = (n) =>
  `₹${(Number(n || 0)).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateIST = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Build a safe, readable address block from either an object or populated Address doc
const extractAddress = (addressRef) => {
  if (!addressRef) return {};

  const a =
    typeof addressRef === "object" && !addressRef._id
      ? addressRef
      : typeof addressRef === "object" && addressRef._id
      ? addressRef
      : {};

  return {
    id: a?._id?.toString?.() || null,
    name: a?.name || a?.fullName || "",
    email: a?.email || "",
    phone: a?.phone || a?.mobile || "",
    line1: a?.street || a?.line1 || "",
    line2: a?.landmark || a?.line2 || "",
    city: a?.city || "",
    state: a?.state || "",
    pincode: a?.pincode || a?.zip || "",
    country: a?.country || "India",
  };
};

// Try to get a small product image URL if present
const getItemImage = (it) => {
  const p = it?.product || {};
  return (
    p?.thumbnail ||
    p?.image ||
    (Array.isArray(p?.images) ? p.images[0] : null) ||
    ""
  );
};

const getItemSkuOrVariant = (it) => {
  const p = it?.product || {};
  const parts = [];
  if (p?.sku) parts.push(`SKU: ${p.sku}`);
  if (it?.variant) parts.push(it.variant);
  if (p?.weight) parts.push(`${p.weight}`);
  return parts.join(" • ");
};

const calcMoney = (items) => {
  const subtotal = (items || []).reduce((sum, it) => {
    const unit = Number(it?.product?.offerPrice ?? it?.price ?? 0);
    return sum + unit * Number(it?.quantity ?? 0);
  }, 0);
  const gst = Math.floor(subtotal * 0.02); // your app uses 2% GST
  const total = subtotal + gst;
  return { subtotal, gst, total };
};

// Safely get the email from the selected address; fallback to the user's account email
export const getRecipientEmail = async (addressRef, userId) => {
  let addrEmail = null;

  if (addressRef && typeof addressRef === "object" && addressRef.email) {
    addrEmail = addressRef.email;
  }

  if (!addrEmail && typeof addressRef === "string") {
    try {
      const addrDoc = await Address.findById(addressRef).lean();
      addrEmail = addrDoc?.email || null;
    } catch (_) {}
  }

  if (addrEmail) return addrEmail;

  const user = await User.findById(userId).lean();
  return user?.email || null;
};

/* ---------------------- HTML fragments ---------------------- */

const addressBlock = (addr = {}) => {
  const lines = [
    addr.name,
    addr.phone,
    addr.email,
    [addr.line1, addr.line2].filter(Boolean).join(", "),
    [addr.city, addr.state].filter(Boolean).join(", "),
    [addr.pincode, addr.country].filter(Boolean).join(", "),
  ].filter(Boolean);

  return `
    <table cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse">
      <tr>
        <td style="padding:10px;border:1px solid #eee">
          <div style="font-size:14px;color:#111;font-weight:600;margin-bottom:6px">Delivery Address</div>
          <div style="font-size:13px;color:#444;line-height:1.5">
            ${lines.map((l) => `<div>${String(l).replace(/</g, "&lt;")}</div>`).join("")}
          </div>
        </td>
      </tr>
    </table>
  `;
};

const itemsTable = (order) => {
  const rows = (order.items || [])
    .map((it) => {
      const p = it?.product || {};
      const name = p?.name || "Product";
      const unit = Number(p?.offerPrice ?? it?.price ?? 0);
      const qty = Number(it?.quantity ?? 0);
      const lineTotal = unit * qty;
      const img = getItemImage(it);
      const meta = getItemSkuOrVariant(it);

      return `
        <tr>
          <td style="padding:10px;border:1px solid #eee;vertical-align:top">
            ${
              img
                ? `<img src="${img}" alt="${name}" width="48" height="48" style="border-radius:6px;object-fit:cover;vertical-align:middle;margin-right:8px" />`
                : ""
            }
            <div style="display:inline-block;vertical-align:middle;max-width:360px">
              <div style="font-weight:600;color:#111">${name}</div>
              ${
                meta
                  ? `<div style="font-size:12px;color:#666;margin-top:2px">${meta}</div>`
                  : ""
              }
            </div>
          </td>
          <td style="padding:10px;border:1px solid #eee;text-align:center">${qty}</td>
          <td style="padding:10px;border:1px solid #eee;text-align:right">${formatINR(unit)}</td>
          <td style="padding:10px;border:1px solid #eee;text-align:right">${formatINR(lineTotal)}</td>
        </tr>`;
    })
    .join("");

  return `
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:600px">
      <thead>
        <tr>
          <th style="padding:10px;border:1px solid #eee;text-align:left;background:#fafafa">Item</th>
          <th style="padding:10px;border:1px solid #eee;text-align:center;background:#fafafa">Qty</th>
          <th style="padding:10px;border:1px solid #eee;text-align:right;background:#fafafa">Unit</th>
          <th style="padding:10px;border:1px solid #eee;text-align:right;background:#fafafa">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

const totalsTable = ({ subtotal, gst, total }, paymentType, isPaid) => `
  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:600px">
    <tbody>
      <tr>
        <td style="padding:8px 10px;text-align:right;color:#555">Subtotal</td>
        <td style="padding:8px 10px;text-align:right;width:160px;border-left:1px solid #fff">${formatINR(subtotal)}</td>
      </tr>
      <tr>
        <td style="padding:8px 10px;text-align:right;color:#555">GST (2%)</td>
        <td style="padding:8px 10px;text-align:right;border-left:1px solid #fff">${formatINR(gst)}</td>
      </tr>
      <tr>
        <td style="padding:10px 10px;text-align:right;color:#111;font-weight:700;border-top:1px solid #eee">Grand Total</td>
        <td style="padding:10px 10px;text-align:right;font-weight:700;border-top:1px solid #eee">${formatINR(total)}</td>
      </tr>
      <tr>
        <td style="padding:8px 10px;text-align:right;color:#555">Payment</td>
        <td style="padding:8px 10px;text-align:right">${paymentType} ${isPaid ? "(Paid)" : "(Unpaid)"}</td>
      </tr>
    </tbody>
  </table>
`;

const buttonRow = (href, label = "View your order") => {
  if (!href) return "";
  return `
    <div style="margin:18px 0">
      <a href="${href}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">
        ${label}
      </a>
    </div>
  `;
};

const section = (inner) => `
  <div style="margin-top:16px">${inner}</div>
`;

/* ---------------------- main senders ---------------------- */

export const sendOrderEmails = async ({ order, addressEmail, userDoc }) => {
  const orderId = order?._id?.toString?.() || "—";
  const createdAt = order?.createdAt || new Date().toISOString();
  const status = order?.status || "Order Placed";
  const paymentType = order?.paymentType || "Unknown";
  const isPaid = !!order?.isPaid;

  // Ensure products are populated for item rows
  try {
    if (!order?.items?.[0]?.product?.name && order.populate) {
      await order.populate("items.product");
    }
  } catch (_) {}

  // Address block (accepts object or populated doc)
  let addr = extractAddress(order?.address);

  if (!addr.name && typeof order?.address === "string") {
    try {
      const addrDoc = await Address.findById(order.address).lean();
      addr = extractAddress(addrDoc || {});
    } catch (_) {}
  }

  // Monetary summary
  const money = calcMoney(order?.items);

  // 🔁 Updated: View order link WITHOUT orderId
  const site = (process.env.SITE_URL || "").replace(/\/$/, "");
  const viewUrl = site ? `${site}/my-orders` : "";

  /* ---------------------- Customer Email ---------------------- */

  const customerHtml = `
    <div style="font-family:system-ui,Arial;background:#f6f7f9;padding:18px">
      <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:12px;overflow:hidden">
        <div style="padding:18px 18px 6px 18px">
          <h2 style="margin:0 0 6px 0;color:#111">Thanks for your order${userDoc?.name ? ", " + userDoc.name : ""}!</h2>
          <div style="color:#555;font-size:14px">Order <b>#${orderId}</b> • ${formatDateIST(createdAt)}</div>
          <div style="color:#555;font-size:14px;margin-top:4px">Status: <b>${status}</b> • Payment: <b>${paymentType}${isPaid ? " (Paid)" : ""}</b></div>
          ${buttonRow(viewUrl)}
        </div>

        <div style="padding:0 18px 18px 18px">
          ${section(addressBlock(addr))}
          ${section(itemsTable(order))}
          ${section(totalsTable(money, paymentType, isPaid))}
          <div style="margin-top:16px;font-size:12px;color:#666;line-height:1.6">
            You’ll receive another email when your order is dispatched. If you have any questions,
            simply reply to this email.
          </div>
        </div>
      </div>
    </div>
  `;

  const userMail = {
    from: process.env.EMAIL_USER,
    to: addressEmail || userDoc?.email,
    subject: `Order Confirmation • #${orderId}`,
    html: customerHtml,
  };

  /* ---------------------- Admin Email ---------------------- */

  const adminInfoTable = `
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:600px">
      <tbody>
        <tr><td style="padding:6px 8px;border:1px solid #eee">Order ID</td><td style="padding:6px 8px;border:1px solid #eee">${orderId}</td></tr>
        <tr><td style="padding:6px 8px;border:1px solid #eee">Created</td><td style="padding:6px 8px;border:1px solid #eee">${formatDateIST(createdAt)}</td></tr>
        <tr><td style="padding:6px 8px;border:1px solid #eee">User</td><td style="padding:6px 8px;border:1px solid #eee">${userDoc?._id || order?.userId || "—"}</td></tr>
        <tr><td style="padding:6px 8px;border:1px solid #eee">User Name</td><td style="padding:6px 8px;border:1px solid #eee">${userDoc?.name || "—"}</td></tr>
        <tr><td style="padding:6px 8px;border:1px solid #eee">User Email</td><td style="padding:6px 8px;border:1px solid #eee">${userDoc?.email || "—"}</td></tr>
        <tr><td style="padding:6px 8px;border:1px solid #eee">Ship Email</td><td style="padding:6px 8px;border:1px solid #eee">${addr.email || addressEmail || userDoc?.email || "—"}</td></tr>
        <tr><td style="padding:6px 8px;border:1px solid #eee">Phone</td><td style="padding:6px 8px;border:1px solid #eee">${addr.phone || "—"}</td></tr>
        <tr><td style="padding:6px 8px;border:1px solid #eee">Address Id</td><td style="padding:6px 8px;border:1px solid #eee">${addr.id || (typeof order?.address === "string" ? order.address : "—")}</td></tr>
        <tr><td style="padding:6px 8px;border:1px solid #eee">Status</td><td style="padding:6px 8px;border:1px solid #eee">${status}</td></tr>
        <tr><td style="padding:6px 8px;border:1px solid #eee">Payment</td><td style="padding:6px 8px;border:1px solid #eee">${paymentType} ${isPaid ? "(Paid)" : "(Unpaid)"}</td></tr>
      </tbody>
    </table>
  `;

  const adminTotals = `
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:600px;margin-top:8px">
      <tbody>
        <tr><td style="padding:6px 8px;border:1px solid #eee">Subtotal</td><td style="padding:6px 8px;border:1px solid #eee;text-align:right">${formatINR(money.subtotal)}</td></tr>
        <tr><td style="padding:6px 8px;border:1px solid #eee">GST (2%)</td><td style="padding:6px 8px;border:1px solid #eee;text-align:right">${formatINR(money.gst)}</td></tr>
        <tr><td style="padding:8px 8px;border:1px solid #eee;font-weight:700">Grand Total</td><td style="padding:8px 8px;border:1px solid #eee;text-align:right;font-weight:700">${formatINR(money.total)}</td></tr>
      </tbody>
    </table>
  `;

  const adminHtml = `
    <div style="font-family:system-ui,Arial;background:#f6f7f9;padding:18px">
      <div style="max-width:720px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:12px;overflow:hidden">
        <div style="padding:18px 18px 6px 18px">
          <h2 style="margin:0 0 6px 0;color:#111">New Order Received</h2>
          <div style="color:#555;font-size:14px">Order <b>#${orderId}</b> • ${formatDateIST(createdAt)}</div>
        </div>
        <div style="padding:0 18px 18px 18px">
          ${section(adminInfoTable)}
          ${section(addressBlock(addr))}
          ${section(itemsTable(order))}
          ${section(adminTotals)}
          ${viewUrl ? `<div style="margin-top:10px;font-size:12px;color:#666">View in app: <a href="${viewUrl}">${viewUrl}</a></div>` : ""}
        </div>
      </div>
    </div>
  `;

  const adminMail = {
    from: process.env.EMAIL_USER,
    to: process.env.ADMIN_EMAIL,
    subject: `New Order • #${orderId}`,
    html: adminHtml,
  };

  await Promise.allSettled([
    transporter.sendMail(userMail),
    transporter.sendMail(adminMail),
  ]);
};
