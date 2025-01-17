const Wallet = require('../../models/walletSchema');
const Order = require('../../models/orderSchema');

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

module.exports = {
    getWallet,
    addToWallet,
    useWalletBalance,
    getWalletBalance
};
