const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');

// @route   GET /api/employees
// @desc    Get all employees
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const employees = await Employee.find().sort({ name: 1 });
        res.json(employees);
    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/employees/:id
// @desc    Get single employee
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        res.json(employee);
    } catch (error) {
        console.error('Get employee error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/employees
// @desc    Create employee
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { name, position, department, email, phone, salary, paymentMethod } = req.body;
        
        // Validate required fields
        if (!name || !position || !department || !email || !phone || !salary) {
            return res.status(400).json({ message: 'All required fields must be filled' });
        }
        
        const employee = new Employee({
            name,
            position,
            department,
            email,
            phone,
            salary,
            paymentMethod: paymentMethod || 'Bank Transfer'
        });
        
        await employee.save();
        
        res.status(201).json({
            message: 'Employee created successfully',
            employee
        });
    } catch (error) {
        console.error('Create employee error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Employee with this email already exists' });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/employees/:id
// @desc    Update employee
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const employee = await Employee.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        
        res.json({
            message: 'Employee updated successfully',
            employee
        });
    } catch (error) {
        console.error('Update employee error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Employee with this email already exists' });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/employees/:id
// @desc    Delete employee
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const employee = await Employee.findByIdAndDelete(req.params.id);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        
        res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;