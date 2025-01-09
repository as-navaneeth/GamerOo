const Coupon = require('../../models/couponSchema');

// Get all coupons page
const getCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.render('coupons', { coupons });
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).render('error', { message: 'Error fetching coupons' });
    }
};

// Get add coupon page
const getAddCoupon = (req, res) => {
    res.render('addCoupon');
};

// Add new coupon
const addCoupon = async (req, res) => {
    try {
        const {
            code,
            description,
            discountType,
            discountAmount,
            minimumPurchase,
            maximumDiscount,
            startDate,
            endDate,
            usageLimit
        } = req.body;

        // Check if coupon code already exists
        const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
        if (existingCoupon) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code already exists'
            });
        }

        // Create new coupon
        const coupon = new Coupon({
            code: code.toUpperCase(),
            description,
            discountType,
            discountAmount,
            minimumPurchase,
            maximumDiscount,
            startDate,
            endDate,
            usageLimit,
            isActive: true
        });

        await coupon.save();

        res.status(201).json({
            success: true,
            message: 'Coupon created successfully'
        });
    } catch (error) {
        console.error('Error creating coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating coupon'
        });
    }
};

// Get edit coupon page
const getEditCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) {
            return res.status(404).render('error', { message: 'Coupon not found' });
        }
        res.render('editCoupon', { coupon });
    } catch (error) {
        console.error('Error fetching coupon:', error);
        res.status(500).render('error', { message: 'Error fetching coupon' });
    }
};

// Update coupon
const updateCoupon = async (req, res) => {
    try {
        const {
            code,
            description,
            discountType,
            discountAmount,
            minimumPurchase,
            maximumDiscount,
            startDate,
            endDate,
            usageLimit,
            isActive
        } = req.body;

        // Check if updated code conflicts with existing coupons
        const existingCoupon = await Coupon.findOne({
            code: code.toUpperCase(),
            _id: { $ne: req.params.id }
        });
        
        if (existingCoupon) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code already exists'
            });
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            req.params.id,
            {
                code: code.toUpperCase(),
                description,
                discountType,
                discountAmount,
                minimumPurchase,
                maximumDiscount,
                startDate,
                endDate,
                usageLimit,
                isActive
            },
            { new: true }
        );

        if (!updatedCoupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        res.json({
            success: true,
            message: 'Coupon updated successfully'
        });
    } catch (error) {
        console.error('Error updating coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating coupon'
        });
    }
};

// Delete coupon
const deleteCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        res.json({
            success: true,
            message: 'Coupon deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting coupon'
        });
    }
};

// Toggle coupon status
const toggleCouponStatus = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        coupon.isActive = !coupon.isActive;
        await coupon.save();

        res.json({
            success: true,
            message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully`
        });
    } catch (error) {
        console.error('Error toggling coupon status:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling coupon status'
        });
    }
};

module.exports = {
    getCoupons,
    getAddCoupon,
    addCoupon,
    getEditCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus
};
