document.addEventListener('DOMContentLoaded', () => {
  const files = MOCK.documents.filter((d) => d.file);
  const kb = (s) => (/MB/.test(s) ? parseFloat(s) * 1024 : parseFloat(s)) || 0;
  const fmt = (n) => (n >= 1024 ? (n / 1024).toFixed(1) + ' MB' : Math.round(n) + ' KB');
  const f = { q: '', kind: 'All file types' };
  let path = []; // [] = root, [clientId] = client folder, [clientId, form] = form folder

  const visible = (d) => (f.kind === 'All file types' || MOCK.fileKind(d.file) === f.kind) && (!f.q || (d.file + d.name).toLowerCase().includes(f.q.toLowerCase()));
  const folderRow = (label, sub, items, size, mod, go) =>
    '<tr class="clickable" data-go="' + go + '"><td><div class="row"><span class="file-ico" style="background:var(--surface-card)">' + Icons.i('folder', 'sm') + '</span><div><div class="cell-main">' + label + '</div>' + (sub ? '<div class="cell-sub">' + sub + '</div>' : '') + '</div></div></td><td>' + items + ' ' + (items === 1 ? 'item' : 'items') + '</td><td>' + size + '</td><td>' + mod + '</td><td class="actions"><button class="icon-btn flat" data-toast="Preparing a .zip" aria-label="Download folder">' + Icons.i('download') + '</button></td></tr>';

  function render() {
    let h = '', n = 0;
    document.getElementById('th-2').textContent = path.length === 2 ? 'Status' : 'Items';
    if (path.length === 0) {
      MOCK.clients.forEach((c) => {
        const fs = files.filter((d) => d.client === c.id && visible(d));
        if (!fs.length) return;
        n++;
        h += folderRow(c.name, c.company, fs.length, fmt(fs.reduce((a, d) => a + kb(d.size), 0)), fs[0].uploaded, c.id);
      });
    } else if (path.length === 1) {
      const fs = files.filter((d) => d.client === path[0] && visible(d));
      [...new Set(fs.map((d) => d.form))].forEach((form) => {
        const g = fs.filter((d) => d.form === form); n++;
        h += folderRow(form, '', g.length, fmt(g.reduce((a, d) => a + kb(d.size), 0)), g[0].uploaded, form);
      });
    } else {
      files.filter((d) => d.client === path[0] && d.form === path[1] && visible(d)).forEach((d) => {
        n++;
        h += '<tr><td><div class="row"><span class="file-ico">' + MOCK.fileTag(d.file) + '</span><div><div class="cell-main">' + d.file + '</div><div class="cell-sub">' + d.name + '</div></div></div></td><td>' + UI.status(d.status) + '</td><td>' + d.size + '</td><td>' + d.uploaded + '</td>' +
          '<td class="actions"><button class="icon-btn flat" data-toast="Opening preview (signed link, 5 min)" aria-label="Preview">' + Icons.i('eye') + '</button><button class="icon-btn flat" data-toast="Download started" aria-label="Download">' + Icons.i('download') + '</button></td></tr>';
      });
    }
    document.getElementById('rows').innerHTML = h;
    document.getElementById('empty').classList.toggle('hidden', n > 0);
    document.getElementById('count').textContent = n + (path.length === 2 ? ' files' : ' folders');
    const c = path[0] && MOCK.clientById(path[0]);
    document.getElementById('crumbs').innerHTML = (path.length ? '<a href="#" data-up="0">File Space</a>' : '<span>File Space</span>') +
      (c ? Icons.i('right', 'sm') + (path.length === 2 ? '<a href="#" data-up="1">' + c.name + '</a>' : '<span>' + c.name + '</span>') : '') +
      (path[1] ? Icons.i('right', 'sm') + '<span>' + path[1] + '</span>' : '');
  }

  document.getElementById('rows').addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-go]');
    if (!tr || e.target.closest('button')) return;
    path.push(tr.dataset.go); render();
  });
  document.getElementById('crumbs').addEventListener('click', (e) => {
    const a = e.target.closest('[data-up]'); if (!a) return;
    e.preventDefault(); path = path.slice(0, +a.dataset.up); render();
  });
  document.getElementById('q').addEventListener('input', (e) => { f.q = e.target.value; render(); });
  document.addEventListener('select:change', (e) => { if (e.detail.name in f) { f[e.detail.name] = e.detail.value; render(); } });

  document.getElementById('n-files').textContent = files.length;
  document.getElementById('n-clients').textContent = new Set(files.map((d) => d.client)).size;
  const kinds = {};
  files.forEach((d) => { const k = MOCK.fileKind(d.file); kinds[k] = (kinds[k] || 0) + 1; });
  document.getElementById('by-type').innerHTML = Object.entries(kinds).map(([k, v]) => '<span class="chip">' + k + ' · ' + v + '</span>').join('');
  render();
});
