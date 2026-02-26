const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Customer = require('../models/Customer');
const auth = require('../middleware/auth');

// Generate JWT Token
const generateToken = (customer) => {
    return jwt.sign(
        { id: customer._id, email: customer.email, role: 'customer' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// @route   POST /api/customer/auth/register
// @desc    Register a new customer
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, address } = req.body;
        
        // Validate required fields
        if (!name || !email || !password || !phone) {
            return res.status(400).json({ 
                message: 'Please provide name, email, password, and phone' 
            });
        }
        
        // Check if customer already exists
        const existingCustomer = await Customer.findOne({ 
            $or: [{ email }, { phone }] 
        });
        
        if (existingCustomer) {
            return res.status(400).json({ 
                message: 'Customer with this email or phone already exists' 
            });
        }
        
        // Create new customer
        const customer = new Customer({
            name,
            email,
            password,
            phone,
            address: address || ''
        });
        
        await customer.save();
        
        // Generate token
        const token = generateToken(customer);
        
        res.status(201).json({
            message: 'Registration successful',
            token,
            customer: {
                _id: customer._id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
                memberSince: customer.memberSince
            }
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

// @route   POST /api/customer/auth/login
// @desc    Login customer
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }
        
        // Find customer by email
        const customer = await Customer.findOne({ email, isActive: true });
        
        if (!customer) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        
        // Check password
        const isMatch = await customer.comparePassword(password);
        
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        
        // Update last login
        customer.lastLogin = new Date();
        await customer.save();
        
        // Generate token
        const token = generateToken(customer);
        
        res.json({
            message: 'Login successful',
            token,
            customer: {
                _id: customer._id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
                memberSince: customer.memberSince
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/customer/auth/me
// @desc    Get current customer profile
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const customer = await Customer.findById(req.user.id).select('-password');
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        res.json(customer);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/customer/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        const customer = await Customer.findOne({ email });
        
        if (!customer) {
            return res.status(404).json({ message: 'No account with that email found' });
        }
        
        // Generate reset token
        const resetToken = crypto.randomBytes(20).toString('hex');
        
        customer.resetPasswordToken = resetToken;
        customer.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        
        await customer.save();
        
        // In a real app, send email here
        console.log(`Password reset token for ${email}: ${resetToken}`);
        
        res.json({ 
            message: 'Password reset email sent',
            resetToken // Remove in production, only for testing
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/customer/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        const customer = await Customer.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!customer) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }
        
        customer.password = newPassword;
        customer.resetPasswordToken = undefined;
        customer.resetPasswordExpires = undefined;
        
        await customer.save();
        
        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/customer/auth/update-profile
// @desc    Update customer profile
// @access  Private
router.put('/update-profile', auth, async (req, res) => {
    try {
        const { name, phone, address } = req.body;
        
        const customer = await Customer.findById(req.user.id);
        
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        if (name) customer.name = name;
        if (phone) customer.phone = phone;
        if (address !== undefined) customer.address = address;
        
        await customer.save();
        
        res.json({
            message: 'Profile updated',
            customer: {
                _id: customer._id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
                memberSince: customer.memberSince
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/customer/auth/change-password
// @desc    Change password
// @access  Private
router.post('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        const customer = await Customer.findById(req.user.id);
        
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        const isMatch = await customer.comparePassword(currentPassword);
        
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        
        customer.password = newPassword;
        await customer.save();
        
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;