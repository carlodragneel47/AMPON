import { $, esc } from '../../core/dom.js';
import { api } from '../../core/api.js';
import { icon } from '../../core/icons.js';
import { initPortal } from '../../core/layout.js';
import { fmtDateTime } from '../../core/format.js';
import { avatar } from '../../core/components.js';
import { errorBox, emptyState, toast } from '../../core/ui.js';
import { ACTION_LABELS } from './shared/actions.js';

const PAGE = 25;
const me = await initPortal('admin', {
  active: 'logs', title: 'System Logs', subtitle: 'Usage records for evaluating the system',
  actions: `<button class="btn btn-soft btn-sm" id="csv">${icon('download')}Export CSV</button>`,
});
let logs = [];
let page = 0;

if (me) {
  $('#action').addEventListener('change', () => { page = 0; load(); });
  $('#q').addEventListener('input', () => { page = 0; render(); });
  $('#csv').addEventListener('click', exportCsv);
  load();
}

async function load() {
  $('#logs-table').innerHTML = '<div class="spinner"></div>';
  try {
    const out = await api('/admin/logs?limit=2000&action=' + encodeURIComponent($('#action').value));
    logs = out.logs;
    const sel = $('#action');
    if (sel.options.length === 1) out.actions.forEach((a) => sel.add(new Option(ACTION_LABELS[a] || a, a)));
    render();
  } catch (e) { $('#logs-table').innerHTML = errorBox(e); }
}

function filtered() {
  const q = $('#q').value.trim().toLowerCase();
  return q ? logs.filter((l) => `${l.userName || 'guest'} ${l.details || ''}`.toLowerCase().includes(q)) : logs;
}

function render() {
  const rows = filtered();
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  page = Math.min(page, pages - 1);
  const slice = rows.slice(page * PAGE, page * PAGE + PAGE);
  $('#logs-table').innerHTML = slice.length ? `<table>
    <thead><tr><th>Date and time</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
    <tbody>${slice.map((l) => `<tr>
      <td style="white-space:nowrap" class="small">${esc(fmtDateTime(l.createdAt))}</td>
      <td><span class="cell-main" style="min-width:160px">${avatar(l.userName || 'Guest', 'avatar-sm')}<span>${esc(l.userName || 'Guest')}</span></span></td>
      <td><span class="tag">${esc(ACTION_LABELS[l.action] || l.action)}</span></td>
      <td class="small">${esc(l.details)}</td>
    </tr>`).join('')}</tbody></table>` : emptyState({ ic: 'scroll-text', title: 'No log records', text: 'Try another action or search term.' });

  $('#pager').innerHTML = rows.length > PAGE ? `
    <span>Showing ${page * PAGE + 1} to ${Math.min(rows.length, (page + 1) * PAGE)} of ${rows.length}</span>
    <div class="row">
      <button class="btn btn-soft btn-sm" id="prev" ${page === 0 ? 'disabled' : ''}>${icon('chevron-left')}Previous</button>
      <span class="small strong">Page ${page + 1} of ${pages}</span>
      <button class="btn btn-soft btn-sm" id="next" ${page >= pages - 1 ? 'disabled' : ''}>Next${icon('chevron-right')}</button>
    </div>` : rows.length ? `<span>${rows.length} records</span>` : '';
  $('#prev')?.addEventListener('click', () => { page--; render(); });
  $('#next')?.addEventListener('click', () => { page++; render(); });
}

function exportCsv() {
  const rows = filtered();
  if (!rows.length) { toast('There are no records to export', 'info'); return; }
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = ['id,date_time,user,action,details', ...rows.map((l) => [l.id, l.createdAt, l.userName || 'Guest', l.action, l.details].map(q).join(','))].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
  a.download = `ampon-system-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(`Exported ${rows.length} records`);
}
