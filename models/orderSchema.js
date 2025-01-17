const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    orderDate: {
        type: Date,
        default: Date.now
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    originalAmount: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    couponCode: {
        type: String
    },
    couponDiscount: {
        code: String,
        discountType: {
            type: String,
            enum: ['percentage', 'fixed']
        },
        discountAmount: Number
    },
    shippingAddress: {
        name: String,
        address: String,
        city: String,
        state: String,
        pincode: String,
        phone: String
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['COD', 'Online Payment', 'RAZORPAY']
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Success', 'Failed','Completed'],
        default: 'Pending'
    },
    paymentId: {
        type: String
    },
    razorpayOrderId: {
        type: String
    },
    status: {
        type: String,
        enum: ['Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Failed', 'Returned'],
        default: 'Processing'
    },
    returnStatus:{
        type:String,
        enum:['Not Returned','Return Requested','Return Approved','Return Rejected','Return Completed'],
        default:'Not Returned'
    },
    returnReason:{
        type:String,
        trim:true
    },
    returnDate:{
        type:Date
    },
    returnApprovedDate:{
        type:Date
    },
    shippingCost: {
        type: Number,
        default: 0
    },
    trackingNumber: String,
    deliveredAt: Date,
    cancelledAt: Date,
    cancellationReason: String
}, {
    timestamps: true
});

// Pre-save middleware to generate unique orderId
orderSchema.pre('save', async function(next) {
    if (!this.orderId) {
        // Generate timestamp part (YYYYMMDD)
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        // Generate random part (4 digits)
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        
        // Combine to create orderId: YYYYMMDD-XXXX
        this.orderId = `${year}${month}${day}-${random}`;
    }
    next();
});

// Add indexes for better query performance
orderSchema.index({ user: 1, orderDate: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'items.product': 1 });

const Order=mongoose.model('Order', orderSchema);
module.exports=Order;
