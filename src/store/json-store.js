// File-based store used when no MySQL connection is configured.
// Keeps everything in data/db.json so the system runs with zero setup.
const fs = require('fs');
const path = require('path');

const TABLES = ['users', 'pets', 'applications', 'care_logs', 'logs'];
const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));

class JsonStore {
  constructor(file) {
    this.file = file;
    this.kind = 'json';
    this.data = null;
  }

  async init() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    if (fs.existsSync(this.file)) {
      this.data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } else {
      this.data = { _seq: {} };
    }
    for (const t of TABLES) {
      if (!Array.isArray(this.data[t])) this.data[t] = [];
      if (!this.data._seq[t]) this.data._seq[t] = this.data[t].reduce((m, r) => Math.max(m, r.id), 0);
    }
    this._save();
  }

  _save() {
    const json = JSON.stringify(this.data, null, 2);
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, json);
    // On Windows, antivirus/indexers can briefly lock the file; retry, then fall back.
    for (let attempt = 0; attempt < 5; attempt++) {
      try { fs.renameSync(tmp, this.file); return; } catch (err) {
        if (!['EPERM', 'EBUSY', 'EACCES'].includes(err.code)) throw err;
        const until = Date.now() + 20 * (attempt + 1);
        while (Date.now() < until) { /* short wait */ }
      }
    }
    fs.writeFileSync(this.file, json);
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
  }

  async list(table, where = {}) {
    return this.data[table]
      .filter((row) => Object.entries(where).every(([k, v]) => row[k] === v))
      .map(clone);
  }

  async get(table, id) {
    return clone(this.data[table].find((r) => r.id === Number(id)) || null);
  }

  async insert(table, obj) {
    const id = ++this.data._seq[table];
    const row = { id, ...clone(obj) };
    this.data[table].push(row);
    this._save();
    return clone(row);
  }

  async update(table, id, patch) {
    const row = this.data[table].find((r) => r.id === Number(id));
    if (!row) return null;
    Object.assign(row, clone(patch));
    this._save();
    return clone(row);
  }

  async remove(table, id) {
    const before = this.data[table].length;
    this.data[table] = this.data[table].filter((r) => r.id !== Number(id));
    // mimic ON DELETE CASCADE
    if (table === 'pets') {
      this.data.applications = this.data.applications.filter((a) => a.petId !== Number(id));
      this.data.care_logs = this.data.care_logs.filter((c) => c.petId !== Number(id));
    }
    if (table === 'users') {
      this.data.applications = this.data.applications.filter((a) => a.userId !== Number(id));
    }
    this._save();
    return this.data[table].length !== before;
  }

  async count(table) {
    return this.data[table].length;
  }

  async reset() {
    this.data = { _seq: {} };
    for (const t of TABLES) { this.data[t] = []; this.data._seq[t] = 0; }
    this._save();
  }
}

module.exports = JsonStore;
