const { Op } = require('sequelize');

let LEAVE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled'
};

try {
  const statusModule = require('../constrants/statuses');
  LEAVE_STATUS = statusModule.LEAVE_STATUS || LEAVE_STATUS;
} catch (e) {
  try {
    const statusModule = require('../constrants/statuses');
    LEAVE_STATUS = statusModule.LEAVE_STATUS || LEAVE_STATUS;
  } catch (e2) {
    LEAVE_STATUS = LEAVE_STATUS;
  }
}

const db = require('../models');
const EmployeeLeave = db.EmployeeLeave;

const validStatuses = Object.values(LEAVE_STATUS);

const calculateLeaveDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 1;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;

  const diff = Math.round((end - start) / 86400000) + 1;
  return diff > 0 ? diff : 1;
};

const normalizeStatus = (status) => {
  if (!status) return LEAVE_STATUS.PENDING;
  return validStatuses.includes(status) ? status : LEAVE_STATUS.PENDING;
};

const buildLeaveIncludes = () => [
  { model: db.Employee, as: 'employee', attributes: ['id', 'first_name', 'last_name', 'email'] },
  { model: db.LeaveType, as: 'leaveType', attributes: ['id', 'name', 'code'] },
  { model: db.User, as: 'approver', attributes: ['id', 'name', 'email'] }
];

const getListQuery = (req) => {
  const where = {};
  const { employee_id, leave_type_id, status, start_date, end_date, approved_by } = req.query;

  if (employee_id) where.employee_id = employee_id;
  if (leave_type_id) where.leave_type_id = leave_type_id;
  if (approved_by) where.approved_by = approved_by;
  if (status) where.status = status;

  if (start_date || end_date) {
    where.start_date = {};
    if (start_date) where.start_date[Op.gte] = start_date;
    if (end_date) where.end_date[Op.lte] = end_date;
  }

  return where;
};

exports.getAllLeaves = async (req, res) => {
  try {
    const where = getListQuery(req);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await EmployeeLeave.findAndCountAll({
      where,
      include: buildLeaveIncludes(),
      order: [['start_date', 'DESC']],
      limit,
      offset
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch leaves.' });
  }
};

exports.getLeave = async (req, res) => {
  try {
    const leave = await EmployeeLeave.findByPk(req.params.id, {
      include: buildLeaveIncludes()
    });

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found.' });
    }

    return res.status(200).json({ success: true, data: leave });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch leave.' });
  }
};

exports.getEmployeeLeaves = async (req, res) => {
  try {
    const employee_id = req.params.employee_id || req.user?.employee_id || req.query.employee_id;
    if (!employee_id) {
      return res.status(400).json({ success: false, message: 'Employee id is required.' });
    }

    const leaves = await EmployeeLeave.findAll({
      where: { employee_id },
      include: buildLeaveIncludes(),
      order: [['start_date', 'DESC']]
    });

    return res.status(200).json({ success: true, data: leaves });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch employee leaves.' });
  }
};

exports.createLeave = async (req, res) => {
  try {
    const payload = req.body;

    const required = ['employee_id', 'leave_type_id', 'start_date', 'end_date'];
    for (const field of required) {
      if (!payload[field]) {
        return res.status(400).json({ success: false, message: `${field} is required.` });
      }
    }

    if (new Date(payload.start_date) > new Date(payload.end_date)) {
      return res.status(400).json({ success: false, message: 'start_date cannot be greater than end_date.' });
    }

    const leaveDays = calculateLeaveDays(payload.start_date, payload.end_date);

    const leave = await EmployeeLeave.create({
      employee_id: payload.employee_id,
      leave_type_id: payload.leave_type_id,
      start_date: payload.start_date,
      end_date: payload.end_date,
      days: payload.days || leaveDays,
      status: normalizeStatus(payload.status),
      reason: payload.reason,
      approved_by: payload.approved_by || null
    });

    const createdLeave = await EmployeeLeave.findByPk(leave.id, { include: buildLeaveIncludes() });

    return res.status(201).json({ success: true, message: 'Leave created successfully.', data: createdLeave });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to create leave.' });
  }
};

exports.updateLeave = async (req, res) => {
  try {
    const leave = await EmployeeLeave.findByPk(req.params.id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found.' });
    }

    const payload = req.body;

    if (payload.start_date && payload.end_date && new Date(payload.start_date) > new Date(payload.end_date)) {
      return res.status(400).json({ success: false, message: 'start_date cannot be greater than end_date.' });
    }

    const start_date = payload.start_date || leave.start_date;
    const end_date = payload.end_date || leave.end_date;

    const updatePayload = {
      employee_id: payload.employee_id || leave.employee_id,
      leave_type_id: payload.leave_type_id || leave.leave_type_id,
      start_date,
      end_date,
      days: payload.days || calculateLeaveDays(start_date, end_date),
      reason: payload.reason ?? leave.reason,
      approved_by: payload.approved_by ?? leave.approved_by
    };

    if (payload.status) {
      updatePayload.status = normalizeStatus(payload.status);
    }

    await leave.update(updatePayload);

    const updatedLeave = await EmployeeLeave.findByPk(leave.id, { include: buildLeaveIncludes() });

    return res.status(200).json({ success: true, message: 'Leave updated successfully.', data: updatedLeave });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to update leave.' });
  }
};

exports.deleteLeave = async (req, res) => {
  try {
    const leave = await EmployeeLeave.findByPk(req.params.id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found.' });
    }

    await leave.destroy();

    return res.status(200).json({ success: true, message: 'Leave deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to delete leave.' });
  }
};

exports.approveLeave = async (req, res) => {
  try {
    const leave = await EmployeeLeave.findByPk(req.params.id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found.' });
    }

    leave.status = LEAVE_STATUS.APPROVED;
    leave.approved_by = req.user?.id || req.body.approved_by || leave.approved_by;
    await leave.save();

    return res.status(200).json({ success: true, message: 'Leave approved successfully.', data: leave });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to approve leave.' });
  }
};

exports.rejectLeave = async (req, res) => {
  try {
    const leave = await EmployeeLeave.findByPk(req.params.id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found.' });
    }

    leave.status = LEAVE_STATUS.REJECTED;
    leave.approved_by = req.user?.id || req.body.approved_by || leave.approved_by;
    leave.reason = req.body.reason || leave.reason;
    await leave.save();

    return res.status(200).json({ success: true, message: 'Leave rejected successfully.', data: leave });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to reject leave.' });
  }
};

exports.cancelLeave = async (req, res) => {
  try {
    const leave = await EmployeeLeave.findByPk(req.params.id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found.' });
    }

    if ([LEAVE_STATUS.APPROVED, LEAVE_STATUS.REJECTED].includes(leave.status)) {
      return res.status(400).json({ success: false, message: 'Only pending or approved leaves can be cancelled.' });
    }

    leave.status = LEAVE_STATUS.CANCELLED;
    await leave.save();

    return res.status(200).json({ success: true, message: 'Leave cancelled successfully.', data: leave });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to cancel leave.' });
  }
};

exports.getLeaveSummary = async (req, res) => {
  try {
    const employee_id = req.params.employee_id || req.query.employee_id;
    if (!employee_id) {
      return res.status(400).json({ success: false, message: 'employee_id is required.' });
    }

    const leaves = await EmployeeLeave.findAll({
      where: { employee_id },
      attributes: ['status', 'days'],
      raw: true
    });

    
    const summary = {
      total_days: leaves.reduce((sum, item) => sum + Number(item.days || 0), 0),
      pending: leaves.filter(item => item.status === LEAVE_STATUS.PENDING).length,
      approved: leaves.filter(item => item.status === LEAVE_STATUS.APPROVED).length,
      rejected: leaves.filter(item => item.status === LEAVE_STATUS.REJECTED).length,
      cancelled: leaves.filter(item => item.status === LEAVE_STATUS.CANCELLED).length
    };

    return res.status(200).json({ success: true, data: summary });
  } catch (error) { 
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch leave summary.' });
  }
};

module.exports = exports;
