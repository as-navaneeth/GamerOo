const Wallet = require('../../models/walletSchema');
const Order = require('../../models/orderSchema');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Get wallet details
const getWallet = async (req, res) => {
    try {
        const userId = req.session.user;
        let wallet = await Wallet.findOne({ user: userId });

        if (!wallet) {
            wallet = await new Wallet({ user: userId }).save();
        }

        res.render('wallet', {
            wallet,
            user: userId
        });
    } catch (error) {
        console.error('Error getting wallet:', error);
        res.status(500).render('error', {
            message: 'Error loading wallet'
        });
    }
};

// Add money to wallet (for refunds)
const addToWallet = async (userId, amount, description, orderId = null) => {
    try {

        const order=await Order.findOne({
            user:userId,
            'item.product':orderId
        });

        let wallet = await Wallet.findOne({ user: userId });
        
        // Create wallet if it doesn't exist
        if (!wallet) {
            wallet = new Wallet({ user: userId });
        }

        // Add transaction
        wallet.transactions.push({
            type: 'credit',
            amount: amount,
            description: description,
            orderId: order.orderId
        });

        // Update balance
        wallet.balance += amount;    

        await wallet.save();
        return wallet;
    } catch (error) {
        console.error('Error adding to wallet:', error);
        throw error;
    }
};

// Use wallet balance for purchase
const useWalletBalance = async (userId, amount, description, orderId) => {
    try {
        const wallet = await Wallet.findOne({ user: userId });
        
        if (!wallet || wallet.balance < amount) {
            throw new Error('Insufficient wallet balance');
        }

        // Add debit transaction
        wallet.transactions.push({
            type: 'debit',
            amount: amount,
            description: description,
            orderId: orderId
        });

        // Update balance
        wallet.balance -= amount;

        await wallet.save();
        return wallet;
    } catch (error) {
        console.error('Error using wallet balance:', error);
        throw error;
    }
};

// Get wallet balance
const getWalletBalance = async (userId) => {
    try {
        const wallet = await Wallet.findOne({ user: userId });
        return wallet ? wallet.balance : 0;
    } catch (error) {
        console.error('Error getting wallet balance:', error);
        throw error;
    }
};


//razor pay integration


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});


// Create Razorpay order for adding money to wallet
const createRazorpayOrderForWallet = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.session.user;

        // Input validation
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount. Please provide a valid positive number.'
            });
        }

        // Create a unique receipt ID
        const receipt = `wallet_${userId.toString().slice(-6)}_${Date.now().toString().slice(-6)}`;

        // Create Razorpay order
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(amount * 100), // Convert to paise
            currency: 'INR',
            receipt: receipt,
            payment_capture: 1
        });

        if (!razorpayOrder || !razorpayOrder.id) {
            throw new Error('Failed to create Razorpay order');
        }

        res.json({
            success: true,
            order: razorpayOrder,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating payment order. Please try again.'
        });
    }
};

// Verify Razorpay payment and update wallet balance
const verifyRazorpayPaymentForWallet = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount } = req.body;
        const userId = req.session.user;

        // Input validation
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required payment information'
            });
        }

        // Verify signature
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature !== expectedSign) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }

        // Find or create user's wallet
        let wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
            wallet = new Wallet({ user: userId, balance: 0, transactions: [] });
        }

        // Update wallet balance
        const amountInRupees = Number(amount);
        wallet.balance += amountInRupees;
        wallet.transactions.push({
            type: 'credit',
            amount: amountInRupees,
            description: 'Added to wallet via Razorpay',
            paymentId: razorpay_payment_id,
            date: new Date()
        });

        await wallet.save();

        res.json({
            success: true,
            message: 'Payment verified and wallet updated successfully',
            newBalance: wallet.balance
        });
    } catch (error) {
        console.error('Error verifying Razorpay payment:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying payment. Please contact support if amount was deducted.'
        });
    }
};

module.exports = {
    getWallet,
    addToWallet,
    useWalletBalance,
    getWalletBalance,
    createRazorpayOrderForWallet,
    verifyRazorpayPaymentForWallet,
};
