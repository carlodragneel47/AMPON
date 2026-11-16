// Care records and adoption readiness dialog (admin Overview and Pets pages).
import { $, esc, formData } from '../../../core/dom.js';
import { api } from '../../../core/api.js';
import { icon } from '../../../core/icons.js';
import { LABELS, fmtDateTime } from '../../../core/format.js';
import { petThumb, statusBadge, healthBadge, progress, checkItem } from '../../../core/components.js';
import { modal, toast, busy, errorBox } from '../../../core/ui.js';

export async function openCare(petId, onChange) {
  const dlg = modal({ title: 'Care and readiness', body: '<div class="spinner"></div>' });
  const body = $('.dlg-body', dlg);

  async function render() {
    let data;
    try { data = await api('/pets/' + petId); } catch (e) { body.innerHTML = errorBox(e); return; }
    const { pet, careLogs, readiness } = data;
    $('.dlg-head h3', dlg).textContent = `Care and readiness for ${pet.name}`;
    const canPublish = readiness.ready && (pet.status === 'rescued' || pet.status === 'rehabilitation');

    body.innerHTML = `<div class="stack">
      <div class="care-head">${petThumb(pet)}<div style="flex:1;min-width:200px"><div class="row" style="gap:8px"><b style="font-size:1.1rem">${esc(pet.name)}</b>${statusBadge(pet.status)}${healthBadge(pet.healthStatus)}</div><div style="margin-top:10px;max-width:320px">${progress(pet.rehabProgress, { thin: true })}</div></div></div>

      <div class="card card-pad">
        <div class="card-head"><h4 style="margin:0">Adoption readiness rules</h4>${readiness.ready ? '<span class="badge b-success">Ready</span>' : '<span class="badge b-warn">Not ready</span>'}</div>
        <ul class="checks">${readiness.checks.map((c) => checkItem(c.ok ? 'ok' : 'no', `${esc(c.text)} <span class="rule-id">${esc(c.rule)}</span>`)).join('')}${readiness.advisories.map((a) => checkItem('adv', esc(a))).join('')}</ul>
        ${canPublish ? `<button class="btn btn-success" id="publish" style="margin-top:18px">${icon('circle-check')}Publish for adoption</button>` : ''}
      </div>

      <form class="card card-pad" id="care-form" novalidate>
        <h4 style="margin-bottom:16px">Add a care record</h4>
        <div id="care-err"></div>
        <div class="form-grid">
          <div class="field"><label for="c-type">Record type</label><select id="c-type" name="type">${Object.entries(LABELS.careType).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><span class="hint">Vaccination and deworming records update the checklist automatically.</span></div>
          <div class="field"><label for="c-health">Update health status</label><select id="c-health" name="healthStatus"><option value="">No change</option>${Object.entries(LABELS.healthStatus).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
          <div class="field"><label for="c-rehab">Update rehabilitation progress (%)</label><input type="number" id="c-rehab" name="rehabProgress" min="0" max="100" placeholder="Currently ${pet.rehabProgress}"></div>
          <div class="field" style="justify-content:flex-end"><label class="switch"><input type="checkbox" name="neutered" value="true"><span class="track"></span>Spayed or neutered during this visit</label></div>
          <div class="field full"><label for="c-notes">Notes</label><textarea id="c-notes" name="notes" required maxlength="2000" placeholder="Findings, treatment given or behaviour observations"></textarea></div>
        </div>
        <button class="btn btn-primary" type="submit" id="care-save" style="margin-top:18px">${icon('plus')}Save care record</button>
      </form>

      <div class="card card-pad"><h4>Care history</h4>${careLogs.length ? `<ul class="timeline" style="margin-top:14px">${careLogs.map((c) => `<li><div class="when">${esc(fmtDateTime(c.createdAt))} · ${esc(LABELS.careType[c.type] || c.type)}</div><div class="what">${esc(c.notes)}</div></li>`).join('')}</ul>` : '<p class="muted small" style="margin:0">No care records yet.</p>'}</div>
    </div>`;

    const form = $('#care-form', body);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      $('#care-err', body).innerHTML = '';
      if (!form.elements.notes.value.trim()) { $('#care-err', body).innerHTML = errorBox(new Error('Please write a short note for this record.')); form.elements.notes.focus(); return; }
      await busy($('#care-save', body), async () => {
        try {
          await api(`/pets/${pet.id}/care`, { method: 'POST', body: formData(form) });
          toast('Care record saved');
          await render(); onChange?.();
        } catch (err) { $('#care-err', body).innerHTML = errorBox(err); }
      });
    });
    $('#publish', body)?.addEventListener('click', async (e) => {
      await busy(e.currentTarget, async () => {
        try {
          await api('/pets/' + pet.id, { method: 'PUT', body: { status: 'available' } });
          toast(`${pet.name} is now listed for adoption`);
          await render(); onChange?.();
        } catch (err) { toast(err.message, 'error'); }
      });
    });
  }
  await render();
}
