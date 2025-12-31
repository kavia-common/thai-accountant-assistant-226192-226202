const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Thai Accountant Assistant API',
      version: '1.0.0',
      description:
        'Express REST API for uploads, extraction, classification, reports, and reconciliation.',
    },
  },
  apis: ['./src/routes/*.js', './src/routes/**/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
