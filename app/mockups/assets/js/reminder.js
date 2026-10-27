/* Manual reminder modal (email only in MVP). Trigger with any element carrying data-remind="<clientId>". */
(function () {
  function ensure() {
    if (document.getElementById('modal-reminder')) return;
    const el = document.createElement('div');
    el.className = 'overlay';
    el.id = 'modal-reminder';
    el.innerHTML =
      '<div class="modal lg" role="dialog" aria-modal="true" aria-labelledby="rm-title">' +
        '<div class="modal-head"><div><h2 id="rm-title">Send reminder</h2><p class="muted">Review the message before it is sent.</p></div><button class="icon-btn flat" data-close aria-label="Close">' + Icons.i('x') + '</button></div>' +
        '<div class="modal-body col gap-4">' +
          '<div class="form-grid"><div class="field"><span class="label">Recipient</span><div class="input" id="rm-to" style="display:flex;align-items:center;background:var(--surface-soft)"></div></div>' +
          '<div class="field"><span class="label">Channel</span>' + UI.select({ options: ['Email'], value: 'Email', block: true }) + '</div></div>' +
          '<div class="field"><span class="label">Missing &amp; expired documents</span><div class="chips" id="rm-docs"></div></div>' +
          '<div class="field"><label for="rm-subject">Subject</label><input id="rm-subject" class="input"></div>' +
          '<div class="field"><label for="rm-body">Message</label><textarea id="rm-body" class="textarea" rows="8"></textarea><span class="hint">Variables such as <code class="var">{{client_name}}</code> and <code class="var">{{portal_link}}</code> are filled in when sent.</span></div>' +
        '</div>' +
        '<div class="modal-foot"><button class="btn secondary" data-close>Cancel</button><button class="btn" id="rm-send">' + Icons.i('send') + 'Send reminder</button></div>' +
      '</div>';
    document.body.appendChild(el);
    el.querySelector('#rm-send').addEventListener('click', () => {
      UI.close(el);
      UI.toast('Reminder sent to ' + el.dataset.name);
    });
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-remind]');
    if (!b) return;
    e.preventDefault();
    ensure();
    const c = MOCK.clientById(b.dataset.remind);
    const docs = MOCK.documents.filter((d) => d.client === c.id && ['missing', 'expired', 'rejected', 'expiring'].includes(d.status));
    const el = document.getElementById('modal-reminder');
    el.dataset.name = c.name;
    el.querySelector('#rm-to').textContent = c.name + ' <' + c.email + '>';
    el.querySelector('#rm-docs').innerHTML = (docs.length ? docs : [{ name: 'All outstanding documents', status: 'missing' }]).map((d) => '<span class="chip">' + d.name + ' · ' + (UI.status(d.status).replace(/<[^>]+>/g, '')) + '</span>').join('');
    el.querySelector('#rm-subject').value = MOCK.templates[1].subject.replace('{{form_name}}', 'your assigned forms');
    el.querySelector('#rm-body').value = MOCK.templates[1].body
      .replace('{{client_name}}', c.name.split(' ')[0])
      .replace('{{missing_documents}}', (docs.length ? docs : [{ name: 'Outstanding documents' }]).map((d) => '• ' + d.name).join('\n'))
      .replace('{{portal_link}}', 'https://portal.gatherly.app/i/8fK2…');
    UI.open('modal-reminder');
  });
})();
