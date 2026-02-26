const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

// @route   GET /api/transactions
// @desc    Get all transactions
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { limit = 100 } = req.query;
        
        const transactions = await Transaction.find()
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));
        
        res.json(transactions);
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/transactions/:id
// @desc    Get single transaction
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        res.json(transaction);
    } catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/transactions
// @desc    Create transaction (sale)
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { customerName, customerPhone, items, paymentMethod, notes } = req.body;
        
        // Validate items
        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'Transaction must contain items' });
        }
        
        // Calculate totals (NO VAT)
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const total = subtotal; // No VAT
        
        const transaction = new Transaction({
            customerName: customerName || 'Walk-in Customer',
            customerPhone,
            items,
            subtotal,
            total,
            paymentMethod: paymentMethod || 'Cash',
            notes,
            createdBy: req.user.id
        });
        
        await transaction.save();
        
        res.status(201).json({
            message: 'Transaction recorded successfully',
            transaction
        });
    } catch (error) {
        console.error('Create transaction error:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/transactions/recent/:limit
// @desc    Get recent transactions
// @access  Private
router.get('/recent/:limit', auth, async (req, res) => {
    try {
        const limit = parseInt(req.params.limit) || 10;
        const transactions = await Transaction.find()
            .sort({ createdAt: -1 })
            .limit(limit);
        
        res.json(transactions);
    } catch (error) {
        console.error('Get recent transactions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;