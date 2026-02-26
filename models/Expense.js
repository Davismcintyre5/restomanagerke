const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    expenseId: {
        type: String,
        unique: true
    },
    type: {
        type: String,
        enum: ['Supplier Payment', 'Utility Bill', 'Rent', 'Equipment', 'Maintenance', 'Marketing', 'Salary', 'Other'],
        required: [true, 'Expense type is required']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    paymentMethod: {
        type: String,
        enum: ['M-PESA', 'Cash', 'Bank Transfer'],
        required: [true, 'Payment method is required']
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier'
    },
    supplierName: String,
    notes: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Generate expenseId before saving
expenseSchema.pre('save', async function(next) {
    if (!this.expenseId) {
        const count = await mongoose.model('Expense').countDocuments();
        this.expenseId = `EXP${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Expense', expenseSchema);