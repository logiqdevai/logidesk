/* Employee view of one client's full form: every answer + every document. View mode is read-only; Edit mode lets any team member change answers and documents on the client's behalf. */
document.addEventListener('DOMContentLoaded', () => {
  const q = new URLSearchParams(location.search);
  const client = MOCK.clientById(q.get('client')) || MOCK.clientById('c1');
  const form = MOCK.forms.find((x) => x.id === q.get('form')) || MOCK.forms[1];
  const me = MOCK.me.name;

  // Answers per form. t: short | number | yesno | dropdown | date | long | checks
  const SECTIONS = form.id === 'f1' ? [
    { title: 'Personal details', fields: [
      { t: 'short', l: 'Full legal name', v: client.name, req: true }, { t: 'date', l: 'Date of birth', v: '1988-04-17', req: true },
      { t: 'dropdown', l: 'Nationality', opts: 'Greek|Irish|Polish|British|Other', v: 'Greek', req: true }, { t: 'short', l: 'Tax residence country', v: 'Greece' } ] },
    { title: 'Address & source of funds', fields: [
      { t: 'long', l: 'Residential address', v: '14 Ermou St, Athens 105 63', full: true, req: true },
      { t: 'checks', l: 'Source of funds', opts: ['Salary', 'Business income', 'Investments', 'Other'], v: ['Salary', 'Investments'], full: true },
      { t: 'yesno', l: 'Politically exposed person?', v: 'No', req: true } ] }
  ] : [
    { title: 'Company details', fields: [
      { t: 'short', l: 'Registered company name', v: client.company || client.name, req: true, full: true },
      { t: 'short', l: 'Registration number', v: 'GEMI 123456701000' }, { t: 'date', l: 'Date of incorporation', v: '2011-06-02' },
      { t: 'yesno', l: 'Do you operate vehicles?', v: 'Yes', req: true }, { t: 'number', l: 'Number of vehicles', v: '18' } ] },
    { title: 'Operations', fields: [
      { t: 'dropdown', l: 'Industry', opts: 'Freight and logistics|Construction|Healthcare|Retail|Other', v: 'Freight and logistics', req: true },
      { t: 'number', l: 'Number of employees', v: '40' },
      { t: 'checks', l: 'Services you provide', opts: ['Road freight', 'Warehousing', 'Customs brokerage', 'Last-mile delivery'], v: ['Road freight', 'Warehousing'], full: true },
      { t: 'long', l: 'Anything else we should know?', v: 'We added three new refrigerated trucks in September. Insurance renewal is in progress with our broker.', full: true } ] }
  ];

  const R = [
    { id: 1, name: 'Certificate of Incorporation', req: true, status: 'approved', file: 'incorporation-cert.pdf', size: '412 KB', exp: '', by: 'Client', on: '14 Mar 2026' },
    { id: 2, name: 'Tax Clearance Certificate', req: true, status: 'review', file: 'tax-clearance-2026.pdf', size: '1.2 MB', exp: '30 Jun 2027', by: 'Client', on: '26 Oct 2026' },
    { id: 3, name: 'Public Liability Insurance', req: true, status: 'expiring', file: 'liability-insurance.pdf', size: '640 KB', exp: '15 Nov 2026', by: 'Tom Becker', on: '16 Nov 2025' },
    { id: 4, name: 'Health & Safety Certificate', req: true, status: 'missing', file: '', size: '', exp: '', by: '', on: '' },
    { id: 5, name: 'Fleet Vehicle List', req: false, status: 'approved', file: 'fleet-list.xlsx', size: '56 KB', exp: '', by: 'Client', on: '02 Oct 2026' }
  ];
  const history = [
    { ico: 'upload', tone: 'brand', t: '<b>' + client.first + '</b> uploaded <b>Tax Clearance Certificate</b>', w: '26 Oct 2026, 16:42' },
    { ico: 'edit', tone: '', t: '<b>Tom Becker</b> changed <b>Number of vehicles</b> from 15 to 18', w: '20 Oct 2026, 11:05' },
    { ico: 'check', tone: 'ok', t: '<b>Maria Costa</b> approved <b>Certificate of Incorporation</b>', w: '15 Mar 2026, 09:30' }
  ];

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  let n = 0;
  const field = (f) => {
    const id = 'f' + n++, lbl = '<label for="' + id + '">' + f.l + (f.req ? ' <span style="color:var(--error)">*</span>' : '') + '</label>';
    let ctl;
    if (f.t === 'long') ctl = '<textarea id="' + id + '" class="textarea" rows="3">' + esc(f.v) + '</textarea>';
    else if (f.t === 'dropdown') return '<div class="field' + (f.full ? ' full' : '') + '"><span class="label">' + f.l + (f.req ? ' <span style="color:var(--error)">*</span>' : '') + '</span>' + UI.select({ block: true, options: f.opts.split('|'), value: f.v }) + '</div>';
    else if (f.t === 'yesno') return '<div class="field"><span class="label">' + f.l + (f.req ? ' <span style="color:var(--error)">*</span>' : '') + '</span><div class="segmented" style="align-self:flex-start"><button type="button" class="' + (f.v === 'Yes' ? 'active' : '') + '" data-value="Yes">Yes</button><button type="button" class="' + (f.v === 'No' ? 'active' : '') + '" data-value="No">No</button></div></div>';
    else if (f.t === 'checks') return '<div class="field full"><span class="label">' + f.l + '</span><div class="chips">' + f.opts.map((o) => '<label class="check chip"><input type="checkbox" ' + (f.v.includes(o) ? 'checked' : '') + '>' + o + '</label>').join('') + '</div></div>';
    else ctl = '<input id="' + id + '" class="input" type="' + (f.t === 'number' ? 'number' : f.t === 'date' ? 'date' : 'text') + '" value="' + esc(f.v) + '">';
    return '<div class="field' + (f.full ? ' full' : '') + '">' + lbl + ctl + '</div>';
  };

  document.getElementById('sections').innerHTML = SECTIONS.map((s) =>
    '<section class="card"><div class="section-title">' + s.title + '</div><div class="card-body form-grid">' + s.fields.map(field).join('') + '</div></section>').join('');

  function drawDocs() {
    const box = document.getElementById('reqs');
    box.querySelectorAll('.req-card').forEach((e) => e.remove());
    R.forEach((r) => {
      const el = document.createElement('div');
      el.className = 'req-card' + (r.status === 'rejected' || r.status === 'expired' ? ' problem' : '');
      el.innerHTML = '<div><div class="title">' + r.name + ' ' + (r.req ? '' : '<span class="badge plain">Optional</span>') + UI.status(r.status) + '</div>' +
        '<div class="meta">' + (r.file ? '<span class="file-chip">' + Icons.i('file', 'sm') + r.file + ' <span class="soft">· ' + r.size + '</span></span><span class="caption">Uploaded ' + r.on + ' by ' + r.by + '</span>' : '<span class="soft">No file uploaded yet</span>') + (r.exp ? '<span class="caption">Expires ' + r.exp + '</span>' : '') + '</div></div>' +
        '<div class="row gap-2 wrap">' + (r.file ? '<button type="button" class="icon-btn flat" data-toast="Opening preview (signed link, 5 min)" aria-label="Preview">' + Icons.i('eye') + '</button><button type="button" class="icon-btn flat" data-toast="Download started" aria-label="Download">' + Icons.i('download') + '</button>' : '') +
        (r.status === 'review' ? '<button type="button" class="btn sm" data-act="approved" data-id="' + r.id + '">Approve</button><button type="button" class="btn secondary sm danger" data-act="rejected" data-id="' + r.id + '">Reject</button>' : '') +
        '<button type="button" class="btn secondary sm" data-act="upload" data-id="' + r.id + '">' + Icons.i('upload', 'sm') + (r.file ? 'Replace' : 'Upload for client') + '</button></div>';
      box.appendChild(el);
    });
    const done = R.filter((r) => r.status === 'approved').length, rev = R.filter((r) => r.status === 'review').length;
    document.getElementById('req-sum').textContent = done + ' of ' + R.length + ' approved';
    document.getElementById('pct').textContent = Math.round((done / R.length) * 100) + '%';
    document.getElementById('bar').innerHTML = '<span class="ok" style="width:' + (done / R.length * 100) + '%"></span><span class="rev" style="width:' + (rev / R.length * 100) + '%"></span>';
    document.getElementById('f-status').innerHTML = done === R.length ? UI.status('complete') : rev ? UI.status('review') : UI.status('inprogress');
  }

  function drawHistory() {
    document.getElementById('history').innerHTML = history.map((h) => '<li><span class="ico ' + h.tone + '">' + Icons.i(h.ico, 'sm') + '</span><div><div>' + h.t + '</div><div class="when">' + h.w + '</div></div></li>').join('');
  }

  document.getElementById('reqs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const r = R.find((x) => x.id === +b.dataset.id), a = b.dataset.act;
    if (a === 'upload') { r.file = r.name.toLowerCase().replace(/[^a-z]+/g, '-') + '.pdf'; r.size = '320 KB'; r.status = 'approved'; r.by = me; r.on = '27 Oct 2026'; history.unshift({ ico: 'upload', tone: 'brand', t: '<b>' + me + '</b> uploaded <b>' + r.name + '</b> on the client\'s behalf', w: 'Just now' }); UI.toast('File uploaded for ' + client.first); }
    else { r.status = a; history.unshift({ ico: a === 'approved' ? 'check' : 'x', tone: a === 'approved' ? 'ok' : 'bad', t: '<b>' + me + '</b> ' + a.replace('approved', 'approved').replace('rejected', 'rejected') + ' <b>' + r.name + '</b>', w: 'Just now' }); UI.toast(a === 'approved' ? 'Document approved' : 'Document rejected · client notified'); }
    drawDocs(); drawHistory();
  });

  const page = document.getElementById('page'), fs = document.getElementById('fs');
  const setMode = (m) => {
    const edit = m === 'edit';
    page.classList.toggle('is-view', !edit);
    fs.disabled = !edit;
    document.getElementById('edit-bar').classList.toggle('hidden', !edit);
    document.querySelectorAll('#mode button').forEach((b) => b.classList.toggle('active', b.dataset.value === m));
  };
  document.getElementById('mode').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setMode(b.dataset.value); });
  document.getElementById('cancel').addEventListener('click', () => setMode('view'));
  document.getElementById('save').addEventListener('click', () => {
    history.unshift({ ico: 'edit', tone: '', t: '<b>' + me + '</b> edited answers on <b>' + form.name + '</b>', w: 'Just now' });
    drawHistory(); setMode('view'); UI.toast('Answers saved · recorded in the audit log');
  });

  document.title = client.name + ' · ' + form.name + ' · LogiDesk';
  document.getElementById('c-crumb').textContent = client.name;
  document.getElementById('f-crumb').textContent = form.name;
  document.getElementById('c-name').textContent = client.name;
  document.getElementById('f-title').textContent = form.name;
  document.getElementById('f-meta').textContent = 'Assigned to ' + client.name + (client.company ? ' · ' + client.company : '') + ' · last activity 26 Oct 2026';
  drawDocs(); drawHistory();
  if (location.hash === '#edit') setMode('edit');
});
