import path from "path";
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import colors from "colors";
import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import orderRoutes from "./routes/orderRoutes.js";
import Stripe from "stripe";
import asyncHandler from "./middleware/asyncHandler.js";
import Order from "./models/orderModel.js";
import uploadRoutes from './routes/uploadRoutes.js'
import cors from 'cors';
import { TimeConverter } from "./utils/EpochToIST.js";


dotenv.config();

const port = process.env.PORT || 5000;
connectDB();
const app = express();


// Enable CORS with credentials support
app.use(cors({
  origin: ['https://playtech-six.vercel.app', 'http://localhost:3000'], // You can replace this with the specific origins you want to allow
  credentials: true, // Enable credentials support (cookies, HTTP authentication, etc.)
}));



const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const endpointSecret = process.env.STRIPE_WEBHOOK_KEY;

    const sig = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      console.log("Verified Webhook");
    } catch (err) {
      console.log("FAILED", err);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;

        const paymentIntent = await stripe.paymentIntents.retrieve(
          session.payment_intent
        );

        const paymentStatus = paymentIntent.status;
        const paymentTime = new Date(paymentIntent.created * 1000);
        const paymentEmail = session.customer_details.email;
        const paymentId = paymentIntent.id;
        const userID = session.client_reference_id;

        const lineItems = await stripe.checkout.sessions.listLineItems(
          session.id,
          { expand: ['data.price.product'] }
        );

        let tax_price, shipping_price;

        const orderItems = lineItems.data.map((item) => {
          if (item.description === "Tax") {
            tax_price = item.amount_total / 100;
            return null; // Return null for tax item to filter it out from orderItems
          } else if (item.description === "Shipping") {
            shipping_price = item.amount_total / 100;
            return null; // Return null for shipping item to filter it out from orderItems
          }

          return {
            name: item.description,
            price: item.amount_total / 100,
            qty: item.quantity,
            product: item.price.product.metadata.product_id,
            image: item.price.product.metadata.product_image,
          };
        });

        // Remove the filtered-out items (tax and shipping) from the orderItems array
        const OrderItems = orderItems.filter((item) => item !== null);

        // Create the order in your database with the information obtained from the webhook
        try {
          const order = new Order({
            user: userID,
            orderItems: OrderItems,
            shippingAddress: JSON.parse(session.metadata.shipping_address),
            paymentMethod: "Stripe",
            taxPrice: tax_price,
            itemsPrice: session.metadata.items_price,
            shippingPrice: shipping_price,
            totalPrice: (session.amount_total) / 100,
            isPaid: true,
            paidAt: paymentTime,
            paymentResult: {
              id: paymentId,
              status: paymentStatus,
              update_time: TimeConverter(paymentTime),
              email_address: paymentEmail,
            },
          });
          const createdOrder = await order.save();
          console.log("Order created successfully", createdOrder);
        } catch (error) {
          res.status(500).json({ message: "Failed to create order", error: error });
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    res.status(200).json({received: true});
  }
);

// Body parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//Cookie parser middleware
app.use(cookieParser());

app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use('/api/upload', uploadRoutes);

app.get("/api/config/paypal", (req, res) =>
  res.send({ clientId: process.env.PAYPAL_CLIENT_ID })
);

app.post(
  "/api/create-checkout-session/stripe",
  asyncHandler(async (req, res) => {
    const {
      orderItems,
      itemsPrice,
      taxPrice,
      shippingPrice,
      userID,
      shippingAddress,
    } = req.body;

    const itemsPriceNumber = parseFloat(itemsPrice).toFixed(2);
    const taxPriceNumber = parseFloat(taxPrice).toFixed(2);
    const shippingPriceNumber = parseFloat(shippingPrice).toFixed(2);

    // Calculate total amount including tax and shipping
    const lineItems = orderItems.map((item) => {
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
            metadata: {
              product_id: item.product,
              product_image: item.image,
            },
          },
          unit_amount: Number(parseFloat(item.price * 100).toFixed(2)),
        },
        quantity: item.qty,
      };
    });

    // Add tax item to line_items
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: "Tax",
        },
        unit_amount: Number(parseFloat(taxPriceNumber * 100).toFixed(2)),
      },
      quantity: 1,
    });

    // Add shipping item to line_items
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: "Shipping",
        },
        unit_amount: Number(parseFloat(shippingPriceNumber * 100).toFixed(2)),
      },
      quantity: 1,
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      client_reference_id: userID,
      metadata: {
        shipping_address: JSON.stringify(shippingAddress),
        items_price: itemsPriceNumber,
      },
      success_url: `${process.env.DOMAIN}/success`,
      cancel_url: `${process.env.DOMAIN}/failed`,
    });

    res.send({ url: session.url });
  })
);
// Currently over 10,000 dollars is not allowed on stripe
//dashboard.stripe.com/test/logs?showIP=false&created[preset]=1D&success=false&method[0]=post&method[1]=delete&direction[0]=self&direction[1]=connect_in


const __dirname = path.resolve(); // set __dirname to current directory
app.use('/uploads', express.static(path.join(__dirname, '/uploads')))


//always write this at the end
if (process.env.NODE_ENV === "production") {
  const currentDirectory = path.resolve();
  app.use(express.static(path.join(currentDirectory, "/frontend/build")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(currentDirectory, "frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running...");
  });
}

app.use(notFound);
app.use(errorHandler);

app.listen(port, () =>
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${port}`.blue.bold
  )
);
