const Ticket = require('../models/ticket.model');
const { successResponse, errorResponse } = require('../utils/response');

// Create Ticket
exports.createTicket = async (req, res) => {
  try {
    if (!req.body.id) {
        const count = await Ticket.countDocuments();
        req.body.id = `TKT-${(1001 + count).toString()}`;
    }
    const ticket = new Ticket(req.body);
    const savedTicket = await ticket.save();
    return successResponse(res, savedTicket, 'Ticket created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create ticket', 400, error);
  }
};

// Get all Tickets
exports.getTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find().sort({ createdAt: -1 });
    return successResponse(res, tickets, 'Tickets retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve tickets', 500, error);
  }
};

// Get Ticket by ID
exports.getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ id: req.params.id });
    if (!ticket) return errorResponse(res, 'Ticket not found', 404);
    return successResponse(res, ticket, 'Ticket retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve ticket', 500, error);
  }
};

// Update Ticket Status
exports.updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = await Ticket.findOneAndUpdate(
        { id: req.params.id }, 
        { status, updatedAt: new Date() }, 
        { new: true }
    );
    if (!ticket) return errorResponse(res, 'Ticket not found', 404);
    return successResponse(res, ticket, 'Ticket status updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update ticket status', 400, error);
  }
};

// Add Comment
exports.addComment = async (req, res) => {
  try {
    const { author, message } = req.body;
    const ticket = await Ticket.findOne({ id: req.params.id });
    if (!ticket) return errorResponse(res, 'Ticket not found', 404);
    
    ticket.comments.push({ author, message });
    const savedTicket = await ticket.save();
    return successResponse(res, savedTicket, 'Comment added successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to add comment', 400, error);
  }
};

// Delete Ticket
exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOneAndDelete({ id: req.params.id });
    if (!ticket) return errorResponse(res, 'Ticket not found', 404);
    return successResponse(res, null, 'Ticket deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete ticket', 500, error);
  }
};
