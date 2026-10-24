# AGENTS.md

给在这个仓库里工作的 AI agent 与贡献者的项目约束。产品面向中文用户，默认所有界面文案、文档与提交说明使用中文（代码标识符用英文）。

## 先读

- 产品说明：`README.md`
- 数据字段与本地 API：`docs/DATA.md`
- 隐私边界：`PRIVACY.md`

## 项目结构

```text
web/             静态 Web 应用。index.html + assets/{styles.css,app.js,logo.svg}
server/          仅 Node 内置模块的本地文件服务与 JSON API
mac/             原生 SwiftUI 源码、Info.plist、空 SeedData、build.sh
desktop/         Electron 壳；启动 server 并加载 web；electron-builder NSIS
docs/            数据格式与虚构截图
.github/         Pages 与双平台 Release workflow
```

三个前端共享同一套 `AppData` JSON。不要把 macOS / Windows / Web 的字段名改得不兼容。

## 常用命令

```bash
# 语法检查（改动 web 或 server 后必做）
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
8. **数据兼容**：`schemaVersion` 保持 `1`。新增字段要有默认值、能向后兼容，并同步更新 `docs/DATA.md`。不要重命名已有字段。
9. **本地服务安全**：只监听 `127.0.0.1`；保留 Host / Origin 校验、同源限制、无 CORS、请求体上限和原子写入。不要为了调试放开这些限制。
10. **不破坏用户数据**：任何覆盖、导入、清除操作前都先备份；不要把 `--no-verify` 之类绕过检查的做法当作解决方案。

## 改动时的检查清单

- 改 Web：`node --check`；启动本地服务，用浏览器走一遍五套主题、六个页面、弹窗、导入/导出与 300 计数。
- 改 server：用 `curl` 验证 `GET /api/status`、`GET/PUT /api/data`、`POST /api/backup`；确认错误路径不会写坏 JSON。
- 改数据层：确认 macOS 原生应用能导入 Web 导出的 JSON，反之亦然；时间戳不带毫秒。
- 改原生：`cd mac && ./build.sh` 必须成功；用 `--data-dir /tmp/...` 启动，避免碰到本机真实数据。
- 改 Windows 封装：本地可 `npm run pack` 验证目录产物；正式 `.exe` 交给 GitHub Actions 的 Windows runner。
- 发版前：搜索仓库确认没有真实个人财务数据；检查 `web` 的静态请求全部为同源；更新版本号与 README。

## 设计基线

- 极简、克制，留白优先；纸色背景、低饱和强调色、少量剪影（锦鲤）。
- 中文字体使用系统字体；不要引入 Web Font。
- 文案少用感叹号，不用收益暗示；强调记录、事实与下一步。
- 空状态要给出一个明确动作，而不是只显示 0。

## Git 与发布

- 主分支 `main`。
- 版本标签使用 `vX.Y.Z`，推送后 `.github/workflows/release.yml` 会构建 macOS 通用包与 Windows NSIS 安装包，并创建 Release。
- Pages 部署来自 `web/`，由 `.github/workflows/pages.yml` 负责。
- 私有数据目录、构建产物、`node_modules` 已在 `.gitignore` 中，不要强行提交。
