const Order = require('../../models/orderSchema');
const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');
const Razorpay = require('razorpay');
require('dotenv').config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_ID,
    key_secret: process.env.RAZORPAY_SECRET
});

// Get all orders for a user
const getMyOrders = async (req, res) => {
    try {
        const userId = req.session.user;
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // Orders per page

        // Get total count of orders
        const totalOrders = await Order.countDocuments({ user: userId });

        //calcualte total pages
        const totalPages=Math.ceil(totalOrders/limit);

        // Get orders for current page
        const orders = await Order.find({ user: userId })
            .populate('items.product')
            .sort({ orderDate: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.render('myOrders', {
            orders,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render('error', {
            message: 'Error loading orders'
        });
    }
};

// Get single order details
const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.session.user;

        const order = await Order.findOne({
            _id: orderId,
            user: userId
        }).populate('items.product');

        if (!order) {
            return res.status(404).render('error', {
                message: 'Order not found'
            });
        }

        res.render('orderDetails', { order });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).render('error', {
            message: 'Error loading order details'
        });
    }
};

// Cancel order
const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.session.user;
        const { reason } = req.body;

        const order = await Order.findOne({
            _id: orderId,
            user: userId,
            status: { $nin: ['Delivered', 'Cancelled'] }
        });

        if (!order) {
            return res.status(400).json({
                success: false,
                message: 'Order cannot be cancelled'
            });
        }

        order.status = 'Cancelled';
        order.cancelledAt = new Date();
        order.cancellationReason = reason;

        await order.save();

        res.json({
            success: true,
            message: 'Order cancelled successfully'
        });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel order'
        });
    }
};

// Request return for an order
const requestReturn = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.session.user;
        const { reason } = req.body;

        const order = await Order.findOne({
            _id: orderId,
            user: userId
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if order is eligible for return
        if (order.status !== 'Delivered') {
            return res.status(400).json({
                success: false,
                message: 'Only delivered orders can be returned'
            });
        }

        // Check if return is within 7 days of delivery
        const deliveryDate = new Date(order.orderDate);
        const currentDate = new Date();
        const daysSinceDelivery = Math.floor((currentDate - deliveryDate) / (1000 * 60 * 60 * 24));

        if (daysSinceDelivery > 7) {
            return res.status(400).json({
                success: false,
                message: 'Return period has expired (7 days from delivery)'
            });
        }

        // Update order with return request
        order.returnStatus = 'Return Requested';
        order.returnReason = reason;
        order.returnDate = new Date();
        await order.save();

        res.json({
            success: true,
            message: 'Return request submitted successfully'
        });

    } catch (error) {
        console.error('Error requesting return:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing return request'
        });
    }
};

// Get return status
const getReturnStatus = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.session.user;

        const order = await Order.findOne({
            _id: orderId,
            user: userId
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            returnStatus: order.returnStatus,
            returnReason: order.returnReason,
            returnDate: order.returnDate,
            returnApprovedDate: order.returnApprovedDate
        });

    } catch (error) {
        console.error('Error fetching return status:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching return status'
        });
    }
};

// Create a new order
const createOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod, totalAmount } = req.body;
        const userId = req.session.user;

        // Create base order
        const order = new Order({
            userId,
            shippingAddress: addressId,
            paymentMethod,
            totalAmount,
            orderStatus: 'pending',
            paymentStatus: paymentMethod === 'COD' ? 'pending' : 'initiated'
        });

        // Save the order
        await order.save();

        if (paymentMethod === 'COD') {
            // For COD, directly process the order
            await processOrder(userId, order._id);
            res.json({
                success: true,
                orderId: order._id,
                message: 'Order placed successfully'
            });
        } else if (paymentMethod === 'RAZORPAY') {
            // Create Razorpay order
            const razorpayOrder = await razorpay.orders.create({
                amount: totalAmount * 100, // Convert to paise
                currency: 'INR',
                receipt: order._id.toString()
            });

            res.json({
                success: true,
                order: razorpayOrder,
                orderId: order._id,
                key_id: process.env.RAZORPAY_ID
            });
        }
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating order'
        });
    }
};

// Process the order (common functionality for both COD and Razorpay)
const processOrder = async (userId, orderId) => {
    try {
        // Update order status
        await Order.findByIdAndUpdate(orderId, {
            orderStatus: 'processing',
            paymentStatus: 'pending'
        });

        // Clear cart
        await Cart.findOneAndUpdate(
            { userId },
            { $set: { products: [] } }
        );

        return true;
    } catch (error) {
        console.error('Error processing order:', error);
        return false;
    }
};

// Verify Razorpay payment
const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            orderId
        } = req.body;

        // Verify signature
        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_SECRET)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            await updateOrderStatus(orderId, 'failed');
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }

        // Update order status
        await updateOrderStatus(orderId, 'paid');
        
        // Process the order
        await processOrder(req.session.user, orderId);

        res.json({
            success: true,
            message: 'Payment verified successfully'
        });
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed'
        });
    }
};

// Update order status
const updateOrderStatus = async (orderId, status) => {
    try {
        await Order.findByIdAndUpdate(orderId, {
            paymentStatus: status,
            orderStatus: status === 'paid' ? 'processing' : 'failed'
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        throw error;
    }
};

// Get order details
const getOrderDetailsNew = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId)
            .populate('userId')
            .populate('shippingAddress');
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            order
        });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching order details'
        });
    }
};

module.exports = {
    getMyOrders,
    getOrderDetails,
    cancelOrder,
    requestReturn,
    getReturnStatus,
    createOrder,
    verifyPayment,
    getOrderDetailsNew
};
