/* Submissions for one form (?form=f2). Filters: search, client, status, employee, time range. */
(function () {
  const id = new URLSearchParams(location.search).get('form') || 'f2';
  const form = MOCK.forms.find((x) => x.id === id) || MOCK.forms[1];
  const subs = MOCK.submissions.filter((s) => s.form === form.id);

  // Runs before the DOMContentLoaded select hydration, so the client list can be injected into data-options.
  const names = [...new Set(subs.map((s) => MOCK.clientById(s.client).name))];
  document.getElementById('sel-client').dataset.options = ['All clients'].concat(names).join('|');
  document.getElementById('title').textContent = form.name;
  document.getElementById('crumb-form').textContent = form.name;
  document.title = form.name + ' · Submissions · Gatherly';

  const STATUS = { 'Not started': 'not-started', 'In progress': 'inprogress', 'Under review': 'review', Complete: 'complete', Overdue: 'overdue' };
  const f = { q: '', client: 'All clients', status: 'All statuses', emp: 'All employees', when: 'Any time' };
  // "Today" in the mockup is 27 Oct 2026
  const daysAgo = (d) => Math.round((new Date('2026-10-27') - new Date(d)) / 864e5);

  document.addEventListener('DOMContentLoaded', () => {
    const rows = document.getElementById('rows');

    function render() {
      const list = subs.filter((s) => {
        const c = MOCK.clientById(s.client);
        if (f.q && !(c.name + c.company).toLowerCase().includes(f.q.toLowerCase())) return false;
        if (f.client !== 'All clients' && c.name !== f.client) return false;
        if (f.status !== 'All statuses' && s.status !== STATUS[f.status]) return false;
        if (f.emp !== 'All employees' && !MOCK.assigneesOf(c).some((u) => u.name === f.emp)) return false;
        if (f.when === 'Not submitted yet' && s.submitted) return false;
        if (f.when === 'Last 7 days' && !(s.submitted && daysAgo(s.submitted) <= 7)) return false;
        if (f.when === 'Last 30 days' && !(s.submitted && daysAgo(s.submitted) <= 30)) return false;
        return true;
      });
      rows.innerHTML = list.map((s) => {
        const c = MOCK.clientById(s.client);
        const pct = Math.round((s.done / s.total) * 100);
        return '<tr class="clickable" onclick="if(!event.target.closest(\'.menu-wrap\'))location.href=\'client-form.html?client=' + c.id + '&form=' + form.id + '\'">' +
          '<td><div class="row">' + UI.avatar(c.name) + '<div><div class="cell-main">' + c.name + '</div><div class="cell-sub">' + (c.company || c.email) + '</div></div></div></td>' +
          '<td><div class="row gap-1">' + MOCK.assigneesOf(c).map((u) => '<span title="' + u.name + '">' + UI.avatar(u.name, u.c, 'sm') + '</span>').join('') + '</div></td>' +
          '<td>' + s.assigned + '</td><td>' + (s.submitted || '<span class="soft">—</span>') + '</td><td>' + s.deadline + '</td>' +
          '<td><div class="progress-cell"><div class="progress"><span class="ok" style="width:' + pct + '%"></span></div><span class="pct">' + s.done + '/' + s.total + '</span></div></td>' +
          '<td>' + UI.status(s.status) + '</td>' +
          '<td class="actions"><div class="menu-wrap"><button class="icon-btn flat" data-menu aria-label="Row actions">' + Icons.i('more') + '</button><div class="menu right">' +
          '<a class="menu-item" href="client-form.html?client=' + c.id + '&form=' + form.id + '">' + Icons.i('forms') + 'View full form</a><a class="menu-item" href="client-form.html?client=' + c.id + '&form=' + form.id + '#edit">' + Icons.i('edit') + 'Edit answers</a><a class="menu-item" href="client-detail.html">' + Icons.i('eye') + 'View client</a><button class="menu-item" data-remind="' + c.id + '">' + Icons.i('send') + 'Send reminder</button><a class="menu-item" href="inbox.html">' + Icons.i('inbox') + 'Review in inbox</a></div></div></td></tr>';
      }).join('');
      document.getElementById('empty').classList.toggle('hidden', list.length > 0);
      document.getElementById('count').textContent = 'Showing ' + list.length + ' of ' + subs.length + ' submissions';
    }

    const n = (st) => subs.filter((s) => s.status === st).length;
    document.getElementById('stats').innerHTML = [
      ['Assigned clients', subs.length, 'received this form', 'users', ''], ['Complete', n('complete'), 'all documents approved', 'check', ''],
      ['Under review', n('review'), 'waiting for an employee', 'inbox', ''], ['Overdue', n('overdue'), 'past the deadline', 'alert', n('overdue') ? 'alert' : '']
    ].map((s) => '<div class="card stat ' + s[4] + '"><span class="label">' + Icons.i(s[3], 'sm') + s[0] + '</span><span class="value">' + s[1] + '</span><span class="sub">' + s[2] + '</span></div>').join('');

    document.getElementById('q').addEventListener('input', (e) => { f.q = e.target.value; render(); });
    document.addEventListener('select:change', (e) => { if (e.detail.name in f) { f[e.detail.name] = e.detail.value; render(); } });
    render();
  });
})();
