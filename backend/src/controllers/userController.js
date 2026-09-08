const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const { User, Role, Employee } = require('../models');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const listUsers = asyncHandler(async (req, res) => {
  const { page, pageSize, limit, offset } = getPagination(req.query);
  const { rows, count } = await User.findAndCountAll({
    include: [{ model: Role, as: 'role' }, { model: Employee, as: 'employee', attributes: ['id', 'employee_code', 'first_name', 'last_name'] }],
    limit,
    offset,
    order: [['id', 'ASC']],
  });
  return ApiResponse.success(res, { message: 'Users retrieved', data: rows, meta: buildPaginationMeta({ total: count, page, pageSize }) });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id, { include: [{ model: Role, as: 'role' }, { model: Employee, as: 'employee' }] });
  if (!user) return ApiResponse.error(res, { message: 'User not found', statusCode: 404 });
  return ApiResponse.success(res, { message: 'User retrieved', data: user });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return ApiResponse.error(res, { message: 'User not found', statusCode: 404 });
  const { role_id, employee_id, is_active } = req.body;
  await user.update({ role_id, employee_id, is_active });
  return ApiResponse.success(res, { message: 'User updated', data: user });
});

const deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return ApiResponse.error(res, { message: 'User not found', statusCode: 404 });
  await user.update({ is_active: false });
  return ApiResponse.success(res, { message: 'User deactivated', data: user });
});

const listRoles = asyncHandler(async (req, res) => {
  const { Permission } = require('../models');
  const roles = await Role.findAll({ include: [{ model: Permission, as: 'permissions' }] });
  return ApiResponse.success(res, { message: 'Roles retrieved', data: roles });
});

module.exports = { listUsers, getUser, updateUser, deactivateUser, listRoles };