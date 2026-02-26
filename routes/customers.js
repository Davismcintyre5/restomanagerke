const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const auth = require('../middleware/auth');

// @route   GET /api/customers
// @desc    Get all customers
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const customers = await Customer.find().sort({ name: 1 });
        // Don't send passwords
        const customersWithoutPasswords = customers.map(c => {
            const customer = c.toObject();
            delete customer.password;
            return customer;
        });
        res.json(customersWithoutPasswords);
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/customers/:id
// @desc    Get single customer
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        const customerObj = customer.toObject();
        delete customerObj.password;
        res.json(customerObj);
    } catch (error) {
        console.error('Get customer error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/customers/phone/:phone
// @desc    Get customer by phone
// @access  Private
router.get('/phone/:phone', auth, async (req, res) => {
    try {
        const customer = await Customer.findOne({ phone: req.params.phone });
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        const customerObj = customer.toObject();
        delete customerObj.password;
        res.json(customerObj);
    } catch (error) {
        console.error('Get customer by phone error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/customers
// @desc    Create customer (admin only - no password required)
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { name, phone, email, address, preferences, notes } = req.body;
        
        // Validate required fields (only name and phone for admin)
        if (!name || !phone) {
            return res.status(400).json({ 
                message: 'Name and phone are required',
                errors: {
                    name: !name ? 'Name is required' : null,
                    phone: !phone ? 'Phone is required' : null
                }
            });
        }
        
        // Check if customer exists
        const existingCustomer = await Customer.findOne({ phone });
        if (existingCustomer) {
            return res.status(400).json({ message: 'Customer with this phone already exists' });
        }
        
        // Create customer WITHOUT password for admin-created customers
        const customer = new Customer({
            name,
            phone,
            email: email || '',
            address: address || '',
            preferences: preferences || '',
            notes: notes || ''
            // No password field - will be null/undefined
        });
        
        await customer.save();
        
        // Return customer without password
        const customerObj = customer.toObject();
        delete customerObj.password;
        
        res.status(201).json({
            message: 'Customer created successfully',
            customer: customerObj
        });
    } catch (error) {
        console.error('Create customer error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Customer with this phone already exists' });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/customers/:id
// @desc    Update customer
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const { name, phone, email, address, preferences, notes } = req.body;
        
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        // Check if phone is being changed and already exists
        if (phone && phone !== customer.phone) {
            const existingCustomer = await Customer.findOne({ phone });
            if (existingCustomer) {
                return res.status(400).json({ message: 'Customer with this phone already exists' });
            }
        }
        
        customer.name = name || customer.name;
        customer.phone = phone || customer.phone;
        customer.email = email !== undefined ? email : customer.email;
        customer.address = address !== undefined ? address : customer.address;
        customer.preferences = preferences !== undefined ? preferences : customer.preferences;
        customer.notes = notes !== undefined ? notes : customer.notes;
        
        await customer.save();
        
        const customerObj = customer.toObject();
        delete customerObj.password;
        
        res.json({
            message: 'Customer updated successfully',
            customer: customerObj
        });
    } catch (error) {
        console.error('Update customer error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Customer with this phone already exists' });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: error.message });
    }
});

// @route   DELETE /api/customers/:id
// @desc    Delete customer
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const customer = await Customer.findByIdAndDelete(req.params.id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/customers/register
// @desc    Customer registration (public - requires password)
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, address } = req.body;
        
        // Validate required fields (all fields required for registration)
        if (!name || !email || !password || !phone) {
            return res.status(400).json({ 
                message: 'Name, email, password, and phone are required' 
            });
        }
        
        // Check if customer exists
        const existingCustomer = await Customer.findOne({ 
            $or: [{ email }, { phone }] 
        });
        
        if (existingCustomer) {
            return res.status(400).json({ 
                message: 'Customer with this email or phone already exists' 
            });
        }
        
        // Create customer WITH password for self-registration
        const customer = new Customer({
            name,
            email,
            password, // Will be hashed by pre-save hook
            phone,
            address: address || ''
        });
        
        await customer.save();
        
        const customerObj = customer.toObject();
        delete customerObj.password;
        
        res.status(201).json({
            message: 'Registration successful',
            customer: customerObj
        });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ 
                message: 'Customer with this email or phone already exists' 
            });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;