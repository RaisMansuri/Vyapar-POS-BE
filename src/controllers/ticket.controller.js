const Ticket = require('../models/ticket.model');
const { successResponse, errorResponse } = require('../utils/response');

// Create Ticket
exports.createTicket = async (req, res) => {
  try {
    if (!req.body.ticketId) {
        const count = await Ticket.count();
        req.body.ticketId = `TKT-${(1001 + count).toString()}`;
    }
    const ticket = await Ticket.create(req.body);
    return successResponse(res, ticket, 'Ticket created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create ticket', 400, error);
  }
};

// Get all Tickets
exports.getTickets = async (req, res) => {
  try {
    const tickets = await Ticket.findAll({ order: [['createdAt', 'DESC']] });
    return successResponse(res, tickets, 'Tickets retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve tickets', 500, error);
  }
};

// Get Ticket by ID
exports.getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
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
    const [updatedCount] = await Ticket.update(
        { status }, 
        { where: { id: req.params.id } }
    );
    if (updatedCount === 0) return errorResponse(res, 'Ticket not found', 404);
    const updatedTicket = await Ticket.findByPk(req.params.id);
    return successResponse(res, updatedTicket, 'Ticket status updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update ticket status', 400, error);
  }
};

// Add Comment
exports.addComment = async (req, res) => {
  try {
    const { author, message } = req.body;
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return errorResponse(res, 'Ticket not found', 404);
    
    const comments = [...(ticket.comments || []), { author, message, timestamp: new Date() }];
    await ticket.update({ comments });
    
    return successResponse(res, ticket, 'Comment added successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to add comment', 400, error);
  }
};

// Delete Ticket
exports.deleteTicket = async (req, res) => {
  try {
    const deletedCount = await Ticket.destroy({ where: { id: req.params.id } });
    if (deletedCount === 0) return errorResponse(res, 'Ticket not found', 404);
    return successResponse(res, null, 'Ticket deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete ticket', 500, error);
  }
};
