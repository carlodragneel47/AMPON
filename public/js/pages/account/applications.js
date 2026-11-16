import { $, $$, esc } from '../../core/dom.js';
import { api } from '../../core/api.js';
import { icon } from '../../core/icons.js';
import { initPortal } from '../../core/layout.js';
import { fmtDate, LABELS, ageLabel } from '../../core/format.js';
import { petMedia, appBadge, appTracker, scoreRing } from '../../core/components.js';
import { toast, busy, errorBox, emptyState, confirmDialog } from '../../core/ui.js';

const me = await initPortal('adopter', { active: 'applications', title: 'My Applications', subtitle: 'Track every adoption request you have sent' });
let all = [];
let filter = 'all';

if (me) {
  $$('#filter input').forEach((r) => r.addEventListener('change', () => { filter = r.value; render(); }));
  load();
}

async function load() {
  try { all = (await api('/applications/mine')).applications; render(); }
  catch (e) { $('#list').innerHTML = errorBox(e); }
}

function render() {
  const rows = all.filter((a) => filter === 'all' || (filter === 'closed' ? ['rejected', 'withdrawn'].includes(a.status) : a.status === filter));
  if (!rows.length) {
    $('#list').innerHTML = `<div class="card">${emptyState({ ic: 'clipboard-list', title: all.length ? 'Nothing in this list' : 'No applications yet', text: all.length ? 'Try a different filter.' : 'Find a pet you love and send your first application.', action: all.length ? '' : '<a class="btn btn-primary" href="/pets">Browse pets</a>' })}</div>`;
    return;
  }
  $('#list').innerHTML = rows.map((a) => `
    <article class="card app-card">
      ${a.pet ? `<a href="/pet?id=${a.pet.id}" aria-label="View ${esc(a.pet.name)}">${petMedia(a.pet)}</a>` : `<div class="pet-media"><div class="pet-placeholder">${icon('paw-print')}</div></div>`}
      <div>
        <div class="top">
          <div>
            <h3>${esc(a.pet?.name || 'Pet no longer listed')}</h3>
            <p class="small muted" style="margin:0">${a.pet ? `${esc(LABELS.species[a.pet.species])} · ${esc(ageLabel(a.pet.ageMonths))} · ` : ''}Application #${a.id} · Submitted ${esc(fmtDate(a.createdAt))}</p>
          </div>
          <div class="row">${a.matchScore != null ? scoreRing(a.matchScore, 'sm') : ''}${appBadge(a.status)}</div>
        </div>
        ${appTracker(a)}
        ${a.adminNote ? `<div class="app-note"><b>Shelter note:</b> ${esc(a.adminNote)}</div>` : ''}
        <div class="row" style="margin-top:16px">
          ${a.pet ? `<a class="btn btn-soft btn-sm" href="/pet?id=${a.pet.id}">${icon('eye')}View pet</a>` : ''}
          ${a.status === 'pending' ? `<button class="btn btn-danger btn-sm" data-withdraw="${a.id}">${icon('undo-2')}Withdraw</button>` : ''}
        </div>
      </div>
    </article>`).join('');

  $$('[data-withdraw]').forEach((b) => b.addEventListener('click', async () => {
    const app = all.find((x) => x.id === Number(b.dataset.withdraw));
    const ok = await confirmDialog({ title: 'Withdraw this application?', text: `Your application for ${app.pet?.name || 'this pet'} will be closed. You can apply again later while the pet is available.`, confirmLabel: 'Withdraw', tone: 'danger', ic: 'undo-2' });
    if (!ok) return;
    await busy(b, async () => {
      try { await api(`/applications/${app.id}/withdraw`, { method: 'PUT' }); toast('Application withdrawn'); await load(); }
      catch (err) { toast(err.message, 'error'); }
    });
  }));
}
