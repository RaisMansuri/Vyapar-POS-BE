const AuditLog = require('../models/auditLog.model');
const { successResponse, errorResponse } = require('../utils/response');
const { Op } = require('sequelize');

exports.getLogs = async (req, res) => {
  try {
    const { action, entityType, entityId, startDate, endDate } = req.query;
    const where = { userId: req.user.id };

    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp[Op.gte] = new Date(startDate);
      if (endDate) where.timestamp[Op.lte] = new Date(endDate);
    }

    const logs = await AuditLog.findAll({
      where,
      order: [['timestamp', 'DESC']],
      limit: 100 // Prevent overloading
    });

    return successResponse(res, logs, 'Audit logs retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve audit logs', 500, error);
  }
};
