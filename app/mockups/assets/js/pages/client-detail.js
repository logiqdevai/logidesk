document.addEventListener('DOMContentLoaded', () => {
  const docs = MOCK.documents.filter((d) => d.client === 'c1');
  document.getElementById('docs').innerHTML = docs.map((d) =>
    '<tr><td><div class="row"><span class="file-ico">' + MOCK.fileTag(d.file) + '</span><div><div class="cell-main">' + d.name + '</div><div class="cell-sub">' + (d.file || 'No file yet') + '</div></div></div></td>' +
    '<td>' + d.form + '</td><td>' + UI.status(d.status) + '</td><td>' + (d.expires || '<span class="soft">—</span>') + '</td><td>' + (d.uploaded ? d.uploaded + '<div class="cell-sub">' + d.by + '</div>' : '<span class="soft">—</span>') + '</td>' +
    '<td class="actions">' + (d.status === 'review'
      ? '<button class="btn sm" data-toast="Document approved">Approve</button> <button class="btn secondary sm danger" data-toast="Document rejected · client notified">Reject</button>'
      : d.file ? '<button class="icon-btn flat" aria-label="Preview">' + Icons.i('eye') + '</button><button class="icon-btn flat" aria-label="Download">' + Icons.i('download') + '</button>' : '<button class="btn secondary sm" data-open="modal-upload">Upload</button>') + '</td></tr>').join('');

  // Fake file chooser: dropzone click/drop adds a file chip (no real upload in the mockup)
  const dz = document.getElementById('dz');
  const add = () => { document.getElementById('dz-files').innerHTML = '<div class="file-chip">' + Icons.i('file', 'sm') + 'health-safety-2026.pdf <span class="soft">· 318 KB</span></div>'; };
  dz.addEventListener('click', add);
  dz.addEventListener('dz:drop', add);
});
