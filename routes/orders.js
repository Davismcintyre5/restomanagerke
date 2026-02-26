const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Customer = require('../models/Customer');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// @route   POST /api/orders
// @desc    Create new order (requires login)
// @access  Private (Customer)
router.post('/', auth, async (req, res) => {
    try {
        console.log('📦 Creating new order:', JSON.stringify(req.body, null, 2));
        
        const { items, orderType, paymentMethod, deliveryAddress, notes, mpesaCheckoutId } = req.body;
        
        // Validate required fields
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ 
                message: 'Order must contain at least one item' 
            });
        }
        
        // Get customer from auth
        const customer = await Customer.findById(req.user.id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        // Validate and fetch menu items
        const orderItems = [];
        for (const item of items) {
            if (!item.menuItemId || !item.quantity) {
                return res.status(400).json({ 
                    message: 'Each item must have menuItemId and quantity' 
                });
            }
            
            const menuItem = await MenuItem.findById(item.menuItemId);
            if (!menuItem) {
                return res.status(400).json({ 
                    message: `Item with ID ${item.menuItemId} not found` 
                });
            }
            
            if (!menuItem.available) {
                return res.status(400).json({ 
                    message: `${menuItem.name} is not available` 
                });
            }
            
            orderItems.push({
                menuItemId: menuItem._id,
                name: menuItem.name,
                quantity: item.quantity,
                price: menuItem.price,
                subtotal: menuItem.price * item.quantity
            });
        }
        
        // Calculate totals
        const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
        
        // Create order object with all required fields
        const orderData = {
            userId: customer._id,
            customerId: customer._id,
            customerName: customer.name,
            customerPhone: customer.phone,
            customerEmail: customer.email || '',
            items: orderItems,
            subtotal: subtotal,
            total: subtotal,
            orderType: orderType || 'takeaway',
            paymentMethod: paymentMethod || 'M-PESA',
            paymentStatus: 'Pending',
            orderStatus: 'Pending',
            notes: notes || ''
        };
        
        // Add M-PESA checkout ID if available
        if (mpesaCheckoutId) {
            orderData.mpesaCheckoutId = mpesaCheckoutId;
        }
        
        // Add delivery address if order type is delivery
        if (orderType === 'delivery') {
            if (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.city) {
                return res.status(400).json({ 
                    message: 'Delivery address (street and city) is required for delivery orders' 
                });
            }
            orderData.deliveryAddress = deliveryAddress;
        }
        
        console.log('📝 Order data to save:', JSON.stringify(orderData, null, 2));
        
        // Create and save order
        const order = new Order(orderData);
        await order.save();
        
        console.log('✅ Order saved successfully:', order.orderNumber);
        
        // Update customer stats
        customer.totalOrders = (customer.totalOrders || 0) + 1;
        customer.totalSpent = (customer.totalSpent || 0) + order.total;
        customer.lastOrderDate = new Date();
        await customer.save();
        
        // Create notification for dashboard with detailed items
        const itemsList = order.items.map(item => `${item.quantity}x ${item.name}`).join(', ');
        await Notification.create({
            title: '🆕 New Order',
            message: `Order #${order.orderNumber} from ${order.customerName}\nItems: ${itemsList}\nTotal: KES ${order.total.toLocaleString()}`,
            type: 'success'
        });
        
        // Send success response
        res.status(201).json({
            message: 'Order created successfully',
            order: {
                _id: order._id,
                orderNumber: order.orderNumber,
                total: order.total,
                status: order.orderStatus,
                items: order.items,
                createdAt: order.createdAt,
                orderType: order.orderType,
                deliveryAddress: order.deliveryAddress
            }
        });
        
    } catch (error) {
        console.error('❌ Create order error:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ 
                message: 'Validation failed', 
                errors: messages 
            });
        }
        
        res.status(500).json({ 
            message: 'Failed to create order', 
            error: error.message 
        });
    }
});

// @route   GET /api/orders/my-orders
// @desc    Get current customer's orders
// @access  Private (Customer)
router.get('/my-orders', auth, async (req, res) => {
    try {
        const orders = await Order.find({ 
            $or: [
                { userId: req.user.id },
                { customerId: req.user.id }
            ]
        }).sort({ createdAt: -1 });
        
        res.json(orders);
    } catch (error) {
        console.error('Get my orders error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/orders/track/:orderNumber
// @desc    Track order by number (requires phone verification)
// @access  Public
router.get('/track/:orderNumber', async (req, res) => {
    try {
        const { phone } = req.query;
        
        const order = await Order.findOne({ orderNumber: req.params.orderNumber });
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        // If phone provided, verify it matches
        if (phone && order.customerPhone !== phone) {
            return res.status(403).json({ 
                message: 'Invalid phone number for this order' 
            });
        }
        
        res.json({
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            orderStatus: order.orderStatus,
            createdAt: order.createdAt,
            total: order.total,
            items: order.items,
            orderType: order.orderType,
            deliveryAddress: order.deliveryAddress
        });
    } catch (error) {
        console.error('Track order error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/orders
// @desc    Get all orders (admin only)
// @access  Private (Admin/Manager)
router.get('/', auth, async (req, res) => {
    try {
        // Check if admin or manager
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const { limit = 100, status } = req.query;
        
        let query = {};
        if (status && status !== 'all') {
            query.orderStatus = status;
        }
        
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));
        
        res.json(orders);
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/orders/:id
// @desc    Get single order (admin only)
// @access  Private (Admin/Manager)
router.get('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   PATCH /api/orders/:id/status
// @desc    Update order status (admin only)
// @access  Private (Admin/Manager)
router.patch('/:id/status', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const { status } = req.body;
        
        const validStatuses = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        order.orderStatus = status;
        await order.save();
        
        // Create notification
        const itemsList = order.items.map(item => `${item.quantity}x ${item.name}`).join(', ');
        await Notification.create({
            title: '📦 Order Status Updated',
            message: `Order #${order.orderNumber} is now ${status}\nItems: ${itemsList}`,
            type: 'info'
        });
        
        res.json({
            message: 'Order status updated',
            order
        });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   PATCH /api/orders/:id/payment
// @desc    Update payment status (admin only)
// @access  Private (Admin/Manager)
router.patch('/:id/payment', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const { paymentStatus, mpesaReceipt } = req.body;
        
        const validStatuses = ['Pending', 'Paid', 'Failed', 'Refunded'];
        if (!validStatuses.includes(paymentStatus)) {
            return res.status(400).json({ message: 'Invalid payment status' });
        }
        
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        order.paymentStatus = paymentStatus;
        if (mpesaReceipt) {
            order.mpesaReceipt = mpesaReceipt;
        }
        await order.save();
        
        // Create notification
        await Notification.create({
            title: paymentStatus === 'Paid' ? '💰 Payment Received' : '⚠️ Payment Update',
            message: `Payment for order #${order.orderNumber} is now ${paymentStatus}\nTotal: KES ${order.total.toLocaleString()}`,
            type: paymentStatus === 'Paid' ? 'success' : 'warning'
        });
        
        res.json({
            message: 'Payment status updated',
            order
        });
    } catch (error) {
        console.error('Update payment status error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;