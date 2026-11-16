// Feedback and dialog helpers: toasts, loading buttons, errors, confirm and modal.
import { esc } from './dom.js';
import { icon } from './icons.js';

export function toast(message, type = 'success') {
  let wrap = document.querySelector('.toasts');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toasts'; wrap.setAttribute('aria-live', 'polite');
    document.body.appendChild(wrap);
  }
  const ic = { success: ['circle-check', 'ico-success'], error: ['triangle-alert', 'ico-danger'], info: ['info', ''] }[type] || ['info', ''];
  const t = document.createElement('div');
  t.className = 'toast';
  if (type === 'error') t.setAttribute('role', 'alert');
  t.innerHTML = `<span class="ico ${ic[1]}">${icon(ic[0])}</span><span>${esc(message)}</span>`;
  wrap.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, 4000);
}

// Shows a spinner on the button while the async function runs.
export async function busy(btn, fn) {
  if (!btn) return fn();
  btn.disabled = true; btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true');
  try { return await fn(); } finally { btn.disabled = false; btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); }
}

export function errorBox(err) {
  const r = err?.data?.readiness;
  const items = r ? r.checks.filter((c) => !c.ok).map((c) => `<li>${esc(c.text)}</li>`).join('') : '';
  return `<div class="alert alert-error" role="alert">${icon('triangle-alert')}<div>${esc(err?.message || 'Something went wrong')}${items ? `<ul>${items}</ul>` : ''}</div></div>`;
}

export const alertBox = (type, html, ic = 'info') => `<div class="alert alert-${type}">${icon(ic)}<div>${html}</div></div>`;

export const emptyState = ({ ic = 'inbox', title = '', text = '', action = '' } = {}) =>
  `<div class="empty"><div class="ico">${icon(ic)}</div>${title ? `<h3>${esc(title)}</h3>` : ''}${text ? `<p>${text}</p>` : ''}${action}</div>`;

export const skeletonCards = (n = 3) => Array.from({ length: n }, () => `
  <div class="card pet-card skel-card" aria-hidden="true">
    <div class="skel skel-media"></div>
    <div class="body"><div class="skel skel-line w60"></div><div class="skel skel-line w80"></div><div class="skel skel-line w40"></div></div>
  </div>`).join('');

// Builds a <dialog>, wires every [data-close] button and removes it on close.
export function modal({ title, body, foot = '', size = '' }) {
  const dlg = document.createElement('dialog');
  if (size) dlg.className = size;
  dlg.setAttribute('aria-label', title);
  dlg.innerHTML = `
    <div class="dlg-head"><h3>${esc(title)}</h3><button type="button" class="btn btn-soft btn-icon btn-sm" data-close aria-label="Close">${icon('x')}</button></div>
    <div class="dlg-body">${body}</div>
    ${foot ? `<div class="dlg-foot">${foot}</div>` : ''}`;
  document.body.appendChild(dlg);
  dlg.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) dlg.close(); });
  dlg.addEventListener('close', () => setTimeout(() => dlg.remove(), 50));
  dlg.showModal();
  return dlg;
}

// Promise based confirmation dialog. Resolves true when confirmed.
export function confirmDialog({ title, text = '', confirmLabel = 'Confirm', tone = 'primary', ic = 'circle-help' }) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'sm';
    dlg.setAttribute('aria-label', title);
    const toneIco = tone === 'danger' ? 'ico-danger' : tone === 'success' ? 'ico-success' : '';
    const btn = tone === 'danger' ? 'btn-danger' : tone === 'success' ? 'btn-success' : 'btn-primary';
    dlg.innerHTML = `
      <div class="confirm-body"><div class="ico ${toneIco}">${icon(ic)}</div><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}</div>
      <div class="confirm-foot"><button type="button" class="btn btn-soft" data-no>Cancel</button><button type="button" class="btn ${btn}" data-yes>${esc(confirmLabel)}</button></div>`;
    document.body.appendChild(dlg);
    let result = false;
    dlg.querySelector('[data-yes]').addEventListener('click', () => { result = true; dlg.close(); });
    dlg.querySelector('[data-no]').addEventListener('click', () => dlg.close());
    dlg.addEventListener('close', () => { resolve(result); setTimeout(() => dlg.remove(), 50); });
    dlg.showModal();
    dlg.querySelector('[data-no]').focus();
  });
}
