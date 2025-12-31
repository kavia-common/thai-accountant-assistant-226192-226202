class ApiError extends Error {
  /**
   * @param {number} statusCode HTTP status
   * @param {string} code machine code
   * @param {string} message human message
   * @param {object} [details] extra details for debugging/validation
   */
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

module.exports = {
  ApiError,
};
