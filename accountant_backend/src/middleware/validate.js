const { ZodError } = require('zod');
const { ApiError } = require('../errors/apiError');

/**
 * PUBLIC_INTERFACE
 * Validates req.{body,query,params} using provided Zod schemas.
 *
 * @param {{ body?: any, query?: any, params?: any }} schemas Zod schemas
 */
function validate(schemas) {
  return (req, _res, next) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.body) req.body = schemas.body.parse(req.body);
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', {
            issues: err.issues,
          })
        );
      }
      return next(err);
    }
  };
}

module.exports = {
  validate,
};
