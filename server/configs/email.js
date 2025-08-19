// config/email.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail", // or smtp settings
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// verify connection configuration (log result)
transporter.verify((err, success) => {
  if (err) {
    console.error("Email transporter verify failed:", err);
  } else {
    console.log("Email transporter ready:", success);
  }
});

export default transporter;
