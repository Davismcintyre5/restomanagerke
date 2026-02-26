const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Item name is required'],
        trim: true
    },
    category: {
        type: String,
        enum: ['Meat', 'Vegetables', 'Dairy', 'Beverages', 'Dry Goods', 'Other'],
        default: 'Other'
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [0, 'Quantity cannot be negative']
    },
    unit: {
        type: String,
        enum: ['kg', 'g', 'L', 'ml', 'pcs', 'boxes'],
        default: 'kg'
    },
    unitPrice: {
        type: Number,
        required: [true, 'Unit price is required'],
        min: [0, 'Price cannot be negative']
    },
    reorderLevel: {
        type: Number,
        required: [true, 'Reorder level is required'],
        min: [0, 'Reorder level cannot be negative']
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier'
    },
    supplierName: String,
    status: {
        type: String,
        enum: ['In Stock', 'Low Stock', 'Out of Stock'],
        default: 'In Stock'
    },
    usageHistory: [{
        quantityUsed: Number,
        reason: String,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    lastRestocked: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Update status based on quantity
inventorySchema.pre('save', function(next) {
    if (this.quantity <= 0) {
        this.status = 'Out of Stock';
    } else if (this.quantity <= this.reorderLevel) {
        this.status = 'Low Stock';
    } else {
        this.status = 'In Stock';
    }
    next();
});

module.exports = mongoose.model('Inventory', inventorySchema);