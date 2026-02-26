// seed-production.js - Run this in production to create admin user
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const User = require('./models/User');
const Restaurant = require('./models/Restaurant');

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// Seed admin user
const seedAdmin = async () => {
    try {
        // Check if admin exists
        const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
        
        if (!adminExists) {
            console.log('👤 Creating admin user...');
            
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);
            
            const admin = new User({
                name: process.env.ADMIN_NAME || 'Admin User',
                email: process.env.ADMIN_EMAIL,
                password: hashedPassword,
                role: 'admin',
                isActive: true
            });
            
            await admin.save();
            console.log('✅ Admin user created successfully');
            console.log(`📧 Email: ${process.env.ADMIN_EMAIL}`);
        } else {
            console.log('✅ Admin user already exists');
        }
    } catch (error) {
        console.error('❌ Error creating admin:', error);
    }
};

// Seed default restaurant settings
const seedRestaurant = async () => {
    try {
        const restaurantExists = await Restaurant.findOne();
        
        if (!restaurantExists) {
            console.log('🏠 Creating default restaurant settings...');
            
            const restaurant = new Restaurant({
                name: 'My Restaurant',
                address: 'Nairobi, Kenya',
                phone: '0712 345 678',
                email: 'info@restaurant.com',
                kraPin: 'P051234567K',
                openingHours: {
                    monday: '8:00 AM - 10:00 PM',
                    tuesday: '8:00 AM - 10:00 PM',
                    wednesday: '8:00 AM - 10:00 PM',
                    thursday: '8:00 AM - 10:00 PM',
                    friday: '8:00 AM - 11:00 PM',
                    saturday: '9:00 AM - 11:00 PM',
                    sunday: '9:00 AM - 9:00 PM'
                }
            });
            
            await restaurant.save();
            console.log('✅ Default restaurant settings created');
        } else {
            console.log('✅ Restaurant settings already exist');
        }
    } catch (error) {
        console.error('❌ Error creating restaurant settings:', error);
    }
};

// Run all seeds
const seedAll = async () => {
    console.log('\n🌱 Starting production seed...\n');
    
    await connectDB();
    await seedAdmin();
    await seedRestaurant();
    
    console.log('\n✨ Production seed completed successfully!\n');
    process.exit(0);
};

// Run if called directly
if (require.main === module) {
    seedAll();
}

module.exports = { seedAdmin, seedRestaurant, seedAll };