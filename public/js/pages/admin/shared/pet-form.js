// Register / edit pet dialog used by the admin Pets page.
import { $, $$, esc } from '../../../core/dom.js';
import { api } from '../../../core/api.js';
import { icon } from '../../../core/icons.js';
import { TEMPERAMENTS, cap } from '../../../core/format.js';
import { modal, toast, busy, errorBox } from '../../../core/ui.js';

const BOOL_FIELDS = ['needsYard', 'specialNeeds', 'vaccinated', 'dewormed', 'neutered'];
const opt = (pairs, current) => pairs.map(([v, t]) => `<option value="${v}" ${String(current) === v ? 'selected' : ''}>${t}</option>`).join('');
const sw = (name, text, on) => `<label class="switch"><input type="checkbox" name="${name}" ${on ? 'checked' : ''}><span class="track"></span>${text}</label>`;

const DEFAULTS = { species: 'dog', sex: 'male', ageMonths: 12, size: 'medium', energy: 'moderate', aloneTolerance: 'medium', training: 'none', goodWithKids: 'unknown', goodWithDogs: 'unknown', goodWithCats: 'unknown', healthStatus: 'under_treatment', rehabProgress: 0, status: 'rescued', temperament: [] };

export function openPetForm(pet, onSaved) {
  const d = pet ? { ...pet } : { ...DEFAULTS, rescueDate: new Date().toISOString().slice(0, 10) };
  const yn = [['unknown', 'Not yet assessed'], ['yes', 'Yes'], ['no', 'No']];

  const dlg = modal({
    title: pet ? `Edit ${pet.name}` : 'Register a rescued pet',
    body: `<form id="pet-form" novalidate>
      <div id="pet-err"></div>
      <h4 style="display:flex;align-items:center;gap:10px;margin-bottom:16px"><span class="ico ico-sm">${icon('paw-print')}</span>Basic information</h4>
      <div class="form-grid">
        <div class="field full"><span class="label">Photo</span>
          <div class="photo-field"><div class="photo-preview" id="photo-preview">${d.photo ? `<img src="${esc(d.photo)}" alt="">` : icon('image', 'icon-lg')}</div>
          <div class="stack-sm"><input type="file" id="f-photo" name="photo" accept="image/jpeg,image/png,image/webp,image/gif"><span class="hint">JPG, PNG, WebP or GIF up to 4 MB</span>
          ${d.photo ? `<label class="check small"><input type="checkbox" id="f-remove">Remove current photo</label>` : ''}</div></div></div>
        <div class="field"><label for="f-name">Name</label><input type="text" id="f-name" name="name" required maxlength="80" value="${esc(d.name || '')}"></div>
        <div class="field"><label for="f-breed">Breed</label><input type="text" id="f-breed" name="breed" maxlength="80" placeholder="Aspin, Puspin, Shih Tzu mix" value="${esc(d.breed || '')}"></div>
        <div class="field"><label for="f-species">Species</label><select id="f-species" name="species">${opt([['dog', 'Dog'], ['cat', 'Cat']], d.species)}</select></div>
        <div class="field"><label for="f-sex">Sex</label><select id="f-sex" name="sex">${opt([['male', 'Male'], ['female', 'Female']], d.sex)}</select></div>
        <div class="field"><label for="f-age">Age in months</label><input type="number" id="f-age" name="ageMonths" min="0" max="300" required value="${esc(d.ageMonths ?? 0)}"><span class="hint">Example: 2 years is 24 months</span></div>
        <div class="field"><label for="f-size">Size</label><select id="f-size" name="size">${opt([['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']], d.size)}</select></div>
        <div class="field"><label for="f-color">Colour or markings</label><input type="text" id="f-color" name="color" maxlength="80" value="${esc(d.color || '')}"></div>
        <div class="field"><label for="f-rdate">Rescue date</label><input type="date" id="f-rdate" name="rescueDate" value="${esc(d.rescueDate || '')}"></div>
        <div class="field full"><label for="f-rloc">Rescue location</label><input type="text" id="f-rloc" name="rescueLocation" maxlength="160" placeholder="Barangay, Santa Maria" value="${esc(d.rescueLocation || '')}"></div>
        <div class="field full"><label for="f-desc">Description or rescue story</label><textarea id="f-desc" name="description" maxlength="3000">${esc(d.description || '')}</textarea></div>
      </div>

      <div class="form-section"><h4><span class="ico ico-sm">${icon('sparkles')}</span>Behaviour and lifestyle <span class="faint small">used by the matching rules</span></h4>
      <div class="form-grid">
        <div class="field"><label for="f-energy">Energy level</label><select id="f-energy" name="energy">${opt([['low', 'Low'], ['moderate', 'Moderate'], ['high', 'High']], d.energy)}</select></div>
        <div class="field"><label for="f-alone">Can be left alone</label><select id="f-alone" name="aloneTolerance">${opt([['low', 'Under 4 hours'], ['medium', '4 to 8 hours'], ['high', '8 hours or more']], d.aloneTolerance)}</select></div>
        <div class="field"><label for="f-training">Training</label><select id="f-training" name="training">${opt([['none', 'Not yet trained'], ['basic', 'Basic commands'], ['trained', 'House trained']], d.training)}</select></div>
        <div class="field"><label for="f-kids">Good with children</label><select id="f-kids" name="goodWithKids">${opt(yn, d.goodWithKids)}</select></div>
        <div class="field"><label for="f-dogs">Good with dogs</label><select id="f-dogs" name="goodWithDogs">${opt(yn, d.goodWithDogs)}</select></div>
        <div class="field"><label for="f-cats">Good with cats</label><select id="f-cats" name="goodWithCats">${opt(yn, d.goodWithCats)}</select></div>
        <div class="field full"><span class="label">Temperament</span><div class="chips">${TEMPERAMENTS.map((t) => `<label class="chip"><input type="checkbox" value="${t}" data-temp ${(d.temperament || []).includes(t) ? 'checked' : ''}><span>${cap(t)}</span></label>`).join('')}</div></div>
        <div class="field">${sw('needsYard', 'Needs a yard', d.needsYard)}</div>
        <div class="field">${sw('specialNeeds', 'Has special needs', d.specialNeeds)}</div>
        <div class="field full"><label for="f-snotes">Special needs notes</label><input type="text" id="f-snotes" name="specialNeedsNotes" maxlength="255" value="${esc(d.specialNeedsNotes || '')}"></div>
      </div></div>

      <div class="form-section"><h4><span class="ico ico-sm ico-success">${icon('stethoscope')}</span>Health, care and status</h4>
      <div class="form-grid">
        <div class="field"><label for="f-health">Health status</label><select id="f-health" name="healthStatus">${opt([['critical', 'Critical'], ['under_treatment', 'Under treatment'], ['recovering', 'Recovering'], ['healthy', 'Healthy']], d.healthStatus)}</select></div>
        <div class="field"><label for="f-rehab">Rehabilitation progress</label><div class="range-row"><input type="range" id="f-rehab" name="rehabProgress" min="0" max="100" step="5" value="${esc(d.rehabProgress ?? 0)}"><output id="f-rehab-val">${esc(d.rehabProgress ?? 0)}%</output></div></div>
        <div class="field full row" style="gap:24px">${sw('vaccinated', 'Vaccinated', d.vaccinated)}${sw('dewormed', 'Dewormed', d.dewormed)}${sw('neutered', 'Spayed or neutered', d.neutered)}</div>
        <div class="field full"><label for="f-status">Adoption status</label><select id="f-status" name="status">${opt([['rescued', 'Rescued (just arrived)'], ['rehabilitation', 'In rehabilitation'], ['available', 'Available for adoption'], ['adopted', 'Adopted']], d.status)}</select><span class="hint">A pet can only be set to Available after it passes every readiness rule.</span></div>
      </div></div>
    </form>`,
    foot: `<button type="button" class="btn btn-soft" data-close>Cancel</button><button type="submit" form="pet-form" class="btn btn-primary" id="pet-save">${icon('check')}${pet ? 'Save changes' : 'Register pet'}</button>`,
  });

  const form = $('#pet-form', dlg);
  const rehab = $('#f-rehab', dlg);
  rehab.addEventListener('input', () => { $('#f-rehab-val', dlg).textContent = rehab.value + '%'; });
  $('#f-photo', dlg).addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) $('#photo-preview', dlg).innerHTML = `<img src="${URL.createObjectURL(file)}" alt="">`;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#pet-err', dlg);
    err.innerHTML = '';
    if (!form.elements.name.value.trim()) { err.innerHTML = errorBox(new Error('Please enter the pet name.')); form.elements.name.focus(); return; }
    const fd = new FormData(form);
    BOOL_FIELDS.forEach((f) => fd.set(f, form.elements[f].checked ? 'true' : 'false'));
    fd.set('temperament', $$('[data-temp]:checked', form).map((c) => c.value).join(','));
    if (!$('#f-photo', dlg).files.length) fd.delete('photo');
    if ($('#f-remove', dlg)?.checked) fd.set('removePhoto', 'true');
    await busy($('#pet-save', dlg), async () => {
      try {
        const { pet: saved } = await api(pet ? '/pets/' + pet.id : '/pets', { method: pet ? 'PUT' : 'POST', form: fd });
        dlg.close();
        toast(pet ? `${saved.name} was updated` : `${saved.name} was registered`);
        onSaved?.(saved);
      } catch (ex) {
        err.innerHTML = errorBox(ex);
        err.scrollIntoView({ block: 'nearest' });
      }
    });
  });
}
