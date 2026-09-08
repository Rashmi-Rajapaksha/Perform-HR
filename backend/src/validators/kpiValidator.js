const { body, param } = require('express-validator');
const { KPI_DIRECTION, KPI_FREQUENCY, KPI_DATA_SOURCE, KPI_LEVEL } = require('../constants/kpi');

const createKpiDefinitionRules = [
  body('code').trim().notEmpty(),
  body('name').trim().notEmpty(),
  body('category_id').isInt({ min: 1 }),
  body('measurement_unit').trim().notEmpty(),
  body('direction').isIn(Object.values(KPI_DIRECTION)),
  body('target_value').isFloat(),
  body('weight').isFloat({ min: 0, max: 100 }),
  body('frequency').isIn(Object.values(KPI_FREQUENCY)),
  body('data_source').isIn(Object.values(KPI_DATA_SOURCE)),
  body('level').isIn(Object.values(KPI_LEVEL)),
];

const assignKpiRules = [
  body('kpi_definition_id').isInt({ min: 1 }),
  body('employee_id').isInt({ min: 1 }),
  body('effective_from').isISO8601(),
];

const recordMeasurementRules = [
  body('kpi_assignment_id').isInt({ min: 1 }),
  body('period_start').isISO8601(),
  body('period_end').isISO8601(),
  body('actual_value').isFloat(),
];

const idParamRule = [param('id').isInt({ min: 1 })];

module.exports = { createKpiDefinitionRules, assignKpiRules, recordMeasurementRules, idParamRule };