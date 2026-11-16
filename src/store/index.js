// Picks the storage backend: MySQL when DB_HOST is set, otherwise data/db.json.
const path = require('path');
const JsonStore = require('./json-store');
const MysqlStore = require('./mysql-store');

async function createStore() {
  if (process.env.DB_HOST) {
    const store = new MysqlStore({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ampon_pet_adoption',
    });
    await store.init();
    return store;
  }
  // DATA_FILE lets you point at another JSON file (for example a test copy).
  const store = new JsonStore(process.env.DATA_FILE ? path.resolve(process.env.DATA_FILE) : path.join(__dirname, '..', '..', 'data', 'db.json'));
  await store.init();
  return store;
}

module.exports = { createStore };
