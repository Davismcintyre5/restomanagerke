// hard-reset.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
require('dotenv').config();

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

async function hardReset() {
    try {
        console.log(`${colors.cyan}${colors.bright}`);
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║           💥 HARDCORE DATABASE RESET TOOL                ║');
        console.log('║                                                          ║');
        console.log('║     This will COMPLETELY DROP and RECREATE the DB       ║');
        console.log('║                                                          ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log(`${colors.reset}`);

        console.log(`${colors.yellow}⚠️  WARNING: This will DESTROY the entire database!${colors.reset}\n`);

        // Ask for confirmation
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const answer = await new Promise(resolve => {
            readline.question(`${colors.red}Type 'DESTROY' to confirm: ${colors.reset}`, resolve);
        });
        readline.close();

        if (answer !== 'DESTROY') {
            console.log(`${colors.yellow}❌ Operation cancelled.${colors.reset}`);
            process.exit(0);
        }

        console.log(`\n${colors.cyan}🔌 Connecting to MongoDB...${colors.reset}`);
        
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
        const dbName = 'restomanagerke';
        const fullURI = `${mongoURI}/${dbName}`;
        
        await mongoose.connect(fullURI);
        console.log(`${colors.green}✅ Connected to MongoDB${colors.reset}`);

        // Drop the entire database
        console.log(`${colors.yellow}💥 Dropping database...${colors.reset}`);
        await mongoose.connection.db.dropDatabase();
        console.log(`${colors.green}✅ Database dropped completely${colors.reset}`);

        // Disconnect
        await mongoose.disconnect();
        console.log(`${colors.cyan}🔌 Disconnected${colors.reset}`);

        // Reconnect to the now empty database
        console.log(`${colors.cyan}🔄 Reconnecting to create fresh database...${colors.reset}`);
        await mongoose.connect(fullURI);

        // Define schemas
        const userSchema = new mongoose.Schema({
            name: String,
            email: { type: String, unique: true },
            password: String,
            role: { type: String, default: 'staff' },
            phone: String,
            isActive: { type: Boolean, default: true },
            lastLogin: Date,
            createdAt: { type: Date, default: Date.now }
        });

        const restaurantSchema = new mongoose.Schema({
            name: { type: String, default: 'RestoManagerKe' },
            address: { type: String, default: 'Nairobi, Kenya' },
            phone: { type: String, default: '+254 700 000000' },
            email: { type: String, default: 'info@restomanagerke.com' },
            kraPin: { type: String, default: 'P000000000A' },
            watermark: { type: String, default: 'RestoManagerKe' },
            updatedAt: { type: Date, default: Date.now }
        });

        // Create models
        const User = mongoose.model('User', userSchema);
        const Restaurant = mongoose.model('Restaurant', restaurantSchema);

        // Create admin user
        console.log(`${colors.cyan}👤 Creating admin user...${colors.reset}`);
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Hdm@2002', 10);
        
        const adminUser = new User({
            name: process.env.ADMIN_NAME || 'Admin User',
            email: process.env.ADMIN_EMAIL || 'davismcintyre5@gmail.com',
            password: hashedPassword,
            role: 'admin',
            isActive: true,
            createdAt: new Date()
        });
        
        await adminUser.save();
        console.log(`${colors.green}✅ Admin user created${colors.reset}`);

        // Create restaurant settings
        console.log(`${colors.cyan}🏢 Creating restaurant settings...${colors.reset}`);
        const restaurant = new Restaurant({
            name: 'RestoManagerKe',
            address: 'Nairobi, Kenya',
            phone: '+254 700 000000',
            email: 'info@restomanagerke.com',
            kraPin: 'P000000000A',
            watermark: 'RestoManagerKe'
        });
        
        await restaurant.save();
        console.log(`${colors.green}✅ Restaurant settings created${colors.reset}`);

        // Verify
        const userCount = await User.countDocuments();
        const restaurantCount = await Restaurant.countDocuments();

        console.log(`\n${colors.green}${colors.bright}══════════════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.green}${colors.bright}         ✅ HARDCORE RESET COMPLETED!                      ${colors.reset}`);
        console.log(`${colors.green}${colors.bright}╚══════════════════════════════════════════════════════════╝${colors.reset}`);
        console.log(``);
        console.log(`${colors.cyan}📊 Database Statistics:${colors.reset}`);
        console.log(`   - Users: ${userCount} (admin only)`);
        console.log(`   - Restaurants: ${restaurantCount}`);
        console.log(``);
        console.log(`${colors.magenta}📧 Admin Email: ${process.env.ADMIN_EMAIL || 'davismcintyre5@gmail.com'}${colors.reset}`);
        console.log(`${colors.magenta}🔑 Admin Password: ${process.env.ADMIN_PASSWORD || 'Hdm@2002'}${colors.reset}`);
        console.log(``);
        console.log(`${colors.yellow}💡 Run 'node seed.js' to add sample data${colors.reset}`);
        console.log(``);

    } catch (error) {
        console.error(`${colors.red}❌ Error during hard reset:${colors.reset}`, error);
    } finally {
        await mongoose.disconnect();
        console.log(`${colors.cyan}🔌 Disconnected from MongoDB${colors.reset}\n`);
    }
}

hardReset();