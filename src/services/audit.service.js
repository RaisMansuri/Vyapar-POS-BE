const AuditLog = require('../models/auditLog.model');

/**
 * Service to record audit logs for sensitive actions.
 * @param {Object} params - Audit log parameters
 * @param {string} params.userId - User who performed the action
 * @param {string} params.action - The action performed (e.g., DELETE_PRODUCT)
 * @param {string} params.entityType - Type of entity affected (e.g., Product)
 * @param {string} [params.entityId] - ID of the entity
 * @param {Object} [params.oldValue] - Value before action
 * @param {Object} [params.newValue] - Value after action
 * @param {Object} [params.req] - Express request object for IP/UserAgent
 */
exports.recordAudit = async ({ userId, action, entityType, entityId, oldValue, newValue, req }) => {
  try {
    await AuditLog.create({
      userId,
      action,
      entityType,
      entityId,
      oldValue,
      newValue: newValue || null,
      ipAddress: req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null,
      userAgent: req ? req.headers['user-agent'] : null,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to record audit log:', error);
    // We don't throw error to avoid breaking main business logic if logging fails
  }
};
