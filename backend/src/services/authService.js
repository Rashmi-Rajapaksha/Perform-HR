const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/environment');
const { User, Role, Employee } = require('../models');

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role?.name }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, type: 'refresh' }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });
}

/**
 * Authenticates by username OR email + password. Uses the `withPassword`
 * scope since the default User scope excludes password_hash.
 */
async function login({ username, password }) {
  const user = await User.scope('withPassword').findOne({
    where: {
      [User.sequelize.Sequelize.Op.or]: [{ username }, { email: username }],
    },
    include: [
      { model: Role, as: 'role' },
      { model: Employee, as: 'employee' },
    ],
  });

  if (!user || !user.is_active) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  user.last_login = new Date();
  await user.save();

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  const safeUser = user.toJSON();
  delete safeUser.password_hash;

  return { user: safeUser, accessToken, refreshToken };
}

async function register({ username, email, password, role_id, employee_id }) {
  const existing = await User.findOne({
    where: { [User.sequelize.Sequelize.Op.or]: [{ username }, { email }] },
  });
  if (existing) {
    const err = new Error('Username or email already in use');
    err.statusCode = 409;
    throw err;
  }

  const password_hash = await bcrypt.hash(password, env.bcrypt.saltRounds);
  const user = await User.create({ username, email, password_hash, role_id, employee_id });
  return user;
}

async function refreshAccessToken(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch (err) {
    const e = new Error('Invalid or expired refresh token');
    e.statusCode = 401;
    throw e;
  }

  const user = await User.findByPk(payload.sub, { include: [{ model: Role, as: 'role' }] });
  if (!user || !user.is_active) {
    const e = new Error('Account not found or deactivated');
    e.statusCode = 401;
    throw e;
  }

  return signAccessToken(user);
}

async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await User.scope('withPassword').findByPk(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const matches = await bcrypt.compare(currentPassword, user.password_hash);
  if (!matches) {
    const err = new Error('Current password is incorrect');
    err.statusCode = 400;
    throw err;
  }

  user.password_hash = await bcrypt.hash(newPassword, env.bcrypt.saltRounds);
  await user.save();
  return true;
}

module.exports = { login, register, refreshAccessToken, changePassword };