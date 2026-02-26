const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// @route   GET /api/inventory
// @desc    Get all inventory items
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const items = await Inventory.find().sort({ name: 1 });
        res.json(items);
    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/inventory/low-stock
// @desc    Get low stock items
// @access  Private
router.get('/low-stock', auth, async (req, res) => {
    try {
        const items = await Inventory.find({
            $expr: { $lte: [ "$quantity", "$reorderLevel" ] }
        });
        res.json(items);
    } catch (error) {
        console.error('Get low stock error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/inventory/:id
// @desc    Get single inventory item
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const item = await Inventory.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.json(item);
    } catch (error) {
        console.error('Get inventory item error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/inventory
// @desc    Create inventory item
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { name, category, quantity, unit, unitPrice, reorderLevel, supplier } = req.body;
        
        // Validate required fields
        if (!name || !quantity || !unitPrice || !reorderLevel) {
            return res.status(400).json({ message: 'Name, quantity, unit price, and reorder level are required' });
        }
        
        const item = new Inventory({
            name,
            category: category || 'Other',
            quantity,
            unit: unit || 'kg',
            unitPrice,
            reorderLevel,
            supplier: supplier || null
        });
        
        await item.save();
        
        // Check if low stock on creation
        if (item.quantity <= item.reorderLevel) {
            await Notification.create({
                title: 'Low Stock Alert',
                message: `${item.name} is low in stock (${item.quantity} ${item.unit} left)`,
                type: 'warning'
            });
        }
        
        res.status(201).json({
            message: 'Inventory item created',
            item
        });
    } catch (error) {
        console.error('Create inventory error:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/inventory/:id
// @desc    Update inventory item
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const item = await Inventory.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        res.json({
            message: 'Inventory item updated',
            item
        });
    } catch (error) {
        console.error('Update inventory error:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/inventory/:id/use
// @desc    Record stock usage
// @access  Private
router.post('/:id/use', auth, async (req, res) => {
    try {
        const { quantity, reason } = req.body;
        
        if (!quantity || quantity <= 0) {
            return res.status(400).json({ message: 'Valid quantity is required' });
        }
        
        const item = await Inventory.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        if (item.quantity < quantity) {
            return res.status(400).json({ message: 'Insufficient stock' });
        }
        
        // Record usage
        item.usageHistory.push({
            quantityUsed: quantity,
            reason: reason || 'Stock usage'
        });
        
        item.quantity -= quantity;
        await item.save();
        
        // Check if now low stock
        if (item.quantity <= item.reorderLevel) {
            await Notification.create({
                title: 'Low Stock Alert',
                message: `${item.name} is now low in stock (${item.quantity} ${item.unit} left)`,
                type: 'warning'
            });
        }
        
        res.json({
            message: 'Usage recorded',
            item
        });
    } catch (error) {
        console.error('Record usage error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/inventory/:id/reorder
// @desc    Create reorder request
// @access  Private
router.post('/:id/reorder', auth, async (req, res) => {
    try {
        const item = await Inventory.findById(req.params.id).populate('supplier');
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        // Create notification for reorder
        await Notification.create({
            title: 'Reorder Request',
            message: `Reorder requested for ${item.name}. Current stock: ${item.quantity} ${item.unit}`,
            type: 'info'
        });
        
        res.json({
            message: 'Reorder request sent',
            item: {
                name: item.name,
                quantity: item.quantity,
                reorderLevel: item.reorderLevel,
                supplier: item.supplierName
            }
        });
    } catch (error) {
        console.error('Reorder error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/inventory/:id
// @desc    Delete inventory item
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const item = await Inventory.findByIdAndDelete(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        res.json({ message: 'Inventory item deleted' });
    } catch (error) {
        console.error('Delete inventory error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;