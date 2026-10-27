// Builds the narrated demo video described in script.json:
//   1. OpenAI text-to-speech for every narration segment (cached in cache/tts)
//   2. Playwright drives the static mockups (cursor, clicks, scrolling, overlays) while a CDP screencast records frames
//   3. ffmpeg turns each scene into a clip synced to its voice-over, then crossfades all clips into one MP4
//
// Usage:  OPENAI_API_KEY=... node build.mjs [--script script.json] [--scenes intro,dashboard] [--voices-only]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MOCKUPS = path.resolve(HERE, '..');
const CACHE = path.join(HERE, 'cache');
const OUT = path.join(HERE, 'out');

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const script = JSON.parse(fs.readFileSync(path.resolve(HERE, opt('--script') || 'script.json'), 'utf8'));
const only = opt('--scenes') ? opt('--scenes').split(',') : null;
const V = { width: 1536, height: 864, scale: 1.25, fps: 30, crossfade: 0.6, transition: 'fade', leadIn: 0.8, tail: 1.0, segmentGap: 0.45, ...script.video };
const OUT_W = Math.round(V.width * V.scale), OUT_H = Math.round(V.height * V.scale);

const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
const log = (...m) => console.log('[demo]', ...m);

function run(bin, argv, label) {
  const r = spawnSync(bin, argv, { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`${label || path.basename(bin)} failed:\n${(r.stderr || '').split('\n').slice(-25).join('\n')}`);
  return r.stdout;
}
const ff = (argv, label) => run(ffmpegPath, ['-y', '-hide_banner', '-loglevel', 'error', ...argv], label);
const probeDuration = (file) => parseFloat(run(ffprobeStatic.path, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).trim());

/* ---------------- 1. Voice-over ---------------- */

async function tts(text) {
  const v = script.voice;
  const hash = crypto.createHash('sha1').update(JSON.stringify([v.model, v.voice, v.instructions, v.speed, text])).digest('hex').slice(0, 16);
  const file = path.join(CACHE, 'tts', hash + '.wav');
  if (!fs.existsSync(file)) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not set (needed to generate new voice lines)');
    const body = { model: v.model, voice: v.voice, input: text, response_format: 'wav' };
    if (v.instructions) body.instructions = v.instructions;
    if (v.speed) body.speed = v.speed;
    let res;
    for (let attempt = 1; ; attempt++) {
      res = await fetch('https://api.openai.com/v1/audio/speech', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok || attempt >= 4 || (res.status < 500 && res.status !== 429)) break;
      await sleep(2000 * attempt);
    }
    if (!res.ok) throw new Error(`OpenAI TTS ${res.status}: ${await res.text()}`);
    const raw = file + '.raw';
    fs.writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
    // Re-mux to a clean 48 kHz WAV (streamed WAV headers carry no length) and normalise loudness
    ff(['-i', raw, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', '-ac', '1', file], 'tts normalise');
    fs.unlinkSync(raw);
    log('voice  ', text.slice(0, 70) + (text.length > 70 ? '…' : ''));
  }
  return { file, duration: probeDuration(file) };
}

async function generateVoices(list) {
  fs.mkdirSync(path.join(CACHE, 'tts'), { recursive: true });
  const jobs = list.flatMap((s) => s.segments.filter((g) => g.say).map((g) => g));
  let next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < jobs.length) { const g = jobs[next++]; g.audio = await tts(g.say.trim()); }
  }));
}

/* ---------------- 2. Overlay injected into every page ---------------- */

const LOGO = '<svg viewBox="0 0 24 24" fill="none" stroke="#cc785c" stroke-width="2.4" stroke-linecap="round"><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7"/></svg>';
const FONTS = 'https://fonts.googleapis.com/css2?family=GFS+Didot&family=Inter:wght@400;500;600&display=swap';

const OVERLAY = `(() => {
  if (window.__demo) return;
  const CSS = \`
  #__demo, #__demo * { box-sizing: border-box; }
  #__demo { font-family: Inter, system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  #__demo .cursor { position: fixed; left: 0; top: 0; width: 26px; height: 26px; z-index: 2147483647; pointer-events: none; opacity: 0; transition: opacity .3s; filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); }
  #__demo .cursor.on { opacity: 1; }
  #__demo .ripple { position: fixed; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%; border: 3px solid #cc785c; z-index: 2147483646; pointer-events: none; animation: __rip .55s ease-out forwards; }
  @keyframes __rip { from { transform: scale(.3); opacity: 1; } to { transform: scale(1.4); opacity: 0; } }
  #__demo .chip { position: fixed; left: 28px; bottom: 28px; z-index: 2147483640; display: flex; align-items: center; gap: 14px; padding: 12px 22px 12px 14px; border-radius: 999px; background: rgba(24,23,21,.94); color: #faf9f5; font-size: 17px; font-weight: 500; box-shadow: 0 10px 30px rgba(0,0,0,.25); transform: translateY(140%); opacity: 0; transition: transform .6s cubic-bezier(.2,.8,.2,1), opacity .6s; }
  #__demo .chip.on { transform: none; opacity: 1; }
  #__demo .chip .n { display: grid; place-items: center; min-width: 34px; height: 34px; padding: 0 8px; border-radius: 999px; background: #cc785c; color: #fff; font-size: 14px; font-weight: 600; letter-spacing: .5px; }
  #__demo .dim { position: fixed; inset: 0; z-index: 2147483630; background: rgba(20,20,19,.32); opacity: 0; transition: opacity .6s; pointer-events: none; }
  #__demo .dim.on { opacity: 1; }
  #__demo .panel { position: fixed; top: 50%; right: 40px; width: 560px; z-index: 2147483635; padding: 40px 42px 38px; border-radius: 22px; background: rgba(24,23,21,.97); color: #faf9f5; box-shadow: 0 30px 80px rgba(0,0,0,.35); transform: translate(110%, -50%); transition: transform .7s cubic-bezier(.2,.8,.2,1); }
  #__demo .panel.on { transform: translate(0, -50%); }
  #__demo .panel .eyebrow { color: #e3a48c; font-size: 13px; font-weight: 600; letter-spacing: 2.4px; text-transform: uppercase; }
  #__demo .panel h2 { margin: 10px 0 26px; font-family: 'GFS Didot', serif; font-weight: 400; font-size: 40px; line-height: 1.15; color: #fff; }
  #__demo .panel ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 18px; }
  #__demo .panel li { display: flex; gap: 16px; align-items: flex-start; font-size: 20px; line-height: 1.4; color: #ece8e0; opacity: 0; transform: translateX(24px); transition: opacity .5s, transform .5s; }
  #__demo .panel li.on { opacity: 1; transform: none; }
  #__demo .panel li i { flex: none; display: grid; place-items: center; width: 28px; height: 28px; margin-top: 1px; border-radius: 50%; background: #cc785c; }
  #__demo .panel li i svg { width: 16px; height: 16px; }
  #__demo .ring { position: absolute; z-index: 2147483620; pointer-events: none; border: 3px solid #cc785c; border-radius: 14px; box-shadow: 0 0 0 200vmax rgba(20,20,19,.34), 0 0 0 7px rgba(204,120,92,.25); opacity: 0; transition: opacity .5s, left .6s, top .6s, width .6s, height .6s; }
  #__demo .ring.on { opacity: 1; }
  \`;
  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  const ARROW = '<svg viewBox="0 0 26 26"><path d="M4 2.5 L4 21 L9 16.4 L12.4 24 L15.6 22.6 L12.3 15.2 L19 15.2 Z" fill="#fff" stroke="#141413" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  let root, pos = null;
  const el = (cls, html) => { const d = document.createElement('div'); d.className = cls; if (html) d.innerHTML = html; root.appendChild(d); return d; };
  function ensure() {
    if (root && root.isConnected) return root;
    if (!document.documentElement) return null;
    root = document.createElement('div'); root.id = '__demo'; root.lang = 'el'; // Greek uppercase drops accents
    const st = document.createElement('style'); st.textContent = CSS; root.appendChild(st);
    const fl = document.createElement('link'); fl.rel = 'stylesheet'; fl.href = '${FONTS}'; root.appendChild(fl);
    el('dim'); el('ring'); el('panel'); el('chip'); el('cursor', ARROW);
    document.documentElement.appendChild(root);
    if (pos) place(pos.x, pos.y);
    return root;
  }
  const q = (c) => (ensure(), root.querySelector('.' + c));
  function place(x, y) { pos = { x, y }; const c = root && root.querySelector('.cursor'); if (c) { c.style.transform = 'translate(' + (x - 4) + 'px,' + (y - 2) + 'px)'; c.classList.add('on'); } }
  window.addEventListener('mousemove', (e) => { ensure(); place(e.clientX, e.clientY); }, true);
  window.addEventListener('mousedown', (e) => { ensure(); const r = el('ripple'); r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'; setTimeout(() => r.remove(), 700); }, true);
  document.addEventListener('DOMContentLoaded', ensure);
  window.__demo = {
    ensure: () => !!ensure(),
    cursor(x, y, show) { ensure(); if (x != null) place(x, y); q('cursor').classList.toggle('on', show !== false); },
    chip(n, text, animate) {
      const c = q('chip'); c.innerHTML = (n ? '<span class="n">' + n + '</span>' : '') + '<span>' + text + '</span>';
      if (!animate) { c.style.transition = 'none'; c.classList.add('on'); c.offsetWidth; c.style.transition = ''; } else requestAnimationFrame(() => c.classList.add('on'));
    },
    hideChip() { q('chip').classList.remove('on'); },
    panel(eyebrow, title, items) {
      const p = q('panel');
      p.innerHTML = '<div class="eyebrow">' + eyebrow + '</div><h2>' + title + '</h2><ul>' + items.map((t) => '<li><i>' + CHECK + '</i><span>' + t + '</span></li>').join('') + '</ul>';
      q('dim').classList.add('on'); q('chip').classList.remove('on'); q('cursor').classList.remove('on');
      requestAnimationFrame(() => p.classList.add('on'));
    },
    reveal(i) { const li = q('panel').querySelectorAll('li')[i]; if (li) li.classList.add('on'); },
    hidePanel() { q('panel').classList.remove('on'); q('dim').classList.remove('on'); q('chip').classList.add('on'); q('cursor').classList.add('on'); },
    ring(r) {
      const g = q('ring');
      if (!r) { g.classList.remove('on'); return; }
      const pad = 8;
      Object.assign(g.style, { left: (r.x + scrollX - pad) + 'px', top: (r.y + scrollY - pad) + 'px', width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px' });
      g.classList.add('on');
    }
  };
})();`;

function titleHtml(s) {
  const points = (s.points || []).map((p, i) => '<div class="pt" style="animation-delay:' + (1.1 + i * 0.18).toFixed(2) + 's"><i>' + LOGO + '</i><span>' + p + '</span></div>').join('');
  return `<!doctype html><html lang="el"><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>
  * { box-sizing: border-box; margin: 0; }
  body:not(.go) * { animation-play-state: paused !important; }
  body { width: 100vw; height: 100vh; overflow: hidden; background: #faf9f5; color: #141413; font-family: Inter, sans-serif; -webkit-font-smoothing: antialiased; display: grid; place-items: center; }
  body::before { content: ''; position: fixed; inset: 0; background: radial-gradient(900px 600px at 85% 15%, #f6e6df 0%, transparent 70%), radial-gradient(800px 600px at 10% 95%, #efe9de 0%, transparent 70%); }
  .wrap { position: relative; width: 1180px; }
  .brand { display: flex; align-items: center; gap: 12px; font-family: 'GFS Didot', serif; font-size: 34px; opacity: 0; animation: up .9s .1s forwards; }
  .brand svg { width: 34px; height: 34px; }
  .eyebrow { margin-top: 56px; color: #cc785c; font-size: 16px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; opacity: 0; animation: up .9s .35s forwards; }
  h1 { margin-top: 18px; font-family: 'GFS Didot', serif; font-weight: 400; font-size: 78px; line-height: 1.08; letter-spacing: -1px; opacity: 0; animation: up 1s .5s forwards; }
  .line { margin-top: 34px; width: 0; height: 3px; background: #cc785c; border-radius: 3px; animation: grow 1s .8s forwards; }
  p.sub { margin-top: 30px; max-width: 860px; font-size: 25px; line-height: 1.5; color: #3d3d3a; opacity: 0; animation: up 1s .9s forwards; }
  .pts { margin-top: 44px; display: grid; grid-template-columns: repeat(${Math.min(3, (s.points || []).length || 1)}, 1fr); gap: 16px; }
  .pt { display: flex; gap: 14px; align-items: center; padding: 18px 20px; border-radius: 14px; background: #efe9de; font-size: 19px; font-weight: 500; opacity: 0; animation: up .8s forwards; }
  .pt i svg { width: 20px; height: 20px; display: block; }
  @keyframes up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
  @keyframes grow { to { width: 120px; } }
  </style></head><body><div class="wrap">
  ${(s.brand ?? script.brand) ? `<div class="brand">${LOGO}<span>${s.brand ?? script.brand}</span></div>` : ''}
  ${s.eyebrow ? `<div class="eyebrow">${s.eyebrow}</div>` : ''}
  <h1>${s.title || ''}</h1><div class="line"></div>
  ${s.subtitle ? `<p class="sub">${s.subtitle}</p>` : ''}
  ${points ? `<div class="pts">${points}</div>` : ''}
  </div></body></html>`;
}

/* ---------------- 3. Recording ---------------- */

class Recorder {
  constructor(cdp) {
    this.cdp = cdp;
    cdp.on('Page.screencastFrame', (f) => {
      if (this.dir) {
        const file = 'f' + String(this.frames.length).padStart(6, '0') + '.jpg';
        fs.writeFileSync(path.join(this.dir, file), Buffer.from(f.data, 'base64'));
        this.frames.push({ t: this.now(), file });
      }
      cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    });
  }
  now() { return (performance.now() - this.t0) / 1000; }
  async begin(dir) {
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    this.dir = dir; this.frames = []; this.t0 = performance.now();
    await this.start();
  }
  async start() { await this.cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: OUT_W, maxHeight: OUT_H, everyNthFrame: 1 }); }
  async restart() { await this.cdp.send('Page.stopScreencast').catch(() => {}); await this.start(); }
  async end() { const d = this.now(); await this.cdp.send('Page.stopScreencast').catch(() => {}); const dir = this.dir; this.dir = null; return { dir, frames: this.frames, duration: d }; }
}

async function record(list) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: V.width, height: V.height }, deviceScaleFactor: V.scale, locale: 'el-GR' });
  await ctx.addInitScript({ content: OVERLAY });
  // Extra CSS for the recorded mockup pages (e.g. hiding the product name)
  if (script.css) await ctx.addInitScript({ content: `document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(script.css)}; document.head.appendChild(s); });` });
  const page = await ctx.newPage();
  const rec = new Recorder(await ctx.newCDPSession(page));
  let cursor = { x: V.width * 0.62, y: V.height * 0.58 };
  let chip = null;
  const numbered = script.scenes.filter((s) => s.type !== 'title');

  const restore = async () => {
    await page.waitForLoadState('load');
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(([c, ch]) => { __demo.ensure(); __demo.cursor(c.x, c.y, true); if (ch) __demo.chip(ch[0], ch[1], false); }, [cursor, chip]);
    if (rec.dir) await rec.restart();
  };
  const goto = async (p) => {
    const [file, query] = p.split('?');
    await page.goto(pathToFileURL(path.join(MOCKUPS, file)).href + (query ? '?' + query : ''));
    await restore();
  };
  const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const moveTo = async (x, y) => {
    const d = Math.hypot(x - cursor.x, y - cursor.y), ms = Math.min(1100, Math.max(420, 300 + d * 0.7)), n = Math.round(ms / 16);
    const from = { ...cursor };
    for (let i = 1; i <= n; i++) { const e = ease(i / n); await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e); await sleep(16); }
    cursor = { x, y };
  };
  const scrollTo = (y, ms = 1000) => page.evaluate(([y, ms]) => new Promise((done) => {
    const max = document.documentElement.scrollHeight - innerHeight, y0 = scrollY, y1 = Math.max(0, Math.min(max, y)), t0 = performance.now();
    const step = (t) => { const p = Math.min(1, (t - t0) / ms), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; window.scrollTo({ top: y0 + (y1 - y0) * e, behavior: 'instant' }); p < 1 ? requestAnimationFrame(step) : done(); };
    requestAnimationFrame(step);
  }), [y, ms]);
  const box = async (sel) => {
    const loc = page.locator(sel).first();
    await loc.waitFor({ state: 'visible', timeout: 5000 });
    let b = await loc.boundingBox();
    if (b.y < 70 || b.y + Math.min(b.height, V.height * 0.6) > V.height - 20) {
      const sy = await page.evaluate(() => scrollY);
      await scrollTo(sy + b.y - Math.max(90, (V.height - b.height) / 2));
      b = await loc.boundingBox();
    }
    return b;
  };
  const center = (b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

  async function act(a) {
    const [k, v] = Object.entries(a)[0];
    const url = page.url();
    switch (k) {
      case 'goto': await goto(v); break;
      case 'wait': await sleep(v); break;
      case 'move': case 'hover': { const c = center(await box(v)); await moveTo(c.x, c.y); break; }
      case 'click': {
        const c = center(await box(v)); await moveTo(c.x, c.y); await sleep(120);
        await page.mouse.down(); await sleep(90); await page.mouse.up(); await sleep(250);
        break;
      }
      case 'type': { const c = center(await box(v.selector)); await moveTo(c.x, c.y); await page.mouse.click(c.x, c.y); if (v.clear) await page.locator(v.selector).first().fill(''); await page.keyboard.type(v.text, { delay: v.delay || 55 }); break; }
      case 'press': await page.keyboard.press(v); break;
      case 'scroll': {
        if (typeof v === 'number') await scrollTo((await page.evaluate(() => scrollY)) + v, Math.min(1600, 500 + Math.abs(v)));
        else if (v === 'top') await scrollTo(0);
        else { const loc = page.locator(v).first(); const b = await loc.boundingBox(); const sy = await page.evaluate(() => scrollY); await scrollTo(sy + b.y - 90, 1100); }
        break;
      }
      case 'highlight': { const b = await box(v); await page.evaluate((r) => __demo.ring(r), b); break; }
      case 'clear': await page.evaluate(() => __demo.ring(null)); break;
      case 'cursor': await page.evaluate((s) => __demo.cursor(null, null, s), v !== false); break;
      default: throw new Error('Unknown action: ' + k);
    }
    if (k !== 'goto' && page.url() !== url) await restore();
  }

  const results = [];
  for (const s of list) {
    const idx = script.scenes.indexOf(s);
    const isTitle = s.type === 'title';
    log('record ', s.id);
    chip = isTitle ? null : [String(numbered.indexOf(s) + 1).padStart(2, '0'), s.chip || s.title];
    if (isTitle) {
      const file = path.join(CACHE, 'titles', s.id + '.html');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, titleHtml(s));
      await page.goto(pathToFileURL(file).href);
      await page.waitForLoadState('load');
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => __demo.cursor(null, null, false));
    } else {
      await goto(s.page);
      await page.evaluate(() => __demo.hideChip());
      if (s.cursor) cursor = { x: s.cursor[0], y: s.cursor[1] };
      await page.mouse.move(cursor.x, cursor.y);
    }

    await rec.begin(path.join(CACHE, 'frames', s.id));
    // Entrance animations start only once the recording is running
    if (isTitle) await page.evaluate(() => document.body.classList.add('go'));
    else await page.evaluate((c) => __demo.chip(c[0], c[1], true), chip);
    await sleep(V.leadIn * 1000);
    const segs = s.segments || [];
    for (let i = 0; i < segs.length; i++) {
      const g = segs[i];
      g.at = rec.now();
      const dur = g.audio ? g.audio.duration : (g.duration || 2);
      const t0 = performance.now();
      const timers = [];
      if (g.panel) {
        const items = Array.isArray(g.panel) ? g.panel : s.benefits || [];
        await page.evaluate(([e, t, it]) => __demo.panel(e, t, it), [g.panelEyebrow || script.labels?.benefits || 'Benefits', g.panelTitle || s.benefitsTitle || s.title, items]);
        // Reveal each bullet as the narrator gets to it (spread across the segment)
        items.forEach((_, j) => timers.push(setTimeout(() => page.evaluate((j) => __demo.reveal(j), j).catch(() => {}), 500 + (j * dur * 1000 * 0.88) / items.length)));
      }
      for (const a of g.do || []) await act(a);
      await sleep(dur * 1000 + (g.pause ?? V.segmentGap) * 1000 - (performance.now() - t0));
      timers.forEach(clearTimeout);
      if (g.panel && !(segs[i + 1] && segs[i + 1].panel)) await page.evaluate(() => __demo.hidePanel());
    }
    await sleep(V.tail * 1000);
    const r = await rec.end();
    results.push({ scene: s, idx, ...r });
  }
  await browser.close();
  return results;
}

/* ---------------- 4. Encoding ---------------- */

function encodeScene(r) {
  const { scene, dir, frames, duration } = r;
  if (!frames.length) throw new Error(`No frames captured for scene "${scene.id}"`);
  const lines = ['ffconcat version 1.0'];
  frames.forEach((f, i) => {
    const start = i === 0 ? 0 : f.t, end = i + 1 < frames.length ? frames[i + 1].t : duration;
    if (start >= duration) return;
    lines.push(`file '${f.file}'`, `duration ${Math.max(0.001, Math.min(end, duration) - start).toFixed(4)}`);
  });
  lines.push(`file '${frames[frames.length - 1].file}'`);
  fs.writeFileSync(path.join(dir, 'frames.txt'), lines.join('\n'));

  // Scene audio: every narration segment placed at the moment it started on screen
  const voiced = (scene.segments || []).filter((g) => g.audio);
  const audio = path.join(dir, 'audio.wav');
  if (voiced.length) {
    const inputs = voiced.flatMap((g) => ['-i', g.audio.file]);
    const delays = voiced.map((g, i) => `[${i}:a]adelay=${Math.round(g.at * 1000)}:all=1[a${i}]`).join(';');
    const mix = voiced.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${voiced.length}:normalize=0,apad,atrim=0:${duration.toFixed(3)}[out]`;
    ff([...inputs, '-filter_complex', delays + ';' + mix, '-map', '[out]', '-ar', '48000', '-ac', '2', audio], 'scene audio');
  } else {
    ff(['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', duration.toFixed(3), audio], 'silence');
  }

  // Near-lossless intermediate clip; the final pass does the real compression
  const out = path.join(CACHE, 'clips', `${String(r.idx).padStart(2, '0')}-${scene.id}.mkv`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  ff(['-f', 'concat', '-safe', '0', '-i', path.join(dir, 'frames.txt'), '-i', audio,
    '-vf', `fps=${V.fps},scale=${OUT_W}:${OUT_H}:flags=lanczos,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '12', '-c:a', 'pcm_s16le', '-t', duration.toFixed(3), out], 'scene ' + scene.id);
  fs.rmSync(dir, { recursive: true, force: true });
  return { file: out, duration: probeDuration(out) };
}

function assemble(clips, outFile) {
  const F = V.crossfade;
  const inputs = clips.flatMap((c) => ['-i', c.file]);
  let filter, vLast = '0:v', aLast = '0:a', acc = clips[0].duration;
  const parts = [];
  for (let i = 1; i < clips.length; i++) {
    const vo = i === clips.length - 1 ? 'vx' : `v${i}`, ao = i === clips.length - 1 ? 'ax' : `a${i}`;
    parts.push(`[${vLast}][${i}:v]xfade=transition=${V.transition}:duration=${F}:offset=${(acc - F).toFixed(3)}[${vo}]`);
    parts.push(`[${aLast}][${i}:a]acrossfade=d=${F}[${ao}]`);
    acc += clips[i].duration - F; vLast = vo; aLast = ao;
  }
  // Fade in from / out to the canvas colour at the very start and end
  const vIn = clips.length > 1 ? '[vx]' : '[0:v]', aIn = clips.length > 1 ? '[ax]' : '[0:a]';
  parts.push(`${vIn}fade=t=in:st=0:d=0.6:color=0xfaf9f5,fade=t=out:st=${(acc - 0.8).toFixed(3)}:d=0.8:color=0xfaf9f5[vout]`);
  let aChain = `${aIn}afade=t=out:st=${(acc - 0.8).toFixed(3)}:d=0.8`;
  const music = script.music && script.music.file ? path.resolve(HERE, script.music.file) : null;
  const extra = [];
  if (music) {
    extra.push('-stream_loop', '-1', '-i', music);
    aChain += '[voice];' + `[${clips.length}:a]volume=${script.music.volume ?? 0.12},afade=t=in:d=2,afade=t=out:st=${(acc - 3).toFixed(3)}:d=3[bg];[voice][bg]amix=inputs=2:duration=first:normalize=0`;
  }
  parts.push(aChain + '[aout]');
  filter = parts.join(';');
  ff([...inputs, ...extra, '-filter_complex', filter, '-map', '[vout]', '-map', '[aout]', '-t', acc.toFixed(3),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(V.fps),
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outFile], 'final assembly');
  return acc;
}

/* ---------------- main ---------------- */

const list = script.scenes.filter((s) => !only || only.includes(s.id));
if (!list.length) throw new Error('No scenes matched --scenes');
log(`voices for ${list.length} scene(s)…`);
await generateVoices(list);
if (args.includes('--voices-only')) { log('voices ready in cache/tts'); process.exit(0); }

const recorded = await record(list);
const clips = recorded.map((r) => { log('encode ', r.scene.id, r.duration.toFixed(1) + 's'); return encodeScene(r); });
const outFile = path.resolve(HERE, only ? path.join('out', 'preview-' + only.join('_') + '.mp4') : script.output || 'out/demo.mp4');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
const total = assemble(clips, outFile);
log(`done → ${outFile} (${Math.floor(total / 60)}m ${Math.round(total % 60)}s)`);
