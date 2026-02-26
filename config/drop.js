// reset-database.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
require('dotenv').config();

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function printBanner() {
    console.log(`${colors.cyan}${colors.bright}`);
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                                                          ║');
    console.log('║           🧹 RESTOMANAGERKE DATABASE RESET              ║');
    console.log('║                                                          ║');
    console.log('║     This will DELETE ALL DATA and keep ONLY Admin       ║');
    console.log('║                                                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`${colors.reset}`);
}

async function resetDatabase() {
    try {
        printBanner();
        
        console.log(`${colors.yellow}⚠️  WARNING: This will permanently delete ALL data!${colors.reset}`);
        console.log(`${colors.yellow}⚠️  Only the admin user will be preserved.${colors.reset}\n`);
        
        // Ask for confirmation
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const answer = await new Promise(resolve => {
            readline.question(`${colors.red}Type 'DELETE ALL' to confirm: ${colors.reset}`, resolve);
        });
        readline.close();

        if (answer !== 'DELETE ALL') {
            console.log(`${colors.yellow}❌ Operation cancelled.${colors.reset}`);
            process.exit(0);
        }

        console.log(`\n${colors.cyan}🔌 Connecting to MongoDB...${colors.reset}`);
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restomanagerke', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log(`${colors.green}✅ Connected to MongoDB${colors.reset}`);
        console.log(`${colors.cyan}📊 Database: ${mongoose.connection.name}${colors.reset}\n`);

        // Get all collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        console.log(`${colors.magenta}📋 Found ${collectionNames.length} collections:${colors.reset}`);
        collectionNames.forEach(name => console.log(`   - ${name}`));
        console.log('');

        // Drop all collections EXCEPT 'users'
        for (const collectionName of collectionNames) {
            if (collectionName !== 'users') {
                try {
                    await mongoose.connection.db.dropCollection(collectionName);
                    console.log(`${colors.green}✅ Dropped collection: ${collectionName}${colors.reset}`);
                } catch (err) {
                    console.log(`${colors.yellow}⚠️  Could not drop ${collectionName}: ${err.message}${colors.reset}`);
                }
            } else {
                console.log(`${colors.yellow}⏩ Skipping users collection (will clean non-admin users)${colors.reset}`);
            }
        }

        console.log(`\n${colors.cyan}🧹 Cleaning users collection...${colors.reset}`);
        
        // Define User model if not already defined
        const User = mongoose.model('User', new mongoose.Schema({
            name: String,
            email: { type: String, unique: true },
            password: String,
            role: String,
            phone: String,
            isActive: { type: Boolean, default: true },
            lastLogin: Date,
            createdAt: { type: Date, default: Date.now }
        }));

        // Remove all non-admin users
        const deleteResult = await User.deleteMany({ role: { $ne: 'admin' } });
        console.log(`${colors.green}✅ Removed ${deleteResult.deletedCount} non-admin users${colors.reset}`);

        // Check if admin exists
        let adminUser = await User.findOne({ role: 'admin' });

        if (!adminUser) {
            console.log(`${colors.yellow}👤 No admin found, creating default admin...${colors.reset}`);
            
            const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Hdm@2002', 10);
            
            adminUser = new User({
                name: process.env.ADMIN_NAME || 'Admin User',
                email: process.env.ADMIN_EMAIL || 'davismcintyre5@gmail.com',
                password: hashedPassword,
                role: 'admin',
                isActive: true,
                phone: '',
                createdAt: new Date()
            });
            
            await adminUser.save();
            console.log(`${colors.green}✅ Default admin created${colors.reset}`);
        } else {
            console.log(`${colors.green}✅ Admin user preserved: ${adminUser.email}${colors.reset}`);
            
            // Reset admin password if needed (optional)
            const resetPassword = await new Promise(resolve => {
                const rl = require('readline').createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                rl.question(`${colors.yellow}Reset admin password to default? (y/n): ${colors.reset}`, resolve);
                rl.close();
            });

            if (resetPassword.toLowerCase() === 'y') {
                const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Hdm@2002', 10);
                adminUser.password = hashedPassword;
                await adminUser.save();
                console.log(`${colors.green}✅ Admin password reset${colors.reset}`);
            }
        }

        // Drop all indexes to remove any problematic unique indexes
        console.log(`\n${colors.cyan}🗑️  Cleaning up indexes...${colors.reset}`);
        
        // Reconnect to ensure we have fresh connection
        await mongoose.disconnect();
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restomanagerke');

        // Drop indexes from all collections
        const newCollections = await mongoose.connection.db.listCollections().toArray();
        for (const collection of newCollections) {
            try {
                const indexes = await mongoose.connection.db.collection(collection.name).indexes();
                for (const index of indexes) {
                    if (index.name !== '_id_') {
                        await mongoose.connection.db.collection(collection.name).dropIndex(index.name);
                        console.log(`${colors.green}✅ Dropped index ${index.name} from ${collection.name}${colors.reset}`);
                    }
                }
            } catch (err) {
                console.log(`${colors.yellow}⚠️  Error with indexes in ${collection.name}: ${err.message}${colors.reset}`);
            }
        }

        // Create necessary indexes for users collection
        await mongoose.connection.db.collection('users').createIndex({ email: 1 }, { unique: true });
        console.log(`${colors.green}✅ Recreated email index on users${colors.reset}`);

        console.log(`\n${colors.green}${colors.bright}══════════════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.green}${colors.bright}         ✅ DATABASE RESET COMPLETED SUCCESSFULLY!         ${colors.reset}`);
        console.log(`${colors.green}${colors.bright}╚══════════════════════════════════════════════════════════╝${colors.reset}`);
        console.log(``);
        console.log(`${colors.cyan}📧 Admin Email: ${process.env.ADMIN_EMAIL || 'davismcintyre5@gmail.com'}${colors.reset}`);
        console.log(`${colors.cyan}🔑 Admin Password: ${process.env.ADMIN_PASSWORD || 'Hdm@2002'}${colors.reset}`);
        console.log(``);
        console.log(`${colors.magenta}📊 Database is now empty except for admin user.${colors.reset}`);
        console.log(`${colors.magenta}✨ You can now run 'node seed.js' to add sample data.${colors.reset}`);
        console.log(``);

    } catch (error) {
        console.error(`${colors.red}❌ Error resetting database:${colors.reset}`, error);
    } finally {
        await mongoose.disconnect();
        console.log(`${colors.cyan}🔌 Disconnected from MongoDB${colors.reset}\n`);
    }
}

// Run the reset function
resetDatabase();