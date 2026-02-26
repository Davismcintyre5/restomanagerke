// Generate order number
const generateOrderNumber = async (OrderModel) => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    const count = await OrderModel.countDocuments();
    const sequence = (count + 1).toString().padStart(4, '0');
    
    return `ORD${year}${month}${day}${sequence}`;
};

// Format phone number to international format
const formatPhoneNumber = (phone) => {
    let formatted = phone.replace(/\D/g, '');
    
    if (formatted.startsWith('0')) {
        formatted = '254' + formatted.substring(1);
    } else if (formatted.startsWith('7')) {
        formatted = '254' + formatted;
    } else if (!formatted.startsWith('254')) {
        formatted = '254' + formatted;
    }
    
    return formatted;
};

// Calculate tax (16% VAT)
const calculateTax = (amount) => {
    return amount * 0.16;
};

// Calculate total with tax
const calculateTotalWithTax = (subtotal) => {
    const tax = calculateTax(subtotal);
    return {
        subtotal,
        tax,
        total: subtotal + tax
    };
};

// Format currency
const formatCurrency = (amount) => {
    return `KES ${amount.toLocaleString()}`;
};

// Get date range for queries
const getDateRange = (startDate, endDate) => {
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
};

// Get current timestamp
const getTimestamp = () => {
    return new Date().toISOString();
};

module.exports = {
    generateOrderNumber,
    formatPhoneNumber,
    calculateTax,
    calculateTotalWithTax,
    formatCurrency,
    getDateRange,
    getTimestamp
};