import asyncHandler from "../middleware/asyncHandler.js";
import Order from "../models/orderModel.js";

//@desc  Create new order
//@route POST /api/orders
//@access Private
const createOrder = asyncHandler(async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    paymentMethod,
    paymentDetails
  } = req.body;

  let paymentResult;
  let isPaid=false;
  let paidAt;

  if (paymentDetails) {
    paymentResult = {
      // from payment gateways like paypal etc
      id: paymentDetails.id, // transaction id
      status: paymentDetails.status, // payment status
      update_time: paymentDetails.update_time, // payment success time
      email_address: paymentDetails.payer.email_address, // email address of payee
    };      
    isPaid= true;
    paidAt= Date.now();
  }

  

  const order = new Order({
    user: req.user._id,
    orderItems,
    shippingAddress,
    paymentMethod,
    taxPrice,
    itemsPrice,
    shippingPrice,
    totalPrice,
    isPaid,
    paidAt,
    paymentResult,
  });
  const createdOrder = await order.save();
  res.status(201).json(createdOrder);
});

//@desc  Get order by id
//@route GET /api/orders/:id
//@access Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email"
  );

  if (order) {
    res.status(200).json(order);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
});

//@desc  Update order to paid
//@route PUT /api/orders/:id/pay
//@access Private
const updateOrderToPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      // from payment gateways like stripe/paypal etc
      id: req.body.id, // transaction id
      status: req.body.status, // payment status
      update_time: req.body.update_time, // payment success time
      email_address: req.body.payer.email_address, // email address of payee
    };

    const updatedOrder = await order.save();

    res.status(200).json(updatedOrder);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
});

//@desc  Update Order to delivered
//@route PUT /api/orders/:id/deliver
//@access Private/Admin
const updateOrderToDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    order.isDelivered = true;
    order.deliveredAt = Date.now();

    const updatedOrder = await order.save();

    res.status(200).json(updatedOrder);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
});

//@desc  Get all Orders
//@route POST /api/orders
//@access Private/Admin
const getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({}).populate("user", "id name");
  res.status(200).json(orders);
});

//@desc  Get user Order
//@route POST /api/orders
//@access Private
const getUserOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id });

  res.status(200).json(orders);
});

const deleteOrders = asyncHandler(async (req,res) => {
  // const orders = await Order.find({ user : user.req._id});
  const id = req.body.id;
  await Order.deleteMany({ user: id});
  res.status(200).json({ message : 'Orders deleted successfully'})
})

export {
  createOrder,
  getOrderById,
  getOrders,
  updateOrderToDelivered,
  updateOrderToPaid,
  getUserOrders,
  deleteOrders
};
