// Reusable HTML fragments: pet media and cards, badges, score rings, progress, trackers.
import { esc } from './dom.js';
import { icon } from './icons.js';
import { LABELS, ageLabel, cap, initials, fmtDate } from './format.js';

const STATUS_TONE = { available: 'b-success', rehabilitation: 'b-warn', rescued: 'b-danger', adopted: 'b-info' };
const HEALTH_TONE = { healthy: 'b-success', recovering: 'b-warn', under_treatment: 'b-danger', critical: 'b-danger' };
const APP_TONE = { pending: 'b-warn', approved: 'b-success', rejected: 'b-danger', withdrawn: 'b-muted' };

export const statusBadge = (s) => `<span class="badge ${STATUS_TONE[s] || ''}">${esc(LABELS.status[s] || s)}</span>`;
export const healthBadge = (s) => `<span class="badge ${HEALTH_TONE[s] || ''}">${esc(LABELS.healthStatus[s] || s)}</span>`;
export const appBadge = (s) => `<span class="badge ${APP_TONE[s] || ''}">${esc(LABELS.appStatus[s] || s)}</span>`;
export const roleBadge = (r) => `<span class="badge plain ${r === 'admin' ? 'b-info' : 'b-muted'}">${esc(LABELS.role[r] || r)}</span>`;

export const avatar = (name, cls = '') => `<span class="avatar ${cls}" aria-hidden="true">${esc(initials(name))}</span>`;

export function petMedia(pet, { badge = false, eager = false } = {}) {
  const b = badge ? statusBadge(pet.status) : '';
  const inner = pet.photo
    ? `<img src="${esc(pet.photo)}" alt="Photo of ${esc(pet.name)}" ${eager ? '' : 'loading="lazy"'} decoding="async">`
    : `<div class="pet-placeholder" role="img" aria-label="${esc(pet.name)}, no photo yet">${icon(pet.species === 'cat' ? 'cat' : 'dog')}</div>`;
  return `<div class="pet-media">${inner}${b}</div>`;
}

export const petThumb = (pet) => `<span class="thumb">${pet?.photo ? `<img src="${esc(pet.photo)}" alt="" loading="lazy">` : `<span class="pet-placeholder">${icon(pet?.species === 'cat' ? 'cat' : 'dog')}</span>`}</span>`;

export function petCard(pet, { showStatus = false, extra = '' } = {}) {
  const temp = (pet.temperament || []).slice(0, 3).map((t) => `<span class="tag">${esc(cap(t))}</span>`).join('');
  return `<a class="card pet-card" href="/pet?id=${pet.id}" aria-label="${esc(pet.name)}, ${esc(LABELS.species[pet.species])}, view profile">
    ${petMedia(pet, { badge: showStatus })}
    <div class="body">
      <div class="name-row"><h3>${esc(pet.name)}</h3><span class="go">${icon('arrow-right')}</span></div>
      <div class="meta">
        <span>${icon(pet.species === 'cat' ? 'cat' : 'dog')}${esc(LABELS.species[pet.species])}</span>
        <span>${icon('cake')}${esc(ageLabel(pet.ageMonths))}</span>
        <span>${icon('ruler')}${esc(LABELS.size[pet.size])}</span>
      </div>
      ${pet.breed ? `<div class="small muted">${esc(pet.breed)} · ${esc(LABELS.sex[pet.sex])}</div>` : ''}
      ${temp ? `<div class="tags">${temp}</div>` : ''}
      ${extra ? `<div class="foot">${extra}</div>` : ''}
    </div>
  </a>`;
}

export const scoreClass = (score) => (score >= 80 ? 'excellent' : score >= 65 ? 'good' : score >= 50 ? 'fair' : 'low');
export const scoreRing = (score, size = '') => {
  const v = Math.max(0, Math.min(100, Number(score) || 0));
  return `<div class="ring ${size} ${scoreClass(v)}" style="--v:${v}" role="img" aria-label="Match score ${v} out of 100"><b>${v}<small>%</small></b></div>`;
};

export const reasonsList = (reasons) => `<ul class="reasons">${reasons.map((r) => `<li class="${r.points > 0 ? 'plus' : 'minus'}"><span class="pts">${r.points > 0 ? '+' : '−'}${Math.abs(r.points)}</span><span>${esc(r.reason)} <span class="rule-id">${esc(r.rule)}</span></span></li>`).join('')}</ul>`;

export function progress(value, { thin = false } = {}) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return `<div class="progress ${thin ? 'thin' : ''}"><div class="progress-track" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill" style="width:${v}%"></div></div><span class="progress-val">${v}%</span></div>`;
}

export const checkItem = (state, text) => `<li class="${state}"><span class="mark">${icon(state === 'ok' ? 'check' : state === 'adv' ? 'info' : 'x')}</span><span>${text}</span></li>`;

// Horizontal tracker for an adoption application's progress.
export function appTracker(app) {
  const steps = [['Submitted', fmtDate(app.createdAt)], ['Under review', ''], ['Decision', '']];
  let states;
  if (app.status === 'pending') states = ['done', 'current', ''];
  else if (app.status === 'approved') { states = ['done', 'done', 'current']; steps[2][0] = 'Approved'; }
  else if (app.status === 'rejected') { states = ['done', 'done', 'failed']; steps[2][0] = 'Not approved'; }
  else { states = ['done', 'failed', '']; steps[1][0] = 'Withdrawn'; }
  return `<ol class="tracker">${steps.map(([t, d], i) => `<li class="${states[i]}"><span class="dot"></span><span class="label-pill">${esc(t)}</span>${d ? `<span class="xsmall muted">${esc(d)}</span>` : ''}</li>`).join('')}</ol>`;
}
