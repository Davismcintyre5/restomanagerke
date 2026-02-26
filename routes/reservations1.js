const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// @route   POST /api/reservations
// @desc    Create reservation (public)
// @access  Public
router.post('/', async (req, res) => {
    try {
        const { name, phone, email, guests, date, time, requests } = req.body;
        
        // Validate input
        if (!name || !phone || !guests || !date || !time) {
            return res.status(400).json({ message: 'Please fill all required fields' });
        }
        
        // Validate time format (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(time)) {
            return res.status(400).json({ message: 'Please enter valid time (HH:MM)' });
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
            name,
            phone,
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
            message: `${name} booked a table for ${guests} on ${reservationDate.toLocaleDateString()} at ${time}`,
            type: 'info'
        });
        
        res.status(201).json({
            message: 'Reservation confirmed successfully',
            reservation: {
                _id: reservation._id,
                name: reservation.name,
                date: reservation.date,
                time: reservation.time,
                guests: reservation.guests
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
// @desc    Get all reservations
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const reservations = await Reservation.find().sort({ date: 1, time: 1 });
        res.json(reservations);
    } catch (error) {
        console.error('Get reservations error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/reservations/today
// @desc    Get today's reservations
// @access  Private
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
        
        res.json(reservations);
    } catch (error) {
        console.error('Get today reservations error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/reservations/:id
// @desc    Get single reservation
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }
        res.json(reservation);
    } catch (error) {
        console.error('Get reservation error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   PATCH /api/reservations/:id/status
// @desc    Update reservation status
// @access  Private
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        
        const validStatuses = ['Confirmed', 'Seated', 'Cancelled', 'No-show'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        
        const reservation = await Reservation.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        
        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }
        
        res.json({
            message: 'Reservation updated successfully',
            reservation
        });
    } catch (error) {
        console.error('Update reservation error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   DELETE /api/reservations/:id
// @desc    Delete reservation
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const reservation = await Reservation.findByIdAndDelete(req.params.id);
        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }
        
        res.json({ message: 'Reservation deleted successfully' });
    } catch (error) {
        console.error('Delete reservation error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;