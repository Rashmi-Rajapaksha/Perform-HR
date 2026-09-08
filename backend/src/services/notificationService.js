const { Notification, User, Role } = require('../models');

async function notify({ user_id, title, message, type = 'INFO' }) {
  return Notification.create({ user_id, title, message, type });
}

/** Notifies every user holding a given role (e.g. all HR_MANAGERs) of an alert. */
async function notifyRole(roleName, { title, message, type = 'ALERT' }) {
  const role = await Role.findOne({ where: { name: roleName } });
  if (!role) return [];
  const users = await User.findAll({ where: { role_id: role.id, is_active: true } });
  return Promise.all(users.map((u) => notify({ user_id: u.id, title, message, type })));
}

async function listForUser(userId, { unreadOnly } = {}) {
  const where = { user_id: userId };
  if (unreadOnly) where.is_read = false;
  return Notification.findAll({ where, order: [['id', 'DESC']], limit: 50 });
}

async function markRead(id, userId) {
  const notification = await Notification.findOne({ where: { id, user_id: userId } });
  if (!notification) throw Object.assign(new Error('Notification not found'), { statusCode: 404 });
  notification.is_read = true;
  await notification.save();
  return notification;
}

async function markAllRead(userId) {
  await Notification.update({ is_read: true }, { where: { user_id: userId, is_read: false } });
  return true;
}

module.exports = { notify, notifyRole, listForUser, markRead, markAllRead };