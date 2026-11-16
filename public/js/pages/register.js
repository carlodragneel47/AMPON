import { $, param, safeNext, formData } from '../core/dom.js';
import { api } from '../core/api.js';
import { initPublic } from '../core/layout.js';
import { busy, errorBox } from '../core/ui.js';
import { wirePasswordToggles } from './auth-shared.js';

const me = await initPublic('register');
const next = safeNext(param('next'));
if (me) location.replace(me.role === 'admin' ? '/admin/' : '/account/');
if (next) $('#alt-link').href = '/login?next=' + encodeURIComponent(next);

wirePasswordToggles();

const form = $('#form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#err').innerHTML = '';
  if (!form.checkValidity()) {
    const bad = form.querySelector(':invalid');
    const msg = bad?.name === 'password' ? 'Password must be at least 6 characters.' : bad?.name === 'email' ? 'Please enter a valid email address.' : 'Please enter your full name.';
    $('#err').innerHTML = errorBox(new Error(msg));
    bad?.focus();
    return;
  }
  await busy($('#submit'), async () => {
    try {
      await api('/auth/register', { method: 'POST', body: formData(form) });
      location.href = next || '/match';
    } catch (err) { $('#err').innerHTML = errorBox(err); }
  });
});
