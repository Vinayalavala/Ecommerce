// controllers/_emailHelpers.js
import transporter from "../configs/email.js";
import User from "../models/user.js";
import Address from "../models/Address.js"; // <-- adjust the path/name to your Address model

// Safely get the email from the selected address; fallback to the user's account email
export const getRecipientEmail = async (addressRef, userId) => {
  let addrEmail = null;

  // If address object already contains email
  if (addressRef && typeof addressRef === "object" && addressRef.email) {
    addrEmail = addressRef.email;
  }

  // If address is an ID string, try to fetch the address doc
  if (!addrEmail && typeof addressRef === "string") {
    try {
      const addrDoc = await Address.findById(addressRef).lean();
      addrEmail = addrDoc?.email || null;
    } catch (_) {
      // ignore
    }
  }

  if (addrEmail) return addrEmail;

  // Fallback to user's email
  const user = await User.findById(userId).lean();
  return user?.email || null;
};

const itemsTable = (order) => {
  const rows = (order.items || [])
    .map((it) => {
      const name = it?.product?.name || "Product";
      const unit = it?.product?.offerPrice ?? 0;
      return `
        <tr>
          <td style="padding:8px;border:1px solid #eee">${name}</td>
          <td style="padding:8px;border:1px solid #eee;text-align:center">${it.quantity}</td>
          <td style="padding:8px;border:1px solid #eee;text-align:right">₹${Number(unit).toFixed(2)}</td>
        </tr>`;
    })
    .join("");

  return `
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:600px">
      <thead>
        <tr>
          <th style="padding:8px;border:1px solid #eee;text-align:left">Item</th>
          <th style="padding:8px;border:1px solid #eee;text-align:center">Qty</th>
          <th style="padding:8px;border:1px solid #eee;text-align:right">Unit Price</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

export const sendOrderEmails = async ({ order, addressEmail, userDoc }) => {
  const orderId = order._id.toString();
  const total = order.amount;

  const userMail = {
    from: process.env.EMAIL_USER,
    to: addressEmail || userDoc?.email,
    subject: `Order Confirmation • #${orderId}`,
    html: `
      <div style="font-family:system-ui,Arial">
        <h2>Thanks for your order${userDoc?.name ? ", " + userDoc.name : ""}!</h2>
        <p>Your order <b>#${orderId}</b> has been placed successfully.</p>
        ${itemsTable(order)}
        <p style="margin-top:12px"><b>Total:</b> ₹${total}</p>
        <p><b>Payment Type:</b> ${order.paymentType}${order.isPaid ? " (Paid)" : ""}</p>
      </div>
    `,
  };

  const adminMail = {
    from: process.env.EMAIL_USER,
    to: process.env.ADMIN_EMAIL,
    subject: `New Order • #${orderId}`,
    html: `
      <div style="font-family:system-ui,Arial">
        <h2>New Order Received</h2>
        <p><b>Order:</b> #${orderId}</p>
        <p><b>User:</b> ${userDoc?.name || userDoc?.email || order.userId}</p>
        <p><b>Contact Email:</b> ${addressEmail || userDoc?.email || "N/A"}</p>
        ${itemsTable(order)}
        <p style="margin-top:12px"><b>Total:</b> ₹${total}</p>
        <p><b>Payment:</b> ${order.paymentType} ${order.isPaid ? "(Paid)" : "(Unpaid)"}</p>
      </div>
    `,
  };

  await Promise.allSettled([
    transporter.sendMail(userMail),
    transporter.sendMail(adminMail),
  ]);
};
