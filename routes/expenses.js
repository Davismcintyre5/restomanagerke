const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');

// @route   GET /api/expenses
// @desc    Get all expenses
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { limit = 100 } = req.query;
        
        const expenses = await Expense.find()
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));
        
        res.json(expenses);
    } catch (error) {
        console.error('Get expenses error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/expenses/:id
// @desc    Get single expense
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);
        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }
        res.json(expense);
    } catch (error) {
        console.error('Get expense error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/expenses
// @desc    Create expense
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { type, description, amount, paymentMethod, supplier, notes } = req.body;
        
        // Validate required fields
        if (!type || !description || !amount || !paymentMethod) {
            return res.status(400).json({ message: 'Type, description, amount, and payment method are required' });
        }
        
        const expense = new Expense({
            type,
            description,
            amount,
            paymentMethod,
            supplier: supplier || null,
            notes: notes || ''
        });
        
        await expense.save();
        
        res.status(201).json({
            message: 'Expense recorded successfully',
            expense
        });
    } catch (error) {
        console.error('Create expense error:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete expense
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const expense = await Expense.findByIdAndDelete(req.params.id);
        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }
        
        res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        console.error('Delete expense error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;