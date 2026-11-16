import { $, $$, esc } from '../../core/dom.js';
import { api } from '../../core/api.js';
import { icon } from '../../core/icons.js';
import { initPortal } from '../../core/layout.js';
import { healthBadge, statusBadge } from '../../core/components.js';
import { errorBox } from '../../core/ui.js';
import { openCare } from './shared/care-panel.js';
import { ACTION_LABELS } from './shared/actions.js';

const me = await initPortal('admin', {
  active: 'overview', title: 'Overview', subtitle: 'Shelter activity and items that need your attention',
  actions: `<a class="btn btn-primary btn-sm" href="/admin/pets#new">${icon('plus')}Register pet</a>`,
});
if (me) load();

const stat = (ic, value, lbl, sub, tone = '') => `<div class="card stat"><span class="ico ${tone}">${icon(ic)}</span><div><div class="v">${value}</div><div class="l">${lbl}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div></div>`;

// Smooth area chart (SVG) in the style of the reference design.
function areaChart(points) {
  const W = 640; const H = 210; const P = { l: 30, r: 12, t: 16, b: 28 };
  const max = Math.max(4, ...points.map((p) => p.count));
  const x = (i) => P.l + (i * (W - P.l - P.r)) / (points.length - 1);
  const y = (v) => P.t + (H - P.t - P.b) * (1 - v / max);
  const pts = points.map((p, i) => [x(i), y(p.count)]);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i]; const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  const area = `${d} L ${pts.at(-1)[0]} ${H - P.b} L ${pts[0][0]} ${H - P.b} Z`;
  const ticks = [0, Math.round(max / 2), max];
  const peak = pts.reduce((best, p, i) => (points[i].count >= points[best].count ? i : best), 0);
  const label = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Activity over the last 14 days, peak of ${points[peak].count} on ${label(points[peak].date)}">
    <defs>
      <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b5bff" stop-opacity=".35"/><stop offset="1" stop-color="#36a5ff" stop-opacity="0"/></linearGradient>
      <linearGradient id="chartStroke" x1="0" x2="1"><stop offset="0" stop-color="#36a5ff"/><stop offset="1" stop-color="#3b5bff"/></linearGradient>
    </defs>
    ${ticks.map((t) => `<line class="grid-line" x1="${P.l}" x2="${W - P.r}" y1="${y(t)}" y2="${y(t)}"/><text class="axis" x="${P.l - 8}" y="${y(t) + 3}" text-anchor="end">${t}</text>`).join('')}
    <path d="${area}" fill="url(#chartFill)"/>
    <path class="line" d="${d}"/>
    <circle class="dot" cx="${pts[peak][0]}" cy="${pts[peak][1]}" r="6"/>
    ${points.map((p, i) => (i % 2 === 0 || i === points.length - 1 ? `<text class="axis" x="${x(i)}" y="${H - 8}" text-anchor="middle">${label(p.date)}</text>` : '')).join('')}
  </svg>`;
}

async function load() {
  const el = $('#content');
  try {
    const s = await api('/admin/stats');
    const ps = s.pets.byStatus; const as = s.applications.byStatus;
    const inCare = (ps.rescued || 0) + (ps.rehabilitation || 0);
    const totalApps = s.applications.total || 0;
    const pct = (n) => (totalApps ? Math.round(((n || 0) / totalApps) * 100) : 0);
    const weekTotal = s.activityByDay.slice(-7).reduce((t, d) => t + d.count, 0);
    const usage = Object.entries(s.activity).filter(([k]) => k !== 'system').sort((a, b) => b[1] - a[1]).slice(0, 6);
    const usageMax = Math.max(1, ...usage.map(([, v]) => v));

    el.innerHTML = `
      <section class="welcome">
        <div><h2>Welcome back, ${esc(me.name)}</h2><p>${as.pending ? `There ${as.pending === 1 ? 'is 1 application' : `are ${as.pending} applications`} waiting for your review.` : 'All applications have been reviewed. Great work.'}</p></div>
        <a class="btn btn-soft" href="/admin/applications">${icon('clipboard-list')}Review applications</a>
      </section>

      <section class="stats" aria-label="Key figures">
        ${stat('paw-print', ps.available || 0, 'Available pets', 'Listed for adoption', 'ico-grad')}
        ${stat('stethoscope', inCare, 'In rescue care', `${ps.rescued || 0} rescued, ${ps.rehabilitation || 0} in rehab`, 'ico-warn')}
        ${stat('heart-handshake', ps.adopted || 0, 'Adopted', 'Successful adoptions', 'ico-success')}
        ${stat('users', s.users.adopters, 'Adopters', `${s.users.admins} administrator${s.users.admins === 1 ? '' : 's'}`)}
      </section>

      <div class="split">
        <section class="card card-pad chart-card">
          <div class="card-head"><div class="card-title"><span class="ico">${icon('activity')}</span><div><h3>System activity</h3><p class="card-sub">Logged actions over the last 14 days</p></div></div><div class="text-grad strong" style="font-size:1.4rem">${weekTotal}<span class="small muted" style="-webkit-text-fill-color:var(--muted);font-weight:600"> this week</span></div></div>
          ${areaChart(s.activityByDay)}
        </section>
        <section class="card card-pad">
          <div class="card-title" style="margin-bottom:20px"><span class="ico">${icon('clipboard-list')}</span><div><h3>Application pipeline</h3><p class="card-sub">${totalApps} total, average match score ${s.applications.avgMatchScore ?? 0}%</p></div></div>
          <div class="donut-wrap">
            <div class="donut" style="--a:${pct(as.approved)};--b:${pct(as.pending)};--c:${pct(as.rejected)}"><b>${totalApps}<small>applications</small></b></div>
            <div class="key">
              <span><i style="background:var(--primary)"></i>Approved <b>${as.approved || 0}</b></span>
              <span><i style="background:#36a5ff"></i>Pending <b>${as.pending || 0}</b></span>
              <span><i style="background:#ffc65c"></i>Not approved <b>${as.rejected || 0}</b></span>
              <span><i style="background:var(--surface-3)"></i>Withdrawn <b>${as.withdrawn || 0}</b></span>
            </div>
          </div>
        </section>
      </div>

      <div class="split-even">
        <section class="card card-pad">
          <div class="card-title" style="margin-bottom:12px"><span class="ico ico-success">${icon('circle-check')}</span><div><h3>Ready to publish</h3><p class="card-sub">Pets in care that now pass every readiness rule</p></div></div>
          ${s.readyToPublish.length ? `<ul class="list">${s.readyToPublish.map((p) => `<li><span class="who">${esc(p.name)}</span><button class="btn btn-soft btn-sm" data-care="${p.id}">Review</button></li>`).join('')}</ul>` : '<p class="muted small" style="margin:0">No pets are waiting to be published.</p>'}
        </section>
        <section class="card card-pad">
          <div class="card-title" style="margin-bottom:12px"><span class="ico ico-danger">${icon('triangle-alert')}</span><div><h3>Needs medical attention</h3><p class="card-sub">Animals that are critical or under treatment</p></div></div>
          ${s.needsAttention.length ? `<ul class="list">${s.needsAttention.map((p) => `<li><span class="who">${esc(p.name)}</span><span class="row" style="gap:10px">${healthBadge(p.healthStatus)}<button class="btn btn-soft btn-sm" data-care="${p.id}">Care log</button></span></li>`).join('')}</ul>` : '<p class="muted small" style="margin:0">All animals are stable.</p>'}
        </section>
        <section class="card card-pad">
          <div class="card-title" style="margin-bottom:12px"><span class="ico">${icon('eye')}</span><div><h3>Most viewed pets</h3><p class="card-sub">Profile views by visitors</p></div></div>
          <ul class="list">${s.topViewed.map((p) => `<li><a class="who" href="/pet?id=${p.id}">${esc(p.name)}</a><span class="row" style="gap:10px">${statusBadge(p.status)}<b class="num">${p.views}</b></span></li>`).join('')}</ul>
        </section>
        <section class="card card-pad">
          <div class="card-title" style="margin-bottom:18px"><span class="ico">${icon('chart-column')}</span><div><h3>Feature usage</h3><p class="card-sub">From the system logs</p></div></div>
          <div class="bars">${usage.map(([k, v]) => `<div class="bar-row"><span>${esc(ACTION_LABELS[k] || k)}</span><b class="num">${v}</b><div class="bar"><i style="width:${Math.round((v / usageMax) * 100)}%"></i></div></div>`).join('') || '<p class="muted small">No activity yet.</p>'}</div>
        </section>
      </div>`;
    $$('[data-care]', el).forEach((b) => b.addEventListener('click', () => openCare(Number(b.dataset.care), load)));
  } catch (e) { el.innerHTML = errorBox(e); }
}
