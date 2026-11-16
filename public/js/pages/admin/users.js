import { $, $$, esc, formData } from '../../core/dom.js';
import { api } from '../../core/api.js';
import { icon } from '../../core/icons.js';
import { initPortal } from '../../core/layout.js';
import { fmtDate, timeAgo } from '../../core/format.js';
import { avatar, roleBadge } from '../../core/components.js';
import { toast, busy, errorBox, emptyState, modal, confirmDialog } from '../../core/ui.js';

const me = await initPortal('admin', {
  active: 'users', title: 'Users', subtitle: 'Adopter and administrator accounts',
  actions: `<button class="btn btn-primary btn-sm" id="add-user">${icon('user-plus')}Add account</button>`,
});
let users = [];
let role = 'all';

if (me) {
  $('#add-user').addEventListener('click', openAdd);
  $$('#role-filter input').forEach((r) => r.addEventListener('change', () => { role = r.value; render(); }));
  $('#q').addEventListener('input', render);
  load();
}

async function load() {
  try { users = (await api('/admin/users')).users; render(); }
  catch (e) { $('#users-table').innerHTML = errorBox(e); }
}

const stat = (ic, value, lbl, tone = '') => `<div class="card stat"><span class="ico ${tone}">${icon(ic)}</span><div><div class="v">${value}</div><div class="l">${lbl}</div></div></div>`;

function render() {
  const adopters = users.filter((u) => u.role === 'adopter');
  $('#stats').innerHTML =
    stat('users', users.length, 'Total accounts', 'ico-grad') +
    stat('user', adopters.length, 'Adopters') +
    stat('shield-check', users.length - adopters.length, 'Administrators') +
    stat('sparkles', adopters.filter((u) => u.preferences).length, 'Completed match profile', 'ico-success');

  const q = $('#q').value.trim().toLowerCase();
  const rows = users.filter((u) => (role === 'all' || u.role === role) && (!q || `${u.name} ${u.email}`.toLowerCase().includes(q)));
  const table = $('#users-table');
  if (!rows.length) { table.innerHTML = emptyState({ ic: 'users', title: 'No accounts found', text: 'Try another filter or search term.' }); return; }
  table.innerHTML = `<table>
    <thead><tr><th>Name</th><th>Role</th><th>Match profile</th><th class="num">Applications</th><th>Activity</th><th class="num">Action</th></tr></thead>
    <tbody>${rows.map((u) => `<tr>
      <td><span class="cell-main">${avatar(u.name, 'avatar-sm')}<span><span style="white-space:nowrap">${esc(u.name)}${u.isSelf ? ' <span class="badge plain b-info" style="margin-left:4px;padding:2px 8px">You</span>' : ''}</span><span class="sub">${esc(u.email)}</span><span class="sub">${esc(u.phone || 'No mobile number')}</span></span></span></td>
      <td>${roleBadge(u.role)}</td>
      <td>${u.role === 'admin' ? '<span class="faint small">Not needed</span>' : u.preferences ? '<span class="badge b-success">Completed</span>' : '<span class="badge b-muted">Not yet</span>'}</td>
      <td class="num">${u.applications}</td>
      <td style="white-space:nowrap" class="small"><div>Joined ${esc(fmtDate(u.createdAt))}</div><div class="muted">Last log in: ${esc(timeAgo(u.lastLogin))}</div></td>
      <td><div class="actions">${u.isSelf ? `<a class="btn btn-soft btn-sm" href="/admin/profile">${icon('pencil')}Edit</a>` : `<button class="btn btn-danger btn-icon btn-sm" data-del="${u.id}" title="Remove account" aria-label="Remove ${esc(u.name)}">${icon('trash-2')}</button>`}</div></td>
    </tr>`).join('')}</tbody></table>`;

  $$('[data-del]', table).forEach((b) => b.addEventListener('click', async () => {
    const u = users.find((x) => x.id === Number(b.dataset.del));
    const ok = await confirmDialog({ title: `Remove ${u.name}?`, text: u.role === 'adopter' ? 'The account and all of its adoption applications will be permanently removed.' : 'This administrator will immediately lose access to the Admin Console.', confirmLabel: 'Remove account', tone: 'danger', ic: 'trash-2' });
    if (!ok) return;
    await busy(b, async () => {
      try { await api('/admin/users/' + u.id, { method: 'DELETE' }); toast(`${u.name} was removed`); await load(); }
      catch (e) { toast(e.message, 'error'); }
    });
  }));
}

function openAdd() {
  const dlg = modal({
    title: 'Add an account',
    size: 'sm',
    body: `<form id="user-form" class="stack" novalidate>
      <div id="user-err"></div>
      <div class="field"><span class="label" id="role-l">Account type</span>
        <div class="segmented block" role="radiogroup" aria-labelledby="role-l">
          <label><input type="radio" name="role" value="adopter" checked><span>${icon('user')}Adopter</span></label>
          <label><input type="radio" name="role" value="admin"><span>${icon('shield-check')}Administrator</span></label>
        </div></div>
      <div class="field"><label for="u-name">Full name</label><input type="text" id="u-name" name="name" required maxlength="120"></div>
      <div class="field"><label for="u-email">Email address</label><input type="email" id="u-email" name="email" required maxlength="160"></div>
      <div class="field"><label for="u-phone">Mobile number <span class="faint">(optional)</span></label><input type="tel" id="u-phone" name="phone" maxlength="40"></div>
      <div class="field"><label for="u-pw">Temporary password</label><input type="text" id="u-pw" name="password" required minlength="6" autocomplete="off"><span class="hint">Share it privately. The user can change it under Profile and Security.</span></div>
    </form>`,
    foot: `<button type="button" class="btn btn-soft" data-close>Cancel</button><button type="submit" form="user-form" class="btn btn-primary" id="user-save">${icon('user-plus')}Create account</button>`,
  });
  const form = $('#user-form', dlg);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#user-err', dlg).innerHTML = '';
    if (!form.checkValidity()) {
      const bad = form.querySelector(':invalid');
      $('#user-err', dlg).innerHTML = errorBox(new Error(bad?.name === 'password' ? 'The temporary password must be at least 6 characters.' : bad?.name === 'email' ? 'Please enter a valid email address.' : 'Please enter the full name.'));
      bad?.focus();
      return;
    }
    await busy($('#user-save', dlg), async () => {
      try {
        const { user } = await api('/admin/users', { method: 'POST', body: formData(form) });
        dlg.close(); toast(`Account created for ${user.name}`); await load();
      } catch (err) { $('#user-err', dlg).innerHTML = errorBox(err); }
    });
  });
}
