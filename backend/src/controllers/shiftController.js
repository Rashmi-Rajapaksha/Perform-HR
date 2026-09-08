const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const { Shift, EmployeeShiftAssignment, Employee } = require('../models');

const list = asyncHandler(async (req, res) => {
  const shifts = await Shift.findAll({ order: [['start_time', 'ASC']] });
  return ApiResponse.success(res, { message: 'Shifts retrieved', data: shifts });
});

const create = asyncHandler(async (req, res) => {
  const shift = await Shift.create(req.body);
  return ApiResponse.created(res, { message: 'Shift created', data: shift });
});

const update = asyncHandler(async (req, res) => {
  const shift = await Shift.findByPk(req.params.id);
  if (!shift) return ApiResponse.error(res, { message: 'Shift not found', statusCode: 404 });
  await shift.update(req.body);
  return ApiResponse.success(res, { message: 'Shift updated', data: shift });
});

const remove = asyncHandler(async (req, res) => {
  const shift = await Shift.findByPk(req.params.id);
  if (!shift) return ApiResponse.error(res, { message: 'Shift not found', statusCode: 404 });
  await shift.destroy();
  return ApiResponse.success(res, { message: 'Shift deleted' });
});

const assignEmployee = asyncHandler(async (req, res) => {
  const { employee_id, shift_id, effective_date, end_date } = req.body;
  const assignment = await EmployeeShiftAssignment.create({ employee_id, shift_id, effective_date, end_date });
  return ApiResponse.created(res, { message: 'Employee assigned to shift', data: assignment });
});

const listAssignments = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.employee_id) where.employee_id = req.query.employee_id;
  if (req.query.shift_id) where.shift_id = req.query.shift_id;
  const assignments = await EmployeeShiftAssignment.findAll({
    where,
    include: [
      { model: Shift, as: 'shift' },
      { model: Employee, as: 'employee', attributes: ['id', 'employee_code', 'first_name', 'last_name'] },
    ],
    order: [['effective_date', 'DESC']],
  });
  return ApiResponse.success(res, { message: 'Shift assignments retrieved', data: assignments });
});

module.exports = { list, create, update, remove, assignEmployee, listAssignments };