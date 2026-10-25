# AGENTS.md

Project constraints for AI agents and contributors working in this repository.

[中文版](AGENTS.zh-CN.md)

**Language policy**: the repository is bilingual. English docs are `README.md`, `PRIVACY.md`, `docs/DATA.md`, `AGENTS.md`; Chinese docs are `README.zh-CN.md`, `PRIVACY.zh-CN.md`, `docs/DATA.zh-CN.md`, `AGENTS.zh-CN.md`. The two web UIs keep separate copy: `web/` is Chinese (锦记), `site/` is English (Koi 300). The macOS and Windows apps expose both languages through an in-app switcher. When changing UI copy, update both UIs and the matching docs. Code identifiers and commit subjects are English.

## Read first

- Product overview: `README.md` / `README.zh-CN.md`
- Data fields and local API: `docs/DATA.md` / `docs/DATA.zh-CN.md`
- Privacy boundaries: `PRIVACY.md` / `PRIVACY.zh-CN.md`

## Structure

```text
shell/           Language redirect; / goes to /zh/ or /en/
site/            English static site (Koi 300), GitHub Pages /en/
web/             Chinese static app (锦记), GitHub Pages /zh/, bundled into the desktop apps
server/          Local file server + JSON API, Node built-ins only
mac/             Native SwiftUI source, Info.plist, empty SeedData, build.sh
desktop/         Electron shell; starts server, loads web; electron-builder NSIS
docs/            Data format and fictional screenshots
.github/         Pages and dual-platform release workflows
```

`site/` and `web/` share the same UI behaviour and data schema but have separate copy. When changing behaviour, update both; when changing copy, update the matching language and keep the other in sync. Native macOS copy lives in the `T()` dictionary in `mac/Sources/Localization.swift`; every new string needs both languages. All front ends share one `AppData` JSON. Never make field names incompatible across macOS, Windows and web.

## Common commands

```bash
# Syntax check (required after touching either front end or the server)
node --check site/assets/app.js
node --check web/assets/app.js
node --check server/server.js

# Local-file mode; data goes to data/
node server/server.js --no-open

# API smoke test
curl http://127.0.0.1:4877/api/status
curl http://127.0.0.1:4877/api/data

# Native macOS build (macOS 14+ and CLT required)
cd mac && ./build.sh

# Windows installer (normally built on Windows or CI)
cd desktop && npm ci && npm run dist
```

## Non-negotiable constraints

1. **Local-first**: no cloud sync, accounts, telemetry, ads, CDNs, third-party fonts, quote APIs or any outbound request. CSP and the UI must keep working offline.
2. **No real data in the repo**: samples, screenshots and test data must be fictional. Never commit `data/`, backups, real account names, real tickers or real amounts.
3. **Never invent quotations**: 300 is a practice quota this project set itself. Copy must say it is not a famous quotation and not a return promise. Do not attribute it to any investor.
4. **A-share colour semantics**: red for gains, green for losses (`--gain` red, `--loss` green). Do not flip to the Western convention.
5. **300 count** = `trades.length + reviews.length`. Trades and reviews count; other records do not.
6. **Five themes**: warm rice, blush, mist, snow, night. Adding a colour means updating the web CSS variables, the native `Theme.swift` and the docs together.
7. **Dates and timestamps**: dates `YYYY-MM-DD`; timestamps ISO 8601 without milliseconds (required by Swift `.iso8601`). UUIDs stay stable across edits.
8. **Data compatibility**: keep `schemaVersion` at `1`. New fields need defaults, backward compatibility and an update to both `DATA` docs. Do not rename existing fields. Enum values exist in Chinese and English: the alias tables live in `web/assets/app.js` / `site/assets/app.js` and in `AppStore.enumAliases` in `mac/Sources/AppStore.swift`. Both sides normalise on import, so keep the tables in sync.
9. **Bilingual consistency**: new or changed UI copy must cover Chinese and English. Language preference is display-only and must never be written into the data file.
10. **Local server security**: bind to `127.0.0.1` only; keep Host/Origin checks, same-origin restrictions, no CORS, the request body limit and atomic writes. Do not relax these for debugging.
11. **Never destroy user data**: back up before any overwrite, import or clear; bypassing checks (e.g. `--no-verify`) is not a fix.

## Checklist when changing things

- Web/site: `node --check` both app files; run the local server or static host and walk through five themes, six pages, modals, import/export and the 300 count in a browser, once per language. Check 390px width for overflow.
- Server: verify `GET /api/status`, `GET/PUT /api/data`, `POST /api/backup` with `curl`; confirm error paths do not corrupt the JSON and `/` redirects by language.
- Data layer: confirm the macOS app can import JSON exported by the web app and vice versa, with Chinese and English enum values; timestamps carry no milliseconds.
- Native: `cd mac && ./build.sh` must succeed; launch with `--data-dir /tmp/...` so you never touch real local data; check the main pages and editors in both languages.
- Desktop shell: `npm run pack` to validate the packaged directory; leave the signed `.exe` to the Windows CI runner.
- Before publishing: search the repo for real personal financial data; confirm every static request in `site/` and `web/` is same-origin; bump versions and update both READMEs.

## Design baseline

- Minimal and restrained; whitespace first. Paper tones, low-saturation accents, one silhouette motif (the koi).
- Chinese UI uses system fonts; never add a web font.
- Copy avoids exclamation marks and return hints; emphasise records, facts and the next step.
- Empty states name one clear action instead of just showing zero.

## Git and releases

- Default branch `main`.
- Tags use `vX.Y.Z`; pushing one triggers `.github/workflows/release.yml`, which builds the macOS universal zip and the Windows NSIS installer and creates a GitHub Release with English notes.
- GitHub Pages assembles `shell/`, `site/` and `web/` into `/en/` and `/zh/` via `.github/workflows/pages.yml`.
- Private data folders, build outputs and `node_modules` are in `.gitignore`; do not force-add them.
