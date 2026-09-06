const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  HR_MANAGER: 'HR_MANAGER',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
});

const ROLE_LIST = Object.values(ROLES);

module.exports = { ROLES, ROLE_LIST };