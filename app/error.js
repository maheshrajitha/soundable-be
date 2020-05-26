/**
 * Soundable
 * @Author Mahesh
 * @module Error
 */

module.exports = function(error, exception, statusCode) {
  Error.captureStackTrace(this, this.constructor);
  this.error = error || "Application Error";
  if (process.env.DEBUG == "true")
    this.exception = exception;
  this.statusCode = statusCode || 400;
};
