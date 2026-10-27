/* Shared UI helpers + delegated behaviours (menus, selects, tabs, modals, toasts) */
(function () {
  const STATUS = {
    missing: 'Missing', submitted: 'Submitted', review: 'Under Review', approved: 'Approved', rejected: 'Rejected',
    expired: 'Expired', notreq: 'Not Required', expiring: 'Expiring soon',
    active: 'Active', invited: 'Invited', 'not-invited': 'Not invited', archived: 'Archived', draft: 'Draft', published: 'Published',
    matched: 'Matched', resolved: 'Resolved', high: 'High',
    sent: 'Sent', delivered: 'Delivered', failed: 'Failed', pending: 'Pending', cancelled: 'Cancelled', overdue: 'Overdue', inprogress: 'In progress', complete: 'Complete', 'not-started': 'Not started'
  };
  const CLS = { 'not-invited': 'notreq', published: 'active', delivered: 'approved', cancelled: 'notreq', review: 'review' };

  const UI = {
    status(key, label) {
      return '<span class="badge ' + (CLS[key] || key) + '">' + (label || STATUS[key] || key) + '</span>';
    },
    avatar(name, cls, size) {
      return '<span class="avatar ' + (size || '') + ' ' + (cls || 'c' + ((name.length % 4) + 1)) + '">' + MOCK.initials(name) + '</span>';
    },
    // Client progress from requirement counts (expiring is a subset of approved, shown as a warning elsewhere)
    progress(req, big) {
      const total = req.approved + req.review + req.missing + req.expired || 1;
      const pct = Math.round((req.approved / total) * 100);
      const w = (n) => ((n / total) * 100).toFixed(1) + '%';
      return { pct, total, html: '<div class="progress ' + (big ? 'lg' : '') + '"><span class="ok" style="width:' + w(req.approved) + '"></span><span class="rev" style="width:' + w(req.review) + '"></span><span class="bad" style="width:' + w(req.expired) + '"></span></div>' };
    },
    progressCell(req) {
      const p = UI.progress(req);
      return '<div class="progress-cell">' + p.html + '<span class="pct">' + p.pct + '%</span></div>';
    },
    select(o) {
      const opts = o.options.map((x) => (typeof x === 'string' ? { value: x, label: x } : x));
      const cur = opts.find((x) => x.value === o.value);
      return '<div class="select ' + (o.size || '') + ' ' + (o.block ? 'block' : '') + '" data-select' + (o.name ? ' data-name="' + o.name + '"' : '') + ' data-value="' + (cur ? cur.value : '') + '">' +
        '<button type="button" class="select-trigger" aria-haspopup="listbox">' + (cur ? '<span class="val">' + cur.label + '</span>' : '<span class="val ph">' + (o.placeholder || 'Select…') + '</span>') + Icons.i('selector', 'sm') + '</button>' +
        '<div class="menu" role="listbox">' + opts.map((x) => '<button type="button" class="menu-item ' + (cur && x.value === cur.value ? 'selected' : '') + '" data-value="' + x.value + '">' + x.label + '</button>').join('') + '</div></div>';
    },
    toast(msg) {
      let box = document.querySelector('.toasts');
      if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
      const t = document.createElement('div');
      t.className = 'toast';
      t.innerHTML = Icons.i('checkcircle') + '<span>' + msg + '</span>';
      box.appendChild(t);
      setTimeout(() => t.remove(), 3200);
    },
    open(id) { const el = document.getElementById(id); if (el) el.classList.add('open'); },
    close(el) { (el || document.querySelector('.overlay.open'))?.classList.remove('open'); },
    // static <div data-select-init data-options="A|B|C" data-value="A"> → custom select
    hydrateSelects(root) {
      (root || document).querySelectorAll('[data-select-init]').forEach((el) => {
        const d = el.dataset;
        const wrap = document.createElement('div');
        wrap.innerHTML = UI.select({ options: d.options.split('|'), value: d.value, size: d.size, block: d.block !== undefined, placeholder: d.placeholder, name: d.name });
        el.replaceWith(wrap.firstChild);
      });
    }
  };
  window.UI = UI;

  document.addEventListener('click', (e) => {
    const t = e.target;

    // Select trigger / option
    const trig = t.closest('.select-trigger');
    if (trig) {
      const menu = trig.parentElement.querySelector('.menu');
      const wasOpen = menu.classList.contains('open');
      document.querySelectorAll('.menu.open').forEach((m) => m.classList.remove('open'));
      if (!wasOpen) menu.classList.add('open');
      return;
    }
    const opt = t.closest('.select .menu-item');
    if (opt) {
      const sel = opt.closest('.select');
      sel.dataset.value = opt.dataset.value;
      const val = sel.querySelector('.val');
      val.textContent = opt.textContent; val.classList.remove('ph');
      sel.querySelectorAll('.menu-item').forEach((i) => i.classList.toggle('selected', i === opt));
      sel.querySelector('.menu').classList.remove('open');
      sel.dispatchEvent(new CustomEvent('select:change', { bubbles: true, detail: { value: opt.dataset.value, name: sel.dataset.name } }));
      return;
    }

    // Action menu
    const mt = t.closest('[data-menu]');
    if (mt) {
      const menu = mt.parentElement.querySelector('.menu');
      const wasOpen = menu.classList.contains('open');
      document.querySelectorAll('.menu.open').forEach((m) => m.classList.remove('open'));
      if (!wasOpen) menu.classList.add('open');
      e.stopPropagation();
      return;
    }
    if (!t.closest('.menu')) document.querySelectorAll('.menu.open').forEach((m) => m.classList.remove('open'));
    else if (t.closest('.menu-item')) t.closest('.menu').classList.remove('open');

    // Tabs
    const tab = t.closest('[data-tab]');
    if (tab) {
      const group = tab.closest('[data-tabs]');
      group.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b === tab));
      const scope = document.getElementById(group.dataset.tabs) || document;
      scope.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === tab.dataset.tab));
      history.replaceState(null, '', '#' + tab.dataset.tab);
    }

    // Segmented / pill toggles (visual only, emits event)
    const seg = t.closest('.segmented button, .pills .pill-tab');
    if (seg) {
      seg.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === seg));
      seg.parentElement.dispatchEvent(new CustomEvent('seg:change', { bubbles: true, detail: { value: seg.dataset.value } }));
    }

    // Modals + toasts
    const op = t.closest('[data-open]');
    if (op) { UI.open(op.dataset.open); e.preventDefault(); }
    if (t.closest('[data-close]') || t.classList.contains('overlay')) UI.close(t.closest('.overlay'));
    const ts = t.closest('[data-toast]');
    if (ts) {
      UI.toast(ts.dataset.toast);
      if (ts.dataset.closeModal !== undefined) UI.close(ts.closest('.overlay'));
    }

    // Mobile nav
    if (t.closest('.menu-btn')) document.body.classList.toggle('nav-open');
    if (t.classList.contains('scrim')) document.body.classList.remove('nav-open');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { UI.close(); document.querySelectorAll('.menu.open').forEach((m) => m.classList.remove('open')); }
  });

  // Dropzone drag styling
  document.addEventListener('dragover', (e) => { const d = e.target.closest?.('.dropzone'); if (d) { e.preventDefault(); d.classList.add('drag'); } });
  document.addEventListener('dragleave', (e) => { e.target.closest?.('.dropzone')?.classList.remove('drag'); });
  document.addEventListener('drop', (e) => { const d = e.target.closest?.('.dropzone'); if (d) { e.preventDefault(); d.classList.remove('drag'); d.dispatchEvent(new CustomEvent('dz:drop', { bubbles: true })); } });
})();
