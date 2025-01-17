const Order = require('../../models/orderSchema');
const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');
const Wallet=require('../../models/walletSchema');
const { OrderedBulkOperation } = require('mongodb');

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
    try 
    
    {
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
        let walletBalance=null;

        //wallet management
        if(order.paymentStatus ==='Success' && order.paymentMethod!=='COD'){
        let wallet=await Wallet.findOne({user:userId});
        if(!wallet){
            wallet=new Wallet({user:userId});
        }
        
        const {totalAmount}=order;
        wallet.balance+=totalAmount;        
        wallet.transactions.push({
            type:'credit',
            amount:totalAmount,
            description:`Refund for cancelled Order: ${order.orderId}`,
            orderId:orderId,           
        })

        await wallet.save();
        walletBalance=wallet.balance;
    }


        res.json({
            success: true,
            message:order.paymentMethod==='COD'?'Order cancelled successfully.'
            :'Order cancelled successfully and refund added to wallet.',
            walletBalance,
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

        // Get cart items
        const cart = await Cart.findOne({ userId }).populate('products.productId');
        if (!cart || cart.products.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty'
            });
        }

        // Prepare order items
        const orderItems = cart.products.map(item => ({
            product: item.productId._id,
            quantity: item.quantity,
            price: item.productId.price
        }));


        // Create base order
        const order = new Order({
            user: userId,
            shippingAddress: addressId,
            items: orderItems,
            paymentMethod,
            totalAmount,
            status: 'Pending',
            paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Initiated'
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
        } else {
            res.json({
                success: true,
                orderId: order._id
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
            status: 'Processing',
            paymentStatus: 'Pending'
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

// Update order status
const updateOrderStatus = async (orderId, status) => {
    try {
        await Order.findByIdAndUpdate(orderId, {
            paymentStatus: status,
            status: status === 'paid' ? 'Processing' : 'Pending'
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        throw error;
    }
};

module.exports = {
    getMyOrders,
    getOrderDetails,
    cancelOrder,
    requestReturn,
    getReturnStatus,
    createOrder,
    processOrder
};
