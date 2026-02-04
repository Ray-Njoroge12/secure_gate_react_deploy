/**
 * Async handler wrapper to avoid try-catch blocks in every controller
 * Automatically catches errors and passes them to the next middleware
 */
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
