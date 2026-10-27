document.addEventListener('DOMContentLoaded', () => {
  const R = [
    { id: 1, name: 'Certificate of Incorporation', req: true, status: 'approved', file: 'incorporation-cert.pdf', exp: '', instr: 'The official certificate issued by the registrar.', rules: 'PDF · up to 10 MB' },
    { id: 2, name: 'Tax Clearance Certificate', req: true, status: 'review', file: 'tax-clearance-2026.pdf', exp: '30/06/2027', instr: 'Must be issued within the last 12 months.', rules: 'PDF or image · up to 10 MB' },
    { id: 3, name: 'Public Liability Insurance', req: true, status: 'expiring', file: 'liability-insurance.pdf', exp: '15/11/2026', instr: 'Upload the renewed certificate when you receive it.', rules: 'PDF or image · up to 15 MB · 2 files' },
    { id: 4, name: 'Health & Safety Certificate', req: true, status: 'missing', file: '', exp: '', instr: 'Your current health and safety certificate, signed and dated.', rules: 'PDF or image · up to 10 MB' },
    { id: 5, name: 'Proof of Address', req: false, status: 'rejected', file: 'utility-bill-sep.pdf', exp: '', instr: 'A utility bill less than 3 months old.', rules: 'PDF or image · up to 5 MB', note: 'The scan was cut off. Please upload the full page.' }
  ];
  const box = document.getElementById('reqs');
  let current = null;

  function draw() {
    box.querySelectorAll('.req-card').forEach((n) => n.remove());
    R.forEach((r) => {
      const can = r.status === 'missing' || r.status === 'rejected' || r.status === 'expired' || r.status === 'expiring';
      const el = document.createElement('div');
      el.className = 'req-card' + (r.status === 'rejected' || r.status === 'expired' ? ' problem' : '');
      el.innerHTML = '<div><div class="title">' + r.name + ' ' + (r.req ? '' : '<span class="badge plain">Optional</span>') + UI.status(r.status) + '</div><p class="instr">' + r.instr + '</p>' +
        (r.note ? '<p class="mt-2" style="color:var(--error-ink)">' + Icons.i('alert', 'sm') + ' ' + r.note + '</p>' : '') +
        '<div class="meta">' + (r.file ? '<span class="file-chip">' + Icons.i('file', 'sm') + r.file + '</span>' : '<span class="soft">No file uploaded yet</span>') + (r.exp ? '<span class="caption">Expires ' + r.exp + '</span>' : '') + '</div></div>' +
        '<div>' + (can ? '<button type="button" class="btn ' + (r.status === 'expiring' ? 'secondary' : '') + '" data-up="' + r.id + '">' + Icons.i('upload') + (r.file ? 'Replace' : 'Upload') + '</button>' : '') + '</div>';
      box.appendChild(el);
    });
    const done = R.filter((r) => r.status === 'approved').length;
    const rev = R.filter((r) => ['review', 'submitted'].includes(r.status)).length;
    const total = R.length;
    document.getElementById('req-sum').textContent = done + ' of ' + total + ' complete';
    document.getElementById('pct').textContent = Math.round((done / total) * 100) + '%';
    document.getElementById('bar').innerHTML = '<span class="ok" style="width:' + (done / total * 100) + '%"></span><span class="rev" style="width:' + (rev / total * 100) + '%"></span>';
  }

  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-up]'); if (!b) return;
    current = R.find((r) => r.id === +b.dataset.up);
    document.getElementById('pu-sub').textContent = current.name;
    document.getElementById('pu-rules').textContent = current.rules;
    document.getElementById('dz-files').innerHTML = '';
    document.getElementById('pu-go').disabled = true;
    UI.open('modal-upload');
  });

  const dz = document.getElementById('dz');
  const pick = () => { document.getElementById('dz-files').innerHTML = '<div class="file-chip">' + Icons.i('file', 'sm') + 'scan-' + current.id + '.pdf <span class="soft">· 402 KB</span></div>'; document.getElementById('pu-go').disabled = false; };
  dz.addEventListener('click', pick);
  dz.addEventListener('dz:drop', pick);
  document.getElementById('pu-go').addEventListener('click', () => {
    current.file = 'scan-' + current.id + '.pdf'; current.status = 'review'; current.note = '';
    UI.close(); UI.toast('Uploaded. Your accountant will review it shortly.'); draw();
  });

  document.getElementById('veh').addEventListener('seg:change', (e) => document.getElementById('veh-n').classList.toggle('hidden', e.detail.value === 'No'));
  document.getElementById('submit-form').addEventListener('click', () => {
    const missing = R.filter((r) => r.req && r.status === 'missing').length;
    UI.toast(missing ? missing + ' required document still missing — you can submit later.' : 'Form submitted. Thank you!');
  });
  draw();
});
