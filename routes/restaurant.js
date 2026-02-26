const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const auth = require('../middleware/auth');

// @route   GET /api/restaurant
// @desc    Get restaurant settings
// @access  Public
router.get('/', async (req, res) => {
    try {
        let settings = await Restaurant.findOne();
        
        // Create default settings if none exist
        if (!settings) {
            settings = new Restaurant();
            await settings.save();
        }
        
        res.json(settings);
    } catch (error) {
        console.error('Get restaurant settings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/restaurant
// @desc    Update restaurant settings
// @access  Private
router.put('/', auth, async (req, res) => {
    try {
        let settings = await Restaurant.findOne();
        
        if (!settings) {
            settings = new Restaurant(req.body);
        } else {
            Object.assign(settings, req.body);
            settings.updatedAt = new Date();
        }
        
        await settings.save();
        
        res.json({
            message: 'Restaurant settings updated',
            settings
        });
    } catch (error) {
        console.error('Update restaurant settings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;