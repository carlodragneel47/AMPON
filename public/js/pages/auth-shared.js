// Shared behaviour for the log in and sign up pages.
import { $$ } from '../core/dom.js';
import { icon } from '../core/icons.js';

export function wirePasswordToggles() {
  $$('[data-toggle-pw]').forEach((btn) => btn.addEventListener('click', () => {
    const input = document.getElementById(btn.getAttribute('aria-controls'));
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.innerHTML = icon(show ? 'eye-off' : 'eye');
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  }));
}
