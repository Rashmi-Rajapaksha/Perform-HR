const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./config/environment');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// ----- Security & core middleware -----
app.use(helmet());
app.use(
  cors({
    origin: env.cors.origin,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

if (env.env !== 'test') {
  app.use(morgan(env.env === 'development' ? 'dev' : 'combined'));
}

// ----- Global rate limiting (login has its own stricter limiter in authRoutes) -----
app.use(
  env.apiPrefix,
  rateLimit({
    windowMs: env.rateLimit.globalWindowMs,
    max: env.rateLimit.globalMax,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ----- Routes -----
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'HR Plus - Integrated Human Resource Information System API',
    data: { apiPrefix: env.apiPrefix, environment: env.env },
  });
});

app.use(env.apiPrefix, routes);

// ----- 404 + centralized error handling -----
app.use(notFound);
app.use(errorHandler);

module.exports = app;
