const Coupon = require('../../models/couponSchema');
const Cart = require('../../models/cartSchema');

// Apply coupon
const applyCoupon = async (req, res) => {
    try {
        const { couponCode, totalAmount } = req.body;
        const userId = req.session.user;

        // Find the coupon
        const coupon = await Coupon.findOne({
            code: couponCode.toUpperCase(),
            isActive: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        if (!coupon) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired coupon code'
            });
        }

        // Check if user has already used this coupon
        const userUsage = coupon.userUsage.find(usage => 
            usage.user.toString() === userId.toString()
        );

        if (userUsage && userUsage.usedCount >= coupon.usageLimit) {
            return res.status(400).json({
                success: false,
                message: 'You have already used this coupon'
            });
        }

        // Check minimum purchase requirement
        if (totalAmount < coupon.minimumPurchase) {
            return res.status(400).json({
                success: false,
                message: `Minimum purchase of ₹${coupon.minimumPurchase} required`
            });
        }

        // Calculate discount
        let discountAmount;
        if (coupon.discountType === 'percentage') {
            discountAmount = Math.floor((totalAmount * coupon.discountAmount) / 100);
            if (coupon.maximumDiscount) {
                discountAmount = Math.min(discountAmount, coupon.maximumDiscount);
            }
        } else {
            discountAmount = coupon.discountAmount;
        }

        // Store coupon in session
        req.session.appliedCoupon = {
            code: coupon.code,
            discountAmount: discountAmount,
            discountType: coupon.discountType,
            originalAmount: totalAmount
        };

        res.json({
            success: true,
            message: 'Coupon applied successfully',
            discountAmount: discountAmount,
            coupon: {
                code: coupon.code,
                discountType: coupon.discountType,
                discountAmount: coupon.discountAmount,
                maximumDiscount: coupon.maximumDiscount
            }
        });

    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Error applying coupon'
        });
    }
};

// Remove coupon
const removeCoupon = async (req, res) => {
    try {
        // Remove coupon from session
        delete req.session.appliedCoupon;

        res.json({
            success: true,
            message: 'Coupon removed successfully'
        });
    } catch (error) {
        console.error('Error removing coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing coupon'
        });
    }
};

// Get applied coupon
const getAppliedCoupon = async (req, res) => {
    try {
        const appliedCoupon = req.session.appliedCoupon;
        
        if (!appliedCoupon) {
            return res.json({
                success: false,
                message: 'No coupon applied'
            });
        }

        res.json({
            success: true,
            coupon: appliedCoupon
        });
    } catch (error) {
        console.error('Error getting applied coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting applied coupon'
        });
    }
};

module.exports = {
    applyCoupon,
    removeCoupon,
    getAppliedCoupon
};
