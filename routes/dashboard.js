const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Expense = require('../models/Expense');
const Inventory = require('../models/Inventory');
const Reservation = require('../models/Reservation');
const Transaction = require('../models/Transaction');
const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const Customer = require('../models/Customer');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// @route   GET /api/dashboard/stats
// @desc    Get all dashboard statistics with accurate counts
// @access  Private
router.get('/stats', auth, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfYear = new Date(today.getFullYear(), 0, 1);

        // TODAY'S ORDERS COUNT - FIXED
        const todayOrders = await Order.countDocuments({
            createdAt: { $gte: today, $lt: tomorrow }
        });
        
        // TODAY'S RESERVATIONS COUNT - FIXED
        const todayReservations = await Reservation.countDocuments({
            date: { $gte: today, $lt: tomorrow },
            status: { $ne: 'Cancelled' }
        });

        // TODAY'S REVENUE (from paid orders and transactions)
        const todayPaidOrders = await Order.find({
            createdAt: { $gte: today, $lt: tomorrow },
            paymentStatus: 'Paid'
        });
        
        const todayTransactions = await Transaction.find({
            createdAt: { $gte: today, $lt: tomorrow }
        });
        
        const todayRevenue = 
            todayPaidOrders.reduce((sum, order) => sum + (order.total || 0), 0) +
            todayTransactions.reduce((sum, t) => sum + (t.total || 0), 0);

        // TODAY'S EXPENSES
        const todayExpenses = await Expense.find({
            createdAt: { $gte: today, $lt: tomorrow }
        });
        
        const todayPayroll = await Payroll.find({
            paymentDate: { $gte: today, $lt: tomorrow },
            status: 'Paid'
        });
        
        const todayExpensesAmount = 
            todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0) +
            todayPayroll.reduce((sum, p) => sum + (p.totalPay || 0), 0);

        // TOTAL REVENUE (all time)
        const allOrders = await Order.find({ paymentStatus: 'Paid' });
        const allTransactions = await Transaction.find();
        const totalRevenue = 
            allOrders.reduce((sum, order) => sum + (order.total || 0), 0) +
            allTransactions.reduce((sum, t) => sum + (t.total || 0), 0);

        // TOTAL EXPENSES
        const allExpenses = await Expense.find();
        const allPayroll = await Payroll.find({ status: 'Paid' });
        const totalExpenses = 
            allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0) +
            allPayroll.reduce((sum, p) => sum + (p.totalPay || 0), 0);

        // ACCOUNT BALANCE
        const accountBalance = totalRevenue - totalExpenses;

        // LOW STOCK COUNT
        const lowStockItems = await Inventory.find({
            $expr: { $lte: [ "$quantity", "$reorderLevel" ] }
        });
        const lowStockCount = lowStockItems.length;

        // MONTHLY REVENUE
        const monthlyOrders = await Order.find({
            createdAt: { $gte: startOfMonth },
            paymentStatus: 'Paid'
        });
        const monthlyTransactions = await Transaction.find({
            createdAt: { $gte: startOfMonth }
        });
        const monthlyRevenue = 
            monthlyOrders.reduce((sum, order) => sum + (order.total || 0), 0) +
            monthlyTransactions.reduce((sum, t) => sum + (t.total || 0), 0);

        // YEARLY REVENUE
        const yearlyOrders = await Order.find({
            createdAt: { $gte: startOfYear },
            paymentStatus: 'Paid'
        });
        const yearlyTransactions = await Transaction.find({
            createdAt: { $gte: startOfYear }
        });
        const yearlyRevenue = 
            yearlyOrders.reduce((sum, order) => sum + (order.total || 0), 0) +
            yearlyTransactions.reduce((sum, t) => sum + (t.total || 0), 0);

        // CUSTOMER COUNT
        const customerCount = await Customer.countDocuments();

        // ACTIVE EMPLOYEES
        const employeeCount = await Employee.countDocuments({ status: 'Active' });

        // PENDING PAYROLL
        const pendingPayroll = await Payroll.countDocuments({ status: 'Pending' });

        // UNREAD NOTIFICATIONS COUNT
        const unreadNotifications = await Notification.countDocuments({ read: false });

        res.json({
            todayOrders,
            todayReservations,
            todayRevenue,
            todayExpenses: todayExpensesAmount,
            totalRevenue,
            totalExpenses,
            accountBalance,
            lowStockCount,
            monthlyRevenue,
            yearlyRevenue,
            customerCount,
            employeeCount,
            pendingPayroll,
            unreadNotifications
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;