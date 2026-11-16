import { $ } from '../core/dom.js';
import { api } from '../core/api.js';
import { initPublic } from '../core/layout.js';
import { petCard, healthBadge, progress } from '../core/components.js';
import { skeletonCards, emptyState, errorBox } from '../core/ui.js';

$('#care').innerHTML = skeletonCards(3);
await initPublic('care');

try {
  const [care, adopted] = await Promise.all([api('/pets?status=care'), api('/pets?status=adopted')]);
  $('#care').innerHTML = care.pets.length
    ? care.pets.map((p) => petCard(p, { showStatus: true, extra: `<div class="row-between" style="margin-bottom:12px"><span class="label">Health</span>${healthBadge(p.healthStatus)}</div><span class="label">Rehabilitation</span><div style="margin-top:8px">${progress(p.rehabProgress)}</div>` })).join('')
    : `<div class="card full">${emptyState({ ic: 'heart', title: 'No animals in rehabilitation', text: 'Every rescued animal is currently healthy and listed for adoption.' })}</div>`;
  $('#adopted-list').innerHTML = adopted.pets.length
    ? adopted.pets.map((p) => petCard(p, { showStatus: true })).join('')
    : `<div class="card full">${emptyState({ ic: 'heart-handshake', title: 'No adoptions recorded yet' })}</div>`;
} catch (e) {
  $('#care').innerHTML = `<div class="full">${errorBox(e)}</div>`;
}
