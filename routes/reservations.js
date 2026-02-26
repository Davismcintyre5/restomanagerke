const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth'); // Admin auth

// @route   POST /api/reservations
// @desc    Create reservation (public - accepts both authenticated and unauthenticated)
// @access  Public
router.post('/', async (req, res) => {
    try {
        const { customerId, name, phone, email, guests, date, time, requests } = req.body;
        
        // Validate input
        if (!name || !phone || !guests || !date || !time) {
            return res.status(400).json({ 
                message: 'Please fill all required fields',
                missing: {
                    name: !name,
                    phone: !phone,
                    guests: !guests,
                    date: !date,
                    time: !time
                }
            });
        }
        
        // Validate phone number
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.substring(1);
        } else if (formattedPhone.startsWith('7')) {
            formattedPhone = '254' + formattedPhone;
        }
        
        if (formattedPhone.length < 10 || formattedPhone.length > 12) {
            return res.status(400).json({ message: 'Please enter a valid phone number' });
        }
        
        // Validate time format (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(time)) {
            return res.status(400).json({ message: 'Please enter valid time (HH:MM) - e.g., 14:30' });
        }
        
        // Check if date is valid
        const reservationDate = new Date(date);
        if (isNaN(reservationDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }
        
        // Check if date is in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (reservationDate < today) {
            return res.status(400).json({ message: 'Cannot book for past dates' });
        }
        
        // Check if slot is available
        const existingReservation = await Reservation.findOne({
            date: reservationDate,
            time,
            status: { $nin: ['Cancelled'] }
        });
        
        if (existingReservation) {
            return res.status(400).json({ message: 'Time slot already booked' });
        }
        
        // Create reservation
        const reservation = new Reservation({
            customerId: customerId || null, // Store customer ID if provided
            name,
            phone: formattedPhone,
            email: email || '',
            guests,
            date: reservationDate,
            time,
            requests: requests || '',
            status: 'Confirmed'
        });
        
        await reservation.save();
        
        // Create notification for dashboard
        await Notification.create({
            title: 'New Reservation',
            message: `${name} (${formattedPhone}) booked a table for ${guests} on ${reservationDate.toLocaleDateString()} at ${time}`,
            type: 'info'
        });
        
        // Format phone for display
        let displayPhone = formattedPhone;
        if (displayPhone.startsWith('254')) {
            displayPhone = '0' + displayPhone.substring(3);
        }
        
        // Send SMS confirmation (simulated - integrate with SMS gateway)
        console.log(`📱 SMS sent to ${displayPhone}: Your table for ${guests} on ${reservationDate.toLocaleDateString()} at ${time} has been confirmed. Thank you for choosing RestoManagerKe!`);
        
        res.status(201).json({
            message: 'Reservation confirmed successfully',
            reservation: {
                _id: reservation._id,
                name: reservation.name,
                phone: displayPhone,
                email: reservation.email,
                date: reservation.date,
                time: reservation.time,
                guests: reservation.guests,
                requests: reservation.requests
            }
        });
    } catch (error) {
        console.error('Create reservation error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Time slot already booked' });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/reservations/my-reservations
// @desc    Get customer's reservations (requires customer auth token)
// @access  Private (Customer)
router.get('/my-reservations', async (req, res) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.role !== 'customer') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        
        const reservations = await Reservation.find({ 
            customerId: decoded.id,
            status: { $nin: ['Cancelled'] }
        }).sort({ date: -1, time: -1 });
        
        // Format phone numbers for display
        const formattedReservations = reservations.map(res => {
            const resObj = res.toObject();
            if (resObj.phone && resObj.phone.startsWith('254')) {
                resObj.phone = '0' + resObj.phone.substring(3);
            }
            return resObj;
        });
        
        res.json(formattedReservations);
    } catch (error) {
        console.error('Get customer reservations error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/reservations/slots/:date
// @desc    Get available time slots for a date (public)
// @access  Public
router.get('/slots/:date', async (req, res) => {
    try {
        const dateParam = req.params.date;
        const date = new Date(dateParam);
        
        if (isNaN(date.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }
        
        const allSlots = ['12:00', '13:00', '14:00', '18:00', '19:00', '20:00'];
        
        const bookedReservations = await Reservation.find({
            date,
            status: { $nin: ['Cancelled'] }
        });
        
        const bookedSlots = bookedReservations.map(r => r.time);
        const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
        
        res.json({ availableSlots, bookedSlots });
    } catch (error) {
        console.error('Get slots error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/reservations
// @desc    Get all reservations (admin only)
// @access  Private (Admin)
router.get('/', auth, async (req, res) => {
    try {
        const reservations = await Reservation.find().sort({ date: 1, time: 1 });
        
        // Format phone numbers for display
        const formattedReservations = reservations.map(res => {
            const resObj = res.toObject();
            if (resObj.phone && resObj.phone.startsWith('254')) {
                resObj.phone = '0' + resObj.phone.substring(3);
            }
            return resObj;
        });
        
        res.json(formattedReservations);
    } catch (error) {
        console.error('Get reservations error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/reservations/today
// @desc    Get today's reservations (admin only)
// @access  Private (Admin)
router.get('/today', auth, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const reservations = await Reservation.find({
            date: { $gte: today, $lt: tomorrow },
            status: { $nin: ['Cancelled'] }
        }).sort({ time: 1 });
        
        // Format phone numbers for display
        const formattedReservations = reservations.map(res => {
            const resObj = res.toObject();
            if (resObj.phone && resObj.phone.startsWith('254')) {
                resObj.phone = '0' + resObj.phone.substring(3);
            }
            return resObj;
        });
        
        res.json(formattedReservations);
    } catch (error) {
        console.error('Get today reservations error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   PATCH /api/reservations/:id/status
// @desc    Update reservation status (admin only)
// @access  Private (Admin)
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        
        const reservation = await Reservation.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        
        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }
        
        // Format phone for display
        let displayPhone = reservation.phone;
        if (displayPhone && displayPhone.startsWith('254')) {
            displayPhone = '0' + displayPhone.substring(3);
        }
        
        // Send SMS notification to customer
        if (reservation.phone) {
            let message = '';
            if (status === 'Seated') {
                message = `Welcome ${reservation.name}! Your table for ${reservation.guests} is now ready. Please proceed to your table.`;
            } else if (status === 'Cancelled') {
                message = `Dear ${reservation.name}, your reservation for ${reservation.date.toLocaleDateString()} at ${reservation.time} has been cancelled.`;
            } else if (status === 'No-show') {
                message = `Dear ${reservation.name}, we missed you for your reservation at ${reservation.time}. Please contact us to reschedule.`;
            }
            
            if (message) {
                console.log(`📱 SMS sent to ${displayPhone}: ${message}`);
            }
        }
        
        res.json({
            message: 'Reservation status updated',
            reservation
        });
    } catch (error) {
        console.error('Update reservation status error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;