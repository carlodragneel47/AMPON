import { $, esc } from '../core/dom.js';
import { api } from '../core/api.js';
import { icon } from '../core/icons.js';
import { initPublic } from '../core/layout.js';
import { scoreRing } from '../core/components.js';
import { errorBox } from '../core/ui.js';

await initPublic('rules');

try {
  const r = await api('/rules');
  $('#base').textContent = r.baseScore;
  const fmt = (t) => esc(t).replace(/\b(IF|THEN|AND|OR|otherwise)\b/g, '<span class="kw">$1</span>');
  const block = (ic, title, desc, rules) => `
    <section class="card card-pad">
      <div class="card-title" style="margin-bottom:6px"><span class="ico">${icon(ic)}</span><div><h2 style="margin:0">${title}</h2><p class="card-sub">${desc}</p></div></div>
      ${rules.map((x) => `<div class="rule"><code>${esc(x.id)}</code><div>${fmt(x.text)}</div></div>`).join('')}
    </section>`;
  $('#rules').innerHTML =
    block('shield-check', 'Eligibility rules', 'Applied first. A pet must pass all of them to be recommended.', r.eligibility) +
    block('scale', 'Compatibility rules', `Applied to every eligible pet. Points are added to a base score of ${r.baseScore} and the result stays between 0 and 100.`, r.compatibility) +
    block('stethoscope', 'Readiness rules', 'Checked whenever staff try to mark a rescued animal as available for adoption.', r.readiness);
  $('#labels').innerHTML = r.labels.map((l) => `<div>${scoreRing(l.min === 0 ? 40 : l.min, 'sm')}<div><b>${esc(l.label)}</b><div class="small muted">${l.min === 0 ? 'Below 50' : `${l.min} and above`}</div></div></div>`).join('');
} catch (e) {
  $('#rules').innerHTML = errorBox(e);
}
