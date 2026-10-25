# AGENTS.md

给在这个仓库里工作的 AI agent 与贡献者的项目约束。

[English](AGENTS.md)

**语言策略**：仓库是中英双语的。英文是 `README.md`、`PRIVACY.md`、`docs/DATA.md`、`AGENTS.md`；中文是 `README.zh-CN.md`、`PRIVACY.zh-CN.md`、`docs/DATA.zh-CN.md`、`AGENTS.zh-CN.md`。两个网页界面各自维护一套文案：`web/` 是中文（锦记），`site/` 是英文（Koi 300）。原生 macOS 与 Windows 窗口共用同一套语言切换。改动界面文案时，同步更新两端界面与对应文档。代码标识符与提交标题用英文。

## 先读

- 产品说明：`README.zh-CN.md` / `README.md`
- 数据字段与本地 API：`docs/DATA.zh-CN.md` / `docs/DATA.md`
- 隐私边界：`PRIVACY.zh-CN.md` / `PRIVACY.md`

## 项目结构

```text
shell/           语言跳转页，/ 按 localStorage 或浏览器语言进入 /zh/ 或 /en/
site/            英文静态站点（Koi 300），GitHub Pages /en/
web/             中文静态应用（锦记），GitHub Pages /zh/，桌面端内置
server/          仅 Node 内置模块的本地文件服务与 JSON API
mac/             原生 SwiftUI 源码、Info.plist、空 SeedData、build.sh
desktop/         Electron 壳；启动 server 并加载 web；electron-builder NSIS
docs/            数据格式与虚构截图
.github/         Pages 与双平台 Release workflow
```

`site/` 与 `web/` 共享同一套界面行为与数据 schema，但文案分开维护。改行为时两边都要改；改文案时只改对应语言，并保持另一种语言同步。原生 macOS 的文案集中在 `mac/Sources/Localization.swift` 的 `T()` 字典里，新增字符串必须同时提供英文。所有前端共享同一份 `AppData` JSON。不要把 macOS / Windows / Web 的字段名改得不兼容。

## 常用命令

```bash
# 语法检查（改动任一前端或 server 后必做）
node --check site/assets/app.js
node --check web/assets/app.js
node --check server/server.js

# 本地文件模式，数据写到 data/
node server/server.js --no-open

# API 冒烟
curl http://127.0.0.1:4877/api/status
curl http://127.0.0.1:4877/api/data

# macOS 原生构建（需要 macOS 14+ 与 CLT）
cd mac && ./build.sh

# Windows 安装包（通常只在 Windows / CI 构建）
cd desktop && npm ci && npm run dist
```

## 不可妥协的约束

1. **本地优先**：不添加云端同步、账号、遥测、广告、CDN、第三方字体、行情接口或任何外部网络请求。CSP 与 UI 都维持离线可用。
2. **不把真实数据带进仓库**：示例、截图、测试数据必须是虚构的。不要提交 `data/`、备份、真实账户名、真实代码或真实金额。
3. **不伪造名人名言**：300 是项目自定的练习量。文案必须说明「不是名人名言 / 不是收益承诺」。不要编造某位投资人说过这句话。
4. **A 股颜色语义**：红涨绿跌（`--gain` 红，`--loss` 绿）。不要按欧美习惯反过来。
5. **300 计数** = `trades.length + reviews.length`。交易与复盘都计入；其它记录不计入。
6. **五套主题**：暖米、淡粉、淡蓝、纯白、黑夜。新增颜色必须同时改 Web CSS 变量、原生 `Theme.swift` 和文档，不要只改一端。
7. **日期与时间戳**：日期 `YYYY-MM-DD`；时间 ISO 8601 且不带毫秒（Swift `.iso8601` 解码要求）。UUID 在编辑中保持不变。
8. **数据兼容**：`schemaVersion` 保持 `1`。新增字段要有默认值、能向后兼容，并同步更新两份 `DATA` 文档。不要重命名已有字段。枚举值有中英文两套：英文表在 `web/assets/app.js` / `site/assets/app.js`，原生表在 `mac/Sources/AppStore.swift` 的 `enumAliases`；两端导入时都会归一化，改一处必须同步另一处。
9. **双语一致性**：新增或修改界面文案时，必须同时覆盖中文与英文；新增文案不能只出现在一个语言里。语言偏好只影响展示，不能写进数据文件。
10. **本地服务安全**：只监听 `127.0.0.1`；保留 Host / Origin 校验、同源限制、无 CORS、请求体上限和原子写入。不要为了调试放开这些限制。
11. **不破坏用户数据**：任何覆盖、导入、清除操作前都先备份；不要把 `--no-verify` 之类绕过检查的做法当作解决方案。

## 改动时的检查清单

- 改 Web/site：`node --check` 两个 app 文件；启动本地服务或静态服务器，用浏览器走一遍五套主题、六个页面、弹窗、导入/导出与 300 计数。两种语言各走一遍，并检查 390px 宽度不溢出。
- 改 server：用 `curl` 验证 `GET /api/status`、`GET/PUT /api/data`、`POST /api/backup`；确认错误路径不会写坏 JSON；确认 `/` 会按语言跳转。
- 改数据层：确认 macOS 原生应用能导入 Web 导出的 JSON，反之亦然；分别用中文枚举和英文枚举各导一次；时间戳不带毫秒。
- 改原生：`cd mac && ./build.sh` 必须成功；用 `--data-dir /tmp/...` 启动，避免碰到本机真实数据；在两种语言下各看一遍主要页面与编辑器。
- 改 Windows 封装：本地可 `npm run pack` 验证目录产物；正式 `.exe` 交给 GitHub Actions 的 Windows runner。
- 发版前：搜索仓库确认没有真实个人财务数据；检查 `site/` 与 `web/` 的静态请求全部为同源；更新版本号、两份 README 与发布说明。

## 设计基线

- 极简、克制，留白优先；纸色背景、低饱和强调色、少量剪影（锦鲤）。
- 字体使用系统字体；不要引入 Web Font。
- 文案少用感叹号，不用收益暗示；强调记录、事实与下一步。
- 空状态要给出一个明确动作，而不是只显示 0。
- 英文界面避免全大写标签和缩写堆叠；中文界面保留「记录」「下一步」这类短词。

## Git 与发布

- 主分支 `main`。
- 版本标签使用 `vX.Y.Z`，推送后 `.github/workflows/release.yml` 会构建 macOS 通用包与 Windows NSIS 安装包，并创建 Release。
- Pages 由 `.github/workflows/pages.yml` 组装 `shell/` + `site/` + `web/`，部署到 `/en/` 与 `/zh/`。
- 私有数据目录、构建产物、`node_modules` 已在 `.gitignore` 中，不要强行提交。
