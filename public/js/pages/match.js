import { $, $$, esc, formData } from '../core/dom.js';
import { api } from '../core/api.js';
import { icon } from '../core/icons.js';
import { initPublic } from '../core/layout.js';
import { LABELS, ageLabel, plural } from '../core/format.js';
import { petMedia, scoreRing, reasonsList } from '../core/components.js';
import { busy, errorBox, emptyState } from '../core/ui.js';

const form = $('#quiz');
const results = $('#results');
const DEFAULTS = { species: 'any', size: 'any', age: 'any', homeType: 'house_no_yard', hasChildren: 'false', otherPets: 'none', activity: 'moderate', hoursAlone: 'medium', experience: 'some', specialNeedsOk: 'false' };
const GUEST_KEY = 'ampon-match-prefs';

// Build the pill radio groups from data attributes: value:icon:label|...
$$('.chips', form).forEach((g) => {
  const name = g.dataset.name;
  g.setAttribute('role', 'radiogroup');
  g.setAttribute('aria-label', g.closest('fieldset').querySelector('legend').textContent.replace(/^\d+/, ''));
  g.innerHTML = g.dataset.options.split('|').map((o) => {
    const [value, ic, text] = o.split(':');
    return `<label class="chip"><input type="radio" name="${name}" value="${value}"><span>${ic ? icon(ic) : ''}${esc(text)}</span></label>`;
  }).join('');
});

results.innerHTML = `<div class="card">${emptyState({ ic: 'sparkles', title: 'Your matches will appear here', text: 'Answer the questions, then select <b>Show my matches</b>. Every result explains which rules affected its score.' })}</div>`;

const me = await initPublic('match');

let saved = null;
if (me?.role === 'adopter' && me.preferences) saved = me.preferences;
else { try { saved = JSON.parse(localStorage.getItem(GUEST_KEY) || 'null'); } catch { saved = null; } }
const initial = { ...DEFAULTS, ...Object.fromEntries(Object.entries(saved || {}).map(([k, v]) => [k, String(v)])) };
for (const [k, v] of Object.entries(initial)) {
  const input = form.querySelector(`input[name="${k}"][value="${CSS.escape(v)}"]`) || form.querySelector(`input[name="${k}"]`);
  if (input) input.checked = true;
}
$('#save-note').innerHTML = me?.role === 'adopter'
  ? 'Your answers are saved to your account and used to score the pets you view.'
  : me ? '' : '<a href="/register">Create an account</a> to save your answers and attach them to applications.';

const mq = matchMedia('(max-width: 980px)');

function render(out) {
  const excluded = out.excludedCount
    ? `<details class="card card-pad"><summary class="strong">${plural(out.excludedCount, 'pet')} filtered out by eligibility rules</summary><ul class="list" style="margin-top:12px">${out.excludedReasons.map((r) => `<li><span>${esc(r.reason)}</span><b>${r.count}</b></li>`).join('')}</ul></details>`
    : '';
  if (!out.results.length) {
    results.innerHTML = `<div class="stack"><div class="card">${emptyState({ ic: 'search', title: 'No pets meet all your eligibility rules', text: 'Try relaxing a preference such as species or special needs care.' })}</div>${excluded}</div>`;
    return;
  }
  results.innerHTML = `
    <div class="results-head"><h2>${plural(out.results.length, 'recommended pet')}</h2><a class="btn btn-soft btn-sm" href="/rules">${icon('info')}How scores work</a></div>
    <div class="stack">${out.results.map((r, i) => `
      <article class="card match-card">
        <a href="/pet?id=${r.pet.id}" tabindex="-1" aria-hidden="true">${petMedia(r.pet)}</a>
        <div class="body">
          <div class="row-between" style="align-items:flex-start">
            <div><span class="rank">#${i + 1} · ${esc(r.label)}</span><h3><a href="/pet?id=${r.pet.id}">${esc(r.pet.name)}</a></h3>
              <p class="small muted" style="margin:0">${esc(r.pet.breed || LABELS.species[r.pet.species])} · ${esc(LABELS.sex[r.pet.sex])} · ${esc(ageLabel(r.pet.ageMonths))} · ${esc(LABELS.size[r.pet.size])}</p></div>
            ${scoreRing(r.score)}
          </div>
          ${r.reasons.length ? reasonsList(r.reasons) : '<p class="small muted" style="margin-top:12px">No compatibility rules applied, so this is a neutral match.</p>'}
          <a class="btn btn-soft btn-sm" style="margin-top:16px" href="/pet?id=${r.pet.id}">View profile and apply${icon('arrow-right')}</a>
        </div>
      </article>`).join('')}${excluded}</div>`;
}

let initialRun = !!saved;
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const prefs = formData(form);
  results.innerHTML = '<div class="spinner" role="status" aria-label="Finding matches"></div>';
  await busy($('#quiz-submit'), async () => {
    try {
      const out = await api('/match', { method: 'POST', body: prefs });
      if (!me) { try { localStorage.setItem(GUEST_KEY, JSON.stringify(prefs)); } catch { /* storage unavailable */ } }
      render(out);
      if (mq.matches && !initialRun) results.scrollIntoView({ behavior: 'smooth' });
    } catch (err) { results.innerHTML = errorBox(err); }
  });
  initialRun = false;
});

if (saved) form.requestSubmit();
