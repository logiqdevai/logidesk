document.addEventListener('DOMContentLoaded', () => {
  const rows = document.getElementById('rows');
  const f = { q: '', emp: 'All employees', portal: 'All portal status', attn: 'All clients' };

  function render() {
    const list = MOCK.clients.filter((c) => {
      const q = f.q.toLowerCase();
      if (q && !(c.name + c.company + c.email + c.tax).toLowerCase().includes(q)) return false;
      if (f.emp !== 'All employees' && !MOCK.assigneesOf(c).some((u) => u.name === f.emp)) return false;
      if (f.portal !== 'All portal status' && c.portal.replace('-', ' ').toLowerCase() !== f.portal.toLowerCase()) return false;
      if (f.attn === 'Needs attention' && !(c.req.missing || c.req.expired)) return false;
      if (f.attn === 'Archived') return false;
      return true;
    });
    rows.innerHTML = list.map((c) => {
            const issues = [c.req.missing && '<span class="badge missing">' + c.req.missing + ' missing</span>', c.req.expired && '<span class="badge expired">' + c.req.expired + ' expired</span>', c.req.expiring && '<span class="badge expiring">' + c.req.expiring + ' expiring</span>'].filter(Boolean).join(' ') || '<span class="soft">None</span>';
      return '<tr class="clickable" onclick="if(!event.target.closest(\'.menu-wrap\'))location.href=\'client-detail.html\'">' +
        '<td><div class="row">' + UI.avatar(c.name) + '<div><div class="cell-main">' + c.name + '</div><div class="cell-sub">' + (c.company ? c.company + ' · ' : '') + c.email + '</div></div></div></td>' +
        '<td><div class="row gap-2">' + MOCK.assigneesOf(c).map((u) => '<span title="' + u.name + '">' + UI.avatar(u.name, u.c, 'sm') + '</span>').join('') + '<span class="caption">' + MOCK.assigneesOf(c).map((u) => u.name.split(' ')[0]).join(', ') + '</span></div></td><td>' + c.forms + '</td>' +
        '<td>' + UI.progressCell(c.req) + '</td><td><div class="row gap-1 wrap">' + issues + '</div></td><td>' + UI.status(c.portal) + '</td>' +
        '<td class="actions"><div class="menu-wrap"><button class="icon-btn flat" data-menu aria-label="Row actions">' + Icons.i('more') + '</button><div class="menu right">' +
        '<a class="menu-item" href="client-detail.html">' + Icons.i('eye') + 'View</a><button class="menu-item" data-remind="' + c.id + '">' + Icons.i('send') + 'Send reminder</button><button class="menu-item" data-open="modal-assign">' + Icons.i('forms') + 'Assign form</button><button class="menu-item" data-open="modal-new">' + Icons.i('edit') + 'Edit</button><div class="menu-sep"></div><button class="menu-item danger" data-toast="Client archived">' + Icons.i('archive') + 'Archive</button></div></div></td></tr>';
    }).join('');
    document.getElementById('empty').classList.toggle('hidden', list.length > 0);
    document.getElementById('count').textContent = 'Showing ' + list.length + ' of ' + MOCK.clients.length + ' clients';
  }

  document.getElementById('q').addEventListener('input', (e) => { f.q = e.target.value; render(); });
  document.addEventListener('select:change', (e) => { if (e.detail.name in f) { f[e.detail.name] = e.detail.value; render(); } });
  render();
});
