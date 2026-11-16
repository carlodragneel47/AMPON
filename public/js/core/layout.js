// Page frames. initPublic() renders the website header/footer; initPortal()
// renders the sidebar shell used by the adopter account and the admin console.
import { $, $$, esc } from './dom.js';
import { api } from './api.js';
import { icon } from './icons.js';
import { avatar } from './components.js';
import { firstName, LABELS } from './format.js';
import { toast } from './ui.js';

const SITE = 'Ampon';
let me;

export async function getMe() {
  if (me !== undefined) return me;
  try { me = (await api('/auth/me')).user; } catch { me = null; }
  return me;
}

export async function logout() {
  try { await api('/auth/logout', { method: 'POST' }); location.href = '/'; }
  catch (err) { toast(err.message || 'Could not log out. Please try again.', 'error'); }
}

const brand = (href = '/') => `<a class="brand" href="${href}"><span class="brand-mark">${icon('paw-print')}</span><span><span class="brand-name">${SITE}</span><span class="brand-sub">Pet Adoption Center</span></span></a>`;
const portalHome = (user) => (user.role === 'admin' ? '/admin/' : '/account/');

// ------------------------------------------------------------------ public site
const PUBLIC_NAV = [
  ['home', '/', 'Home', 'house'],
  ['pets', '/pets', 'Adopt a Pet', 'paw-print'],
  ['match', '/match', 'Find a Match', 'sparkles'],
  ['rules', '/rules', 'How It Works', 'list-checks'],
  ['care', '/care', 'Rescue and Care', 'stethoscope'],
];

function renderHeader(active, user) {
  const header = $('#site-header');
  if (!header) return;
  const links = PUBLIC_NAV.map(([key, href, text, ic]) => `<a href="${href}" class="${active === key ? 'active' : ''}" ${active === key ? 'aria-current="page"' : ''}>${icon(ic)}<span>${text}</span></a>`).join('');
  const actions = user
    ? `<a class="user-pill" href="${portalHome(user)}">${avatar(user.name)}<span class="hide-sm">${user.role === 'admin' ? 'Admin Console' : esc(firstName(user.name))}</span></a>`
    : `<a class="btn btn-ghost btn-sm hide-sm" href="/login">${icon('log-in')}Log in</a><a class="btn btn-primary btn-sm" href="/register">Sign up</a>`;
  const mobileExtra = user
    ? `<hr><a href="${portalHome(user)}">${icon('layout-dashboard')}${user.role === 'admin' ? 'Admin Console' : 'My Account'}</a><a href="#" data-logout>${icon('log-out')}Log out</a>`
    : `<hr><a href="/login">${icon('log-in')}Log in</a><a href="/register">${icon('user-plus')}Create an account</a>`;

  header.className = 'site-header';
  header.innerHTML = `<div class="container" style="position:relative">
    <div class="header-bar">
      ${brand()}
      <nav class="nav" aria-label="Main">${links}</nav>
      <div class="header-actions">
        ${actions}
        <button class="btn btn-soft btn-icon menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav">${icon('menu')}</button>
      </div>
    </div>
    <nav class="mobile-nav" id="mobile-nav" aria-label="Main">${links}${mobileExtra}</nav>
  </div>`;

  const btn = $('.menu-btn', header); const nav = $('#mobile-nav', header);
  const setOpen = (open) => {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    btn.innerHTML = icon(open ? 'x' : 'menu');
  };
  btn.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); btn.focus(); } });
  document.addEventListener('click', (e) => { if (nav.classList.contains('open') && !header.contains(e.target)) setOpen(false); });
  $$('[data-logout]', header).forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); logout(); }));
}

function renderFooter() {
  const f = $('#site-footer');
  if (!f) return;
  f.className = 'site-footer';
  f.innerHTML = `<div class="container">
    <div class="footer-card">
      <div>${brand()}<p>A web based pet adoption system with rule based matching for the rescued dogs and cats of Santa Maria, Bulacan.</p></div>
      <div><h4>Adopt</h4><ul><li><a href="/pets">Browse pets</a></li><li><a href="/match">Find a match</a></li><li><a href="/rules">How matching works</a></li></ul></div>
      <div><h4>Shelter</h4><ul><li><a href="/care">Animals in care</a></li><li><a href="/care#adopted">Happy endings</a></li></ul></div>
      <div><h4>Account</h4><ul><li><a href="/login">Log in</a></li><li><a href="/register">Create an account</a></li><li><a href="/account/">My account</a></li></ul></div>
    </div>
    <div class="footer-bottom"><span>© ${new Date().getFullYear()} ${SITE} Pet Adoption Center, Santa Maria, Bulacan</span><span>Thesis project, PUP Santa Maria Bulacan Campus, BS Information Technology</span></div>
  </div>`;
}

export async function initPublic(active) {
  const user = await getMe();
  renderHeader(active, user);
  renderFooter();
  return user;
}

// ------------------------------------------------------------------ portals
const PORTALS = {
  admin: {
    label: 'Admin Console',
    sections: [
      ['Manage', [
        ['overview', '/admin/', 'Overview', 'layout-dashboard'],
        ['pets', '/admin/pets', 'Pets and Care', 'paw-print'],
        ['applications', '/admin/applications', 'Applications', 'clipboard-list'],
        ['users', '/admin/users', 'Users', 'users'],
        ['logs', '/admin/logs', 'System Logs', 'scroll-text'],
      ]],
      ['Account', [
        ['profile', '/admin/profile', 'Profile and Security', 'user'],
        ['site', '/', 'View Website', 'globe'],
      ]],
    ],
  },
  adopter: {
    label: 'My Account',
    sections: [
      ['Account', [
        ['overview', '/account/', 'Overview', 'layout-dashboard'],
        ['applications', '/account/applications', 'My Applications', 'clipboard-list'],
        ['profile', '/account/profile', 'Profile and Security', 'user'],
      ]],
      ['Explore', [
        ['match', '/match', 'Match Questionnaire', 'sparkles'],
        ['pets', '/pets', 'Browse Pets', 'paw-print'],
        ['site', '/', 'View Website', 'globe'],
      ]],
    ],
  },
};

export async function initPortal(role, { active, title, subtitle = '', actions = '' }) {
  const user = await getMe();
  if (!user) { location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search); return null; }
  if (user.role !== role) { location.href = portalHome(user); return null; }
  const cfg = PORTALS[role];
  document.title = `${title} | ${SITE} ${cfg.label}`;

  const nav = cfg.sections.map(([heading, items]) => `
    <div class="side-label">${heading}</div>
    <nav class="side-nav" aria-label="${heading}">${items.map(([key, href, text, ic]) => `<a href="${href}" class="${active === key ? 'active' : ''}" ${active === key ? 'aria-current="page"' : ''}><span class="ico">${icon(ic)}</span><span>${text}</span>${key === 'applications' && role === 'admin' ? '<span class="count hidden" id="pending-count"></span>' : ''}</a>`).join('')}</nav>`).join('');

  $('#sidebar').innerHTML = `${brand(portalHome(user))}${nav}
    <div class="side-foot">
      <div class="side-user">${avatar(user.name)}<div><b>${esc(user.name)}</b><span>${esc(LABELS.role[user.role])}</span></div></div>
      <div class="side-nav"><button type="button" data-logout><span class="ico">${icon('log-out')}</span><span>Log out</span></button></div>
    </div>`;
  $('#topbar').innerHTML = `
    <button class="btn btn-soft btn-icon menu-btn" aria-label="Open navigation" aria-controls="sidebar" aria-expanded="false">${icon('menu')}</button>
    <div><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>
    <div class="spacer"></div>
    <div class="row" id="topbar-actions">${actions}</div>`;
  const foot = $('.portal-foot');
  if (foot) foot.textContent = `© ${new Date().getFullYear()} ${SITE} Pet Adoption Center`;

  // Off-canvas sidebar on small screens.
  const sidebar = $('#sidebar'); const overlay = $('.shell-overlay'); const btn = $('.menu-btn', $('#topbar'));
  const setOpen = (open) => { sidebar.classList.toggle('open', open); overlay?.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open)); };
  btn.addEventListener('click', () => setOpen(true));
  overlay?.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  $$('[data-logout]', sidebar).forEach((b) => b.addEventListener('click', logout));

  if (role === 'admin') {
    api('/admin/applications?status=pending').then(({ applications }) => {
      const c = $('#pending-count');
      if (c && applications.length) { c.textContent = applications.length; c.classList.remove('hidden'); c.setAttribute('aria-label', `${applications.length} pending`); }
    }).catch(() => {});
  }
  return user;
}
