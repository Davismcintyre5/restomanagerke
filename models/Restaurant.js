const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        default: 'RestoManagerKe'
    },
    address: {
        type: String,
        default: 'Nairobi, Kenya'
    },
    phone: {
        type: String,
        default: '+254 700 000000'
    },
    email: {
        type: String,
        default: 'info@restomanagerke.com'
    },
    kraPin: {
        type: String,
        default: 'P000000000A'
    },
    watermark: {
        type: String,
        default: 'RestoManagerKe'
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure only one restaurant settings document exists
restaurantSchema.pre('save', async function(next) {
    const count = await mongoose.model('Restaurant').countDocuments();
    if (count > 0 && !this._id) {
        const err = new Error('Only one restaurant settings document can exist');
        return next(err);
    }
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('Restaurant', restaurantSchema);