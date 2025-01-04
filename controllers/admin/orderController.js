const Order = require('../../models/orderSchema');

// List all orders with pagination and filters
const listOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const searchQuery = req.query.search;

        let query = {};
        if (status) query.status = status;
        if (searchQuery) {
            query.$or = [
                { 'shippingAddress.name': { $regex: searchQuery, $options: 'i' } },
                { trackingNumber: { $regex: searchQuery, $options: 'i' } }
            ];
        }

        const orders = await Order.find(query)
            .populate('user', 'name email')
            .populate('items.product', 'name productImage')
            .sort({ orderDate: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Order.countDocuments(query);

        res.render('orders', {
            orders,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total,
            status: status || 'all'
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render('error', { message: 'Error fetching orders' });
    }
};

// Update order status
const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // If order is being cancelled
        if (status === 'Cancelled' && order.status !== 'Cancelled') {
            order.cancelledAt = new Date();
            order.cancellationReason = req.body.reason || 'Cancelled by admin';
            
            // Restore product stock
            for (const item of order.items) {
                const product = await Product.findById(item.product);
                if (product) {
                    product.stock += item.quantity;
                    await product.save();
                }
            }
        }

        // If order is being delivered
        if (status === 'Delivered' && order.status !== 'Delivered') {
            order.deliveredAt = new Date();
            order.paymentStatus = 'Completed';
        }

        order.status = status;
        await order.save();

        res.json({
            success: true,
            message: 'Order status updated successfully',
            order: {
                status: order.status,
                updatedAt: order.updatedAt
            }
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Error updating order status' });
    }
};

// Get order details
const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId)
            .populate('user', 'name email')
            .populate('items.product', 'name productImage price');

        if (!order) {
            return res.status(404).render('error', { message: 'Order not found' });
        }

        res.render('orderDetails', { order });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).render('error', { message: 'Error fetching order details' });
    }
};

module.exports = {
    listOrders,
    updateOrderStatus,
    getOrderDetails
};
