// npm run reset-data  → wipes the database and reloads the sample data.
const { createStore } = require('./store');
const { seed } = require('./seed');

(async () => {
  const store = await createStore();
  await store.reset();
  await seed(store);
  console.log(`Database (${store.kind}) reset with sample data.`);
  if (store.pool) await store.pool.end();
})().catch((err) => { console.error(err); process.exit(1); });
