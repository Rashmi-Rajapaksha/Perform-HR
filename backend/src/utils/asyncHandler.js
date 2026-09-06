/**
 * Wraps an async Express route handler so that any rejected promise or
 * thrown error is forwarded to next(), landing in the centralized
 * errorMiddleware instead of crashing the process or requiring
 * repetitive try/catch blocks in every controller.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;