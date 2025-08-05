import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './configs/db.js';
import 'dotenv/config';
import userRouter from './routes/userRoute.js';
import sellerRouter from './routes/sellerRoute.js';
import connectCloudinary from './configs/cloudinary.js';
import analyticsRoutes from "./routes/analytics.js";
import productRouter from './routes/productRoute.js';
import cartRouter from './routes/cartRoute.js';
import addressRouter from './routes/addressRoute.js';
import orderRouter from './routes/orderRoute.js';
import { stripeWebhook } from './controllers/orderController.js';
import reviewRoutes from './routes/reviewRoute.js';

const app = express();
const PORT = process.env.PORT || 4001;

const allowedOrigins = [
  'http://localhost:5173',
  'https://padmavatimilkpoint.vercel.app',
  'https://vishwaadhika.vercel.app',
  'https://milkpoint.vercel.app'
];

// Stripe Webhook route: must be before express.json()
app.post('/api/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// CORS middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Routers
app.use('/api/user', userRouter);
app.use('/api/seller', sellerRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/address', addressRouter);
app.use('/api/order', orderRouter);
app.use('/api/review', reviewRoutes);
app.use("/api", analyticsRoutes);

// Test route
app.get('/', (req, res) => {
  res.send("API is Working Nice");
});

// Async startup
const startServer = async () => {
  try {
    await connectDB();
    await connectCloudinary();

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Error during server initialization:", error);
    process.exit(1);
  }
};

startServer();
