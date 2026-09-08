const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const authService = require('../services/authService');

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return ApiResponse.success(res, { message: 'Login successful', data: result });
});

const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  return ApiResponse.created(res, { message: 'User registered successfully', data: { id: user.id, username: user.username } });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const accessToken = await authService.refreshAccessToken(refreshToken);
  return ApiResponse.success(res, { message: 'Token refreshed', data: { accessToken } });
});

const me = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, { message: 'Current user', data: req.user });
});

const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword({
    userId: req.userId,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
  });
  return ApiResponse.success(res, { message: 'Password changed successfully' });
});

const logout = asyncHandler(async (req, res) => {
  // Stateless JWT: logout is handled client-side by discarding the token.
  return ApiResponse.success(res, { message: 'Logged out successfully' });
});

module.exports = { login, register, refresh, me, changePassword, logout };