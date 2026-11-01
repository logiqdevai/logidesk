# LogiDesk demo video (Greek)

Generates a narrated MP4 walkthrough of the mockups in `../`.

```powershell
npm install
npx playwright install chromium   # first time only
$env:OPENAI_API_KEY = "sk-..."    # only needed when narration text changes
npm run build                     # → out/logidesk-demo-el.mp4
node build.mjs --scenes inbox     # preview one or more scenes → out/preview-inbox.mp4
npm run voices                    # only (re)generate voice lines
```

## Editing `script.json`

- `voice` — OpenAI TTS model, voice (`cedar`, `marin`, `onyx`, `nova`, …) and speaking-style instructions.
- `music` — optional background track: `{ "file": "music.mp3", "volume": 0.12 }`.
- `scenes[]` — played in order.
  - `type: "title"` scenes are full-screen cards (`eyebrow`, `title`, `subtitle`, `points`).
  - Other scenes open `page` (path relative to `app/mockups`), show `title` in the bottom chip, and list `benefits` in the "Τι κερδίζετε" panel.
  - `segments[]` — each one is a narration line (`say`) plus screen actions (`do`) that run while it plays. Add `"panel": "benefits"` to show the benefits panel during that line.

Voice lines are cached by text in `cache/tts`, so only lines you change are regenerated (and billed).

### Actions (`do`)

| Action | Example |
| --- | --- |
| Open a page | `{ "goto": "business/inbox.html" }` |
| Pause (ms) | `{ "wait": 1200 }` |
| Move the cursor to an element | `{ "move": "#stats .stat >> nth=2" }` |
| Click | `{ "click": "#approve" }` |
| Type into a field | `{ "type": { "selector": "#q", "text": "Nikolaou" } }` |
| Press a key | `{ "press": "Escape" }` |
| Scroll by pixels / to an element / to top | `{ "scroll": 400 }`, `{ "scroll": "#reminders" }`, `{ "scroll": "top" }` |
| Spotlight an element / remove it | `{ "highlight": ".card:has-text('Match details')" }`, `{ "clear": true }` |
| Show or hide the cursor | `{ "cursor": false }` |

Selectors are [Playwright selectors](https://playwright.dev/docs/other-locators), so `:has-text('…')` and `>> nth=N` work.
