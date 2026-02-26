const mongoose = require('mongoose');

const transactionItemSchema = new mongoose.Schema({
    name: String,
    quantity: Number,
    price: Number,
    subtotal: Number
});

const transactionSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        unique: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    customerName: {
        type: String,
        default: 'Walk-in Customer'
    },
    customerPhone: String,
    items: [transactionItemSchema],
    subtotal: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['M-PESA', 'Cash', 'Card', 'Bank Transfer'],
        default: 'Cash'
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
        default: 'Paid'
    },
    mpesaReceipt: String,
    notes: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Generate transactionId before saving
transactionSchema.pre('save', async function(next) {
    if (!this.transactionId) {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const count = await mongoose.model('Transaction').countDocuments();
        this.transactionId = `TRX${year}${month}${day}${String(count + 1).padStart(4, '0')}`;
    }
    
    // Calculate totals (NO VAT)
    this.subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    this.total = this.subtotal; // No VAT
    
    next();
});

module.exports = mongoose.model('Transaction', transactionSchema);