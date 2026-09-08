const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const notificationService = require('../services/notificationService');

const list = asyncHandler(async (req, res) => {
  const notifications = await notificationService.listForUser(req.userId, { unreadOnly: req.query.unread === 'true' });
  return ApiResponse.success(res, { message: 'Notifications retrieved', data: notifications });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(req.params.id, req.userId);
  return ApiResponse.success(res, { message: 'Notification marked as read', data: notification });
});

const markAllRead = asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.userId);
  return ApiResponse.success(res, { message: 'All notifications marked as read' });
});

module.exports = { list, markRead, markAllRead };