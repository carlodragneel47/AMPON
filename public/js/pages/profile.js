// Profile and password forms, shared by the adopter account and the admin console.
import { $, esc, formData } from '../core/dom.js';
import { api } from '../core/api.js';
import { initPortal } from '../core/layout.js';
import { avatar } from '../core/components.js';
import { LABELS, fmtDate } from '../core/format.js';
import { toast, busy, errorBox } from '../core/ui.js';
import { wirePasswordToggles } from './auth-shared.js';

const role = document.body.dataset.role || 'adopter';
const me = await initPortal(role, { active: 'profile', title: 'Profile and Security', subtitle: 'Manage your personal details and password' });
if (me) setup(me);

function header(user) {
  $('#profile-head').innerHTML = `${avatar(user.name, 'avatar-lg')}<div><h3>${esc(user.name)}</h3><p class="card-sub">${esc(LABELS.role[user.role])} since ${esc(fmtDate(user.createdAt))}</p></div>`;
}

function setup(user) {
  header(user);
  const pf = $('#profile');
  pf.elements.name.value = user.name;
  $('#p-email').value = user.email;
  pf.elements.phone.value = user.phone || '';
  pf.elements.address.value = user.address || '';
  wirePasswordToggles();

  pf.addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#profile-msg').innerHTML = '';
    if (!pf.elements.name.value.trim()) { $('#profile-msg').innerHTML = errorBox(new Error('Please enter your full name.')); pf.elements.name.focus(); return; }
    await busy($('#p-save'), async () => {
      try {
        const { user: updated } = await api('/auth/profile', { method: 'PUT', body: formData(pf) });
        header(updated);
        const sideName = document.querySelector('.side-user b');
        if (sideName) sideName.textContent = updated.name;
        toast('Your profile was saved');
      } catch (err) { $('#profile-msg').innerHTML = errorBox(err); }
    });
  });

  const pw = $('#password');
  pw.addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#pw-msg').innerHTML = '';
    const v = formData(pw);
    let problem = '';
    if (!v.currentPassword) problem = 'Please enter your current password.';
    else if ((v.newPassword || '').length < 6) problem = 'New password must be at least 6 characters.';
    else if (v.newPassword !== v.confirm) problem = 'The new passwords do not match.';
    if (problem) { $('#pw-msg').innerHTML = errorBox(new Error(problem)); return; }
    await busy($('#pw-save'), async () => {
      try {
        await api('/auth/password', { method: 'PUT', body: { currentPassword: v.currentPassword, newPassword: v.newPassword } });
        pw.reset();
        toast('Your password was updated');
      } catch (err) { $('#pw-msg').innerHTML = errorBox(err); }
    });
  });
}
