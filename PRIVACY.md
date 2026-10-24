# Privacy

Last updated: 2026-10-24

## In one sentence

Koi 300 does not collect, upload or sell your data. There is no account system and no cloud sync.

## What the app touches

### Desktop apps

- macOS: data is written to `~/Library/Application Support/Koi 300/data.json`, backups to `Backups/` in the same folder.
- Windows: data is written to `%APPDATA%\Koi 300\data\portfolio.json`, backups to `data\backups\`.
- On launch the app serves a local page bound to `127.0.0.1` only; on Windows this local server renders the UI and reads/writes the data.
- No telemetry, crash reporting, usage analytics, ads or third-party SDKs.

### Browser demo

- Data is written to the current site's `localStorage` in the current browser, under the keys `koi300.data.v1` and `koi300.theme`.
- Clearing site data, switching browsers or using private mode can lose your data. Export JSON regularly.
- GitHub Pages only hosts static files. GitHub, as the host, may keep ordinary access logs (IP, User-Agent and similar); this is standard for any hosting service. The app itself never sends investment data to GitHub or anyone else.

### Local-file mode

- Data is written to `data/portfolio.json` in the project folder, backups to `data/backups/`.
- The local HTTP server binds to `127.0.0.1` only, checks `Host` and `Origin`, and rejects cross-site API requests.
- If you forward or reverse-proxy the port to the internet, or let untrusted programs reach your machine, the data may be exposed. Don't do that.

## What the app never does

- Sends holdings, trades, reviews or any personal data to an external server.
- Requests quotes, exchange rates, news or font CDNs.
- Requires login, a phone number, an email address or identity verification.
- Checks for updates automatically (new releases must be downloaded manually).

## How your data is protected

- Local data is **plain JSON**; the app does not encrypt it.
- In local-file mode the data file is created with `0600` permissions (current user only), but backups and OS snapshots may still be readable by other programs with local access.
- Security depends mainly on your login password, disk encryption (FileVault / BitLocker) and file permissions.
- Export JSON from the Data & export page regularly and store it somewhere you trust.

## Deleting data

- "Data & export → Clear local data" in the app removes the current data after exporting a backup first.
- macOS: quit the app, then delete `~/Library/Application Support/Koi 300/`.
- Windows: quit the app, then delete `%APPDATA%\Koi 300\`.
- Browser demo: clear the site's data in your browser settings.
- Uninstalling the app does not delete your data automatically, to avoid accidental loss.

## Public repository

Sample data, screenshots and documentation in this repository are entirely fictional. Do not commit your own `data/portfolio.json`, backups, real screenshots or exported CSVs to the public repository, and do not paste them into public issues.

## Contact

If you find a privacy or security issue, describe it in a repository issue. Never attach real holdings data to an issue.
