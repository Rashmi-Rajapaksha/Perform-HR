/**
 * Central model registry.
 *
 * Every file in this directory (except this one) must export a function
 * `(sequelize, DataTypes) => Model` and, if it has relationships, attach a
 * static `associate(models)` method to the returned model. This file loads
 * every model, then invokes `associate()` for each one so that ALL
 * relationships in the system are wired up from a single place instead of
 * being scattered/duplicated across model files.
 */
const fs = require('fs');
const path = require('path');
const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const basename = path.basename(__filename);
const db = {};

fs.readdirSync(__dirname)
  .filter((file) => file !== basename && file.endsWith('.js'))
  .forEach((file) => {
    const modelDefiner = require(path.join(__dirname, file));
    const model = modelDefiner(sequelize, DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if (typeof db[modelName].associate === 'function') {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = require('sequelize');

module.exports = db;