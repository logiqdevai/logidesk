/* App shell: injects sidebar + topbar (business) or top nav (portal) around <main id="page">.
   Pages declare: <body data-shell="business|portal" data-nav="clients"> */
(function () {
  const logo = '<svg viewBox="0 0 24 24" fill="none" stroke="#cc785c" stroke-width="2.4" stroke-linecap="round"><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7"/></svg>';
  const I = (n, c) => Icons.i(n, c);

  const BUSINESS = [
    { group: 'Workspace', items: [
      ['dashboard', 'Dashboard', 'dashboard.html', 'dashboard'],
      ['clients', 'Clients', 'clients.html', 'users'],
      ['documents', 'Documents', 'documents.html', 'file'],
      ['files', 'File Space', 'files.html', 'folder'],
      ['inbox', 'Document Inbox', 'inbox.html', 'inbox'],
      ['forms', 'Forms & Templates', 'forms.html', 'forms']
    ] },
    { group: 'Communication', items: [['notifications', 'Notifications', 'notifications.html', 'bell']] },
    { group: 'Administration', items: [
      ['team', 'Team', 'team.html', 'team'],
      ['settings', 'Settings', 'settings.html', 'settings']
    ] }
  ];
  const PORTAL = [
    ['overview', 'Overview', 'overview.html'],
    ['forms', 'My Forms', 'my-forms.html'],
    ['documents', 'My Documents', 'my-documents.html'],
    ['info', 'My Information', 'my-information.html'],
    ['account', 'Account Settings', 'account.html']
  ];

  function businessShell(main, active) {
    const me = MOCK.me;
    const n = MOCK.needsReview();
    const nav = BUSINESS.map((g) => '<div class="nav-group"><span class="eyebrow">' + g.group + '</span>' + g.items.map((it) =>
      '<a class="nav-link ' + (it[0] === active ? 'active' : '') + '" href="' + it[2] + '">' + I(it[3]) + it[1] + (it[0] === 'inbox' && n ? '<span class="count" title="Items needing review">' + n + '</span>' : '') + '</a>').join('') + '</div>').join('');

    const app = document.createElement('div');
    app.className = 'app';
    app.innerHTML =
      '<aside class="sidebar" aria-label="Main navigation">' +
        '<a class="brand" href="dashboard.html">' + logo + '<span class="brand-name">Gatherly</span></a>' +
        '<div class="menu-wrap"><button class="org-switch" data-menu><span class="logo">' + MOCK.org.short + '</span><span class="grow"><span class="name" style="display:block">' + MOCK.org.name + '</span><span class="role">' + me.role + '</span></span>' + I('selector', 'sm') + '</button>' +
        '<div class="menu"><div class="menu-label">Your workspaces</div>' + MOCK.workspaces.map((w) => '<a class="menu-item ' + (w.id === 'w1' ? 'selected' : '') + '" href="dashboard.html">' + w.name + '<span class="caption" style="margin-left:auto">' + w.role + '</span></a>').join('') + '<div class="menu-sep"></div><a class="menu-item" href="../auth/workspaces.html#new">' + I('plus') + 'Create workspace</a></div></div>' +
        nav +
        '<div class="sidebar-foot"><div class="menu-wrap" style="display:block"><button class="user-chip btn ghost" data-menu style="height:auto;width:100%;justify-content:flex-start;padding:6px 8px">' + UI.avatar(me.name, me.c) + '<span class="grow" style="text-align:left"><span class="name" style="display:block">' + me.name + '</span><span class="caption">' + me.email + '</span></span></button>' +
        '<div class="menu" style="top:auto;bottom:calc(100% + 4px)"><a class="menu-item" href="settings.html#profile">' + I('user') + 'Profile</a><a class="menu-item" href="../portal/overview.html">' + I('eye') + 'Preview client portal</a><div class="menu-sep"></div><a class="menu-item danger" href="../auth/login.html">' + I('logout') + 'Sign out</a></div></div></div>' +
      '</aside>' +
      '<div class="scrim"></div>' +
      '<div class="content"><header class="topbar">' +
        '<button class="icon-btn flat menu-btn" aria-label="Open menu">' + I('menu', 'lg') + '</button>' +
        '<div class="search"><label class="sr-only" for="gs">Search</label>' + I('search') + '<input id="gs" class="input sm" style="height:36px" placeholder="Search clients, forms, documents…"></div>' +
        '<span class="grow"></span>' +
        '<div class="menu-wrap"><button class="btn sm" data-menu>' + I('plus') + 'New</button><div class="menu right">' +
          '<a class="menu-item" href="clients.html#new">' + I('users') + 'Add client</a><a class="menu-item" href="form-builder.html">' + I('forms') + 'Create document form</a><a class="menu-item" href="clients.html#assign">' + I('send') + 'Assign a form</a><a class="menu-item" href="documents.html#upload">' + I('upload') + 'Upload a document</a><div class="menu-sep"></div><a class="menu-item" href="dashboard.html#reminders">' + I('bell') + 'Send reminders</a></div></div>' +
        '<a class="icon-btn" href="notifications.html" aria-label="Notifications">' + I('bell') + '<span class="dot"></span></a>' +
      '</header></div>';
    main.replaceWith(app);
    app.querySelector('.content').appendChild(main);
  }

  function portalShell(main, active) {
    const nav = document.createElement('header');
    nav.className = 'portal-nav';
    nav.innerHTML = '<a class="brand" href="overview.html" style="padding:0">' + logo + '<span class="brand-name">Gatherly</span></a>' +
      '<nav class="links" aria-label="Client portal">' + PORTAL.map((p) => '<a class="nav-link ' + (p[0] === active ? 'active' : '') + '" href="' + p[2] + '">' + p[1] + '</a>').join('') + '</nav>' +
      '<span class="org-tag">' + MOCK.org.name + '</span>' +
      '<div class="menu-wrap"><button class="icon-btn" data-menu aria-label="Account">' + I('user') + '</button><div class="menu right"><div class="menu-label">Northwind Logistics Ltd</div><a class="menu-item" href="account.html">' + I('settings') + 'Account settings</a><div class="menu-sep"></div><a class="menu-item danger" href="../auth/login.html">' + I('logout') + 'Sign out</a></div></div>';
    main.before(nav);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const main = document.getElementById('page');
    const kind = document.body.dataset.shell;
    if (main && kind === 'business') businessShell(main, document.body.dataset.nav);
    if (main && kind === 'portal') portalShell(main, document.body.dataset.nav);
    hydrateIcons();
    UI.hydrateSelects();
    // open a modal / tab via URL hash (#new, #assign, #upload, #tab-id)
    const h = location.hash.slice(1);
    if (h) {
      const modal = document.getElementById('modal-' + h);
      if (modal) modal.classList.add('open');
      const tab = document.querySelector('[data-tab="' + h + '"]');
      if (tab) tab.click();
    }
  });
})();
