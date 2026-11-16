// Small DOM helpers shared by every page.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const param = (key) => new URLSearchParams(location.search).get(key);

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

// Reads a form into a plain object (repeated names become arrays, files are skipped).
export function formData(form) {
  const out = {};
  for (const [k, v] of new FormData(form).entries()) {
    if (v instanceof File) continue;
    if (k in out) out[k] = [].concat(out[k], v); else out[k] = v;
  }
  return out;
}

// Accepts only same-site relative paths, so ?next= cannot redirect off site.
export const safeNext = (next) => (next && next.startsWith('/') && !next.startsWith('//') ? next : null);
