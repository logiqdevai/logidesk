document.addEventListener('DOMContentLoaded', () => {
  const C = MOCK.clients;
  const sum = (k) => C.reduce((a, c) => a + c.req[k], 0);
  const t = { approved: sum('approved'), review: sum('review'), missing: sum('missing'), expired: sum('expired'), expiring: sum('expiring') };
  const total = t.approved + t.review + t.missing + t.expired;
  const rejected = MOCK.documents.filter((d) => d.status === 'rejected').length;
  const forms = C.reduce((a, c) => a + c.forms, 0);
  const overdue = C.filter((c) => c.req.missing >= 3).length;

  const quick = [
    ['users', 'Add client', 'clients.html#new'], ['forms', 'Create document form', 'form-builder.html'],
    ['send', 'Assign a form', 'clients.html#assign'], ['upload', 'Upload a document', 'documents.html#upload'], ['bell', 'Send reminders', '#', 'c1']
  ];
  document.getElementById('quick').innerHTML = quick.map((q) =>
    '<a class="card cream clickable" style="padding:14px 16px;display:flex;gap:10px;align-items:center;color:var(--ink);font-weight:500" href="' + q[2] + '"' + (q[3] ? ' data-remind="' + q[3] + '"' : '') + '>' + Icons.i(q[0]) + q[1] + '</a>').join('');

  const stats = [
    ['Total clients', C.length, '', 'users'], ['Assigned forms', forms, 'across all clients', 'forms'], ['Awaiting submission', t.missing, 'documents missing', 'clock', 'warn'],
    ['Awaiting review', t.review, 'received, to review', 'eye'], ['Approved', t.approved, 'documents', 'check'],
    ['Rejected', rejected, 'need re-upload', 'x', rejected ? 'alert' : ''], ['Expired', t.expired, 'need replacement', 'alert', 'alert'], ['Expiring soon', t.expiring, 'within 30 days', 'calendar', 'warn'],
    ['Overdue submissions', overdue, 'clients past deadline', 'alert', 'alert'], ['Inbox needs review', MOCK.needsReview(), 'items', 'inbox']
  ];
  document.getElementById('stats').innerHTML = stats.map((s) =>
    '<div class="card stat ' + (s[4] || '') + '"><span class="label">' + Icons.i(s[3], 'sm') + s[0] + '</span><span class="value">' + s[1] + '</span><span class="sub">' + s[2] + '</span></div>').join('');

  const w = (n) => ((n / total) * 100).toFixed(1) + '%';
  document.getElementById('p-pct').textContent = Math.round((t.approved / total) * 100) + '%';
  document.getElementById('p-total').textContent = total + ' requested documents';
  document.getElementById('p-bar').innerHTML = '<span class="ok" style="width:' + w(t.approved) + '"></span><span class="rev" style="width:' + w(t.review) + '"></span><span class="bad" style="width:' + w(t.expired) + '"></span>';
  document.getElementById('p-legend').innerHTML = [['var(--success)', t.approved + ' completed'], ['var(--surface-cream-strong)', t.missing + ' missing'], ['var(--amber)', t.review + ' awaiting review'], ['var(--error)', t.expired + ' expired']].map((l) => '<span><i style="background:' + l[0] + '"></i>' + l[1] + '</span>').join('');

  document.getElementById('attention').innerHTML = C.filter((c) => c.req.missing || c.req.expired).sort((a, b) => (b.req.missing + b.req.expired * 2) - (a.req.missing + a.req.expired * 2)).slice(0, 6).map((c) =>
    '<tr class="clickable" onclick="location.href=\'client-detail.html\'"><td><div class="cell-main">' + c.name + '</div><div class="cell-sub">' + (c.company || c.email) + '</div></td>' +
    '<td>' + (c.req.missing || '<span class="soft">–</span>') + '</td><td>' + (c.req.expired ? '<span style="color:var(--error-ink);font-weight:500">' + c.req.expired + '</span>' : '<span class="soft">–</span>') + '</td><td>' + (c.req.expiring || '<span class="soft">–</span>') + '</td>' +
    '<td>' + UI.progressCell(c.req) + '</td><td class="actions"><button class="btn secondary sm" data-remind="' + c.id + '" onclick="event.stopPropagation()">' + Icons.i('send', 'sm') + 'Remind</button></td></tr>').join('');

  document.getElementById('inbox-n').textContent = MOCK.needsReview();
  document.getElementById('activity').innerHTML = MOCK.activity.map((a) =>
    '<li><span class="ico ' + a.tone + '">' + Icons.i(a.ico, 'sm') + '</span><div><div>' + a.text + '</div><div class="when">' + a.when + '</div></div></li>').join('');
});
