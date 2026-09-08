const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const { Designation } = require('../models');

const list = asyncHandler(async (req, res) => {
  const designations = await Designation.findAll({ order: [['level', 'ASC']] });
  return ApiResponse.success(res, { message: 'Designations retrieved', data: designations });
});

const create = asyncHandler(async (req, res) => {
  const designation = await Designation.create(req.body);
  return ApiResponse.created(res, { message: 'Designation created', data: designation });
});

const update = asyncHandler(async (req, res) => {
  const designation = await Designation.findByPk(req.params.id);
  if (!designation) return ApiResponse.error(res, { message: 'Designation not found', statusCode: 404 });
  await designation.update(req.body);
  return ApiResponse.success(res, { message: 'Designation updated', data: designation });
});

const remove = asyncHandler(async (req, res) => {
  const designation = await Designation.findByPk(req.params.id);
  if (!designation) return ApiResponse.error(res, { message: 'Designation not found', statusCode: 404 });
  await designation.destroy();
  return ApiResponse.success(res, { message: 'Designation deleted' });
});

module.exports = { list, create, update, remove };