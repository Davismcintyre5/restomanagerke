const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Expense = require('../models/Expense');
const Inventory = require('../models/Inventory');
const Payroll = require('../models/Payroll');
const Transaction = require('../models/Transaction');
const Reservation = require('../models/Reservation');
const Customer = require('../models/Customer');
const auth = require('../middleware/auth');

// Helper to get date range
const getDateRange = (startDate, endDate) => {
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
};

// @route   GET /api/reports/sales
// @desc    Generate sales report
// @access  Private
router.get('/sales', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const { start, end } = getDateRange(startDate, endDate);
        
        // Get orders in date range
        const orders = await Order.find({
            createdAt: { $gte: start, $lte: end }
        }).sort({ createdAt: -1 });
        
        // Get transactions in date range
        const transactions = await Transaction.find({
            createdAt: { $gte: start, $lte: end }
        }).sort({ createdAt: -1 });
        
        // Calculate summary
        const summary = {
            totalOrders: orders.length,
            totalTransactions: transactions.length,
            totalRevenue: 0,
            paidOrders: 0,
            pendingOrders: 0,
            byPaymentMethod: {},
            byOrderType: {},
            daily: {}
        };
        
        // Process orders
        orders.forEach(order => {
            summary.totalRevenue += order.total || 0;
            
            if (order.paymentStatus === 'Paid') summary.paidOrders++;
            else summary.pendingOrders++;
            
            const method = order.paymentMethod || 'Unknown';
            summary.byPaymentMethod[method] = (summary.byPaymentMethod[method] || 0) + order.total;
            
            const type = order.orderType || 'Unknown';
            summary.byOrderType[type] = (summary.byOrderType[type] || 0) + 1;
            
            const day = order.createdAt.toISOString().split('T')[0];
            if (!summary.daily[day]) {
                summary.daily[day] = { orders: 0, revenue: 0 };
            }
            summary.daily[day].orders++;
            summary.daily[day].revenue += order.total;
        });
        
        // Process transactions
        transactions.forEach(t => {
            summary.totalRevenue += t.total || 0;
            
            const day = t.createdAt.toISOString().split('T')[0];
            if (!summary.daily[day]) {
                summary.daily[day] = { orders: 0, revenue: 0 };
            }
            summary.daily[day].revenue += t.total;
        });
        
        res.json({
            period: { start, end },
            summary,
            orders,
            transactions
        });
    } catch (error) {
        console.error('Sales report error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/reports/expenses
// @desc    Generate expense report
// @access  Private
router.get('/expenses', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const { start, end } = getDateRange(startDate, endDate);
        
        const expenses = await Expense.find({
            createdAt: { $gte: start, $lte: end }
        }).sort({ createdAt: -1 });
        
        const payrolls = await Payroll.find({
            paymentDate: { $gte: start, $lte: end },
            status: 'Paid'
        }).sort({ paymentDate: -1 });
        
        const summary = {
            totalExpenses: expenses.length + payrolls.length,
            totalAmount: 0,
            byType: {},
            byPaymentMethod: {},
            daily: {}
        };
        
        // Process expenses
        expenses.forEach(e => {
            summary.totalAmount += e.amount || 0;
            
            const type = e.type || 'Other';
            summary.byType[type] = (summary.byType[type] || 0) + e.amount;
            
            const method = e.paymentMethod || 'Unknown';
            summary.byPaymentMethod[method] = (summary.byPaymentMethod[method] || 0) + e.amount;
            
            const day = e.createdAt.toISOString().split('T')[0];
            if (!summary.daily[day]) {
                summary.daily[day] = { count: 0, amount: 0 };
            }
            summary.daily[day].count++;
            summary.daily[day].amount += e.amount;
        });
        
        // Process payrolls
        payrolls.forEach(p => {
            summary.totalAmount += p.totalPay || 0;
            
            const day = p.paymentDate.toISOString().split('T')[0];
            if (!summary.daily[day]) {
                summary.daily[day] = { count: 0, amount: 0 };
            }
            summary.daily[day].count++;
            summary.daily[day].amount += p.totalPay;
        });
        
        res.json({
            period: { start, end },
            summary,
            expenses,
            payrolls
        });
    } catch (error) {
        console.error('Expense report error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/reports/inventory
// @desc    Generate inventory report
// @access  Private
router.get('/inventory', auth, async (req, res) => {
    try {
        const items = await Inventory.find().sort({ name: 1 });
        
        const summary = {
            totalItems: items.length,
            totalValue: items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0),
            lowStock: items.filter(i => i.quantity <= i.reorderLevel).length,
            outOfStock: items.filter(i => i.quantity <= 0).length,
            byCategory: {},
            totalCost: 0
        };
        
        // Group by category
        items.forEach(item => {
            const category = item.category || 'Other';
            if (!summary.byCategory[category]) {
                summary.byCategory[category] = {
                    count: 0,
                    value: 0,
                    items: []
                };
            }
            summary.byCategory[category].count++;
            summary.byCategory[category].value += item.quantity * item.unitPrice;
            summary.byCategory[category].items.push({
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                unitPrice: item.unitPrice,
                totalValue: item.quantity * item.unitPrice,
                status: item.status
            });
        });
        
        res.json({
            generatedAt: new Date(),
            summary,
            items
        });
    } catch (error) {
        console.error('Inventory report error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/reports/payroll
// @desc    Generate payroll report
// @access  Private
router.get('/payroll', auth, async (req, res) => {
    try {
        const { period } = req.query;
        
        let query = {};
        if (period) {
            query.payPeriod = period;
        }
        
        const payrolls = await Payroll.find(query).sort({ createdAt: -1 });
        
        const summary = {
            totalRecords: payrolls.length,
            totalPaid: payrolls.reduce((sum, p) => sum + (p.totalPay || 0), 0),
            pending: payrolls.filter(p => p.status === 'Pending').length,
            paid: payrolls.filter(p => p.status === 'Paid').length,
            byEmployee: {},
            byMonth: {}
        };
        
        payrolls.forEach(p => {
            // Group by employee
            if (!summary.byEmployee[p.employeeName]) {
                summary.byEmployee[p.employeeName] = {
                    count: 0,
                    total: 0
                };
            }
            summary.byEmployee[p.employeeName].count++;
            summary.byEmployee[p.employeeName].total += p.totalPay;
            
            // Group by month
            if (!summary.byMonth[p.payPeriod]) {
                summary.byMonth[p.payPeriod] = {
                    count: 0,
                    total: 0
                };
            }
            summary.byMonth[p.payPeriod].count++;
            summary.byMonth[p.payPeriod].total += p.totalPay;
        });
        
        res.json({
            period: period || 'All time',
            summary,
            payrolls
        });
    } catch (error) {
        console.error('Payroll report error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/reports/general
// @desc    Generate general restaurant report
// @access  Private
router.get('/general', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const { start, end } = getDateRange(startDate, endDate);
        
        // Get all data
        const orders = await Order.find({
            createdAt: { $gte: start, $lte: end }
        });
        
        const reservations = await Reservation.find({
            date: { $gte: start, $lte: end }
        });
        
        const expenses = await Expense.find({
            createdAt: { $gte: start, $lte: end }
        });
        
        const customers = await Customer.find({
            memberSince: { $gte: start, $lte: end }
        });
        
        // Calculate totals
        const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const profit = totalRevenue - totalExpenses;
        
        const summary = {
            period: { start, end },
            orders: {
                total: orders.length,
                pending: orders.filter(o => o.orderStatus === 'Pending').length,
                confirmed: orders.filter(o => o.orderStatus === 'Confirmed').length,
                preparing: orders.filter(o => o.orderStatus === 'Preparing').length,
                ready: orders.filter(o => o.orderStatus === 'Ready').length,
                completed: orders.filter(o => o.orderStatus === 'Completed').length,
                cancelled: orders.filter(o => o.orderStatus === 'Cancelled').length,
                totalRevenue
            },
            reservations: {
                total: reservations.length,
                confirmed: reservations.filter(r => r.status === 'Confirmed').length,
                seated: reservations.filter(r => r.status === 'Seated').length,
                cancelled: reservations.filter(r => r.status === 'Cancelled').length
            },
            expenses: {
                total: expenses.length,
                totalAmount: totalExpenses
            },
            customers: {
                new: customers.length
            },
            profit
        };
        
        res.json(summary);
    } catch (error) {
        console.error('General report error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;