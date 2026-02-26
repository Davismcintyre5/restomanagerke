// server.js - RestoManagerKe Complete Server
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// ============= MIDDLEWARE =============
// Configure CORS for production - allow multiple origins
const corsOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',') 
    : ['http://localhost:5000', 'http://127.0.0.1:5000'];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl)
        if (!origin) return callback(null, true);
        
        if (corsOrigins.indexOf(origin) === -1 && process.env.NODE_ENV === 'production') {
            console.warn(`Blocked request from origin: ${origin}`);
            return callback(null, false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ============= DATABASE CONNECTION =============
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            // These options help with connection stability in production
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        console.log('\n=================================');
        console.log('✅ MongoDB Connected Successfully');
        console.log('=================================');
        console.log(`📊 Database: ${conn.connection.name}`);
        console.log(`📚 Host: ${conn.connection.host}`);
        console.log(`🔌 Port: ${conn.connection.port}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        
        // Log available collections (only in development)
        if (process.env.NODE_ENV !== 'production') {
            const collections = await conn.connection.db.listCollections().toArray();
            console.log(`\n📋 Available Collections (${collections.length}):`);
            collections.forEach(col => console.log(`   - ${col.name}`));
        }
        console.log('=================================\n');
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('🔌 MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('🔄 MongoDB reconnected');
        });

        return conn;
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        console.error('💡 Check your MONGODB_URI environment variable');
        console.error('💡 Make sure your IP is whitelisted in MongoDB Atlas');
        process.exit(1);
    }
};

connectDB();

// ============= MODELS =============
require('./models/User');
require('./models/MenuItem');
require('./models/Order');
require('./models/Reservation');
require('./models/Inventory');
require('./models/Supplier');
require('./models/Employee');
require('./models/Payroll');
require('./models/Expense');
require('./models/Transaction');
require('./models/Notification');
require('./models/Restaurant');
require('./models/Customer');

// ============= ROUTES =============
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const reservationRoutes = require('./routes/reservations');
const mpesaRoutes = require('./routes/mpesa');
const inventoryRoutes = require('./routes/inventory');
const supplierRoutes = require('./routes/suppliers');
const employeeRoutes = require('./routes/employees');
const payrollRoutes = require('./routes/payroll');
const expenseRoutes = require('./routes/expenses');
const transactionRoutes = require('./routes/transactions');
const notificationRoutes = require('./routes/notifications');
const restaurantRoutes = require('./routes/restaurant');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');
const healthRoutes = require('./routes/health');
const customerRoutes = require('./routes/customers');
const customerAuthRoutes = require('./routes/customer-auth');

// ============= USE ROUTES =============
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/customers', customerRoutes);
app.use('/health', healthRoutes);
app.use('/api/customer/auth', customerAuthRoutes);

// ============= TEST ENDPOINT =============
app.get('/api/test', (req, res) => {
    res.json({
        message: '✅ API is working!',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
            auth: '/api/auth',
            menu: '/api/menu',
            orders: '/api/orders',
            reservations: '/api/reservations',
            mpesa: '/api/mpesa',
            inventory: '/api/inventory',
            suppliers: '/api/suppliers',
            employees: '/api/employees',
            payroll: '/api/payroll',
            expenses: '/api/expenses',
            transactions: '/api/transactions',
            notifications: '/api/notifications',
            restaurant: '/api/restaurant',
            dashboard: '/api/dashboard',
            reports: '/api/reports',
            customers: '/api/customers',
            health: '/health'
        }
    });
});

// ============= FRONTEND ROUTES =============
// Main Dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Customer Portal
app.get('/order', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'customer-portal.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'customer-portal.html'));
});

// Test Page
app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test.html'));
});

// ============= API ROOT =============
app.get('/api', (req, res) => {
    res.json({
        name: 'RestoManagerKe API',
        version: '3.0.0',
        status: 'running',
        environment: process.env.NODE_ENV || 'development',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        endpoints: {
            test: '/api/test',
            auth: '/api/auth',
            menu: '/api/menu',
            orders: '/api/orders',
            reservations: '/api/reservations',
            mpesa: '/api/mpesa',
            inventory: '/api/inventory',
            suppliers: '/api/suppliers',
            employees: '/api/employees',
            payroll: '/api/payroll',
            expenses: '/api/expenses',
            transactions: '/api/transactions',
            notifications: '/api/notifications',
            restaurant: '/api/restaurant',
            dashboard: '/api/dashboard',
            reports: '/api/reports',
            customers: '/api/customers',
            health: '/health'
        }
    });
});

// ============= HEALTH CHECK =============
app.get('/health', (req, res) => {
    const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: {
            state: dbState[mongoose.connection.readyState] || 'unknown',
            connected: mongoose.connection.readyState === 1,
            name: mongoose.connection.name || 'unknown',
            host: mongoose.connection.host,
            port: mongoose.connection.port
        },
        server: {
            port: process.env.PORT || 5000,
            nodeVersion: process.version
        }
    });
});

// ============= ERROR HANDLING =============
// 404 handler
app.use((req, res) => {
    // Don't send 404 for frontend routes - let frontend handle routing
    if (req.accepts('html') && !req.path.startsWith('/api/')) {
        // Serve the appropriate frontend app
        if (req.path.startsWith('/dashboard')) {
            return res.sendFile(path.join(__dirname, 'public', 'index.html'));
        }
        return res.sendFile(path.join(__dirname, 'public', 'customer-portal.html'));
    }
    
    res.status(404).json({ 
        message: 'Route not found',
        path: req.path,
        method: req.method
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.stack);
    
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({ 
            message: 'Validation Error', 
            errors: messages 
        });
    }
    
    // MongoDB duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(400).json({ 
            message: `${field} already exists`,
            field
        });
    }
    
    // JWT error
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
    }
    
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
    }
    
    // Don't leak error details in production
    res.status(500).json({ 
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ============= START SERVER =============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('\n=================================');
    console.log('🚀 RestoManagerKe Server Started');
    console.log('=================================');
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`🍽️  Customer Portal: http://localhost:${PORT}/`);
    console.log(`🔧 Test Page: http://localhost:${PORT}/test`);
    console.log(`🔌 API Test: http://localhost:${PORT}/api/test`);
    console.log(`❤️  Health: http://localhost:${PORT}/health`);
    console.log(`💳 M-PESA: ${process.env.MPESA_ENVIRONMENT || 'sandbox'} mode`);
    
    if (process.env.NODE_ENV === 'production') {
        console.log(`🌐 CORS Origins: ${corsOrigins.join(', ')}`);
    }
    console.log('=================================\n');
});