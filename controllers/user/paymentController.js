const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../../models/orderSchema');
const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const Wallet=require('../../models/walletSchema');

require('dotenv').config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Razorpay order
const createRazorpayOrder = async (req, res) => {
    try {
        const { paymentMethod, amount } = req.body;
        const userId = req.session.user;

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

        // Get applied coupon from session
        const appliedCoupon = req.session.appliedCoupon;
        const originalAmount = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);

        // Create order in database
        const newOrder = new Order({
            user: userId,
            items: orderItems,
            totalAmount: amount,
            originalAmount: originalAmount,
            discount: appliedCoupon ? appliedCoupon.discountAmount : 0,
            shippingAddress: shippingAddress,
            paymentMethod: paymentMethod === 'cod' ? 'COD' : 'Online Payment',
            paymentStatus: 'Pending',
            status: 'Processing',
            orderDate: new Date()
        });

        if (appliedCoupon) {
            newOrder.couponCode = appliedCoupon.code;
            newOrder.couponDiscount = {
                code: appliedCoupon.code,
                discountType: appliedCoupon.discountType,
                discountAmount: appliedCoupon.discountAmount
            };
        }

        await newOrder.save();

        // Create Razorpay order
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(amount * 100),
            currency: 'INR',
            receipt: newOrder._id.toString()    
        });

        // console.log('Razorpay order created:', razorpayOrder);

        res.json({
            success: true,
            order: razorpayOrder,
            key: process.env.RAZORPAY_KEY_ID,
            orderId: newOrder._id // Add this to track our order
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating order'
        });
    }
};

// Verify Razorpay payment
const verifyPayment = async (req, res) => {
    try {
        
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, receipt } = req.body;

        // Verify signature
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

    

        if (razorpay_signature === expectedSign) {
            // Find and update order
            const order = await Order.findById(receipt);
            
            if (!order) {
                console.error('Order not found:', receipt);
                return res.status(404).json({
                    success: false,
                    message: "Order not found"
                });
            }


            // Update order status
            order.paymentStatus = 'Success';
            order.status = 'Confirmed';
            order.paymentId = razorpay_payment_id;
            order.razorpayOrderId = razorpay_order_id;
            await order.save();
           

            // Clear cart after successful payment
            await Cart.findOneAndDelete({ user: req.session.user });

            res.json({
                success: true,
                message: "Payment verified successfully"
            });
        } else {
            console.error('Signature verification failed');
            // If signature verification fails
            const order = await Order.findById(receipt);
            if (order) {
                order.paymentStatus = 'Failed';
                order.status = 'Failed';
                await order.save();
            }

            res.status(400).json({
                success: false,
                message: "Invalid signature"
            });
        }


    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: "Error verifying payment"
        });
    }
};



const handleWalletPayment=async (req,res)=>{
    try {
        const {finalAmount}=req.body;
        const userId=req.session.user;


        // Ensure amount is a valid number
        if (isNaN(finalAmount) || finalAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount'
            });
        }
        
        //find the user's wallet
        const wallet=await Wallet.findOne({user:userId});

        if(!wallet || wallet.balance< finalAmount){
            return res.status(400).json({
                success:false,
                message:'Insufficient wallet balance'
            });
        }

        

        //create order in database
        const cart=await Cart.findOne({user:userId}).populate('items.product');
        const address=await Address.findOne({user:userId, isDefault:true});

        if(!cart || !address){
            return res.status(400).json({
                success:'false',
                message:'Cart or address not found'
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

        // Get applied coupon from session
        const appliedCoupon = req.session.appliedCoupon;
        const originalAmount = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);

        // Create order in database
        const newOrder = new Order({
            user: userId,
            items: orderItems,
            totalAmount: finalAmount,
            originalAmount: originalAmount,
            discount: appliedCoupon ? appliedCoupon.discountAmount : 0,
            shippingAddress: shippingAddress,
            paymentMethod: 'Wallet',
            paymentStatus: 'Success',
            status: 'Confirmed',
            orderDate: new Date()
        });

        if (appliedCoupon) {
            newOrder.couponCode = appliedCoupon.code;
            newOrder.couponDiscount = {
                code: appliedCoupon.code,
                discountType: appliedCoupon.discountType,
                discountAmount: appliedCoupon.discountAmount
            };
        }

        await newOrder.save();


        //Dedut the amount from the wallet
        wallet.balance-=finalAmount;
        wallet.transactions.push({
            type:'debit',
            amount:finalAmount,
            description:`Order payment for ${newOrder.orderId}`,
            date:new Date()
        })
        await wallet.save();



        // Clear cart after successful payment
        await Cart.findOneAndDelete({ user: userId });

        res.json({
            success: true,
            message: 'Payment successful',
            orderId: newOrder._id
        });



    } catch (error) {
        console.error('Wallet payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing wallet payment'
        });
    }
}






// Handle COD orders
// const handleCodOrder = async (req, res) => {
//     try {
//         const { orderId } = req.body;
        
//         // Find the order
//         const order = await Order.findById(orderId);
//         if (!order) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Order not found"
//             });
//         }

//         // Update order status for COD
//         order.paymentStatus = 'Pending';
//         order.status = 'Confirmed';
//         await order.save();

//         // Clear cart after successful order placement
//         await Cart.findOneAndDelete({ user: req.session.user });

//         res.json({
//             success: true,
//             message: "Order placed successfully"
//         });
//     } catch (error) {
//         console.error('COD order error:', error);
//         res.status(500).json({
//             success: false,
//             message: "Error processing COD order"
//         });
//     }
// };

// Get order status
const getOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        res.json({
            success: true,
            status: order.status,
            paymentStatus: order.paymentStatus
        });
    } catch (error) {
        console.error('Get order status error:', error);
        res.status(500).json({
            success: false,
            message: "Error getting order status"
        });
    }
};

module.exports = {
    createRazorpayOrder,
    verifyPayment,    
    getOrderStatus,
    handleWalletPayment,
};