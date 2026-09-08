const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const { Section, Department } = require('../models');

const list = asyncHandler(async (req, res) => {
  const where = req.query.department_id ? { department_id: req.query.department_id } : {};
  const sections = await Section.findAll({ where, include: [{ model: Department, as: 'department' }], order: [['name', 'ASC']] });
  return ApiResponse.success(res, { message: 'Sections retrieved', data: sections });
});

const create = asyncHandler(async (req, res) => {
  const section = await Section.create(req.body);
  return ApiResponse.created(res, { message: 'Section created', data: section });
});

const update = asyncHandler(async (req, res) => {
  const section = await Section.findByPk(req.params.id);
  if (!section) return ApiResponse.error(res, { message: 'Section not found', statusCode: 404 });
  await section.update(req.body);
  return ApiResponse.success(res, { message: 'Section updated', data: section });
});

const remove = asyncHandler(async (req, res) => {
  const section = await Section.findByPk(req.params.id);
  if (!section) return ApiResponse.error(res, { message: 'Section not found', statusCode: 404 });
  await section.destroy();
  return ApiResponse.success(res, { message: 'Section deleted' });
});

module.exports = { list, create, update, remove };