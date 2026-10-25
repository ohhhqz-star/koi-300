# Data format and local API

The macOS app, the Windows app and the web version all share one JSON structure. You can move data between them by exporting and importing.

[中文](DATA.zh-CN.md)

## Where the files are

| Mode | Path |
| --- | --- |
| Web, local-file mode | `data/portfolio.json` |
| Local backups | `data/backups/portfolio-YYYYMMDD-HHmmss.json` |
| macOS app | `~/Library/Application Support/Koi 300/data.json` |
| macOS backups | `~/Library/Application Support/Koi 300/Backups/` |
| Windows app | `%APPDATA%\Koi 300\data\portfolio.json` |
| Windows backups | `%APPDATA%\Koi 300\data\backups\` |
| Browser demo | `localStorage["koi300.data.v1"]` |

The in-app "Data & export" page shows the actual path in use.

## Top level

```json
{
  "schemaVersion": 1,
  "assets": [],
  "trades": [],
  "reviews": [],
  "plans": [],
  "snapshots": [],
  "lastModified": "2026-10-24T08:00:00Z"
}
```

- `schemaVersion`: currently `1`.
- `lastModified`: ISO 8601 timestamp.
- Missing arrays are treated as empty; wrong field types cause the import to be rejected.
- Both the native Swift app and the web version ignore unknown fields, but **do not rely on that for migrations**.

## Conventions

- IDs: UUID strings such as `94788131-8295-478E-BDCA-C0662BE0F738`. Imports keep existing IDs; new records get a new UUID.
- Dates: `YYYY-MM-DD`, local date, no time zone.
- Timestamps: ISO 8601, e.g. `2026-10-24T08:00:00Z`.
- Amounts: JSON numbers in CNY.
- P&L colours: red for gains, green for losses; display only, never stored.
- 300 count: `trades.length + reviews.length`.
- Enums: the Chinese UI writes Chinese values, the English UI writes English ones. Both sides accept the other language and normalise on import, so a file can move between them without losing categories. The alias tables are in `web/assets/app.js` and `site/assets/app.js` for the web side, and in `AppStore.enumAliases` (`mac/Sources/AppStore.swift`) on macOS; they must stay in sync.
- Language: the interface language is never stored in the data file. macOS keeps it in `UserDefaults["app.language"]`; the browser and local-file modes use `localStorage["koi300.lang"]`. The web root (`/`) redirects to `/en/` or `/zh/` using that preference, then `Accept-Language`, then Chinese; both routes share the same data and API.

> The native macOS app decodes with Swift's `.iso8601` strategy, so timestamps **must not include milliseconds**. The web and Windows versions strip milliseconds when writing.

## assets (holdings)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | UUID |
| `account` | string | Account name, e.g. "Long-term" |
| `category` | string | `Fund (OTC)` / `场外基金`, `Fund (ETF)` / `场内基金`, `Stock` / `股票`, `Pension` / `养老金`, `Gold` / `黄金`, `Cash` / `现金`. macOS also accepts `OTC fund`, `ETF`, `Off-exchange fund` and `Exchange-traded fund`, normalising them to the Chinese values. |
| `code` | string | Fund or stock code; may be empty |
| `name` | string | Name |
| `cost` | number | Invested cost |
| `value` | number | Current value |
| `units` | number \| null | Units held |
| `costPrice` | number \| null | Cost per unit |
| `price` | number \| null | Current price |
| `note` | string | Note |
| `nextStep` | string | Next step |
| `dataStatus` | string | `Manual` / `手工填写`, `From screenshot` / `截图录入`, `Broker screenshot` / `券商截图`, `Estimate` / `估算`, `Needs update` / `待更新` |
| `updatedAt` | string | ISO timestamp |

## trades

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | UUID |
| `date` | string | `YYYY-MM-DD` |
| `account` | string | Account |
| `category` | string | Same as assets |
| `code` | string | Code; may be empty |
| `name` | string | Name |
| `action` | string | `Buy` / `买入`, `Sell` / `卖出`, `DCA` / `定投`, `Switch` / `转换`, `Dividend` / `分红` |
| `amount` | number \| null | Amount |
| `shares` | number \| null | Units |
| `price` | number \| null | Fill price |
| `fee` | number \| null | Fee |
| `realizedPnL` | number \| null | Realised P&L; may be negative |
| `reason` | string | Why this trade |
| `mood` | string | Mood, free text |
| `market` | string | Market context at the time |
| `review` | string | Hindsight review |
| `followedPlan` | string | `Not reviewed` / `待复盘`, `Yes` / `是`, `No` / `否`, `Partly` / `部分按计划` |
| `lesson` | string | Lesson |
| `createdAt` | string | ISO timestamp |

## reviews (daily)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | UUID |
| `date` | string | `YYYY-MM-DD`; only one entry per day |
| `mood` | number | 1–5 |
| `trigger` | string | Trigger |
| `operations` | string | Actions taken |
| `market` | string | Market |
| `didRight` | string | What went right |
| `didWrong` | string | What went wrong |
| `nextPlan` | string | The single next step |
| `createdAt` | string | ISO timestamp |
| `updatedAt` | string | ISO timestamp |

## plans (DCA)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | UUID |
| `platform` | string | Platform |
| `code` | string | Code; may be empty (the native app uses `—` for empty) |
| `name` | string | Name |
| `category` | string | Same as assets |
| `frequency` | string | `Monthly` / `每月`, `Weekly` / `每周`, `Daily` / `每日`, `Every trading day` / `每交易日`, `One-off` / `一次性` |
| `amount` | number \| null | Amount per period |
| `debitDay` | string | Debit day, free text |
| `startDate` | string | `YYYY-MM-DD` or empty |
| `status` | string | `Active` / `进行中`, `Paused` / `已暂停`, `Cash pool` / `资金归集`, `Finished` / `已结束` |
| `note` | string | Note |

## snapshots (value history)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | UUID |
| `date` | string | `YYYY-MM-DD` |
| `cost` | number | Total cost that day |
| `value` | number | Total value that day |
| `cash` | number | Cash that day |

Editing a holding or that day's review updates the day's snapshot automatically. Importing historical data may carry snapshots along.

## Local HTTP API

The API only exists when the app is started through `start-mac.command` / `start-windows.bat` or the Windows desktop app.

### `GET /api/status`

```json
{
  "app": "koi-300",
  "mode": "local-file",
  "dataFile": "/path/to/data/portfolio.json",
  "dataDir": "/path/to/data",
  "mtimeMs": 1792805585269.747,
  "size": 4210,
  "counts": { "assets": 7, "trades": 6, "reviews": 4, "plans": 4 },
  "port": 4877
}
```

### `GET /api/data`

Returns the complete top-level JSON.

### `PUT /api/data`

- `Content-Type: application/json`
- 8 MB maximum.
- Backs up before writing; writes via a temp file plus atomic rename.
- Returns `{ "ok": true, "mtimeMs": ..., "counts": ... }`.

```bash
curl -X PUT -H 'Content-Type: application/json' \
  --data-binary @data/portfolio.json \
  http://127.0.0.1:4877/api/data
```

### `POST /api/backup`

Copies the current data file to `data/backups/portfolio-YYYYMMDD-HHmmss.json` immediately.

```bash
curl -X POST http://127.0.0.1:4877/api/backup
```

## Security boundaries

- The server binds to `127.0.0.1` only.
- `Host` must be `127.0.0.1:<port>`, `localhost:<port>` or `[::1]:<port>`; this blocks DNS rebinding.
- When `Origin` is present, only same-origin requests are allowed; no CORS headers are sent.
- At most 80 backups are kept.
- This is not an internet-facing service. Do not reverse-proxy it, forward its port or deploy it to a server.

## Workflow for agents

1. `POST /api/backup` first, or copy the JSON.
2. Read `/api/data` (or the file directly).
3. Change only the necessary fields; keep `schemaVersion`, `id`, date formats and every other UUID intact.
4. Write back with `PUT /api/data`, or edit the file directly (the app detects the mtime change within about 4 seconds and refreshes).
5. Never send the data to an external service or commit it to a public repository.

## Import and export

- Full JSON: all five collections plus `lastModified`.
- Holdings CSV: account, category, cost, value, P&L, notes and more.
- Trades CSV: includes reason, mood, market, review, plan adherence and lesson.
- Reviews CSV: every field, ordered by date.
- Plans CSV: platform, frequency, debit day, status and monthly estimate.
- CSVs use a UTF-8 BOM so Excel and Numbers open them directly.

Importing replaces the current data. The app takes a backup first, then swaps it in. In browser mode it downloads a JSON backup; in file mode it also leaves one in `data/backups/`.
