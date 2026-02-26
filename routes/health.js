const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const os = require('os');

// @route   GET /health
// @desc    Health check endpoint
// @access  Public
router.get('/', (req, res) => {
    const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const status = mongoose.connection.readyState;
    
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        system: {
            platform: os.platform(),
            memory: {
                free: os.freemem(),
                total: os.totalmem(),
                usage: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(2) + '%'
            },
            cpus: os.cpus().length
        },
        process: {
            pid: process.pid,
            memory: process.memoryUsage(),
            version: process.version
        },
        database: {
            state: dbState[status] || 'unknown',
            connected: status === 1,
            name: mongoose.connection.name || 'unknown',
            host: mongoose.connection.host,
            port: mongoose.connection.port
        },
        server: {
            port: process.env.PORT || 5000,
            environment: process.env.NODE_ENV || 'development'
        }
    });
});

// @route   GET /health/detailed
// @desc    Detailed health check
// @access  Public
router.get('/detailed', async (req, res) => {
    try {
        // Get collection counts if connected
        let collections = [];
        let collectionCounts = {};
        
        if (mongoose.connection.readyState === 1) {
            const db = mongoose.connection.db;
            collections = await db.listCollections().toArray();
            
            for (const col of collections) {
                const count = await db.collection(col.name).countDocuments();
                collectionCounts[col.name] = count;
            }
        }
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: {
                connected: mongoose.connection.readyState === 1,
                collections: collections.length,
                counts: collectionCounts
            },
            memory: process.memoryUsage(),
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'unhealthy', 
            error: error.message 
        });
    }
});

module.exports = router;