const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/', auditController.getLogs);

module.exports = router;
