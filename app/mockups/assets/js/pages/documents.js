document.addEventListener('DOMContentLoaded', () => {
  const f = { q: '', status: 'all', form: 'All forms', src: 'All sources' };
  const rows = document.getElementById('rows');

  function render() {
    const list = MOCK.documents.filter((d) => {
      const c = MOCK.clientById(d.client);
      if (f.q && !(d.name + c.name + d.file).toLowerCase().includes(f.q.toLowerCase())) return false;
      if (f.status !== 'all' && d.status !== f.status) return false;
      if (f.form !== 'All forms' && d.form !== f.form) return false;
      if (f.src === 'Client Portal' && d.src !== 'portal') return false;
      if (f.src === 'Employee Upload' && d.src !== 'employee') return false;
      return true;
    });
    rows.innerHTML = list.map((d) => {
      const c = MOCK.clientById(d.client);
      return '<tr><td><div class="row"><span class="file-ico">' + MOCK.fileTag(d.file) + '</span><div><div class="cell-main">' + d.name + '</div><div class="cell-sub">' + (d.file || 'No file yet') + '</div></div></div></td>' +
        '<td><a href="client-detail.html" style="color:var(--ink)">' + c.name + '</a></td><td>' + d.form + '</td><td>' + UI.status(d.status) + '</td>' +
        '<td>' + (d.expires || '<span class="soft">—</span>') + '</td><td>' + (d.uploaded ? d.uploaded + '<div class="cell-sub">' + d.by + '</div>' : '<span class="soft">—</span>') + '</td>' +
        '<td class="actions">' + (d.file ? '<div class="menu-wrap"><button class="icon-btn flat" data-menu aria-label="Actions">' + Icons.i('more') + '</button><div class="menu right">' +
          '<button class="menu-item" data-toast="Opening preview (signed link, 5 min)">' + Icons.i('eye') + 'Preview</button><button class="menu-item" data-toast="Download started">' + Icons.i('download') + 'Download</button>' +
          '<button class="menu-item" data-toast="Edit expiration date…">' + Icons.i('calendar') + 'Edit expiration</button><button class="menu-item" data-open="modal-upload">' + Icons.i('upload') + 'Replace file</button>' +
          (d.status === 'review' ? '<div class="menu-sep"></div><button class="menu-item" data-toast="Document approved">' + Icons.i('check') + 'Approve</button><button class="menu-item danger" data-toast="Document rejected">' + Icons.i('x') + 'Reject</button>' : '') +
          '</div></div>' : '<button class="btn secondary sm" data-open="modal-upload">Upload</button>') + '</td></tr>';
    }).join('');
    document.getElementById('empty').classList.toggle('hidden', list.length > 0);
    document.getElementById('count').textContent = list.length + ' of ' + MOCK.documents.length + ' documents';
  }

  document.getElementById('q').addEventListener('input', (e) => { f.q = e.target.value; render(); });
  document.getElementById('status-pills').addEventListener('seg:change', (e) => { f.status = e.detail.value; render(); });
  document.addEventListener('select:change', (e) => { if (e.detail.name in f) { f[e.detail.name] = e.detail.value; render(); } });

  const dz = document.getElementById('dz');
  const add = () => { document.getElementById('dz-files').innerHTML = ['fleet-list.pdf · 120 KB', 'safety-cert.jpg · 884 KB', 'payroll.xlsx · 56 KB'].map((n) => '<div class="file-chip">' + Icons.i('file', 'sm') + n + '</div>').join(''); };
  dz.addEventListener('click', add);
  dz.addEventListener('dz:drop', add);
  render();
});
