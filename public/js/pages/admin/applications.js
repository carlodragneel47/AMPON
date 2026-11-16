import { $, $$, esc } from '../../core/dom.js';
import { api } from '../../core/api.js';
import { icon } from '../../core/icons.js';
import { initPortal } from '../../core/layout.js';
import { PREF_LABELS, fmtDate } from '../../core/format.js';
import { petThumb, appBadge, statusBadge, scoreRing, avatar, appTracker } from '../../core/components.js';
import { toast, busy, errorBox, emptyState, modal, confirmDialog, alertBox } from '../../core/ui.js';

const me = await initPortal('admin', { active: 'applications', title: 'Applications', subtitle: 'Review adoption requests and record your decision' });
let status = 'pending';
let apps = [];

if (me) {
  $$('#status-filter input').forEach((r) => r.addEventListener('change', () => { status = r.value; load(); }));
  $('#q').addEventListener('input', render);
  load();
}

async function load() {
  $('#apps-table').innerHTML = '<div class="spinner"></div>';
  try { apps = (await api('/admin/applications?status=' + status)).applications; render(); }
  catch (e) { $('#apps-table').innerHTML = errorBox(e); }
}

function render() {
  const q = $('#q').value.trim().toLowerCase();
  const rows = apps.filter((a) => !q || `${a.user?.name || ''} ${a.user?.email || ''} ${a.pet?.name || ''}`.toLowerCase().includes(q));
  const table = $('#apps-table');
  if (!rows.length) { table.innerHTML = emptyState({ ic: 'inbox', title: 'No applications here', text: status === 'pending' ? 'You are all caught up. New requests will appear here.' : 'Try another filter.' }); return; }
  table.innerHTML = `<table>
    <thead><tr><th>Applicant</th><th>Pet</th><th class="num">Match</th><th>Submitted</th><th>Status</th><th class="num">Action</th></tr></thead>
    <tbody>${rows.map((a) => `<tr>
      <td><span class="cell-main">${avatar(a.user?.name || '?', 'avatar-sm')}<span>${esc(a.user?.name || 'Removed account')}<span class="sub">${esc(a.user?.email || '')}</span></span></span></td>
      <td>${a.pet ? `<a class="cell-main" href="/pet?id=${a.pet.id}" style="min-width:150px">${petThumb(a.pet)}<span>${esc(a.pet.name)}</span></a>` : '<span class="muted">Removed</span>'}</td>
      <td class="num">${a.matchScore != null ? `<b>${a.matchScore}%</b>` : '<span class="small muted">No quiz</span>'}</td>
      <td style="white-space:nowrap">${esc(fmtDate(a.createdAt))}</td>
      <td>${appBadge(a.status)}</td>
      <td class="num"><button class="btn btn-soft btn-sm" data-review="${a.id}">${icon('eye')}Review</button></td>
    </tr>`).join('')}</tbody></table>`;
  $$('[data-review]', table).forEach((b) => b.addEventListener('click', () => review(apps.find((a) => a.id === Number(b.dataset.review)))));
}

function household(p) {
  if (!p) return '<p class="muted small" style="margin:0">The applicant has not completed the match questionnaire.</p>';
  const items = [PREF_LABELS.homeType[p.homeType], p.hasChildren ? 'Has children' : 'No children', PREF_LABELS.otherPets[p.otherPets], PREF_LABELS.activity[p.activity], PREF_LABELS.hoursAlone[p.hoursAlone], PREF_LABELS.experience[p.experience]];
  return `<div class="tags">${items.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>`;
}

function review(a) {
  const closed = a.status === 'withdrawn';
  const decision = closed ? alertBox('info', 'The adopter withdrew this application, so no decision is needed.', 'undo-2') : `
    <div class="field"><label for="a-note">Note to the adopter <span class="faint">(optional)</span></label><textarea id="a-note" maxlength="255" placeholder="For example: Please visit the shelter on Saturday at 10 AM for a meet and greet.">${esc(a.adminNote || '')}</textarea></div>`;
  const actions = closed ? '<button type="button" class="btn btn-soft" data-close>Close</button>' : `
    ${a.status !== 'pending' ? `<button type="button" class="btn btn-soft" data-set="pending">${icon('undo-2')}Move back to pending</button>` : ''}
    ${a.status !== 'rejected' ? `<button type="button" class="btn btn-danger" data-set="rejected">${icon('circle-x')}Decline</button>` : ''}
    ${a.status !== 'approved' ? `<button type="button" class="btn btn-success" data-set="approved">${icon('circle-check')}Approve adoption</button>` : ''}`;

  const dlg = modal({
    title: `Application #${a.id}`,
    body: `<div class="stack">
      ${appTracker(a)}
      <div class="grid grid-2" style="gap:18px">
        <div class="card card-pad">
          <span class="label">Applicant</span>
          <div class="row" style="margin-top:12px;flex-wrap:nowrap">${avatar(a.user?.name || '?')}<div style="min-width:0"><b>${esc(a.user?.name || 'Removed account')}</b><div class="small muted" style="overflow-wrap:anywhere">${esc(a.user?.email || '')}</div></div></div>
          <ul class="list small" style="margin-top:12px">
            <li><span class="muted">${icon('phone')} Mobile</span><b>${esc(a.phone)}</b></li>
            <li><span class="muted">${icon('map-pin')} Address</span><b style="text-align:right">${esc(a.address)}</b></li>
            <li><span class="muted">${icon('house')} Home visit</span><b>${a.homeVisitOk ? 'Agreed' : 'Not agreed'}</b></li>
          </ul>
        </div>
        <div class="card card-pad">
          <span class="label">Pet</span>
          ${a.pet ? `<div class="row" style="margin-top:12px">${petThumb(a.pet)}<div><a href="/pet?id=${a.pet.id}" target="_blank" rel="noopener"><b>${esc(a.pet.name)}</b></a><div style="margin-top:4px">${statusBadge(a.pet.status)}</div></div></div>` : '<p class="muted">This pet was removed.</p>'}
          ${a.matchScore != null ? `<div class="row" style="margin-top:16px">${scoreRing(a.matchScore, 'sm')}<span class="small muted">Rule based score when the application was submitted</span></div>` : ''}
        </div>
      </div>
      <div><span class="label">Household from the match questionnaire</span><div style="margin-top:10px">${household(a.user?.preferences)}</div></div>
      <div><span class="label">Reason for adopting</span><p class="inset" style="padding:16px;margin:10px 0 0;white-space:pre-wrap">${esc(a.reason)}</p></div>
      ${decision}
    </div>`,
    foot: actions,
  });

  $$('[data-set]', dlg).forEach((b) => b.addEventListener('click', async () => {
    const next = b.dataset.set;
    if (next === 'approved') {
      const ok = await confirmDialog({ title: 'Approve this adoption?', text: `${a.pet?.name || 'The pet'} will be marked as adopted and any other pending applications for this pet will be declined.`, confirmLabel: 'Approve', tone: 'success', ic: 'heart-handshake' });
      if (!ok) return;
    } else if (a.status === 'approved') {
      const ok = await confirmDialog({ title: 'Undo this approval?', text: `${a.pet?.name || 'The pet'} will be listed as available for adoption again.`, confirmLabel: 'Undo approval', tone: 'danger', ic: 'undo-2' });
      if (!ok) return;
    }
    await busy(b, async () => {
      try {
        await api('/admin/applications/' + a.id, { method: 'PUT', body: { status: next, adminNote: $('#a-note', dlg)?.value || '' } });
        dlg.close();
        toast({ approved: 'Adoption approved', rejected: 'Application declined', pending: 'Application moved back to pending' }[next]);
        load();
      } catch (err) { toast(err.message, 'error'); }
    });
  }));
}
