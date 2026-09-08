const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const { ProductionRecord, Employee } = require('../models');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { Op } = require('sequelize');

const list = asyncHandler(async (req, res) => {
  const { page, pageSize, limit, offset } = getPagination(req.query);
  const where = {};
  if (req.query.employee_id) where.employee_id = req.query.employee_id;
  if (req.query.from && req.query.to) where.date = { [Op.between]: [req.query.from, req.query.to] };

  const { rows, count } = await ProductionRecord.findAndCountAll({
    where,
    include: [{ model: Employee, as: 'employee', attributes: ['id', 'employee_code', 'first_name', 'last_name'] }],
    limit,
    offset,
    order: [['date', 'DESC']],
  });
  return ApiResponse.success(res, { message: 'Production records retrieved', data: rows, meta: buildPaginationMeta({ total: count, page, pageSize }) });
});

const create = asyncHandler(async (req, res) => {
  const record = await ProductionRecord.create(req.body);
  return ApiResponse.created(res, { message: 'Production record created', data: record });
});

const bulkCreate = asyncHandler(async (req, res) => {
  const records = await ProductionRecord.bulkCreate(req.body.records || []);
  return ApiResponse.created(res, { message: `${records.length} production record(s) created`, data: records });
});

const update = asyncHandler(async (req, res) => {
  const record = await ProductionRecord.findByPk(req.params.id);
  if (!record) return ApiResponse.error(res, { message: 'Production record not found', statusCode: 404 });
  await record.update(req.body);
  return ApiResponse.success(res, { message: 'Production record updated', data: record });
});

module.exports = { list, create, bulkCreate, update };