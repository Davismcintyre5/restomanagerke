// Validate email
const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

// Validate phone number (Kenyan format)
const isValidPhone = (phone) => {
    const re = /^(0|254)?[17]\d{8}$/;
    return re.test(phone.replace(/\D/g, ''));
};

// Validate price
const isValidPrice = (price) => {
    return typeof price === 'number' && price > 0;
};

// Validate quantity
const isValidQuantity = (quantity) => {
    return typeof quantity === 'number' && quantity > 0 && Number.isInteger(quantity);
};

// Validate required fields
const validateRequired = (obj, fields) => {
    const missing = [];
    fields.forEach(field => {
        if (!obj[field] || obj[field].toString().trim() === '') {
            missing.push(field);
        }
    });
    return missing;
};

// Validate menu item
const validateMenuItem = (item) => {
    const errors = [];
    
    if (!item.name || item.name.length < 3) {
        errors.push('Name must be at least 3 characters');
    }
    
    if (!isValidPrice(item.price)) {
        errors.push('Price must be a positive number');
    }
    
    const validCategories = ['Appetizer', 'Main Course', 'Dessert', 'Beverage', 'Side Dish'];
    if (!validCategories.includes(item.category)) {
        errors.push('Invalid category');
    }
    
    return errors;
};

// Validate order
const validateOrder = (order) => {
    const errors = [];
    
    if (!order.customerPhone) {
        errors.push('Phone number is required');
    } else if (!isValidPhone(order.customerPhone)) {
        errors.push('Valid phone number is required');
    }
    
    if (!order.items || order.items.length === 0) {
        errors.push('Order must contain items');
    }
    
    return errors;
};

// Validate reservation
const validateReservation = (reservation) => {
    const errors = [];
    
    if (!reservation.name || reservation.name.length < 2) {
        errors.push('Name is required');
    }
    
    if (!reservation.phone) {
        errors.push('Phone number is required');
    } else if (!isValidPhone(reservation.phone)) {
        errors.push('Valid phone number is required');
    }
    
    if (!reservation.guests || reservation.guests < 1) {
        errors.push('Number of guests must be at least 1');
    }
    
    if (!reservation.date) {
        errors.push('Date is required');
    }
    
    if (!reservation.time) {
        errors.push('Time is required');
    }
    
    return errors;
};

module.exports = {
    isValidEmail,
    isValidPhone,
    isValidPrice,
    isValidQuantity,
    validateRequired,
    validateMenuItem,
    validateOrder,
    validateReservation
};