const Notification = require('../models/notification.model');
const { successResponse, errorResponse } = require('../utils/response');

// Get all notifications for current user
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    
    const unreadCount = await Notification.count({
      where: { userId: req.user.id, isRead: false }
    });

    return successResponse(res, { notifications, unreadCount }, 'Notifications retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve notifications', 500, error);
  }
};

// Create a notification
exports.createNotification = async (req, res) => {
  try {
    const { title, message, type, link, metadata } = req.body;
    
    // Logic to prevent duplicate unread alerts for the same product
    if (metadata?.productId) {
      const existing = await Notification.findOne({
        where: {
          userId: req.user.id,
          metadata: { productId: metadata.productId },
          isRead: false
        }
      });
      if (existing) {
        return successResponse(res, existing, 'Unread notification already exists');
      }
    }

    const notification = await Notification.create({
      userId: req.user.id,
      title,
      message,
      type: type || 'info',
      link,
      metadata
    });

    return successResponse(res, notification, 'Notification created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create notification', 500, error);
  }
};

// Mark as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await Notification.update(
      { isRead: true },
      { where: { id, userId: req.user.id } }
    );

    if (!updated) {
      return errorResponse(res, 'Notification not found', 404);
    }

    return successResponse(res, null, 'Notification marked as read');
  } catch (error) {
    return errorResponse(res, 'Failed to update notification', 500, error);
  }
};

// Mark all as read
exports.markAllRead = async (req, res) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { userId: req.user.id, isRead: false } }
    );

    return successResponse(res, null, 'All notifications marked as read');
  } catch (error) {
    return errorResponse(res, 'Failed to update notifications', 500, error);
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Notification.destroy({
      where: { id, userId: req.user.id }
    });

    if (!deleted) {
      return errorResponse(res, 'Notification not found', 404);
    }

    return successResponse(res, null, 'Notification deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete notification', 500, error);
  }
};
