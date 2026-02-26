const express = require('express');
const router = express.Router();
const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');

// @route   GET /api/payroll
// @desc    Get all payroll records
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { period } = req.query;
        let query = {};
        
        if (period) {
            query.payPeriod = period;
        }
        
        const payroll = await Payroll.find(query).sort({ createdAt: -1 });
        res.json(payroll);
    } catch (error) {
        console.error('Get payroll error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/payroll/employee/:employeeId
// @desc    Get payroll for specific employee
// @access  Private
router.get('/employee/:employeeId', auth, async (req, res) => {
    try {
        const payroll = await Payroll.find({ 
            employeeId: req.params.employeeId 
        }).sort({ payPeriod: -1 });
        
        res.json(payroll);
    } catch (error) {
        console.error('Get employee payroll error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/payroll/:id
// @desc    Get single payroll record
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) {
            return res.status(404).json({ message: 'Payroll record not found' });
        }
        res.json(payroll);
    } catch (error) {
        console.error('Get payroll error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/payroll
// @desc    Process payroll for employee
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { employeeId, hoursWorked, overtime, bonus, deductions, notes } = req.body;
        
        if (!employeeId) {
            return res.status(400).json({ message: 'Employee ID is required' });
        }
        
        // Get employee details
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        
        // Calculate pay
        const date = new Date();
        const payPeriod = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        // Check if payroll already exists for this period
        const existingPayroll = await Payroll.findOne({
            employeeId: employee.employeeId,
            payPeriod
        });
        
        if (existingPayroll) {
            return res.status(400).json({ message: 'Payroll already processed for this period' });
        }
        
        const hourlyRate = employee.salary / 160; // Assuming 160 hours per month
        const overtimePay = (hourlyRate * 1.5) * (overtime || 0);
        const totalPay = employee.salary + overtimePay + (bonus || 0) - (deductions || 0);
        
        const payroll = new Payroll({
            employeeId: employee.employeeId,
            employeeName: employee.name,
            payPeriod,
            baseSalary: employee.salary,
            hoursWorked: hoursWorked || 160,
            overtime: overtime || 0,
            overtimePay,
            bonus: bonus || 0,
            deductions: deductions || 0,
            totalPay,
            notes: notes || '',
            status: 'Pending'
        });
        
        await payroll.save();
        
        res.status(201).json({
            message: 'Payroll processed successfully',
            payroll
        });
    } catch (error) {
        console.error('Process payroll error:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/payroll/process-all
// @desc    Process payroll for all active employees
// @access  Private
router.post('/process-all', auth, async (req, res) => {
    try {
        const { hoursWorked, overtime, bonus, deductions } = req.body;
        
        // Get all active employees
        const employees = await Employee.find({ status: 'Active' });
        const date = new Date();
        const payPeriod = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const results = {
            processed: 0,
            skipped: 0,
            errors: []
        };
        
        for (const employee of employees) {
            try {
                // Check if already processed
                const existing = await Payroll.findOne({
                    employeeId: employee.employeeId,
                    payPeriod
                });
                
                if (existing) {
                    results.skipped++;
                    continue;
                }
                
                const hourlyRate = employee.salary / 160;
                const overtimePay = (hourlyRate * 1.5) * (overtime || 0);
                const totalPay = employee.salary + overtimePay + (bonus || 0) - (deductions || 0);
                
                const payroll = new Payroll({
                    employeeId: employee.employeeId,
                    employeeName: employee.name,
                    payPeriod,
                    baseSalary: employee.salary,
                    hoursWorked: hoursWorked || 160,
                    overtime: overtime || 0,
                    overtimePay,
                    bonus: bonus || 0,
                    deductions: deductions || 0,
                    totalPay,
                    status: 'Pending'
                });
                
                await payroll.save();
                results.processed++;
            } catch (err) {
                results.errors.push({
                    employee: employee.name,
                    error: err.message
                });
            }
        }
        
        res.json({
            message: `Processed ${results.processed} payrolls, skipped ${results.skipped}`,
            results
        });
    } catch (error) {
        console.error('Process all payroll error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PATCH /api/payroll/:id/pay
// @desc    Mark payroll as paid
// @access  Private
router.patch('/:id/pay', auth, async (req, res) => {
    try {
        const payroll = await Payroll.findById(req.params.id);
        
        if (!payroll) {
            return res.status(404).json({ message: 'Payroll record not found' });
        }
        
        if (payroll.status === 'Paid') {
            return res.status(400).json({ message: 'Payroll already paid' });
        }
        
        payroll.status = 'Paid';
        payroll.paymentDate = new Date();
        await payroll.save();
        
        res.json({
            message: 'Payment processed successfully',
            payroll
        });
    } catch (error) {
        console.error('Pay payroll error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/payroll/pay-all
// @desc    Pay all pending salaries
// @access  Private
router.post('/pay-all', auth, async (req, res) => {
    try {
        const result = await Payroll.updateMany(
            { status: 'Pending' },
            { 
                status: 'Paid',
                paymentDate: new Date()
            }
        );
        
        res.json({
            message: `Paid ${result.modifiedCount} pending salaries`,
            count: result.modifiedCount
        });
    } catch (error) {
        console.error('Pay all error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/payroll/:id
// @desc    Delete payroll record
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) {
            return res.status(404).json({ message: 'Payroll record not found' });
        }
        
        // Can only delete pending payrolls
        if (payroll.status === 'Paid') {
            return res.status(400).json({ message: 'Cannot delete paid payroll' });
        }
        
        await payroll.deleteOne();
        res.json({ message: 'Payroll record deleted' });
    } catch (error) {
        console.error('Delete payroll error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/payroll/:id/payslip
// @desc    Generate payslip
// @access  Private
router.get('/:id/payslip', auth, async (req, res) => {
    try {
        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) {
            return res.status(404).json({ message: 'Payroll record not found' });
        }
        
        // Return payslip data (can be used to generate PDF)
        res.json({
            message: 'Payslip generated',
            payslip: {
                employeeName: payroll.employeeName,
                employeeId: payroll.employeeId,
                payPeriod: payroll.payPeriod,
                baseSalary: payroll.baseSalary,
                hoursWorked: payroll.hoursWorked,
                overtime: payroll.overtime,
                overtimePay: payroll.overtimePay,
                bonus: payroll.bonus,
                deductions: payroll.deductions,
                totalPay: payroll.totalPay,
                status: payroll.status,
                paymentDate: payroll.paymentDate
            }
        });
    } catch (error) {
        console.error('Generate payslip error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;