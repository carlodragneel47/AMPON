import { $, esc, param, formData } from '../core/dom.js';
import { api } from '../core/api.js';
import { icon } from '../core/icons.js';
import { initPublic } from '../core/layout.js';
import { LABELS, ageLabel, cap, fmtDate } from '../core/format.js';
import { petMedia, statusBadge, healthBadge, scoreRing, reasonsList, progress, checkItem } from '../core/components.js';
import { toast, busy, errorBox, emptyState, alertBox, modal } from '../core/ui.js';

const page = $('#page');
const me = await initPublic('pets');
const id = param('id');

const notFound = (msg) => {
  page.innerHTML = `<div class="card" style="max-width:560px;margin:40px auto">${emptyState({ ic: 'paw-print', title: msg, text: 'The pet may have been adopted or removed from the list.', action: '<a class="btn btn-primary" href="/pets">Browse pets</a>' })}</div>`;
};

let data;
if (!id) notFound('No pet selected');
else {
  try { data = await api('/pets/' + encodeURIComponent(id)); }
  catch (e) { notFound(e.status === 404 ? 'Pet not found' : e.message); }
}

if (data) render(data);

function render({ pet, careLogs, readiness, match, myApplication, ageGroup }) {
  document.title = `${pet.name} | Ampon`;
  const compat = (title, v, ic) => `<div class="${v}"><span class="ico ico-sm">${icon(ic)}</span>${title}<b>${esc(LABELS.yesNo[v])}</b></div>`;
  const fact = (ic, dt, dd) => `<div><span class="ico ico-sm">${icon(ic)}</span><div><dt>${dt}</dt><dd>${dd}</dd></div></div>`;
  const temperament = (pet.temperament || []).map((t) => `<span class="tag">${esc(cap(t))}</span>`).join('') || '<span class="muted small">Not yet assessed</span>';

  page.innerHTML = `
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/pets">${icon('arrow-left')}All pets</a><span>/</span><span>${esc(pet.name)}</span></nav>
    <div class="profile">
      <div class="profile-media stack">
        <div class="profile-photo">${petMedia(pet, { badge: true, eager: true })}</div>
        ${matchBlock(pet, match)}
      </div>
      <div class="stack">
        <div class="profile-title">
          <h1>${esc(pet.name)}</h1>
          <div class="sub">
            <span>${icon(pet.species === 'cat' ? 'cat' : 'dog')}${esc(pet.breed || LABELS.species[pet.species])}</span>
            <span>${icon('user')}${esc(LABELS.sex[pet.sex])}</span>
            <span>${icon('cake')}${esc(ageLabel(pet.ageMonths))} (${esc(LABELS.ageGroup[ageGroup])})</span>
          </div>
        </div>
        <div id="action">${actionBlock(pet, myApplication)}</div>
        ${pet.description ? `<p class="lead" style="margin:0">${esc(pet.description)}</p>` : ''}
        <dl class="kv">
          ${fact('ruler', 'Size', esc(LABELS.size[pet.size]))}
          ${fact('palette', 'Colour', esc(pet.color || 'Not recorded'))}
          ${fact('zap', 'Energy level', esc(LABELS.energy[pet.energy]))}
          ${fact('badge-check', 'Training', esc(LABELS.training[pet.training]))}
          ${fact('clock', 'Can be left alone', esc(LABELS.aloneTolerance[pet.aloneTolerance]))}
          ${fact('trees', 'Needs a yard', pet.needsYard ? 'Yes' : 'No')}
          ${fact('calendar', 'Rescued', esc(fmtDate(pet.rescueDate)))}
          ${fact('map-pin', 'Found in', esc(pet.rescueLocation || 'Not recorded'))}
        </dl>
        <div class="card card-pad"><h3>Personality</h3><div class="tags">${temperament}</div></div>
        <div><h3>Gets along with</h3><div class="compat">${compat('Children', pet.goodWithKids, 'baby')}${compat('Dogs', pet.goodWithDogs, 'dog')}${compat('Cats', pet.goodWithCats, 'cat')}</div></div>
        ${pet.specialNeeds ? alertBox('info', `<b>Special needs.</b> ${esc(pet.specialNeedsNotes || 'Requires extra care.')}`, 'heart') : ''}
        <div class="card card-pad">
          <div class="card-head"><div class="card-title"><span class="ico ico-success">${icon('stethoscope')}</span><h3>Health and care</h3></div>${healthBadge(pet.healthStatus)}</div>
          <ul class="checks">
            ${checkItem(pet.vaccinated ? 'ok' : 'no', pet.vaccinated ? 'Vaccinated' : 'Not yet vaccinated')}
            ${checkItem(pet.dewormed ? 'ok' : 'no', pet.dewormed ? 'Dewormed' : 'Not yet dewormed')}
            ${checkItem(pet.neutered ? 'ok' : 'adv', pet.neutered ? 'Spayed or neutered' : 'Not yet spayed or neutered')}
          </ul>
          <p class="label" style="margin:22px 0 10px">Rehabilitation progress</p>${progress(pet.rehabProgress)}
          ${pet.status !== 'available' && pet.status !== 'adopted' ? `<p class="label" style="margin:22px 0 10px">Adoption readiness</p><ul class="checks">${readiness.checks.map((c) => checkItem(c.ok ? 'ok' : 'no', esc(c.text))).join('')}</ul>` : ''}
        </div>
        ${careLogs.length ? `<div class="card card-pad"><h3>Care timeline</h3><ul class="timeline">${careLogs.map((c) => `<li><div class="when">${esc(fmtDate(c.createdAt))} · ${esc(LABELS.careType[c.type] || c.type)}</div><div class="what">${esc(c.notes)}</div></li>`).join('')}</ul></div>` : ''}
      </div>
    </div>`;

  $('#apply-btn')?.addEventListener('click', () => openApply(pet));
}

function actionBlock(pet, app) {
  if (pet.status === 'adopted') return alertBox('success', `${esc(pet.name)} has already found a loving home.`, 'heart-handshake');
  if (pet.status !== 'available') return alertBox('info', `${esc(pet.name)} is still being cared for by the shelter and is not yet available for adoption. Please check back soon.`, 'stethoscope');
  if (!me) return `<a class="btn btn-primary btn-lg btn-block" href="/login?next=${encodeURIComponent(location.pathname + location.search)}">${icon('log-in')}Log in to apply for ${esc(pet.name)}</a>`;
  if (me.role === 'admin') return `<a class="btn btn-soft btn-block" href="/admin/pets">${icon('settings')}Manage in the Admin Console</a>`;
  if (app?.status === 'pending') return alertBox('success', `Your application was submitted on ${esc(fmtDate(app.createdAt))} and is under review. <a href="/account/applications">Track it in your account</a>.`, 'circle-check');
  if (app?.status === 'approved') return alertBox('success', `Your application was approved. The shelter will contact you soon.${app.adminNote ? `<br>${esc(app.adminNote)}` : ''}`, 'heart-handshake');
  const prev = app?.status === 'rejected'
    ? alertBox('warn', `Your previous application was not approved.${app.adminNote ? ` Shelter note: ${esc(app.adminNote)}` : ''} You may apply again.`, 'info') + '<div style="height:12px"></div>'
    : '';
  return `${prev}<button class="btn btn-primary btn-lg btn-block" id="apply-btn">${icon('heart')}Apply to adopt ${esc(pet.name)}</button>`;
}

function matchBlock(pet, match) {
  if (pet.status !== 'available') return '';
  const quiz = (text) => `<div class="card card-pad"><div class="card-title" style="margin-bottom:10px"><span class="ico">${icon('sparkles')}</span><h3>Is ${esc(pet.name)} right for you?</h3></div><p class="muted small">${text}</p><a class="btn btn-primary btn-sm" href="/match">Take the match questionnaire</a></div>`;
  if (!me || me.role !== 'adopter') return quiz('Answer a short questionnaire to see your compatibility score.');
  if (!match) return quiz('Complete the match questionnaire to see your compatibility score for every pet.');
  if (!match.eligible) {
    return `<div class="card card-pad"><h3>Your compatibility</h3>${alertBox('error', `Based on your saved answers, ${esc(pet.name)} is not recommended for your household:<ul>${match.excludedBy.map((x) => `<li>${esc(x.reason)} <span class="rule-id">${esc(x.rule)}</span></li>`).join('')}</ul>`, 'triangle-alert')}<p class="small muted" style="margin:14px 0 0">Did your situation change? <a href="/match">Update your answers</a>.</p></div>`;
  }
  return `<div class="card card-pad">
    <div class="match-box">${scoreRing(match.score, 'lg')}<div><span class="eyebrow" style="margin-bottom:6px">Your compatibility</span><h3 style="margin:0">${esc(match.label)}</h3><p class="small muted" style="margin:4px 0 0">Starts at 50. Each rule below adds or subtracts points.</p></div></div>
    ${reasonsList(match.reasons)}
    <p class="small" style="margin:16px 0 0"><a href="/rules">How is this calculated?</a> · <a href="/match">Update my answers</a></p>
  </div>`;
}

function openApply(pet) {
  const dlg = modal({
    title: `Adoption application for ${pet.name}`,
    body: `<form id="apply-form" class="stack" novalidate>
        <div id="apply-error"></div>
        <div class="form-grid">
          <div class="field"><label for="ap-phone">Mobile number</label><div class="input-wrap">${icon('phone')}<input type="tel" id="ap-phone" name="phone" required maxlength="40" autocomplete="tel" value="${esc(me.phone || '')}"></div></div>
          <div class="field"><label for="ap-address">Home address</label><div class="input-wrap">${icon('map-pin')}<input type="text" id="ap-address" name="address" required maxlength="255" autocomplete="street-address" value="${esc(me.address || '')}"></div></div>
          <div class="field full"><label for="ap-reason">Why would you like to adopt ${esc(pet.name)}?</label><textarea id="ap-reason" name="reason" required maxlength="2000" placeholder="Tell us about your household, your daily routine and how you plan to care for the pet."></textarea></div>
          <label class="switch full"><input type="checkbox" name="homeVisitOk" value="true" checked><span class="track"></span>I agree to a home visit or video call by shelter staff</label>
          <label class="check full"><input type="checkbox" name="agree" value="true" required>I commit to responsible pet ownership, including proper food, shelter and veterinary care, and I will never abandon the pet.</label>
        </div>
      </form>`,
    foot: `<button type="button" class="btn btn-soft" data-close>Cancel</button><button type="submit" form="apply-form" class="btn btn-primary" id="apply-submit">${icon('send')}Submit application</button>`,
  });
  const form = $('#apply-form', dlg);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#apply-error', dlg).innerHTML = '';
    const v = formData(form);
    if (!v.phone?.trim() || !v.address?.trim() || !v.reason?.trim()) { $('#apply-error', dlg).innerHTML = errorBox(new Error('Please complete your mobile number, address and reason.')); return; }
    if (!v.agree) { $('#apply-error', dlg).innerHTML = errorBox(new Error('Please confirm the responsible ownership agreement.')); return; }
    await busy($('#apply-submit', dlg), async () => {
      try {
        await api('/applications', { method: 'POST', body: { ...v, petId: pet.id } });
        dlg.close();
        toast(`Your application for ${pet.name} was submitted`);
        setTimeout(() => location.reload(), 900);
      } catch (err) {
        $('#apply-error', dlg).innerHTML = errorBox(err);
        $('#apply-error', dlg).scrollIntoView({ block: 'nearest' });
      }
    });
  });
}
