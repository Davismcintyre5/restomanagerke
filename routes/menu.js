const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const auth = require('../middleware/auth');

// @route   GET /api/menu/available
// @desc    Get available menu items (public)
// @access  Public
router.get('/available', async (req, res) => {
    try {
        const items = await MenuItem.find({ available: true })
            .select('name category price description image preparationTime')
            .sort({ category: 1, name: 1 });
        
        res.json(items);
    } catch (error) {
        console.error('Get available menu error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/menu
// @desc    Get all menu items
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const items = await MenuItem.find().sort({ category: 1, name: 1 });
        res.json(items);
    } catch (error) {
        console.error('Get menu error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/menu/:id
// @desc    Get single menu item
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const item = await MenuItem.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        res.json(item);
    } catch (error) {
        console.error('Get menu item error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/menu
// @desc    Create menu item
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { name, category, price, description, preparationTime, available, image } = req.body;
        
        // Validate required fields
        if (!name || !category || !price) {
            return res.status(400).json({ message: 'Name, category, and price are required' });
        }
        
        // Check for duplicate name (optional - you might want this)
        const existingItem = await MenuItem.findOne({ name: { $regex: new RegExp('^' + name + '$', 'i') } });
        if (existingItem) {
            return res.status(400).json({ message: 'Menu item with this name already exists' });
        }
        
        const menuItem = new MenuItem({
            name,
            category,
            price,
            description: description || '',
            preparationTime: preparationTime || 15,
            available: available !== undefined ? available : true,
            image: image || 'fa-utensils'
        });
        
        await menuItem.save();
        
        res.status(201).json({
            message: 'Menu item created successfully',
            menuItem
        });
    } catch (error) {
        console.error('Create menu item error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Menu item with this ID already exists' });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/menu/:id
// @desc    Update menu item
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const { name, category, price, description, preparationTime, available, image } = req.body;
        
        const menuItem = await MenuItem.findByIdAndUpdate(
            req.params.id,
            {
                name,
                category,
                price,
                description,
                preparationTime,
                available,
                image
            },
            { new: true, runValidators: true }
        );
        
        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        
        res.json({
            message: 'Menu item updated successfully',
            menuItem
        });
    } catch (error) {
        console.error('Update menu item error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Menu item with this name already exists' });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: error.message });
    }
});

// @route   PATCH /api/menu/:id/toggle
// @desc    Toggle menu item availability
// @access  Private
router.patch('/:id/toggle', auth, async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id);
        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        
        menuItem.available = !menuItem.available;
        await menuItem.save();
        
        res.json({
            message: `Menu item ${menuItem.available ? 'activated' : 'deactivated'}`,
            available: menuItem.available
        });
    } catch (error) {
        console.error('Toggle menu item error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   DELETE /api/menu/:id
// @desc    Delete menu item
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const menuItem = await MenuItem.findByIdAndDelete(req.params.id);
        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        
        res.json({ message: 'Menu item deleted successfully' });
    } catch (error) {
        console.error('Delete menu item error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;