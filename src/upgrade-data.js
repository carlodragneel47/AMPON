// npm run upgrade-data
// Brings an existing database up to date with the current sample data WITHOUT
// deleting anything: adds photos to the sample pets that have none, refreshes
// their sample descriptions, and adds the sample adopter accounts (with their
// applications) if they do not exist yet. Safe to run more than once.
// Stop the server before running it.
const bcrypt = require('bcryptjs');
const { createStore } = require('./store');
const rules = require('./rules');
const { PETS, ADOPTERS, APPLICATIONS, photo } = require('./seed');

const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();
const OLD_COLORS = { Muning: 'Calico', Ash: 'Grey brindle', Lucky: 'Black', Mochi: 'Grey' };

(async () => {
  const store = await createStore();
  const report = { photos: 0, details: 0, users: 0, applications: 0 };

  const pets = await store.list('pets');
  for (const sample of PETS) {
    const pet = pets.find((p) => p.name === sample.name);
    if (!pet) continue;
    const patch = {};
    if (!pet.photo) { patch.photo = photo(sample.name); report.photos++; }
    if (OLD_COLORS[sample.name] && pet.color === OLD_COLORS[sample.name]) patch.color = sample.color;
    if (/[—–]/.test(pet.description || '') || /[—–]/.test(pet.specialNeedsNotes || '')) { patch.description = sample.description; patch.specialNeedsNotes = sample.specialNeedsNotes || null; }
    if (Object.keys(patch).length) {
      if (patch.color || patch.description) report.details++;
      await store.update('pets', pet.id, { ...patch, updatedAt: new Date().toISOString() });
    }
  }

  const hash = bcrypt.hashSync('adopter123', 10);
  const petsByName = Object.fromEntries((await store.list('pets')).map((p) => [p.name, p]));
  for (const a of ADOPTERS) {
    let [user] = await store.list('users', { email: a.email });
    if (!user) {
      user = await store.insert('users', { name: a.name, email: a.email, passwordHash: hash, role: 'adopter', phone: a.phone, address: a.address, preferences: a.preferences, createdAt: daysAgo(a.days) });
      report.users++;
    }
    for (const app of APPLICATIONS.filter((x) => x.email === a.email)) {
      const pet = petsByName[app.pet];
      if (!pet || (await store.list('applications', { userId: user.id, petId: pet.id })).length) continue;
      if (app.status === 'approved' && pet.status !== 'adopted') continue; // keep data consistent
      let matchScore = null;
      if (user.preferences) {
        const ev = rules.evaluatePet(rules.normalizePreferences(user.preferences), { ...pet, status: 'available' });
        matchScore = ev.eligible ? ev.score : 0;
      }
      await store.insert('applications', {
        userId: user.id, petId: pet.id, phone: user.phone || a.phone, address: user.address || a.address, reason: app.reason, homeVisitOk: true,
        matchScore, status: app.status, adminNote: app.note || null, createdAt: daysAgo(app.days), updatedAt: daysAgo(Math.max(0, app.days - 1)),
      });
      report.applications++;
    }
  }

  await store.insert('logs', { userId: null, action: 'system', details: `Sample data upgraded: ${report.photos} photos, ${report.users} accounts, ${report.applications} applications`, createdAt: new Date().toISOString() });
  console.log(`Done (${store.kind}). Photos added: ${report.photos}, pet details refreshed: ${report.details}, accounts added: ${report.users}, applications added: ${report.applications}.`);
  if (store.pool) await store.pool.end();
})().catch((err) => { console.error(err); process.exit(1); });
