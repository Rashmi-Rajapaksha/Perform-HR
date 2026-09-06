/**
 * Centralized environment configuration.
 * All process.env access in the app should go through this module so that
 * defaults, types, and required-value checks live in exactly one place.
 */
require('dotenv').config();

const required = ['JWT_SECRET', 'DB_NAME', 'DB_USER'];

if (process.env.NODE_ENV !== 'test') {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[environment] Warning: missing recommended env vars: ${missing.join(', ')}. ` +
        'Copy .env.example to .env and fill in real values.'
    );
  }
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    name: process.env.DB_NAME || 'hr_plus',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: process.env.DB_LOGGING === 'true',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_only_insecure_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_only_insecure_refresh_secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  rateLimit: {
    loginWindowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    loginMax: parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 10,
    globalWindowMs: parseInt(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    globalMax: parseInt(process.env.GLOBAL_RATE_LIMIT_MAX, 10) || 1000,
  },

  dashboard: {
    pollIntervalSeconds: parseInt(process.env.DASHBOARD_POLL_INTERVAL_SECONDS, 10) || 60,
  },

  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE, 10) || 20,
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE, 10) || 100,
  },
};