const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    discountType: {
        type: String,
        required: true,
        enum: ['percentage', 'fixed'],
        default: 'percentage'
    },
    discountAmount: {
        type: Number,
        required: true,
        min: 0
    },
    minimumPurchase: {
        type: Number,
        required: true,
        default: 0
    },
    maximumDiscount: {
        type: Number,
        required: false
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    usageLimit: {
        type: Number,
        required: true,
        default: 1
    },
    usedCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    userUsage: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        usedCount: {
            type: Number,
            default: 1
        },
        lastUsed: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Add indexes for better query performance

couponSchema.index({ startDate: 1, endDate: 1 });
couponSchema.index({ isActive: 1 });


const Coupon = mongoose.model('Coupon', couponSchema);




module.exports=Coupon