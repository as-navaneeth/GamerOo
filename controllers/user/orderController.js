const Order = require('../../models/orderSchema');

// Get all orders for a user
const getMyOrders = async (req, res) => {
    try {
        const userId = req.session.user;
        const orders = await Order.find({ user: userId })
            .populate('items.product')
            .sort({ createdAt: -1 }); // Most recent orders first

        res.render('myOrders', { orders });
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

module.exports = {
    getMyOrders,
    getOrderDetails,
    cancelOrder
};
