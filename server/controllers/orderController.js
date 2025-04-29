import Order from '../models/Order.js';
import Product from '../models/Product.js';
import stripe from 'stripe';
import User from '../models/user.js';

export const placeOrderCOD = async (req, res) => {
    try {
        const { userId, items, address } = req.body;

        if (!address || items.length === 0) {
            return res.json({
                success: false,
                message: "Invalid data"
            });
        }

        // Calculate total amount
        let amount = 0;
        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.json({
                    success: false,
                    message: `Product not found: ${item.product}`
                });
            }
            amount += product.offerPrice * item.quantity;
        }

        // Add GST
        amount += Math.floor(amount * 0.02);

        await Order.create({
            userId,
            items,
            address,
            amount,
            paymentType: "COD",
            isPaid: true
        });

        res.json({
            success: true,
            message: "Order placed successfully"
        });

    } catch (error) {
        console.log(error.message);
        res.json({
            success: false,
            message: error.message
        });
    }
};

export const stripeWebhook = async (req, res) => {
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY); 
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripeInstance.webhooks.constructEvent(
            req.body, 
            sig, 
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.log(`Webhook Error: ${err.message}`);
        return res.send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
        case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object;
            const paymentIntentId = paymentIntent.id;
        
            const session = await stripeInstance.checkout.sessions.list({
                payment_intent: paymentIntentId,
            });
        
            const { orderId, userId } = session.data[0].metadata;
        
            // Update order status in DB
            await Order.findByIdAndUpdate(orderId, {
                isPaid: true,
                paymentStatus: "Paid",  // Add this to mark the payment as completed
            });
        
            await User.findByIdAndUpdate(userId, {
                cartItems: [],
            });
        
            break;
        }
        

        case 'payment_intent.payment_failed':{
            const paymentIntent = event.data.object;
            const paymentIntentId = paymentIntent.id;

            const session = await stripeInstance.checkout.sessions.list({
                payment_intent: paymentIntentId,
            });

            const {orderId} = session.data[0].metadata;

            // Update order status in DB
            await Order.findByIdAndDelete(orderId);
            break;
        }

        default:
            console.error(`Unhandled event type ${event.type}`);
            return res.send(`Unhandled event type ${event.type}`);
            break;
    }
    res.json({ received: true });
}


export const getUserOrders = async (req, res) => {
    try {
        const { userId } = req.query; // Extract userId from query params

        if (!userId) {
            return res.json({
                success: false,
                message: "User ID is required"
            });
        }

        const orders = await Order.find({
            userId,
            $or: [{ paymentType: "COD" }, { isPaid: true }]
        })
        .populate("items.product address")
        .populate("address")
        .sort({ createdAt: -1 });

        if (orders.length === 0) {
            return res.json({
                success: false,
                message: "No orders found"
            });
        }

        res.json({
            success: true,
            orders
        });

    } catch (error) {
        console.log("Error fetching user orders:", error.message);
        res.json({
            success: false,
            message: "An error occurred while fetching orders"
        });
    }
};

export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate("items.product address").populate("address").sort({createdAt: -1});
        
        if(!orders){
            return res.json({
                success: false,
                message: "No orders found"
            })
        }
        res.json({
            success: true,
            orders
        })
    } catch (error) {
        console.log(error.message);
        res.json({
            success: false,
            message: error.message
        })
    }
}

const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY); // Create once globally


export const placeOrderStripe = async (req, res) => {
    try {
        const { userId, items, address } = req.body;
        const origin = req.headers.origin;

        if (!origin) {
            return res.json({
                success: false,
                message: "Origin header missing",
            });
        }

        if (!address || !items || items.length === 0) {
            return res.json({
                success: false,
                message: "Invalid order data",
            });
        }

        let productData = [];
        let baseAmount = 0;

        // Fetch products & calculate price
        for (const item of items) {
            const product = await Product.findById(item.product);

            if (!product) {
                return res.json({
                    success: false,
                    message: `Product not found: ${item.product}`,
                });
            }

            productData.push({
                name: product.name,
                quantity: item.quantity,
                price: product.offerPrice,
            });

            baseAmount += product.offerPrice * item.quantity;
        }

        // Calculate GST (2%) & Total
        const gstAmount = Math.floor(baseAmount * 0.02);
        const totalAmount = baseAmount + gstAmount;

        // 1. Create order in DB with "Pending" payment status
        const order = await Order.create({
            userId,
            items,
            address,
            amount: totalAmount, // Including tax
            paymentType: "Online",
            paymentStatus: "Pending",
        });

        // 2. Prepare Stripe line items
        const line_items = productData.map((item) => ({
            price_data: {
                currency: 'inr',
                product_data: {
                    name: item.name,
                },
                unit_amount: Math.floor(item.price * 1.02 * 100), // price + 2% GST per item
            },
            quantity: item.quantity,
        }));

        // 3. Create Stripe checkout session
        const session = await stripeInstance.checkout.sessions.create({
            line_items,
            mode: 'payment',
            success_url: `${origin}/loader?next=my-orders&orderId=${order._id}`, // pass orderId too
            cancel_url: `${origin}/cart`,
            metadata: {
                orderId: order._id.toString(),
                userId,
            },
        });

        // 4. Send Stripe session URL to frontend
        res.json({
            success: true,
            url: session.url,
            message: "Stripe session created successfully",
        });

    } catch (error) {
        console.error("Stripe Order Error:", error);

        res.json({
            success: false,
            message: "Server error: " + error.message,
        });
    }
};
