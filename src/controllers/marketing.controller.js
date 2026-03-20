const { successResponse, errorResponse } = require('../utils/response');
const Customer = require('../models/customer.model');

/**
 * Send bulk messages to customers
 * (Simulated implementation for SMS/WhatsApp)
 */
exports.sendBulkMessage = async (req, res) => {
    try {
        const { message, customerIds, type } = req.body; // type: 'SMS' | 'WhatsApp'

        if (!message) {
            return errorResponse(res, 'Message content is required', 400);
        }

        let targets = [];
        if (customerIds && customerIds.length > 0) {
            targets = await Customer.find({ id: { $in: customerIds } }).select('name phone');
        } else {
            // If no IDs provided, send to all (or implement segments later)
            targets = await Customer.find().select('name phone');
        }

        // Logic to interface with external SMS/WA Gateway would go here
        // For now, we simulate success for each target
        const results = targets.map(target => ({
            customerName: target.name,
            phone: target.phone,
            status: 'Sent (Simulated)',
            timestamp: new Date()
        }));

        return successResponse(res, {
            totalSent: results.length,
            results
        }, `Bulk ${type} sent successfully to ${results.length} customers`);
    } catch (error) {
        return errorResponse(res, 'Failed to send bulk messages', 500, error);
    }
};

exports.getMarketingStats = async (req, res) => {
    try {
        // Mock stats for the dashboard
        const stats = {
            totalCampaigns: 12,
            messagesSentThisMonth: 1250,
            engagementRate: '4.2%',
            topChannel: 'WhatsApp'
        };
        return successResponse(res, stats, 'Marketing stats fetched successfully');
    } catch (error) {
        return errorResponse(res, 'Failed to fetch marketing stats', 500, error);
    }
};
