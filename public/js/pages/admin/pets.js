import { $, $$, esc } from '../../core/dom.js';
import { api } from '../../core/api.js';
import { icon } from '../../core/icons.js';
import { initPortal } from '../../core/layout.js';
import { LABELS, ageLabel, plural } from '../../core/format.js';
import { petThumb, statusBadge, healthBadge, progress } from '../../core/components.js';
import { toast, busy, errorBox, emptyState, confirmDialog } from '../../core/ui.js';
import { openPetForm } from './shared/pet-form.js';
import { openCare } from './shared/care-panel.js';

const me = await initPortal('admin', {
  active: 'pets', title: 'Pets and Care', subtitle: 'Register rescued animals, record their care and publish them for adoption',
  actions: `<button class="btn btn-primary btn-sm" id="add-pet">${icon('plus')}Register pet</button>`,
});

let pets = [];
let status = 'all';

if (me) {
  $('#add-pet').addEventListener('click', () => openPetForm(null, load));
  $$('#status-filter input').forEach((r) => r.addEventListener('change', () => { status = r.value; render(); }));
  $('#q').addEventListener('input', render);
  await load();
  if (location.hash === '#new') { history.replaceState(null, '', location.pathname); openPetForm(null, load); }
}

async function load() {
  try { pets = (await api('/pets?status=all')).pets; render(); }
  catch (e) { $('#pets-table').innerHTML = errorBox(e); }
}

function render() {
  const q = $('#q').value.trim().toLowerCase();
  const rows = pets.filter((p) => (status === 'all' || p.status === status) && (!q || `${p.name} ${p.breed || ''}`.toLowerCase().includes(q)));
  const table = $('#pets-table');
  if (!rows.length) {
    table.innerHTML = emptyState({ ic: 'paw-print', title: pets.length ? 'No pets match this view' : 'No pets registered yet', text: pets.length ? 'Try another filter or search term.' : 'Register the first rescued animal to get started.' });
    return;
  }
  table.innerHTML = `<table>
    <thead><tr><th>Pet</th><th>Status</th><th>Health</th><th style="min-width:140px">Rehab</th><th>Readiness</th><th class="num">Views</th><th class="num">Pending</th><th class="num">Actions</th></tr></thead>
    <tbody>${rows.map((p) => {
      const pending = p.readiness.checks.filter((c) => !c.ok).length;
      return `<tr>
        <td><a class="cell-main" href="/pet?id=${p.id}">${petThumb(p)}<span>${esc(p.name)}<span class="sub">${esc(LABELS.species[p.species])} · ${esc(ageLabel(p.ageMonths))}</span></span></a></td>
        <td>${statusBadge(p.status)}</td>
        <td>${healthBadge(p.healthStatus)}</td>
        <td>${progress(p.rehabProgress, { thin: true })}</td>
        <td>${p.readiness.ready ? '<span class="badge b-success">Ready</span>' : `<span class="small muted" style="white-space:nowrap">${plural(pending, 'check')} left</span>`}</td>
        <td class="num">${p.views || 0}</td>
        <td class="num">${p.pendingApplications ? `<a href="/admin/applications" class="badge b-warn plain">${p.pendingApplications}</a>` : '0'}</td>
        <td><div class="actions">
          <button class="btn btn-soft btn-icon btn-sm" data-care="${p.id}" title="Care and readiness" aria-label="Care and readiness for ${esc(p.name)}">${icon('stethoscope')}</button>
          <button class="btn btn-soft btn-icon btn-sm" data-edit="${p.id}" title="Edit" aria-label="Edit ${esc(p.name)}">${icon('pencil')}</button>
          <button class="btn btn-danger btn-icon btn-sm" data-del="${p.id}" title="Delete" aria-label="Delete ${esc(p.name)}">${icon('trash-2')}</button>
        </div></td>
      </tr>`;
    }).join('')}</tbody></table>`;

  $$('[data-care]', table).forEach((b) => b.addEventListener('click', () => openCare(Number(b.dataset.care), load)));
  $$('[data-edit]', table).forEach((b) => b.addEventListener('click', () => openPetForm(pets.find((p) => p.id === Number(b.dataset.edit)), load)));
  $$('[data-del]', table).forEach((b) => b.addEventListener('click', async () => {
    const pet = pets.find((p) => p.id === Number(b.dataset.del));
    const ok = await confirmDialog({ title: `Delete ${pet.name}?`, text: 'This also removes the care records and applications for this pet. This cannot be undone.', confirmLabel: 'Delete pet', tone: 'danger', ic: 'trash-2' });
    if (!ok) return;
    await busy(b, async () => {
      try { await api('/pets/' + pet.id, { method: 'DELETE' }); toast(`${pet.name} was deleted`); await load(); }
      catch (e) { toast(e.message, 'error'); }
    });
  }));
}
