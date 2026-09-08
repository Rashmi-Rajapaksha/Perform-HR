const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const { Department, Section, Employee } = require('../models');

const list = asyncHandler(async (req, res) => {
  const departments = await Department.findAll({ include: [{ model: Section, as: 'sections' }], order: [['name', 'ASC']] });
  return ApiResponse.success(res, { message: 'Departments retrieved', data: departments });
});

const getById = asyncHandler(async (req, res) => {
  const department = await Department.findByPk(req.params.id, { include: [{ model: Section, as: 'sections' }] });
  if (!department) return ApiResponse.error(res, { message: 'Department not found', statusCode: 404 });
  return ApiResponse.success(res, { message: 'Department retrieved', data: department });
});

const create = asyncHandler(async (req, res) => {
  const department = await Department.create(req.body);
  return ApiResponse.created(res, { message: 'Department created', data: department });
});

const update = asyncHandler(async (req, res) => {
  const department = await Department.findByPk(req.params.id);
  if (!department) return ApiResponse.error(res, { message: 'Department not found', statusCode: 404 });
  await department.update(req.body);
  return ApiResponse.success(res, { message: 'Department updated', data: department });
});

const remove = asyncHandler(async (req, res) => {
  const department = await Department.findByPk(req.params.id);
  if (!department) return ApiResponse.error(res, { message: 'Department not found', statusCode: 404 });
  const employeeCount = await Employee.count({ where: { department_id: department.id } });
  if (employeeCount > 0) {
    return ApiResponse.error(res, { message: 'Cannot delete a department with assigned employees', statusCode: 400 });
  }
  await department.destroy();
  return ApiResponse.success(res, { message: 'Department deleted' });
});

module.exports = { list, getById, create, update, remove };