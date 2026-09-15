const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { loginRules, registerRules, changePasswordRules } = require('../validators/authValidator');
const env = require('../config/environment');

const loginLimiter = rateLimit({
  windowMs: env.rateLimit.loginWindowMs,
  max: env.rateLimit.loginMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.', data: {} },
});

router.post('/login', loginLimiter, loginRules, validate, authController.login);
router.post('/register', authenticate, registerRules, validate, authController.register);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.post('/change-password', authenticate, changePasswordRules, validate, authController.changePassword);

module.exports = router;
