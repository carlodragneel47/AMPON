// Web-Based Pet Adoption System with Rule-Based Matching — server entry point.
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const { createStore } = require('./src/store');
const { seed } = require('./src/seed');
const createApi = require('./src/api');

const PORT = Number(process.env.PORT || 3000);

(async () => {
  const store = await createStore();
  if (await seed(store)) console.log('Sample data loaded (admin@ampon.local / admin123, adopter@ampon.local / adopter123).');

  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'SAMEORIGIN' });
    next();
  });
  app.use(express.json({ limit: '200kb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 },
  }));

  app.use('/api', createApi(store));

  // Each user type has its own portal. Pages are protected on the server, so a
  // guest or the wrong role is redirected before any page is sent.
  const home = (role) => (role === 'admin' ? '/admin/' : '/account/');
  const portal = (role) => (req, res, next) => {
    const user = req.session.user;
    if (!user) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
    if (user.role !== role) return res.redirect(home(user.role));
    next();
  };
  app.use('/admin', portal('admin'));
  app.use('/account', portal('adopter'));
  // Old addresses from earlier versions.
  app.get(['/dashboard', '/dashboard.html'], (req, res) => res.redirect(301, '/account/'));
  app.get('/admin.html', (req, res) => res.redirect(301, '/admin/'));

  app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
  app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

  app.listen(PORT, () => {
    console.log(`Database: ${store.kind === 'mysql' ? `MySQL (${process.env.DB_NAME || 'ampon_pet_adoption'})` : `JSON file (${process.env.DATA_FILE || 'data/db.json'})`}`);
    console.log(`Ampon is running at http://localhost:${PORT}`);
  });
})().catch((err) => {
  console.error('Failed to start:', err.message);
  if (process.env.DB_HOST) console.error('Check that MySQL is running and the DB_* settings in .env are correct.');
  process.exit(1);
});
