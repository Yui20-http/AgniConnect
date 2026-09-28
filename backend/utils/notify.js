const Notification = require('../models/Notification');
const { emitToUser } = require('./socket');

/**
 * Create a notification in the database and push it to the user in real time.
 *
 * @param {Object} opts
 * @param {String} opts.user   - recipient user id
 * @param {String} opts.title  - short title
 * @param {String} opts.message- longer message
 * @param {String} opts.type   - order | delivery | stock | system | price
 * @param {String} opts.link   - optional frontend route
 * @param {Object} opts.meta   - optional extra data
 */
const createNotification = async ({ user, title, message, type = 'system', link = '', meta = {} }) => {
  try {
    const notification = await Notification.create({ user, title, message, type, link, meta });
    emitToUser(user, 'notification:new', notification);
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error.message);
    return null;
  }
};

module.exports = { createNotification };
