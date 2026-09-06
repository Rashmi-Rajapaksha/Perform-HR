const env = require('../config/environment');

/**
 * Parses page/limit query params into Sequelize-ready { limit, offset }
 * plus a page/pageSize pair for building the response meta block.
 */
function getPagination(query = {}) {
  let page = parseInt(query.page, 10);
  let pageSize = parseInt(query.pageSize || query.limit, 10);

  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = env.pagination.defaultPageSize;
  if (pageSize > env.pagination.maxPageSize) pageSize = env.pagination.maxPageSize;

  const offset = (page - 1) * pageSize;

  return { page, pageSize, limit: pageSize, offset };
}

/**
 * Builds a `meta` object for a paginated list response given the total
 * row count returned by Sequelize's findAndCountAll.
 */
function buildPaginationMeta({ total, page, pageSize }) {
  return {
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

module.exports = { getPagination, buildPaginationMeta };