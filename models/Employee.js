const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        unique: true
    },
    name: {
        type: String,
        required: [true, 'Employee name is required'],
        trim: true
    },
    position: {
        type: String,
        required: [true, 'Position is required'],
        trim: true
    },
    department: {
        type: String,
        enum: ['Kitchen', 'Service', 'Management', 'Cleaning', 'Other'],
        required: [true, 'Department is required']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        match: [/^[0-9]{10,12}$/, 'Please enter a valid phone number']
    },
    salary: {
        type: Number,
        required: [true, 'Salary is required'],
        min: [0, 'Salary cannot be negative']
    },
    paymentMethod: {
        type: String,
        enum: ['Bank Transfer', 'M-PESA', 'Cash'],
        default: 'Bank Transfer'
    },
    status: {
        type: String,
        enum: ['Active', 'On Leave', 'Terminated'],
        default: 'Active'
    },
    hireDate: {
        type: Date,
        default: Date.now
    }
});

// Generate employeeId before saving
employeeSchema.pre('save', async function(next) {
    if (!this.employeeId) {
        const count = await mongoose.model('Employee').countDocuments();
        this.employeeId = `EMP${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Employee', employeeSchema);