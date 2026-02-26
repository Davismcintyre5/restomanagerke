const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const auth = require('../middleware/auth');

// @route   GET /api/suppliers
// @desc    Get all suppliers
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const suppliers = await Supplier.find().sort({ name: 1 });
        res.json(suppliers);
    } catch (error) {
        console.error('Get suppliers error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/suppliers/:id
// @desc    Get single supplier
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }
        res.json(supplier);
    } catch (error) {
        console.error('Get supplier error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/suppliers
// @desc    Create supplier
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { name, contactPerson, phone, email, address, products, paymentTerms } = req.body;
        
        // Validate required fields
        if (!name || !contactPerson || !phone || !email || !products || !paymentTerms) {
            return res.status(400).json({ message: 'All required fields must be filled' });
        }
        
        const supplier = new Supplier({
            name,
            contactPerson,
            phone,
            email,
            address: address || '',
            products,
            paymentTerms
        });
        
        await supplier.save();
        
        res.status(201).json({
            message: 'Supplier created successfully',
            supplier
        });
    } catch (error) {
        console.error('Create supplier error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Supplier with this email already exists' });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/suppliers/:id
// @desc    Update supplier
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }
        
        res.json({
            message: 'Supplier updated successfully',
            supplier
        });
    } catch (error) {
        console.error('Update supplier error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Supplier with this email already exists' });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/suppliers/:id
// @desc    Delete supplier
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndDelete(req.params.id);
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }
        
        res.json({ message: 'Supplier deleted successfully' });
    } catch (error) {
        console.error('Delete supplier error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;