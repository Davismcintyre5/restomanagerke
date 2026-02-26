const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    menuId: {
        type: String,
        unique: true,
        sparse: true // This allows multiple null values
    },
    name: {
        type: String,
        required: [true, 'Item name is required'],
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Appetizer', 'Main Course', 'Dessert', 'Beverage', 'Side Dish']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    description: {
        type: String,
        default: ''
    },
    preparationTime: {
        type: Number,
        default: 15,
        min: [0, 'Preparation time cannot be negative']
    },
    available: {
        type: Boolean,
        default: true
    },
    image: {
        type: String,
        default: 'fa-utensils'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Generate menuId only if not present
menuItemSchema.pre('save', async function(next) {
    if (!this.menuId) {
        const count = await mongoose.model('MenuItem').countDocuments();
        this.menuId = `MENU${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

// Drop any existing indexes that might cause issues
menuItemSchema.index({ menuId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);