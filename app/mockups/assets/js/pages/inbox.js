document.addEventListener('DOMContentLoaded', () => {
  const f = { tab: 'review', src: 'All sources', client: 'All clients' };
  let selected = null;
  const list = document.getElementById('list');
  const detail = document.getElementById('detail');
  const SRC = { portal: 'Client Portal', employee: 'Employee Upload' };

  const visible = () => MOCK.inbox.filter((i) => {
    if ((f.tab === 'review') !== !!i.needs) return false;
    if (f.src !== 'All sources' && SRC[i.src] !== f.src) return false;
    if (f.client !== 'All clients' && MOCK.clientById(i.client).name !== f.client) return false;
    return true;
  });

  function renderList() {
    document.getElementById('n-review').textContent = MOCK.inbox.filter((i) => i.needs).length;
    document.getElementById('n-done').textContent = MOCK.inbox.filter((i) => !i.needs).length;
    const badge = document.querySelector('.nav-link .count');
    if (badge) { badge.textContent = MOCK.needsReview(); badge.classList.toggle('hidden', !MOCK.needsReview()); }
    const items = visible();
    if (!items.find((i) => i.id === selected)) selected = items[0] && items[0].id;
    list.innerHTML = items.length ? items.map((i) => {
      const c = MOCK.clientById(i.client);
      return '<div class="inbox-item ' + (i.id === selected ? 'active' : '') + '" data-id="' + i.id + '" tabindex="0">' + UI.avatar(c.name) +
        '<div class="grow"><div class="top"><span class="cell-main truncate">' + c.name + '</span><span class="caption" style="white-space:nowrap">' + i.when + '</span></div>' +
        '<div class="truncate">' + i.doc + '</div><div class="meta"><span class="badge portal-src plain">' + SRC[i.src] + '</span><span class="badge high">High confidence</span>' + UI.status(i.status) + '</div></div></div>';
    }).join('') : '<div class="empty"><div class="ico">' + Icons.i('checkcircle', 'lg') + '</div><h3>All caught up</h3><p>Nothing here needs your attention.</p></div>';
    renderDetail();
  }

  function renderDetail() {
    const i = MOCK.inbox.find((x) => x.id === selected);
    if (!i) { detail.innerHTML = ''; return; }
    const c = MOCK.clientById(i.client);
    const actions = i.needs
      ? '<div class="row wrap"><button class="btn" id="approve">' + Icons.i('check') + 'Approve</button><button class="btn secondary danger" data-open="modal-reject">' + Icons.i('x') + 'Reject</button><button class="btn secondary" data-open="modal-change">Change assignment</button><span class="grow"></span><button class="btn ghost" data-toast="Item dismissed">Dismiss</button></div>'
      : '<div class="callout ok">' + Icons.i('checkcircle', 'lg') + '<div><b>Resolved</b><div class="muted">Attached to ' + i.req + ' by ' + (i.by || 'a reviewer') + '. Recorded in the audit log.</div></div></div>';
    detail.innerHTML =
      '<div class="col gap-4"><div class="preview"><div class="preview-bar"><span>' + Icons.i('file', 'sm') + ' ' + i.file + ' · ' + i.size + '</span><div class="row gap-2"><button class="btn sm" data-toast="Download started">' + Icons.i('download', 'sm') + 'Download</button></div></div>' +
      '<div class="sheet"><div class="h">' + i.doc + '</div><i class="m"></i><i></i><i class="s"></i><i></i><i class="m"></i><i class="s"></i><i></i><span class="stamp">' + c.name.toUpperCase().slice(0, 18) + '</span></div></div>' +
      '<div class="card"><div class="card-head"><h3>Match details</h3>' + UI.status(i.status) + '</div><div class="card-body col gap-4">' +
      '<dl class="kv"><dt>Client</dt><dd><a href="client-detail.html">' + c.name + '</a></dd><dt>Document type</dt><dd>' + i.doc + '</dd><dt>Source</dt><dd>' + SRC[i.src] + (i.by ? ' · ' + i.by : '') + '</dd><dt>Assignment</dt><dd>' + i.form + '</dd><dt>Requirement</dt><dd>' + i.req + '</dd><dt>Received</dt><dd>' + i.when + '</dd></dl>' +
      '<div><div class="label" style="font-weight:500;color:var(--ink)">Matching confidence</div><div class="score mt-2"><span class="badge high">High</span><div class="bar"><span style="width:100%"></span></div><span class="mono">1.00</span></div>' +
      '<ul class="signals mt-2">' + i.signals.map((s) => '<li>' + Icons.i('check', 'sm') + '<span>' + s + '</span></li>').join('') + '</ul></div>' + actions + '</div></div></div>';
    const ap = document.getElementById('approve');
    if (ap) ap.addEventListener('click', () => resolve('Document approved · assignment updated'));
  }

  function resolve(msg) {
    const i = MOCK.inbox.find((x) => x.id === selected);
    i.needs = ''; i.status = 'resolved'; i.by = MOCK.me.name;
    UI.toast(msg);
    renderList();
  }

  list.addEventListener('click', (e) => { const el = e.target.closest('.inbox-item'); if (el) { selected = el.dataset.id; renderList(); } });
  document.getElementById('inbox-tabs').addEventListener('click', (e) => {
    const t = e.target.closest('[data-filter]');
    if (t) {
      document.querySelectorAll('#inbox-tabs .tab').forEach((b) => b.classList.toggle('active', b === t));
      f.tab = t.dataset.value; selected = null; renderList();
    }
  });
  document.addEventListener('select:change', (e) => { if (e.detail.name in f) { f[e.detail.name] = e.detail.value; renderList(); } });
  document.getElementById('confirm-reject').addEventListener('click', () => { UI.close(); resolve('Document rejected · client notified'); });
  renderList();
});
