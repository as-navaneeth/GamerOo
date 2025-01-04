const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');

// Validate checkout
const validateCheckout = async (req, res) => {
    try {
        const userId = req.session.user;
        const address = await Address.findOne({
            user: userId,
            isDefault: true
        });

        if (!address) {
            return res.json({ success: false, message: 'Please add a delivery address' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error validating checkout:', error);
        res.status(500).json({
            success: false,
            message: 'Error validating checkout'
        });
    }
};

// Get checkout page
const getCheckout = async (req, res) => {
    try {
        const userId = req.session.user;

        // Get cart with products
        const cart = await Cart.findOne({ user: userId }).populate('items.product');

        // Get default address
        const address = await Address.findOne({
            user: userId,
            isDefault: true
        });

        if (!cart || cart.items.length === 0) {
            return res.redirect('/cart');
        }

        if (!address) {
            return res.redirect('/manageAddress');
        }

        res.render('checkout', {
            cart,
            address,
            totalAmount: cart.totalAmount
        });
    } catch (error) {
        console.error('Error loading checkout:', error);
        res.status(500).render('error', {
            message: 'Error loading checkout page'
        });
    }
};

// Process Checkout
const processCheckout = async (req, res) => {
    try {
        const userId = req.session.user;
        const { paymentMethod } = req.body;

        // Get cart and address
        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        const address = await Address.findOne({
            user: userId,
            isDefault: true
        });

        if (!cart || !address) {
            return res.status(400).json({
                success: false,
                message: "Cart or address not found"
            });
        }

        // Format shipping address
        const shippingAddress = {
            name: address.name,
            address: address.address,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            phone: address.phone
        };



        // Create order items
        const orderItems = cart.items.map(item => ({
            product: item.product._id,
            quantity: item.quantity,
            price: item.price
        }));

        // Create new order
        const order = new Order({
            user: userId,
            items: orderItems,
            totalAmount: cart.totalAmount,
            shippingAddress: shippingAddress,
            paymentMethod: paymentMethod === 'cod' ? 'COD' : 'Online Payment',
            paymentStatus: 'Pending',
            status: 'Processing',
            orderDate: new Date()
        });

        await order.save();

        // Clear cart after successful order
        await Cart.findOneAndDelete({ user: userId });

        res.json({
            success: true,
            orderId: order._id,
            message: 'Order placed successfully'
        });
        
    } catch (error) {
        console.error('Error processing checkout:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing checkout'
        });
    }
};

module.exports = {
    validateCheckout,
    getCheckout,
    processCheckout
};