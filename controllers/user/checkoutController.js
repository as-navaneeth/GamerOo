const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Coupon = require('../../models/couponSchema');

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

        // Get all addresses and default address
        const addresses = await Address.find({ user: userId });
        const address = addresses.find(addr => addr.isDefault) || addresses[0];

        //get avaliable coupons
        const availableCoupons=await Coupon.find({isActive:true,endDate:{$gte:new Date()}});

        if (!cart || cart.items.length === 0) {
            return res.redirect('/cart');
        }

        // if (!address) {
        //     return res.redirect('/manageAddress');
        // }

        // Calculate total amount
        let totalAmount = 0;
        cart.items.forEach(item => {
            totalAmount += item.price * item.quantity;
        });

        res.render('checkout', {
            cart,
            address,
            addresses,  // Pass all addresses to the view
            totalAmount,
            availableCoupons
        });
    } catch (error) {
        console.error('Error in checkout:', error);
        res.redirect('/cart');
    }
};

// Process Checkout
const 
processCheckout = async (req, res) => {
    try {
        const userId = req.session.user;
        const { paymentMethod } = req.body;
        console.log(req.body);

        // Get cart and address
        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        const address = await Address.findOne({
            user: userId,
            isDefault: true
        });
        

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Cart is empty"
            });
        }

        if (!address) {
            return res.status(400).json({
                success: false,
                message: "No default address found"
            });
        }

        //calute amount
        let originalAmount=0;
        let finalAmount=0;
        let discount=0;


        // Calculate original amount from cart
        cart.items.forEach(item => {
            if (item.product && typeof item.price === 'number' && typeof item.quantity === 'number') {
                originalAmount += item.price * item.quantity;
            }
        });
        

        // Validate original amount
        if (isNaN(originalAmount) || originalAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid cart amount' });
        }

        finalAmount = originalAmount;

        // Check for applied coupon
        let appliedCoupon = null;
        if (cart.coupon) {
            appliedCoupon = await Coupon.findOne({ code: cart.coupon });
            if (appliedCoupon && appliedCoupon.isActive) {
                discount = appliedCoupon.discountAmount;
                finalAmount = originalAmount - discount;
            }
        }

        // Validate final amount
        if (isNaN(finalAmount) || finalAmount < 0) {
            return res.status(400).json({ success: false, message: 'Invalid final amount' });
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

        // Create order items with validation
        const orderItems = cart.items.map(item => {
            if (!item.product || typeof item.price !== 'number') {
                throw new Error('Invalid product price in cart');
            }
            return {
                product: item.product._id,
                quantity: item.quantity,
                price: item.price
            };
        });

        // Create new order
        const newOrder = new Order({
            user: userId,
            items: orderItems,
            totalAmount: finalAmount,
            originalAmount: originalAmount,
            discount: discount,
            shippingAddress: shippingAddress,
            paymentMethod: paymentMethod === 'cod' ? 'COD' : 'Online Payment',
            paymentStatus: paymentMethod==='cod'?'Pending':'Success',
            status: 'Processing',
            orderDate: new Date()
        });

        // If there's a coupon applied, store the coupon details
        if (appliedCoupon) {
            newOrder.couponCode = appliedCoupon.code;
            newOrder.couponDiscount = {
                code: appliedCoupon.code,
                discountType: appliedCoupon.discountType,
                discountAmount: appliedCoupon.discountAmount
            };
        }

        await newOrder.save();

        if (paymentMethod === 'cod') {
            // For COD, clear cart and redirect
            await Cart.findOneAndDelete({ user: userId });
            delete req.session.appliedCoupon;

            res.json({
                success: true,
                message: "Order placed successfully",
                orderId: newOrder._id
            });
        } 
        
    } catch (error) {
        console.error('Error processing checkout:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error processing checkout'
        });
    }
};

module.exports = {
    validateCheckout,
    getCheckout,
    processCheckout
};