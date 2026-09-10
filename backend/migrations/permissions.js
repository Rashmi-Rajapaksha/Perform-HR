/**
 * Permission tables are created in 002-create-roles.js (kept together
 * with role_permissions since they're always deployed as a unit). This
 * file is intentionally a no-op placeholder to preserve the migration
 * numbering from the project's required migration list; sequelize-cli
 * still tracks it in SequelizeMeta so `db:migrate` has one entry per
 * listed file.
 */
module.exports = {
  up: async () => {},
  down: async () => {},
};