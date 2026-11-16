import { $, param, safeNext, formData } from '../core/dom.js';
import { api } from '../core/api.js';
import { initPublic } from '../core/layout.js';
import { busy, errorBox, modal } from '../core/ui.js';
import { wirePasswordToggles } from './auth-shared.js';

const me = await initPublic('login');
const next = safeNext(param('next'));
const home = (user) => next || (user.role === 'admin' ? '/admin/' : '/account/');
if (me) location.replace(home(me));
if (next) $('#alt-link').href = '/register?next=' + encodeURIComponent(next);

wirePasswordToggles();

$('#forgot').addEventListener('click', () => modal({
  title: 'Forgot your password?',
  size: 'sm',
  body: '<p class="muted" style="margin:0">For your security, passwords are reset by the shelter. Please visit or message the Ampon shelter office and an administrator will set a temporary password for you. You can then change it under <b>Profile and Security</b>.</p>',
  foot: '<button type="button" class="btn btn-primary" data-close>Got it</button>',
}));

const form = $('#form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#err').innerHTML = '';
  if (!form.checkValidity()) {
    $('#err').innerHTML = errorBox(new Error('Please enter a valid email address and your password.'));
    (form.querySelector(':invalid') || form.elements.email).focus();
    return;
  }
  await busy($('#submit'), async () => {
    try {
      const { user } = await api('/auth/login', { method: 'POST', body: formData(form) });
      location.href = home(user);
    } catch (err) {
      $('#err').innerHTML = errorBox(err);
      form.elements.password.select();
    }
  });
});
