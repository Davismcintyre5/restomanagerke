const express = require('express');
const router = express.Router();
const axios = require('axios');

// Helper: Get M-PESA access token
async function getMpesaAccessToken() {
    try {
        const consumerKey = process.env.MPESA_CONSUMER_KEY;
        const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
        
        if (!consumerKey || !consumerSecret) {
            throw new Error('M-PESA consumer key or secret not configured');
        }
        
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
        
        const url = process.env.MPESA_ENVIRONMENT === 'production'
            ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
            : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
        
        const response = await axios.get(url, {
            headers: { 
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ M-PESA Access Token Generated');
        return response.data.access_token;
    } catch (error) {
        console.error('❌ M-PESA Token Error:', error.response?.data || error.message);
        throw error;
    }
}

// @route   GET /api/mpesa/test
// @desc    Test M-PESA configuration
// @access  Public
router.get('/test', (req, res) => {
    const config = {
        message: 'M-PESA API is configured',
        environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
        consumerKeySet: !!process.env.MPESA_CONSUMER_KEY,
        consumerSecretSet: !!process.env.MPESA_CONSUMER_SECRET,
        businessShortCode: process.env.MPESA_BUSINESS_SHORTCODE || '174379',
        passkeySet: !!process.env.MPESA_PASSKEY
    };
    
    console.log('📋 M-PESA Config Check:', config);
    res.json(config);
});

// @route   POST /api/mpesa/stkpush
// @desc    Initiate STK Push
// @access  Public
router.post('/stkpush', async (req, res) => {
    try {
        const { phone, amount, accountReference } = req.body;
        
        console.log('📤 STK Push Request:', { phone, amount, accountReference });
        
        // Validate input
        if (!phone || !amount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Phone and amount are required' 
            });
        }
        
        // Format phone number (ensure it starts with 254)
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.substring(1);
        } else if (formattedPhone.startsWith('7')) {
            formattedPhone = '254' + formattedPhone;
        } else if (!formattedPhone.startsWith('254')) {
            formattedPhone = '254' + formattedPhone;
        }
        
        // Ensure phone is exactly 12 digits (254 + 9 digits)
        if (formattedPhone.length !== 12) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone number format. Use 254XXXXXXXXX'
            });
        }
        
        // Get access token
        let accessToken;
        try {
            accessToken = await getMpesaAccessToken();
        } catch (tokenError) {
            console.error('Failed to get M-PESA token:', tokenError);
            return res.status(500).json({
                success: false,
                message: 'M-PESA configuration error. Please check your credentials.',
                error: tokenError.message
            });
        }
        
        // Prepare STK Push request
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
        
        const businessShortCode = process.env.MPESA_BUSINESS_SHORTCODE || '174379';
        const passkey = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
        
        // Generate password (Base64 of BusinessShortCode + Passkey + Timestamp)
        const password = Buffer.from(businessShortCode + passkey + timestamp).toString('base64');
        
        const url = process.env.MPESA_ENVIRONMENT === 'production'
            ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
            : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
        
        const stkRequest = {
            BusinessShortCode: businessShortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(amount),
            PartyA: formattedPhone,
            PartyB: businessShortCode,
            PhoneNumber: formattedPhone,
            CallBackURL: process.env.MPESA_CALLBACK_URL || 'https://yourdomain.com/api/mpesa/callback',
            AccountReference: accountReference || 'RestoKe',
            TransactionDesc: 'Restaurant Payment'
        };
        
        console.log('📤 Sending STK Push:', stkRequest);
        
        try {
            const response = await axios.post(url, stkRequest, {
                headers: { 
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📥 M-PESA Response:', response.data);
            
            if (response.data.ResponseCode === '0') {
                res.json({
                    success: true,
                    message: 'STK Push sent successfully',
                    data: {
                        MerchantRequestID: response.data.MerchantRequestID,
                        CheckoutRequestID: response.data.CheckoutRequestID,
                        ResponseCode: response.data.ResponseCode,
                        ResponseDescription: response.data.ResponseDescription
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: response.data.ResponseDescription || 'STK Push failed',
                    data: response.data
                });
            }
        } catch (stkError) {
            console.error('❌ STK Push Error:', stkError.response?.data || stkError.message);
            res.status(500).json({
                success: false,
                message: 'Failed to send STK push. Please try again.',
                error: stkError.response?.data || stkError.message
            });
        }
        
    } catch (error) {
        console.error('❌ M-PESA STK Push Error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment initiation failed',
            error: error.message
        });
    }
});

// @route   POST /api/mpesa/callback
// @desc    M-PESA Callback URL
// @access  Public
router.post('/callback', (req, res) => {
    console.log('📞 M-PESA Callback received:', JSON.stringify(req.body, null, 2));
    
    // Always respond with success to M-PESA
    res.json({ 
        ResultCode: 0, 
        ResultDesc: 'Success' 
    });
});

// @route   POST /api/mpesa/query
// @desc    Query payment status
// @access  Public
router.post('/query', async (req, res) => {
    try {
        const { checkoutRequestId } = req.body;
        
        if (!checkoutRequestId) {
            return res.status(400).json({ 
                success: false, 
                message: 'CheckoutRequestID is required' 
            });
        }
        
        // Get access token
        const accessToken = await getMpesaAccessToken();
        
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
        
        const businessShortCode = process.env.MPESA_BUSINESS_SHORTCODE || '174379';
        const passkey = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
        const password = Buffer.from(businessShortCode + passkey + timestamp).toString('base64');
        
        const url = process.env.MPESA_ENVIRONMENT === 'production'
            ? 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query'
            : 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query';
        
        const queryRequest = {
            BusinessShortCode: businessShortCode,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestId
        };
        
        const response = await axios.post(url, queryRequest, {
            headers: { 
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📥 M-PESA Query Response:', response.data);
        
        res.json({
            success: true,
            data: response.data
        });
        
    } catch (error) {
        console.error('❌ M-PESA Query Error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to query payment status',
            error: error.response?.data || error.message
        });
    }
});

module.exports = router;