document.addEventListener('DOMContentLoaded', () => {
  const N = MOCK.notifications;
  document.getElementById('rows').innerHTML = N.map((n, i) =>
    '<tr class="clickable" data-i="' + i + '"><td><div class="cell-main">' + n.to + '</div><div class="cell-sub">' + n.email + '</div></td><td>' + n.type + '</td><td class="truncate" style="max-width:260px">' + n.subject + '</td>' +
    '<td><span class="row gap-2">' + Icons.i('mail', 'sm') + 'Email</span></td><td>' + n.by + '</td><td>' + n.when + '</td><td>' + UI.status(n.status) + '</td>' +
    '<td class="actions">' + (n.status === 'failed' ? '<button class="btn secondary sm" data-toast="Retry queued">Retry</button>' : '') + '</td></tr>').join('');

  document.getElementById('rows').addEventListener('click', (e) => {
    const tr = e.target.closest('tr'); if (!tr || e.target.closest('button')) return;
    const n = N[tr.dataset.i];
    document.getElementById('nm-body').innerHTML = '<dl class="kv"><dt>Recipient</dt><dd>' + n.to + ' &lt;' + n.email + '&gt;</dd><dt>Channel</dt><dd>Email</dd><dt>Related client</dt><dd><a href="client-detail.html">' + n.to + '</a></dd><dt>Status</dt><dd>' + UI.status(n.status) + '</dd><dt>Created</dt><dd>' + n.when + '</dd><dt>Provider response</dt><dd class="mono">' + (n.status === 'failed' ? '552 Mailbox full' : '250 OK · id re_8Xk2…') + '</dd>' + (n.reason ? '<dt>Failure reason</dt><dd style="color:var(--error-ink)">' + n.reason + '</dd>' : '') + '</dl>' +
      '<div class="divider"></div><div class="label" style="font-weight:500;color:var(--ink)">Message</div><div class="callout mt-2" style="white-space:pre-wrap">' + n.subject + '\n\nHi, this is an automated message from Meridian Accounting…</div>';
    UI.open('modal-notif');
  });

  // Templates
  const T = MOCK.templates; let cur = 0;
  const list = document.getElementById('tpl-list'), edit = document.getElementById('tpl-edit');
  function renderT() {
    list.innerHTML = '<div class="card-head"><h3>Templates</h3></div>' + T.map((t, i) => '<div class="list-row clickable" data-i="' + i + '" style="cursor:pointer;' + (i === cur ? 'background:var(--surface-soft)' : '') + '">' + Icons.i('mail') + '<span class="grow cell-main">' + t.name + '</span>' + Icons.i('right', 'sm') + '</div>').join('');
    const t = T[cur];
    edit.innerHTML = '<h3>' + t.name + '</h3><div class="field"><label for="ts">Subject</label><input id="ts" class="input" value="' + t.subject.replace(/"/g, '&quot;') + '"></div><div class="field"><label for="tb">Body</label><textarea id="tb" class="textarea" rows="9">' + t.body + '</textarea></div>' +
      '<div><div class="label" style="font-weight:500;color:var(--ink);margin-bottom:6px">Variables</div><div class="chips">' + ['client_name', 'company_name', 'form_name', 'missing_documents', 'expiration_date', 'portal_link'].map((v) => '<code class="var">{{' + v + '}}</code>').join('') + '</div></div>' +
      '<div class="row"><button class="btn" data-toast="Template saved">Save template</button><button class="btn secondary" data-toast="Test email sent to alex@meridian.co">Send test</button></div>';
  }
  list.addEventListener('click', (e) => { const r = e.target.closest('.list-row'); if (r) { cur = +r.dataset.i; renderT(); } });
  renderT();
});
