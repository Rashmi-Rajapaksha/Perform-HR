const { Op } = require('sequelize');
const {
  Employee, Department, Section, Designation, EmploymentType, EmploymentHistory,
} = require('../models');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const includeGraph = [
  { model: Department, as: 'department' },
  { model: Section, as: 'section' },
  { model: Designation, as: 'designation' },
  { model: EmploymentType, as: 'employmentType' },
  { model: Employee, as: 'manager', attributes: ['id', 'employee_code', 'first_name', 'last_name'] },
];

async function listEmployees(query) {
  const { page, pageSize, limit, offset } = getPagination(query);
  const where = {};

  if (query.department_id) where.department_id = query.department_id;
  if (query.section_id) where.section_id = query.section_id;
  if (query.designation_id) where.designation_id = query.designation_id;
  if (query.employment_status) where.employment_status = query.employment_status;
  if (query.search) {
    where[Op.or] = [
      { first_name: { [Op.like]: `%${query.search}%` } },
      { last_name: { [Op.like]: `%${query.search}%` } },
      { employee_code: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await Employee.findAndCountAll({
    where,
    include: includeGraph,
    limit,
    offset,
    order: [['id', 'ASC']],
    distinct: true,
  });

  return { rows, meta: buildPaginationMeta({ total: count, page, pageSize }) };
}

async function getEmployeeById(id) {
  const employee = await Employee.findByPk(id, { include: includeGraph });
  if (!employee) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }
  return employee;
}

async function createEmployee(payload) {
  const employee = await Employee.create(payload);
  await EmploymentHistory.create({
    employee_id: employee.id,
    department_id: employee.department_id,
    designation_id: employee.designation_id,
    effective_date: employee.join_date,
    change_type: 'HIRE',
    remarks: 'Initial hire record',
  });
  return getEmployeeById(employee.id);
}

async function updateEmployee(id, payload) {
  const employee = await getEmployeeById(id);

  const departmentChanged = payload.department_id && payload.department_id !== employee.department_id;
  const designationChanged = payload.designation_id && payload.designation_id !== employee.designation_id;

  await employee.update(payload);

  if (departmentChanged || designationChanged) {
    await EmploymentHistory.create({
      employee_id: employee.id,
      department_id: employee.department_id,
      designation_id: employee.designation_id,
      effective_date: new Date().toISOString().slice(0, 10),
      change_type: departmentChanged ? 'TRANSFER' : 'PROMOTION',
      remarks: 'Updated via employee profile edit',
    });
  }

  return getEmployeeById(id);
}

async function deactivateEmployee(id, { reason } = {}) {
  const employee = await getEmployeeById(id);
  await employee.update({ employment_status: 'TERMINATED', end_date: new Date().toISOString().slice(0, 10) });
  await EmploymentHistory.create({
    employee_id: employee.id,
    department_id: employee.department_id,
    designation_id: employee.designation_id,
    effective_date: new Date().toISOString().slice(0, 10),
    change_type: 'TERMINATION',
    remarks: reason || 'Employee deactivated',
  });
  return employee;
}

async function getDirectReports(managerId) {
  return Employee.findAll({
    where: { reporting_manager_id: managerId },
    include: includeGraph,
  });
}

module.exports = {
  listEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
  getDirectReports,
  includeGraph,
};