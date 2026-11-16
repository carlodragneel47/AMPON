import { $, esc } from '../../core/dom.js';
import { api } from '../../core/api.js';
import { icon } from '../../core/icons.js';
import { initPortal } from '../../core/layout.js';
import { PREF_LABELS, firstName, fmtDate } from '../../core/format.js';
import { petCard, petMedia, appBadge, appTracker, scoreRing } from '../../core/components.js';
import { errorBox, emptyState, skeletonCards } from '../../core/ui.js';

const me = await initPortal('adopter', { active: 'overview', title: 'Overview', subtitle: 'Your adoption journey at a glance' });
if (me) {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  $('#greeting').textContent = `${part}, ${firstName(me.name)}`;
  renderPrefs(me.preferences);
  loadApplications();
  loadMatches(me.preferences);
}

function stat(ic, value, lbl, sub, tone = '') {
  return `<div class="card stat"><span class="ico ${tone}">${icon(ic)}</span><div><div class="v">${value}</div><div class="l">${lbl}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div></div>`;
}

async function loadApplications() {
  try {
    const { applications } = await api('/applications/mine');
    const n = (s) => applications.filter((a) => a.status === s).length;
    $('#stats').innerHTML =
      stat('clipboard-list', applications.length, 'Applications', 'Submitted so far', 'ico-grad') +
      stat('hourglass', n('pending'), 'Pending review', 'Waiting for the shelter', 'ico-warn') +
      stat('heart-handshake', n('approved'), 'Approved', 'Successful adoptions', 'ico-success') +
      stat('sparkles', me.preferences ? 'Done' : 'To do', 'Match profile', me.preferences ? 'Used for your scores' : 'Answer 10 questions');

    const a = applications[0];
    $('#latest').innerHTML = a
      ? `<div class="row" style="align-items:flex-start;gap:18px;flex-wrap:nowrap">
          <a href="/pet?id=${a.pet?.id ?? ''}" style="width:96px;flex:none">${a.pet ? `<div style="border-radius:18px;overflow:hidden;aspect-ratio:1">${petMedia(a.pet)}</div>` : ''}</a>
          <div style="flex:1;min-width:0">
            <div class="row-between"><div><h3 style="margin:0">${esc(a.pet?.name || 'Removed pet')}</h3><p class="small muted" style="margin:2px 0 0">Submitted ${esc(fmtDate(a.createdAt))}</p></div>${appBadge(a.status)}</div>
            <div style="margin-top:18px">${appTracker(a)}</div>
          </div>
          ${a.matchScore != null ? `<div class="hide-sm">${scoreRing(a.matchScore, 'sm')}</div>` : ''}
        </div>
        ${a.adminNote ? `<div class="app-note"><b>Shelter note:</b> ${esc(a.adminNote)}</div>` : ''}`
      : emptyState({ ic: 'clipboard-list', title: 'No applications yet', text: 'When you apply for a pet, its progress will appear here.', action: '<a class="btn btn-primary" href="/pets">Browse pets</a>' });
  } catch (e) { $('#latest').innerHTML = errorBox(e); }
}

async function loadMatches(prefs) {
  const top = $('#top');
  if (!prefs) {
    top.innerHTML = `<div class="card full">${emptyState({ ic: 'sparkles', title: 'Get personalised recommendations', text: 'Answer the match questionnaire to see the pets that fit your home best.', action: '<a class="btn btn-primary" href="/match">Start the questionnaire</a>' })}</div>`;
    return;
  }
  top.innerHTML = skeletonCards(3);
  try {
    const out = await api('/match?silent=1', { method: 'POST', body: prefs });
    top.innerHTML = out.results.slice(0, 3).map((r) => petCard(r.pet, { extra: `<div class="row">${scoreRing(r.score, 'sm')}<b class="small">${esc(r.label)}</b></div>` })).join('')
      || `<div class="card full">${emptyState({ ic: 'search', title: 'No matches right now', text: 'New rescues are listed every week. Please check back soon.' })}</div>`;
  } catch (e) { top.innerHTML = `<div class="full">${errorBox(e)}</div>`; }
}

function renderPrefs(P) {
  const head = `<div class="card-head"><div class="card-title"><span class="ico">${icon('sparkles')}</span><div><h3>Match profile</h3><p class="card-sub">Used to score every pet you view</p></div></div></div>`;
  if (!P) {
    $('#prefs').innerHTML = `${head}<p class="muted small">You have not answered the match questionnaire yet. It takes about a minute.</p><a class="btn btn-primary btn-block" href="/match">Start the questionnaire</a>`;
    return;
  }
  const items = [
    ['paw-print', PREF_LABELS.species[P.species]], ['ruler', PREF_LABELS.size[P.size]], ['cake', PREF_LABELS.age[P.age]],
    ['house', PREF_LABELS.homeType[P.homeType]], ['baby', P.hasChildren ? 'Has children' : 'No children'], ['dog', PREF_LABELS.otherPets[P.otherPets]],
    ['zap', PREF_LABELS.activity[P.activity]], ['clock', PREF_LABELS.hoursAlone[P.hoursAlone]], ['star', PREF_LABELS.experience[P.experience]],
    ['heart', P.specialNeedsOk ? 'Open to special needs' : 'No special needs'],
  ];
  $('#prefs').innerHTML = `${head}<div class="pref-grid">${items.map(([ic, t]) => `<div>${icon(ic)}${esc(t)}</div>`).join('')}</div><a class="btn btn-soft btn-sm btn-block" style="margin-top:18px" href="/match">${icon('pencil')}Update answers</a>`;
}
