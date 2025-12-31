const cors = require('cors');
const express = require('express');
const routes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../swagger');
const { config } = require('./config/env');
const { ApiError } = require('./errors/apiError');

// Initialize express app
const app = express();

const corsOptions = {
  origin: (origin, cb) => {
    // Allow non-browser clients (no Origin header) and configured origins.
    if (!origin) return cb(null, true);

    const allowed = config.cors.allowedOrigins;
    if (allowed.includes(origin)) return cb(null, true);

    return cb(new ApiError(403, 'CORS_BLOCKED', `Origin not allowed: ${origin}`));
  },
  methods: config.cors.allowedMethods,
  allowedHeaders: config.cors.allowedHeaders,
  maxAge: config.cors.maxAge,
};

app.use(cors(corsOptions));
app.set('trust proxy', true);

app.use('/docs', swaggerUi.serve, (req, res, next) => {
  const host = req.get('host'); // may or may not include port
  let protocol = req.protocol; // http or https

  const actualPort = req.socket.localPort;
  const hasPort = host.includes(':');

  const needsPort =
    !hasPort &&
    ((protocol === 'http' && actualPort !== 80) ||
      (protocol === 'https' && actualPort !== 443));
  const fullHost = needsPort ? `${host}:${actualPort}` : host;
  protocol = req.secure ? 'https' : protocol;

  const dynamicSpec = {
    ...swaggerSpec,
    servers: [
      {
        url: `${protocol}://${fullHost}`,
      },
    ],
  };
  swaggerUi.setup(dynamicSpec)(req, res, next);
});

// Parse JSON request body
app.use(express.json());

// Mount routes
app.use('/', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    code: 'NOT_FOUND',
    message: 'Route not found',
  });
});

// Error handling middleware
app.use((err, _req, res, _next) => {
  const status = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  // Avoid leaking internal errors; include details only when present.
  const payload = {
    status: 'error',
    code,
    message: err.message || 'Internal Server Error',
  };

  if (err.details) payload.details = err.details;

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json(payload);
});

module.exports = app;
