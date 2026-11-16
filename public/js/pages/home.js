import { $, $$ } from '../core/dom.js';
import { api } from '../core/api.js';
import { initPublic } from '../core/layout.js';
import { petCard } from '../core/components.js';
import { skeletonCards, emptyState, errorBox } from '../core/ui.js';

const featured = $('#featured');
featured.innerHTML = skeletonCards(3);
await initPublic('home');

api('/stats')
  .then((s) => $$('#stats [data-k]').forEach((el) => { el.textContent = s[el.dataset.k] ?? 0; }))
  .catch(() => { /* stats are optional */ });

try {
  const { pets } = await api('/pets?status=available');
  featured.innerHTML = pets.length
    ? pets.slice(0, 6).map((p) => petCard(p)).join('')
    : `<div class="card full">${emptyState({ ic: 'paw-print', title: 'No pets listed right now', text: 'Please check back soon. New rescues are listed every week.' })}</div>`;
} catch (e) {
  featured.innerHTML = `<div class="full">${errorBox(e)}</div>`;
}
featured.removeAttribute('aria-busy');
