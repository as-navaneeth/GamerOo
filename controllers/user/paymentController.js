const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../../models/orderSchema');
const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_ID,
    key_secret: process.env.RAZORPAY_SECRET
});

// Create Razorpay order
const createRazorpayOrder = async (req, res) => {
    try {
        const { amount } = req.body;
        
        const options = {
            amount: amount * 100, // Convert to paise
            currency: 'INR',
            receipt: 'receipt#1',
        };

        const order = await razorpay.orders.create(options);
        res.json({
            key: process.env.RAZORPAY_SECRET,
            amount: order.amount,
            currency: order.currency,
            id: order.id
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send(error);
    }
};

// Verify Razorpay payment
const verifyPayment = async (req, res) => {
    console.log('Verifying Razorpay payment...');

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
    console.log('Received data:', { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId });

    const key_secret = process.env.RAZORPAY_SECRET;

    try {
        // Verify Razorpay signature
        const generated_signature = crypto
            .createHmac('sha256', key_secret)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            // Update order status to failed if signature verification fails
            const order = await Order.findById(orderId);
            if (order) {
                order.paymentStatus = 'failed';
                order.razorpay_order_id = razorpay_order_id;
                order.razorpay_payment_id = razorpay_payment_id;
                order.razorpay_signature = razorpay_signature;
                await order.save();
            }
            return res.status(400).json({ status: 'failed', message: 'Invalid signature' });
        }

        // Find and update the order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ status: 'failed', message: 'Order not found' });
        }

        // Update order with payment details
        order.razorpay_order_id = razorpay_order_id;
        order.razorpay_payment_id = razorpay_payment_id;
        order.razorpay_signature = razorpay_signature;
        order.paymentStatus = 'paid';
        await order.save();

        // Clear the user's cart
        const user = await User.findById(order.userId);
        if (user) {
            await Cart.findOneAndUpdate({ userId: user._id }, { $set: { products: [] } });
        }

        res.json({ status: 'success', message: 'Payment verified successfully' });

    } catch (error) {
        console.error('Error during payment verification:', error);
        // Update order status to failed on error
        try {
            const order = await Order.findById(orderId);
            if (order) {
                order.paymentStatus = 'failed';
                order.razorpay_order_id = razorpay_order_id;
                order.razorpay_payment_id = razorpay_payment_id;
                order.razorpay_signature = razorpay_signature;
                await order.save();
            }
        } catch (saveError) {
            console.error('Error updating order status:', saveError);
        }
        res.status(500).json({ status: 'failed', message: 'Error during payment verification' });
    }
};

// Process COD order
const processCodOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        order.paymentStatus = 'pending';
        order.orderStatus = 'processing';
        order.paymentMethod = 'COD';
        await order.save();

        // Clear cart after COD order placement
        await Cart.findOneAndUpdate(
            { userId: order.userId },
            { $set: { products: [] } }
        );

        res.json({
            success: true,
            message: 'COD order placed successfully'
        });
    } catch (error) {
        console.error('COD processing error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing COD order'
        });
    }
};

module.exports = {
    createRazorpayOrder,
    verifyPayment,
    processCodOrder
};
