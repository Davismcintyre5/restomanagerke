const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import User Model
const User = require('./models/User');

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restomanagerke', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB Connected Successfully');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        process.exit(1);
    }
};

// Seed only admin credentials
const seedAdmin = async () => {
    console.log('👤 Seeding admin user...');
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: 'davismcintyre5@gmail.com' });
    
    if (existingUser) {
        console.log('⚠️  Admin user already exists. Updating password...');
        
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Hdm@2002', salt);
        
        // Update existing user
        existingUser.password = hashedPassword;
        existingUser.role = 'admin';
        existingUser.isActive = true;
        await existingUser.save();
        
        console.log('✅ Admin user updated successfully');
        return;
    }
    
    // Create new admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Hdm@2002', salt);
    
    const admin = new User({
        name: 'Davis McIntyre',
        email: 'davismcintyre5@gmail.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true
    });
    
    await admin.save();
    console.log('✅ Admin user created successfully');
};

// Run the seed
const seedDatabase = async () => {
    try {
        await connectDB();
        await seedAdmin();
        console.log('\n✨ Seed completed successfully!');
        console.log('📧 Email: davismcintyre5@gmail.com');
        console.log('🔑 Password: Hdm@2002');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
};

// Run seed
seedDatabase();