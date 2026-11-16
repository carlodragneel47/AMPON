const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const rules = require('./rules');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// The stored extension comes from the (whitelisted) MIME type, never from the
// client-supplied file name, so an upload can't be served back as HTML/JS.
const IMAGE_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(10).toString('hex') + IMAGE_EXT[file.mimetype]),
  }),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => (IMAGE_EXT[file.mimetype]
    ? cb(null, true)
    : cb(new HttpError(400, 'Photo must be a JPG, PNG, WebP or GIF image'))),
});
// Only files that were uploaded are ever deleted (never the bundled sample photos).
const removeUpload = (photo) => {
  if (!photo) return;
  const file = String(photo).startsWith('/uploads/') ? path.basename(photo) : String(photo);
  if (!file.includes('/')) fs.unlink(path.join(UPLOAD_DIR, file), () => {});
};

const now = () => new Date().toISOString();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

class HttpError extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; }
}

const ENUMS = {
  species: ['dog', 'cat'],
  sex: ['male', 'female'],
  size: ['small', 'medium', 'large'],
  energy: ['low', 'moderate', 'high'],
  yesNo: ['yes', 'no', 'unknown'],
  aloneTolerance: ['low', 'medium', 'high'],
  training: ['none', 'basic', 'trained'],
  healthStatus: ['healthy', 'recovering', 'under_treatment', 'critical'],
  status: ['rescued', 'rehabilitation', 'available', 'adopted'],
  careType: ['checkup', 'vaccination', 'deworming', 'treatment', 'surgery', 'grooming', 'behavior', 'note'],
  temperament: ['friendly', 'calm', 'playful', 'shy', 'gentle', 'independent', 'protective', 'affectionate', 'curious'],
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const toBool = (v) => v === true || v === 'true' || v === 'on' || v === '1' || v === 1;
const str = (v, max = 255) => (v == null ? '' : String(v).trim().slice(0, max));

function parsePetInput(body, existing = {}) {
  const e = (field, list, dflt) => {
    const v = body[field] ?? existing[field] ?? dflt;
    if (!list.includes(v)) throw new HttpError(400, `Invalid value for ${field}`);
    return v;
  };
  const b = (field) => (body[field] !== undefined ? toBool(body[field]) : !!existing[field]);
  let temperament = body.temperament ?? existing.temperament ?? [];
  if (typeof temperament === 'string') temperament = temperament.split(',');
  temperament = [...new Set(temperament.map((t) => String(t).trim()).filter((t) => ENUMS.temperament.includes(t)))];

  const name = str(body.name ?? existing.name, 80);
  if (!name) throw new HttpError(400, 'Pet name is required');
  const ageMonths = Number(body.ageMonths ?? existing.ageMonths ?? 0);
  if (!Number.isFinite(ageMonths) || ageMonths < 0 || ageMonths > 300) throw new HttpError(400, 'Age (in months) must be between 0 and 300');
  const rehabProgress = Math.round(Number(body.rehabProgress ?? existing.rehabProgress ?? 0));
  if (!Number.isFinite(rehabProgress) || rehabProgress < 0 || rehabProgress > 100) throw new HttpError(400, 'Rehabilitation progress must be between 0 and 100');
  const rescueDate = str(body.rescueDate ?? existing.rescueDate, 10) || null;
  if (rescueDate && !/^\d{4}-\d{2}-\d{2}$/.test(rescueDate)) throw new HttpError(400, 'Invalid rescue date');

  return {
    name,
    species: e('species', ENUMS.species),
    breed: str(body.breed ?? existing.breed, 80) || null,
    sex: e('sex', ENUMS.sex),
    ageMonths: Math.round(ageMonths),
    size: e('size', ENUMS.size),
    color: str(body.color ?? existing.color, 80) || null,
    energy: e('energy', ENUMS.energy, 'moderate'),
    temperament,
    goodWithKids: e('goodWithKids', ENUMS.yesNo, 'unknown'),
    goodWithDogs: e('goodWithDogs', ENUMS.yesNo, 'unknown'),
    goodWithCats: e('goodWithCats', ENUMS.yesNo, 'unknown'),
    needsYard: b('needsYard'),
    aloneTolerance: e('aloneTolerance', ENUMS.aloneTolerance, 'medium'),
    training: e('training', ENUMS.training, 'none'),
    specialNeeds: b('specialNeeds'),
    specialNeedsNotes: str(body.specialNeedsNotes ?? existing.specialNeedsNotes) || null,
    healthStatus: e('healthStatus', ENUMS.healthStatus, 'under_treatment'),
    vaccinated: b('vaccinated'),
    dewormed: b('dewormed'),
    neutered: b('neutered'),
    rehabProgress,
    status: e('status', ENUMS.status, 'rescued'),
    rescueDate,
    rescueLocation: str(body.rescueLocation ?? existing.rescueLocation, 160) || null,
    description: str(body.description ?? existing.description, 3000) || null,
  };
}

function publicUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}

module.exports = function createApi(store) {
  const api = express.Router();

  const log = (req, action, details = '') =>
    store.insert('logs', { userId: req.session?.user?.id ?? null, action, details: String(details).slice(0, 500), createdAt: now() })
      .catch((err) => console.error('log failed', err));

  const requireAuth = (req, res, next) => (req.session.user ? next() : next(new HttpError(401, 'Please log in first')));
  // Admin routes re-check the account on every request, so a removed or
  // demoted administrator loses access immediately (not when the session ends).
  const requireAdmin = wrap(async (req, res, next) => {
    if (req.session.user?.role !== 'admin') throw new HttpError(403, 'Administrator access only');
    const user = await store.get('users', req.session.user.id);
    if (!user || user.role !== 'admin') { req.session.destroy(() => {}); throw new HttpError(403, 'Administrator access only'); }
    next();
  });
  const requireAdopter = (req, res, next) => (req.session.user?.role === 'adopter' ? next() : next(new HttpError(403, 'Only adopter accounts can do this')));

  // ---------------------------------------------------------------- auth
  api.post('/auth/register', wrap(async (req, res) => {
    const name = str(req.body.name, 120);
    const email = str(req.body.email, 160).toLowerCase();
    const password = String(req.body.password || '');
    if (!name || !email || !password) throw new HttpError(400, 'Name, email and password are required');
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address');
    if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
    if ((await store.list('users', { email })).length) throw new HttpError(409, 'An account with this email already exists');
    const user = await store.insert('users', {
      name, email, passwordHash: await bcrypt.hash(password, 10), role: 'adopter',
      phone: str(req.body.phone, 40) || null, address: str(req.body.address) || null, preferences: null, createdAt: now(),
    });
    // New session id on sign-up (prevents session fixation), same as login.
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Session error' });
      req.session.user = { id: user.id, role: user.role, name: user.name };
      log(req, 'register', `New adopter account: ${email}`);
      res.status(201).json({ user: publicUser(user) });
    });
  }));

  api.post('/auth/login', wrap(async (req, res) => {
    const email = str(req.body.email, 160).toLowerCase();
    const [user] = await store.list('users', { email });
    if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.passwordHash))) {
      log(req, 'login_failed', email);
      throw new HttpError(401, 'Incorrect email or password');
    }
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Session error' });
      req.session.user = { id: user.id, role: user.role, name: user.name };
      log(req, 'login', `${user.role} ${email}`);
      res.json({ user: publicUser(user) });
    });
  }));

  api.post('/auth/logout', (req, res) => {
    if (req.session.user) log(req, 'logout', req.session.user.name);
    req.session.destroy(() => { res.clearCookie('connect.sid'); res.json({ ok: true }); });
  });

  api.get('/auth/me', wrap(async (req, res) => {
    if (!req.session.user) return res.json({ user: null });
    const user = await store.get('users', req.session.user.id);
    if (!user) { req.session.destroy(() => {}); return res.json({ user: null }); }
    res.json({ user: publicUser(user) });
  }));

  api.put('/auth/profile', requireAuth, wrap(async (req, res) => {
    const patch = {};
    if (req.body.name !== undefined) { patch.name = str(req.body.name, 120); if (!patch.name) throw new HttpError(400, 'Name is required'); }
    if (req.body.phone !== undefined) patch.phone = str(req.body.phone, 40) || null;
    if (req.body.address !== undefined) patch.address = str(req.body.address) || null;
    const user = await store.update('users', req.session.user.id, patch);
    if (!user) { req.session.destroy(() => {}); throw new HttpError(401, 'Your account no longer exists. Please log in again.'); }
    req.session.user.name = user.name;
    res.json({ user: publicUser(user) });
  }));

  api.put('/auth/password', requireAuth, wrap(async (req, res) => {
    const current = String(req.body.currentPassword || '');
    const next = String(req.body.newPassword || '');
    const user = await store.get('users', req.session.user.id);
    if (!user) throw new HttpError(401, 'Please log in again');
    if (!(await bcrypt.compare(current, user.passwordHash))) throw new HttpError(400, 'Your current password is incorrect');
    if (next.length < 6) throw new HttpError(400, 'New password must be at least 6 characters');
    if (next === current) throw new HttpError(400, 'New password must be different from the current one');
    await store.update('users', user.id, { passwordHash: await bcrypt.hash(next, 10) });
    log(req, 'password_change', user.email);
    res.json({ ok: true });
  }));

  // ---------------------------------------------------------------- public stats & rules
  api.get('/stats', wrap(async (req, res) => {
    const pets = await store.list('pets');
    const c = (s) => pets.filter((p) => s.includes(p.status)).length;
    res.json({ available: c(['available']), adopted: c(['adopted']), inCare: c(['rescued', 'rehabilitation']) });
  }));

  api.get('/rules', (req, res) => res.json(rules.describeRules()));

  // ---------------------------------------------------------------- pets
  api.get('/pets', wrap(async (req, res) => {
    const isAdmin = req.session.user?.role === 'admin';
    const view = String(req.query.status || 'available');
    let pets = await store.list('pets');
    if (view === 'care') pets = pets.filter((p) => p.status === 'rescued' || p.status === 'rehabilitation');
    else if (view === 'all' && isAdmin) { /* everything */ }
    else if (ENUMS.status.includes(view)) pets = pets.filter((p) => p.status === view);
    else pets = pets.filter((p) => p.status === 'available');

    const { q, species, size, age, sex, kids } = req.query;
    if (species && species !== 'any') pets = pets.filter((p) => p.species === species);
    if (size && size !== 'any') pets = pets.filter((p) => p.size === size);
    if (sex && sex !== 'any') pets = pets.filter((p) => p.sex === sex);
    if (age && age !== 'any') pets = pets.filter((p) => rules.ageGroup(p) === age);
    if (kids === 'yes') pets = pets.filter((p) => p.goodWithKids === 'yes');
    if (q) {
      const needle = String(q).toLowerCase();
      pets = pets.filter((p) => [p.name, p.breed, p.color, p.rescueLocation, ...(p.temperament || [])].some((f) => f && String(f).toLowerCase().includes(needle)));
    }
    const filters = Object.entries({ q, species, size, age, sex, kids }).filter(([, v]) => v && v !== 'any');
    if (filters.length && !isAdmin) log(req, 'pet_search', filters.map(([k, v]) => `${k}=${v}`).join(', '));

    if (isAdmin) {
      pets = pets.map((p) => ({ ...p, readiness: rules.checkReadiness(p) }));
      const apps = await store.list('applications', { status: 'pending' });
      pets.forEach((p) => { p.pendingApplications = apps.filter((a) => a.petId === p.id).length; });
    }
    pets.sort((a, b) => b.id - a.id);
    res.json({ pets });
  }));

  api.get('/pets/:id', wrap(async (req, res) => {
    const pet = await store.get('pets', req.params.id);
    if (!pet) throw new HttpError(404, 'Pet not found');
    const user = req.session.user;
    if (user?.role !== 'admin') {
      await store.update('pets', pet.id, { views: (pet.views || 0) + 1 });
      log(req, 'pet_view', `${pet.name} (#${pet.id})`);
    }
    const careLogs = (await store.list('care_logs', { petId: pet.id })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const out = { pet, careLogs, readiness: rules.checkReadiness(pet), ageGroup: rules.ageGroup(pet) };
    if (user?.role === 'adopter') {
      const me = await store.get('users', user.id);
      if (me?.preferences) out.match = rules.evaluatePet(rules.normalizePreferences(me.preferences), { ...pet, status: 'available' });
      const apps = await store.list('applications', { userId: user.id, petId: pet.id });
      out.myApplication = apps.sort((a, b) => b.id - a.id)[0] || null;
    }
    res.json(out);
  }));

  // If validation fails after multer has already written the photo, delete it
  // so rejected submissions don't leave orphan files in public/uploads.
  const cleanupUploadOnError = (err, req, res, next) => { removeUpload(req.file?.filename); next(err); };

  api.post('/pets', requireAdmin, upload.single('photo'), wrap(async (req, res) => {
    const data = parsePetInput(req.body);
    if (data.status === 'available') {
      const r = rules.checkReadiness(data);
      if (!r.ready) throw new HttpError(400, 'This pet does not yet meet the readiness rules for adoption', { readiness: r });
    }
    const pet = await store.insert('pets', { ...data, photo: req.file ? '/uploads/' + req.file.filename : null, views: 0, createdAt: now(), updatedAt: now() });
    log(req, 'pet_create', `${pet.name} (#${pet.id}) registered as ${pet.status}`);
    res.status(201).json({ pet });
  }), cleanupUploadOnError);

  api.put('/pets/:id', requireAdmin, upload.single('photo'), wrap(async (req, res) => {
    const existing = await store.get('pets', req.params.id);
    if (!existing) throw new HttpError(404, 'Pet not found');
    const data = parsePetInput(req.body, existing);
    if (data.status === 'available' && existing.status !== 'available') {
      const r = rules.checkReadiness(data);
      if (!r.ready) throw new HttpError(400, 'This pet does not yet meet the readiness rules for adoption', { readiness: r });
    }
    if (req.file) data.photo = '/uploads/' + req.file.filename;
    else if (toBool(req.body.removePhoto)) data.photo = null;
    const pet = await store.update('pets', existing.id, { ...data, updatedAt: now() });
    // Only delete the old photo once the new record is safely saved.
    if ((req.file || toBool(req.body.removePhoto)) && existing.photo) removeUpload(existing.photo);
    const changes = existing.status !== pet.status ? `status ${existing.status} → ${pet.status}` : 'details updated';
    log(req, 'pet_update', `${pet.name} (#${pet.id}): ${changes}`);
    res.json({ pet });
  }), cleanupUploadOnError);

  api.delete('/pets/:id', requireAdmin, wrap(async (req, res) => {
    const pet = await store.get('pets', req.params.id);
    if (!pet) throw new HttpError(404, 'Pet not found');
    await store.remove('pets', pet.id);
    removeUpload(pet.photo);
    log(req, 'pet_delete', `${pet.name} (#${pet.id})`);
    res.json({ ok: true });
  }));

  // care logs (health, rehabilitation and behaviour monitoring)
  api.post('/pets/:id/care', requireAdmin, wrap(async (req, res) => {
    const pet = await store.get('pets', req.params.id);
    if (!pet) throw new HttpError(404, 'Pet not found');
    const type = req.body.type;
    if (!ENUMS.careType.includes(type)) throw new HttpError(400, 'Invalid care record type');
    const notes = str(req.body.notes, 2000);
    if (!notes) throw new HttpError(400, 'Notes are required');
    const entry = await store.insert('care_logs', { petId: pet.id, type, notes, recordedBy: req.session.user.id, createdAt: now() });

    // A care record can also update the pet's condition in one step.
    const patch = {};
    if (ENUMS.healthStatus.includes(req.body.healthStatus)) patch.healthStatus = req.body.healthStatus;
    if (req.body.rehabProgress !== undefined && req.body.rehabProgress !== '') {
      const n = Math.round(Number(req.body.rehabProgress));
      if (Number.isFinite(n) && n >= 0 && n <= 100) patch.rehabProgress = n;
    }
    if (type === 'vaccination') patch.vaccinated = true;
    if (type === 'deworming') patch.dewormed = true;
    if (toBool(req.body.neutered)) patch.neutered = true;
    let updated = pet;
    if (Object.keys(patch).length) updated = await store.update('pets', pet.id, { ...patch, updatedAt: now() });
    log(req, 'care_log_add', `${pet.name} (#${pet.id}): ${type}`);
    res.status(201).json({ entry, pet: updated, readiness: rules.checkReadiness(updated) });
  }));

  // ---------------------------------------------------------------- rule-based matching
  api.post('/match', wrap(async (req, res) => {
    const prefs = rules.normalizePreferences(req.body || {});
    if (req.session.user?.role === 'adopter') await store.update('users', req.session.user.id, { preferences: prefs });
    const pets = await store.list('pets', { status: 'available' });
    const out = rules.recommend(prefs, pets);
    // ?silent=1 is used by the dashboard preview so it does not inflate usage logs.
    if (!req.query.silent) log(req, 'match_run', `${out.results.length} matches, ${out.excludedCount} excluded, top score ${out.results[0]?.score ?? '-'}`);
    res.json({ preferences: prefs, ...out });
  }));

  // ---------------------------------------------------------------- applications (adopter)
  api.post('/applications', requireAdopter, wrap(async (req, res) => {
    const pet = await store.get('pets', req.body.petId);
    if (!pet) throw new HttpError(404, 'Pet not found');
    if (pet.status !== 'available') throw new HttpError(400, `${pet.name} is not available for adoption right now`);
    const mine = await store.list('applications', { userId: req.session.user.id, petId: pet.id });
    if (mine.some((a) => a.status === 'pending')) throw new HttpError(409, 'You already have a pending application for this pet');
    const phone = str(req.body.phone, 40);
    const address = str(req.body.address);
    const reason = str(req.body.reason, 2000);
    if (!phone || !address || !reason) throw new HttpError(400, 'Phone, address and reason are required');
    if (!toBool(req.body.agree)) throw new HttpError(400, 'Please confirm the responsible-ownership agreement');

    const me = await store.get('users', req.session.user.id);
    let matchScore = null;
    if (me.preferences) {
      const ev = rules.evaluatePet(rules.normalizePreferences(me.preferences), pet);
      matchScore = ev.eligible ? ev.score : 0;
    }
    const appRow = await store.insert('applications', {
      userId: me.id, petId: pet.id, phone, address, reason, homeVisitOk: toBool(req.body.homeVisitOk),
      matchScore, status: 'pending', adminNote: null, createdAt: now(), updatedAt: now(),
    });
    if (!me.phone || !me.address) await store.update('users', me.id, { phone: me.phone || phone, address: me.address || address });
    log(req, 'application_submit', `${me.name} → ${pet.name} (#${pet.id}), score ${matchScore ?? 'n/a'}`);
    res.status(201).json({ application: appRow });
  }));

  api.get('/applications/mine', requireAuth, wrap(async (req, res) => {
    const apps = await store.list('applications', { userId: req.session.user.id });
    const pets = await store.list('pets');
    res.json({ applications: apps.sort((a, b) => b.id - a.id).map((a) => ({ ...a, pet: pets.find((p) => p.id === a.petId) || null })) });
  }));

  api.put('/applications/:id/withdraw', requireAuth, wrap(async (req, res) => {
    const a = await store.get('applications', req.params.id);
    if (!a || a.userId !== req.session.user.id) throw new HttpError(404, 'Application not found');
    if (a.status !== 'pending') throw new HttpError(400, 'Only pending applications can be withdrawn');
    const updated = await store.update('applications', a.id, { status: 'withdrawn', updatedAt: now() });
    log(req, 'application_withdraw', `Application #${a.id}`);
    res.json({ application: updated });
  }));

  // ---------------------------------------------------------------- admin
  api.get('/admin/applications', requireAdmin, wrap(async (req, res) => {
    let apps = await store.list('applications');
    if (req.query.status && req.query.status !== 'all') apps = apps.filter((a) => a.status === req.query.status);
    const [pets, users] = await Promise.all([store.list('pets'), store.list('users')]);
    res.json({
      applications: apps.sort((a, b) => b.id - a.id).map((a) => ({
        ...a,
        pet: pets.find((p) => p.id === a.petId) || null,
        user: publicUser(users.find((u) => u.id === a.userId)),
      })),
    });
  }));

  api.put('/admin/applications/:id', requireAdmin, wrap(async (req, res) => {
    const a = await store.get('applications', req.params.id);
    if (!a) throw new HttpError(404, 'Application not found');
    const status = req.body.status;
    if (!['approved', 'rejected', 'pending'].includes(status)) throw new HttpError(400, 'Invalid status');
    if (a.status === 'withdrawn') throw new HttpError(400, 'This application was withdrawn by the adopter');
    if (a.status === status) throw new HttpError(400, `This application is already ${status}`);
    const pet = await store.get('pets', a.petId);
    if (!pet) throw new HttpError(404, 'The pet for this application no longer exists');
    if (status === 'approved' && pet.status !== 'available') throw new HttpError(400, `${pet.name} is no longer available`);

    const updated = await store.update('applications', a.id, { status, adminNote: str(req.body.adminNote) || null, updatedAt: now() });
    if (status === 'approved') {
      await store.update('pets', pet.id, { status: 'adopted', updatedAt: now() });
      const others = (await store.list('applications', { petId: pet.id, status: 'pending' })).filter((o) => o.id !== a.id);
      for (const o of others) await store.update('applications', o.id, { status: 'rejected', adminNote: `${pet.name} has been adopted by another applicant.`, updatedAt: now() });
    } else if (a.status === 'approved' && pet.status === 'adopted') {
      // Un-approving an adoption puts the pet back on the adoption list;
      // otherwise it would stay "adopted" with no approved adopter.
      await store.update('pets', pet.id, { status: 'available', updatedAt: now() });
    }
    log(req, 'application_' + (status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : 'reopen'), `Application #${a.id} for ${pet.name}`);
    res.json({ application: updated });
  }));

  api.get('/admin/users', requireAdmin, wrap(async (req, res) => {
    const [users, apps, logs] = await Promise.all([store.list('users'), store.list('applications'), store.list('logs', { action: 'login' })]);
    const lastLogin = new Map();
    for (const l of logs) if (l.userId && (!lastLogin.has(l.userId) || l.createdAt > lastLogin.get(l.userId))) lastLogin.set(l.userId, l.createdAt);
    res.json({
      users: users.map((u) => ({
        ...publicUser(u),
        applications: apps.filter((a) => a.userId === u.id).length,
        lastLogin: lastLogin.get(u.id) || null,
        isSelf: u.id === req.session.user.id,
      })).sort((a, b) => b.id - a.id),
    });
  }));

  api.post('/admin/users', requireAdmin, wrap(async (req, res) => {
    const name = str(req.body.name, 120);
    const email = str(req.body.email, 160).toLowerCase();
    const password = String(req.body.password || '');
    const role = req.body.role === 'admin' ? 'admin' : 'adopter';
    if (!name || !email || !password) throw new HttpError(400, 'Name, email and password are required');
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address');
    if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
    if ((await store.list('users', { email })).length) throw new HttpError(409, 'An account with this email already exists');
    const user = await store.insert('users', {
      name, email, passwordHash: await bcrypt.hash(password, 10), role,
      phone: str(req.body.phone, 40) || null, address: null, preferences: null, createdAt: now(),
    });
    log(req, 'user_create', `${role} account ${email}`);
    res.status(201).json({ user: publicUser(user) });
  }));

  api.delete('/admin/users/:id', requireAdmin, wrap(async (req, res) => {
    const user = await store.get('users', req.params.id);
    if (!user) throw new HttpError(404, 'User not found');
    if (user.id === req.session.user.id) throw new HttpError(400, 'You cannot remove your own account');
    if (user.role === 'admin' && (await store.list('users', { role: 'admin' })).length <= 1) throw new HttpError(400, 'At least one administrator account is required');
    await store.remove('users', user.id);
    log(req, 'user_delete', `${user.role} account ${user.email}`);
    res.json({ ok: true });
  }));

  api.get('/admin/logs', requireAdmin, wrap(async (req, res) => {
    const all = await store.list('logs');
    let logs = all;
    if (req.query.action && req.query.action !== 'all') logs = all.filter((l) => l.action === req.query.action);
    const names = new Map((await store.list('users')).map((u) => [u.id, u.name]));
    const limit = Math.min(Number(req.query.limit) || 300, 2000);
    res.json({
      logs: logs.sort((a, b) => b.id - a.id).slice(0, limit).map((l) => ({ ...l, userName: names.get(l.userId) || null })),
      actions: [...new Set(all.map((l) => l.action))].sort(),
    });
  }));

  api.get('/admin/stats', requireAdmin, wrap(async (req, res) => {
    const [pets, apps, users, logs] = await Promise.all([store.list('pets'), store.list('applications'), store.list('users'), store.list('logs')]);
    const by = (rows, key) => rows.reduce((m, r) => ((m[r[key]] = (m[r[key]] || 0) + 1), m), {});
    const scored = apps.filter((a) => a.matchScore != null);
    const inCare = pets.filter((p) => p.status === 'rescued' || p.status === 'rehabilitation');
    // Activity per day for the last 14 days (local date), for the overview chart.
    const day = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
    const days = Array.from({ length: 14 }, (_, i) => day(Date.now() - (13 - i) * 864e5));
    const perDay = Object.fromEntries(days.map((d) => [d, 0]));
    for (const l of logs) { const d = day(l.createdAt); if (d in perDay && l.action !== 'system') perDay[d]++; }
    res.json({
      activityByDay: days.map((d) => ({ date: d, count: perDay[d] })),
      pets: { total: pets.length, byStatus: by(pets, 'status'), bySpecies: by(pets, 'species'), byHealth: by(pets, 'healthStatus') },
      applications: { total: apps.length, byStatus: by(apps, 'status'), avgMatchScore: scored.length ? Math.round(scored.reduce((s, a) => s + a.matchScore, 0) / scored.length) : null },
      users: { adopters: users.filter((u) => u.role === 'adopter').length, admins: users.filter((u) => u.role === 'admin').length },
      activity: by(logs, 'action'),
      readyToPublish: inCare.filter((p) => rules.checkReadiness(p).ready).map((p) => ({ id: p.id, name: p.name })),
      needsAttention: pets.filter((p) => p.healthStatus === 'critical' || p.healthStatus === 'under_treatment').map((p) => ({ id: p.id, name: p.name, healthStatus: p.healthStatus })),
      topViewed: [...pets].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5).map((p) => ({ id: p.id, name: p.name, species: p.species, views: p.views || 0, status: p.status })),
    });
  }));

  // ---------------------------------------------------------------- errors
  api.use((req, res) => res.status(404).json({ error: 'Not found' }));
  // eslint-disable-next-line no-unused-vars
  api.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be 4 MB or smaller' : err.message });
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...(err.extra || {}) });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server' });
  });

  return api;
};
