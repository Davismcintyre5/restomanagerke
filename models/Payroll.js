const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: true
    },
    employeeName: {
        type: String,
        required: true
    },
    payPeriod: {
        type: String,
        required: true
    },
    baseSalary: {
        type: Number,
        required: true,
        min: 0
    },
    hoursWorked: {
        type: Number,
        default: 160,
        min: 0
    },
    overtime: {
        type: Number,
        default: 0,
        min: 0
    },
    overtimePay: {
        type: Number,
        default: 0,
        min: 0
    },
    bonus: {
        type: Number,
        default: 0,
        min: 0
    },
    deductions: {
        type: Number,
        default: 0,
        min: 0
    },
    totalPay: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['Pending', 'Paid', 'Cancelled'],
        default: 'Pending'
    },
    paymentDate: Date,
    notes: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Payroll', payrollSchema);