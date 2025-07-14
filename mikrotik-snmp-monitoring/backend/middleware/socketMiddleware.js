/**
 * Middleware to attach Socket.IO instance to requests
 */

const attachSocketIO = (req, res, next) => {
  // Get the Socket.IO instance from the app
  req.io = req.app.get('io');
  next();
};

module.exports = {
  attachSocketIO
};