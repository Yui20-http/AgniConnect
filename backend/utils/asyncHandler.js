/**
 * Wraps an async route handler so that rejected promises are forwarded to
 * Express' error middleware automatically (avoids try/catch everywhere).
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
