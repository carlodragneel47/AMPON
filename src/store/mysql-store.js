// MySQL store (MySQL Server / XAMPP). Same interface as JsonStore so the rest of
// the app does not care which one is in use.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Whitelisted columns per table. Only these are ever written, which also keeps
// table/column names out of user control.
const COLUMNS = {
  users: ['name', 'email', 'passwordHash', 'role', 'phone', 'address', 'preferences', 'createdAt'],
  pets: ['name', 'species', 'breed', 'sex', 'ageMonths', 'size', 'color', 'energy', 'temperament',
    'goodWithKids', 'goodWithDogs', 'goodWithCats', 'needsYard', 'aloneTolerance', 'training',
    'specialNeeds', 'specialNeedsNotes', 'healthStatus', 'vaccinated', 'dewormed', 'neutered',
    'rehabProgress', 'status', 'rescueDate', 'rescueLocation', 'description', 'photo', 'views',
    'createdAt', 'updatedAt'],
  applications: ['userId', 'petId', 'phone', 'address', 'reason', 'homeVisitOk', 'matchScore',
    'status', 'adminNote', 'createdAt', 'updatedAt'],
  care_logs: ['petId', 'type', 'notes', 'recordedBy', 'createdAt'],
  logs: ['userId', 'action', 'details', 'createdAt'],
};
const JSON_COLS = new Set(['preferences', 'temperament']);
const BOOL_COLS = new Set(['needsYard', 'specialNeeds', 'vaccinated', 'dewormed', 'neutered', 'homeVisitOk']);
const DATETIME_COLS = new Set(['createdAt', 'updatedAt']);

function toDb(col, v) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (JSON_COLS.has(col)) return JSON.stringify(v);
  if (BOOL_COLS.has(col)) return v ? 1 : 0;
  if (DATETIME_COLS.has(col)) return new Date(v).toISOString().slice(0, 19).replace('T', ' ');
  return v;
}

function fromDb(row) {
  if (!row) return null;
  const out = { ...row };
  for (const [k, v] of Object.entries(out)) {
    if (v == null) continue;
    if (JSON_COLS.has(k) && typeof v === 'string') { try { out[k] = JSON.parse(v); } catch { /* keep raw */ } }
    else if (BOOL_COLS.has(k)) out[k] = Boolean(Number(v));
    else if (DATETIME_COLS.has(k)) out[k] = String(v).replace(' ', 'T') + 'Z';
  }
  return out;
}

function assertTable(table) {
  if (!COLUMNS[table]) throw new Error('Unknown table ' + table);
}

class MysqlStore {
  constructor(cfg) {
    this.cfg = cfg;
    this.kind = 'mysql';
    this.pool = null;
  }

  async init() {
    const { host, port, user, password, database } = this.cfg;
    const boot = await mysql.createConnection({ host, port, user, password, multipleStatements: true });
    await boot.query(`CREATE DATABASE IF NOT EXISTS \`${database.replace(/`/g, '')}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await boot.changeUser({ database });
    await boot.query(fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'schema.sql'), 'utf8'));
    await boot.end();
    this.pool = mysql.createPool({ host, port, user, password, database, dateStrings: true, connectionLimit: 10, charset: 'utf8mb4' });
  }

  async list(table, where = {}) {
    assertTable(table);
    const keys = Object.keys(where).filter((k) => COLUMNS[table].includes(k) || k === 'id');
    const sql = `SELECT * FROM \`${table}\`` + (keys.length ? ' WHERE ' + keys.map((k) => `\`${k}\` = ?`).join(' AND ') : '') + ' ORDER BY id';
    const [rows] = await this.pool.query(sql, keys.map((k) => toDb(k, where[k])));
    return rows.map(fromDb);
  }

  async get(table, id) {
    assertTable(table);
    const [rows] = await this.pool.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [Number(id)]);
    return fromDb(rows[0]);
  }

  async insert(table, obj) {
    assertTable(table);
    const cols = COLUMNS[table].filter((c) => obj[c] !== undefined);
    const [res] = await this.pool.query(
      `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
      cols.map((c) => toDb(c, obj[c])),
    );
    return this.get(table, res.insertId);
  }

  async update(table, id, patch) {
    assertTable(table);
    const cols = COLUMNS[table].filter((c) => patch[c] !== undefined);
    if (cols.length) {
      await this.pool.query(
        `UPDATE \`${table}\` SET ${cols.map((c) => `\`${c}\` = ?`).join(', ')} WHERE id = ?`,
        [...cols.map((c) => toDb(c, patch[c])), Number(id)],
      );
    }
    return this.get(table, id);
  }

  async remove(table, id) {
    assertTable(table);
    const [res] = await this.pool.query(`DELETE FROM \`${table}\` WHERE id = ?`, [Number(id)]);
    return res.affectedRows > 0;
  }

  async count(table) {
    assertTable(table);
    const [rows] = await this.pool.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
    return Number(rows[0].n);
  }

  async reset() {
    await this.pool.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of ['logs', 'care_logs', 'applications', 'pets', 'users']) await this.pool.query(`TRUNCATE TABLE \`${t}\``);
    await this.pool.query('SET FOREIGN_KEY_CHECKS = 1');
  }
}

module.exports = MysqlStore;
