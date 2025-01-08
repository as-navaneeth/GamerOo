const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
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
        enum: ['COD', 'Online Payment']
    },
    paymentStatus: {
        type: String,
        required: true,
        enum: ['Pending', 'Completed', 'Failed'],
        default: 'Pending'
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled','Returned'],
        default: 'Pending'
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
    discount: {
        type: Number,
        default: 0
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

// Add indexes for better query performance
orderSchema.index({ user: 1, orderDate: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'items.product': 1 });

module.exports = mongoose.model('Order', orderSchema);
