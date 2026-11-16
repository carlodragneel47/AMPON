import { $ } from '../core/dom.js';
import { api } from '../core/api.js';
import { initPublic } from '../core/layout.js';
import { petCard } from '../core/components.js';
import { skeletonCards, emptyState, errorBox } from '../core/ui.js';
import { plural } from '../core/format.js';

const form = $('#filters');
const results = $('#results');
results.innerHTML = skeletonCards(6);
await initPublic('pets');

// Pre-fill filters from the address bar (for example ?species=dog).
for (const [k, v] of new URLSearchParams(location.search)) {
  const el = form.elements[k];
  if (!el) continue;
  if (el instanceof RadioNodeList) el.value = v;
  else if (el.type === 'checkbox') el.checked = v === 'yes';
  else el.value = v;
}

// Mobile filter panel toggle.
const toggle = $('.filter-toggle');
toggle.addEventListener('click', () => {
  const open = !form.classList.contains('open');
  form.classList.toggle('open', open);
  toggle.setAttribute('aria-expanded', String(open));
});

let timer;
let seq = 0; // ignore responses that arrive after a newer request
async function load() {
  const mine = ++seq;
  const qs = new URLSearchParams();
  for (const [k, v] of new FormData(form)) if (v && v !== 'any') qs.set(k, v);
  history.replaceState(null, '', '/pets' + (qs.toString() ? '?' + qs : ''));
  qs.set('status', 'available');
  results.setAttribute('aria-busy', 'true');
  try {
    const { pets } = await api('/pets?' + qs);
    if (mine !== seq) return;
    $('#count').textContent = `${plural(pets.length, 'pet')} available`;
    results.innerHTML = pets.length
      ? pets.map((p) => petCard(p)).join('')
      : `<div class="card full">${emptyState({ ic: 'search', title: 'No pets match these filters', text: 'Try widening your search or resetting the filters.', action: '<button type="button" class="btn btn-soft" id="clear-empty">Reset filters</button>' })}</div>`;
    $('#clear-empty')?.addEventListener('click', () => form.reset());
  } catch (e) {
    if (mine === seq) results.innerHTML = `<div class="full">${errorBox(e)}</div>`;
  } finally {
    if (mine === seq) results.removeAttribute('aria-busy');
  }
}

form.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 250); });
form.addEventListener('reset', () => setTimeout(load, 0));
form.addEventListener('submit', (e) => { e.preventDefault(); load(); });
load();
