const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.post('/', ticketController.createTicket);
router.get('/', ticketController.getTickets);
router.get('/:id', ticketController.getTicketById);
router.put('/:id/status', ticketController.updateTicketStatus);
router.post('/:id/comments', ticketController.addComment);
router.delete('/:id', ticketController.deleteTicket);

module.exports = router;
