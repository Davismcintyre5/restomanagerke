// test-mpesa.js
const axios = require('axios');
require('dotenv').config();

async function testMpesaConfig() {
    console.log('\n🔧 M-PESA Configuration Test');
    console.log('==============================');
    
    // Check environment variables
    console.log('\n📋 Environment Variables:');
    console.log(`MPESA_ENVIRONMENT: ${process.env.MPESA_ENVIRONMENT || 'sandbox'}`);
    console.log(`MPESA_CONSUMER_KEY: ${process.env.MPESA_CONSUMER_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`MPESA_CONSUMER_SECRET: ${process.env.MPESA_CONSUMER_SECRET ? '✅ Set' : '❌ Missing'}`);
    console.log(`MPESA_BUSINESS_SHORTCODE: ${process.env.MPESA_BUSINESS_SHORTCODE || '174379'}`);
    console.log(`MPESA_PASSKEY: ${process.env.MPESA_PASSKEY ? '✅ Set' : '❌ Missing'}`);
    
    if (!process.env.MPESA_CONSUMER_KEY || !process.env.MPESA_CONSUMER_SECRET) {
        console.log('\n❌ M-PESA credentials are missing!');
        console.log('Please add them to your .env file:');
        console.log('MPESA_CONSUMER_KEY=aEeRklzAF1aopKmOx06UjcqeAtsUYVVc7VRNlaOsOlRRh1Qe');
        console.log('MPESA_CONSUMER_SECRET=KVPqOA3wBof39Wl8tiUVSaf2nj5nxDnSwNU946oeV6QmQGkqxAcPoe6A0esXaHU5');
        return;
    }
    
    // Test getting access token
    try {
        console.log('\n🔄 Testing M-PESA API connection...');
        
        const consumerKey = process.env.MPESA_CONSUMER_KEY;
        const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
        
        const url = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
        
        const response = await axios.get(url, {
            headers: { 
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Successfully connected to M-PESA API');
        console.log('✅ Access token obtained');
        console.log('\n🎉 M-PESA is properly configured!');
        
    } catch (error) {
        console.log('\n❌ Failed to connect to M-PESA API:');
        console.log(error.response?.data || error.message);
        console.log('\n💡 Possible issues:');
        console.log('1. Consumer key or secret is incorrect');
        console.log('2. Network connection issue');
        console.log('3. Safaricom sandbox might be down');
    }
}

testMpesaConfig();