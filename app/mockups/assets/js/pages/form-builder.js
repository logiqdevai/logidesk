document.addEventListener('DOMContentLoaded', () => {
  const TYPES = {
    short: { label: 'Short Text', icon: 'type', value: true, g: 'Input' },
    long: { label: 'Long Text', icon: 'align', value: true, g: 'Input' },
    number: { label: 'Number', icon: 'hash', value: true, g: 'Input' },
    email: { label: 'Email', icon: 'mail', value: true, g: 'Input' },
    phone: { label: 'Phone', icon: 'phone', value: true, g: 'Input' },
    date: { label: 'Date', icon: 'calendar', value: true, g: 'Input' },
    dropdown: { label: 'Dropdown', icon: 'selector', opts: true, value: true, g: 'Choice' },
    radio: { label: 'Multiple Choice', icon: 'radio', opts: true, value: true, g: 'Choice' },
    checkbox: { label: 'Checkboxes', icon: 'checkbox', opts: true, g: 'Choice' },
    yesno: { label: 'Yes / No', icon: 'toggle', value: true, g: 'Choice' },
    file: { label: 'File Upload', icon: 'upload', doc: true, g: 'Documents' },
    heading: { label: 'Heading', icon: 'heading', stat: true, g: 'Layout' },
    desc: { label: 'Description', icon: 'info', stat: true, g: 'Layout' },
    divider: { label: 'Divider', icon: 'minus', stat: true, g: 'Layout' }
  };
  const FMTS = ['PDF', 'Image', 'Word', 'Excel'];
  let uid = 20;
  const newReminder = () => ({ override: false, start: 14, every: 3, unit: 'days', time: '09:00', overdue: true, overEvery: 7, overUnit: 'days' });
  const mk = (type, label, extra) => Object.assign({ id: 'x' + uid++, type, label: label || TYPES[type].label, help: '', required: false, def: '', opts: 'Option 1\nOption 2', min: '', max: '', cond: { on: '', eq: '' }, file: { fmts: ['PDF', 'Image'], size: 10, count: 1, expiry: 'manual', days: 365, multiple: false, approval: true, reminder: newReminder() } }, extra || {});

  const state = {
    sections: [
      { id: 's1', title: 'Company details', fields: [
        mk('short', 'Registered company name', { required: true, help: 'As it appears on your certificate of incorporation.' }),
        mk('yesno', 'Do you operate vehicles?', { required: true }),
        mk('short', 'Number of vehicles', { help: 'Only if you operate vehicles.', cond: { on: '', eq: 'Yes' } })
      ] },
      { id: 's2', title: 'Documents', fields: [
        mk('file', 'Certificate of Incorporation', { required: true, help: 'The official certificate issued by the registrar.', file: { fmts: ['PDF'], size: 10, count: 1, expiry: 'none', days: 365, multiple: false, approval: true, reminder: newReminder() } }),
        mk('file', 'Tax Clearance Certificate', { required: true, help: 'Must be issued within the last 12 months.', file: { fmts: ['PDF', 'Image'], size: 10, count: 1, expiry: 'upload', days: 365, multiple: false, approval: true, reminder: newReminder() } }),
        mk('file', 'Public Liability Insurance', { required: true, file: { fmts: ['PDF', 'Image', 'Excel'], size: 15, count: 2, expiry: 'manual', days: 365, multiple: true, approval: true, reminder: Object.assign(newReminder(), { override: true, start: 30, every: 1, unit: 'weeks', time: '08:30' }) } })
      ] }
    ],
    settings: { reminder: Object.assign(newReminder(), { override: true }), expiry: 'manual' }
  };
  state.sections[0].fields[2].cond.on = state.sections[0].fields[1].id;
  let sel = state.sections[1].fields[1].id;
  let pane = 'field';
  let preview = location.hash === '#preview';

  const all = () => state.sections.flatMap((s) => s.fields);
  const find = (id) => all().find((f) => f.id === id);
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  const plural = (n, u) => n + ' ' + (n === 1 ? u.replace(/s$/, '') : u);
  const summary = (r) => !r.enabledOff && ('Starts ' + (r.start === 0 ? 'on the deadline day' : plural(r.start, 'days') + ' before the deadline') + ', then every ' + (r.every === 1 ? r.unit.replace(/s$/, '') : r.every + ' ' + r.unit) + ' at ' + r.time + (r.overdue ? '. Keeps reminding every ' + (r.overEvery === 1 ? r.overUnit.replace(/s$/, '') : r.overEvery + ' ' + r.overUnit) + ' after the deadline.' : '. Stops at the deadline.'));
  const EXP = { none: 'No expiration', manual: 'Entered by employee', upload: 'Calculated from upload date', fixed: 'Fixed date' };

  /* ---------- palette ---------- */
  function renderPalette() {
    const groups = {};
    Object.entries(TYPES).forEach(([k, t]) => (groups[t.g] = groups[t.g] || []).push([k, t]));
    $('palette').innerHTML = '<div class="eyebrow" style="padding:10px">Add field</div>' + Object.entries(groups).map(([g, items]) => '<span class="eyebrow">' + g + '</span>' + items.map(([k, t]) => '<button data-add="' + k + '">' + Icons.i(t.icon) + t.label + '</button>').join('')).join('');
  }

  /* ---------- canvas ---------- */
  function fieldBody(f) {
    const t = TYPES[f.type];
    const lbl = '<div class="lbl">' + esc(f.label || 'Untitled') + (f.required ? '<span class="req" title="Required">*</span>' : '') + '</div>' + (f.help ? '<div class="help">' + esc(f.help) + '</div>' : '');
    if (f.type === 'heading') return '<div class="fld-heading">' + esc(f.label) + '</div>';
    if (f.type === 'desc') return '<p class="muted">' + esc(f.label) + '</p>';
    if (f.type === 'divider') return '<hr>';
    let ctl = '<div class="fake">' + (f.def ? esc(f.def) : 'Your answer') + '</div>';
    if (f.type === 'long') ctl = '<div class="fake" style="height:64px;align-items:flex-start;padding-top:10px">Your answer</div>';
    if (f.type === 'date') ctl = '<div class="fake">dd/mm/yyyy</div>';
    if (f.type === 'dropdown') ctl = '<div class="fake" style="justify-content:space-between">Choose…' + Icons.i('selector', 'sm') + '</div>';
    if (f.type === 'radio' || f.type === 'checkbox') ctl = f.opts.split('\n').filter(Boolean).map((o) => '<div class="opt-row"><input type="' + (f.type === 'radio' ? 'radio' : 'checkbox') + '" disabled>' + esc(o) + '</div>').join('');
    if (f.type === 'yesno') ctl = '<div class="segmented"><button>Yes</button><button>No</button></div>';
    if (f.type === 'file') ctl = '<div class="fake file">' + Icons.i('upload', 'sm') + 'Upload ' + f.file.fmts.join(', ') + ' · max ' + f.file.size + ' MB</div>';
    let tags = '';
    if (f.type === 'file') tags = '<span class="chip">' + EXP[f.file.expiry] + '</span>' + (f.file.approval ? '<span class="chip">Needs approval</span>' : '') + (f.file.reminder.override ? '<span class="chip">Custom reminders</span>' : '') + (f.file.multiple ? '<span class="chip">Multiple submissions</span>' : '');
    if (f.cond.on) { const src = find(f.cond.on); tags += '<span class="chip">Shown if “' + esc(src ? src.label : '?') + '” = ' + esc(f.cond.eq) + '</span>'; }
    return lbl + ctl + (tags ? '<div class="tags">' + tags + '</div>' : '');
  }

  function renderCanvas() {
    $('canvas').innerHTML = state.sections.map((s, si) =>
      '<div class="sec-bar"><input class="input sm" style="width:auto;flex:1;background:transparent;border-color:transparent;font-weight:500" data-sec="' + s.id + '" value="' + esc(s.title) + '" aria-label="Section title"><button class="icon-btn flat" data-del-sec="' + s.id + '" aria-label="Delete section">' + Icons.i('trash', 'sm') + '</button></div>' +
      (s.fields.length ? s.fields.map((f) =>
        '<div class="fld ' + (f.id === sel ? 'selected' : '') + '" draggable="' + !preview + '" data-id="' + f.id + '"><span class="grip">' + Icons.i('grip') + '</span><div class="body">' + fieldBody(f) + '</div>' +
        '<div class="acts"><button class="icon-btn flat" data-dup="' + f.id + '" aria-label="Duplicate">' + Icons.i('copy', 'sm') + '</button><button class="icon-btn flat" data-del="' + f.id + '" aria-label="Delete field">' + Icons.i('trash', 'sm') + '</button></div></div>').join('')
        : '<div class="empty canvas-empty" data-drop-sec="' + s.id + '"><div class="ico">' + Icons.i('plus') + '</div><h3>This section is empty</h3><p>Add a field from the left.</p></div>')).join('');
    const n = all().filter((f) => f.type === 'file').length;
    $('summary').textContent = all().length + ' fields · ' + n + ' document requirements';
  }

  /* ---------- properties ---------- */
  const row = (label, inner, hint) => '<div class="field mb-4"><span class="label">' + label + '</span>' + inner + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>';
  const toggle = (label, path, on) => '<label class="row between mb-4" style="cursor:pointer"><span>' + label + '</span><span class="toggle"><input type="checkbox" data-t="' + path + '" ' + (on ? 'checked' : '') + '></span></label>';

  function scheduleUI(pfx, r, withOverride) {
    return (withOverride ? toggle('Override the form default', pfx + '.override', r.override) : '') +
      (!withOverride || r.override ?
        '<div class="form-grid mb-4"><div class="field"><label>Start (days before deadline)</label><input class="input sm" type="number" min="0" data-n="' + pfx + '.start" value="' + r.start + '"></div>' +
        '<div class="field"><label>Send time</label><input class="input sm" type="time" data-v="' + pfx + '.time" value="' + r.time + '"></div>' +
        '<div class="field"><label>Repeat every</label><input class="input sm" type="number" min="1" data-n="' + pfx + '.every" value="' + r.every + '"></div>' +
        '<div class="field"><label>&nbsp;</label>' + UI.select({ size: 'sm', block: true, name: pfx + '.unit', options: ['days', 'weeks'], value: r.unit }) + '</div></div>' +
        toggle('Keep reminding after the deadline', pfx + '.overdue', r.overdue) +
        (r.overdue ? '<div class="form-grid mb-4"><div class="field"><label>Overdue every</label><input class="input sm" type="number" min="1" data-n="' + pfx + '.overEvery" value="' + r.overEvery + '"></div><div class="field"><label>&nbsp;</label>' + UI.select({ size: 'sm', block: true, name: pfx + '.overUnit', options: ['days', 'weeks'], value: r.overUnit }) + '</div></div>' : '') +
        '<div class="callout">' + Icons.i('clock', 'lg') + '<div><b>Effective schedule</b><div class="muted">' + summary(r) + '</div></div></div>'
        : '<div class="callout">' + Icons.i('clock', 'lg') + '<div class="muted">Using the form default: ' + summary(state.settings.reminder) + '</div></div>');
  }

  function renderProps() {
    document.querySelectorAll('#props-tabs .tab').forEach((b) => b.classList.toggle('active', b.dataset.p === pane));
    if (pane === 'form') {
      $('props').innerHTML = '<div class="prop-group"><h3>Default reminder schedule</h3><p class="muted mb-4">Applies to every document in this form unless a document or an assignment overrides it.</p>' + scheduleUI('settings.reminder', state.settings.reminder, false) + '</div>' +
        '<div class="prop-group"><h3>Default expiration policy</h3>' + row('Documents expire', UI.select({ block: true, name: 'settings.expiry', options: [{ value: 'none', label: EXP.none }, { value: 'manual', label: EXP.manual }, { value: 'upload', label: EXP.upload }, { value: 'fixed', label: EXP.fixed }], value: state.settings.expiry }), 'Each uploaded document still keeps its own expiration date.') + '</div>';
      return;
    }
    const f = find(sel);
    if (!f) { $('props').innerHTML = '<div class="empty"><div class="ico">' + Icons.i('forms') + '</div><h3>Select a field</h3><p>Click a field on the canvas to edit it.</p></div>'; return; }
    const t = TYPES[f.type];
    const prevFields = all().filter((x) => x.id !== f.id && !TYPES[x.type].stat && !TYPES[x.type].doc);
    let h = '<div class="prop-group"><div class="row between mb-4"><h3 style="margin:0">' + t.label + '</h3><span class="icon-btn flat" style="cursor:default">' + Icons.i(t.icon) + '</span></div>' +
      row(f.type === 'desc' ? 'Text' : f.type === 'heading' ? 'Heading text' : 'Label', f.type === 'desc' ? '<textarea class="textarea" rows="3" data-v="label">' + esc(f.label) + '</textarea>' : '<input class="input" data-v="label" value="' + esc(f.label) + '">');
    if (f.type !== 'divider' && !t.stat) h += row('Description / help text', '<input class="input" data-v="help" value="' + esc(f.help) + '" placeholder="Shown under the label">') + toggle('Required', 'required', f.required);
    if (t.opts) h += row('Options', '<textarea class="textarea" rows="4" data-v="opts">' + esc(f.opts) + '</textarea>', 'One option per line.');
    if (t.value && !t.opts) h += row('Default value', '<input class="input" data-v="def" value="' + esc(f.def) + '">');
    h += '</div>';
    if (['short', 'long', 'number'].includes(f.type)) h += '<div class="prop-group"><h3>Validation</h3><div class="form-grid"><div class="field"><label>' + (f.type === 'number' ? 'Min value' : 'Min length') + '</label><input class="input sm" type="number" data-v="min" value="' + f.min + '"></div><div class="field"><label>' + (f.type === 'number' ? 'Max value' : 'Max length') + '</label><input class="input sm" type="number" data-v="max" value="' + f.max + '"></div></div></div>';
    if (f.type === 'email' || f.type === 'phone') h += '<div class="prop-group"><h3>Validation</h3><p class="muted">' + (f.type === 'email' ? 'Must be a valid email address.' : 'Must be a valid phone number.') + '</p></div>';
    if (f.type === 'file') {
      const o = f.file;
      h += '<div class="prop-group"><h3>Document settings</h3>' +
        row('Accepted formats', '<div class="chips">' + FMTS.map((x) => '<label class="check chip"><input type="checkbox" data-fmt="' + x + '" ' + (o.fmts.includes(x) ? 'checked' : '') + '>' + x + '</label>').join('') + '</div>') +
        '<div class="form-grid mb-4"><div class="field"><label>Max file size (MB)</label><input class="input sm" type="number" min="1" data-n="file.size" value="' + o.size + '"></div><div class="field"><label>Max files</label><input class="input sm" type="number" min="1" data-n="file.count" value="' + o.count + '"></div></div>' +
        toggle('Allow multiple submissions', 'file.multiple', o.multiple) + toggle('Employee approval required', 'file.approval', o.approval) + '</div>' +
        '<div class="prop-group"><h3>Expiration</h3>' + row('Expiration date', UI.select({ block: true, name: 'file.expiry', options: [{ value: 'none', label: EXP.none }, { value: 'manual', label: EXP.manual }, { value: 'upload', label: EXP.upload }, { value: 'fixed', label: EXP.fixed }], value: o.expiry }), 'Stored on each uploaded document and editable per document.') +
        (o.expiry === 'upload' ? '<div class="field"><label>Valid for (days after upload)</label><input class="input sm" type="number" data-n="file.days" value="' + o.days + '"></div>' : '') + '</div>' +
        '<div class="prop-group"><h3>Reminder schedule</h3>' + scheduleUI('file.reminder', o.reminder, true) + '</div>';
    }
    if (f.type !== 'divider') h += '<div class="prop-group"><h3>Conditional visibility</h3>' +
      row('Show this field only when', UI.select({ block: true, name: 'cond.on', placeholder: 'Always show', options: [{ value: '', label: 'Always show' }].concat(prevFields.map((x) => ({ value: x.id, label: x.label }))), value: f.cond.on })) +
      (f.cond.on ? '<div class="field"><label>Answer equals</label><input class="input sm" data-v="cond.eq" value="' + esc(f.cond.eq) + '"></div>' : '') + '</div>';
    $('props').innerHTML = h;
  }

  /* ---------- state helpers ---------- */
  function target(path) { // 'settings.*' or field path
    let o = path.startsWith('settings.') ? state.settings : find(sel);
    const parts = path.replace(/^settings\./, '').split('.');
    const last = parts.pop();
    parts.forEach((p) => (o = o[p]));
    return [o, last];
  }
  const set = (path, v) => { const [o, k] = target(path); o[k] = v; };
  const refresh = (props) => { renderCanvas(); if (props) renderProps(); };

  /* ---------- events ---------- */
  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) {
      const cur = state.sections.find((s) => s.fields.some((f) => f.id === sel)) || state.sections[state.sections.length - 1];
      const f = mk(add.dataset.add);
      const idx = cur.fields.findIndex((x) => x.id === sel);
      cur.fields.splice(idx < 0 ? cur.fields.length : idx + 1, 0, f);
      sel = f.id; pane = 'field'; refresh(true); return;
    }
    const del = e.target.closest('[data-del]');
    if (del) { state.sections.forEach((s) => (s.fields = s.fields.filter((f) => f.id !== del.dataset.del))); if (sel === del.dataset.del) sel = null; refresh(true); return; }
    const dup = e.target.closest('[data-dup]');
    if (dup) { state.sections.forEach((s) => { const i = s.fields.findIndex((f) => f.id === dup.dataset.dup); if (i >= 0) { const c = JSON.parse(JSON.stringify(s.fields[i])); c.id = 'x' + uid++; c.label += ' (copy)'; s.fields.splice(i + 1, 0, c); sel = c.id; } }); refresh(true); return; }
    const ds = e.target.closest('[data-del-sec]');
    if (ds) { if (state.sections.length > 1) state.sections = state.sections.filter((s) => s.id !== ds.dataset.delSec); else UI.toast('A form needs at least one section'); refresh(true); return; }
    if (e.target.closest('#add-section')) { state.sections.push({ id: 's' + uid++, title: 'New section', fields: [] }); refresh(); return; }
    const fld = e.target.closest('.fld');
    if (fld && !preview) { sel = fld.dataset.id; pane = 'field'; refresh(true); return; }
    const pt = e.target.closest('#props-tabs .tab');
    if (pt) { pane = pt.dataset.p; renderProps(); }
  });

  $('mode').addEventListener('seg:change', (e) => {
    preview = e.detail.value === 'preview';
    $('builder').classList.toggle('is-preview', preview);
    $('canvas-card').classList.toggle('preview-mode', preview);
    $('preview-foot').classList.toggle('hidden', !preview);
    renderCanvas();
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'f-title') return;
    if (t.dataset.sec) { state.sections.find((s) => s.id === t.dataset.sec).title = t.value; return; }
    if (t.dataset.v) { set(t.dataset.v, t.value); renderCanvas(); }
    if (t.dataset.n) { set(t.dataset.n, Math.max(0, parseInt(t.value || '0', 10))); renderCanvas(); if (t.dataset.n.includes('reminder')) { const c = t.closest('.prop-group').querySelector('.callout .muted'); const [o] = target(t.dataset.n.replace(/\.[^.]+$/, '.x')); if (c && summary(o)) c.textContent = summary(o); } }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.t) { set(t.dataset.t, t.checked); refresh(true); }
    if (t.dataset.fmt) { const f = find(sel); f.file.fmts = FMTS.filter((x) => (x === t.dataset.fmt ? t.checked : f.file.fmts.includes(x))); renderCanvas(); }
  });
  document.addEventListener('select:change', (e) => {
    const { name, value } = e.detail;
    if (!name) return;
    set(name, value); refresh(true);
  });

  /* drag & drop reordering (within and across sections) */
  let dragId = null;
  document.addEventListener('dragstart', (e) => { const el = e.target.closest?.('.fld'); if (el) { dragId = el.dataset.id; el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); } });
  document.addEventListener('dragend', () => { dragId = null; document.querySelectorAll('.dragging,.over').forEach((n) => n.classList.remove('dragging', 'over')); });
  document.addEventListener('dragover', (e) => { const el = e.target.closest?.('.fld'); if (el && dragId && el.dataset.id !== dragId) { e.preventDefault(); document.querySelectorAll('.over').forEach((n) => n.classList.remove('over')); el.classList.add('over'); } if (e.target.closest?.('[data-drop-sec]') && dragId) e.preventDefault(); });
  document.addEventListener('drop', (e) => {
    if (!dragId) return;
    const el = e.target.closest('.fld'); const empty = e.target.closest('[data-drop-sec]');
    if (!el && !empty) return;
    e.preventDefault();
    let moved; state.sections.forEach((s) => { const i = s.fields.findIndex((f) => f.id === dragId); if (i >= 0) moved = s.fields.splice(i, 1)[0]; });
    if (empty) state.sections.find((s) => s.id === empty.dataset.dropSec).fields.push(moved);
    else state.sections.forEach((s) => { const i = s.fields.findIndex((f) => f.id === el.dataset.id); if (i >= 0) s.fields.splice(i, 0, moved); });
    sel = moved.id; refresh(true);
  });

  renderPalette(); renderCanvas(); renderProps();
  if (preview) { $('mode').querySelector('[data-value=preview]').click(); }
});
