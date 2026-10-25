# 数据格式与本地 API

锦记（Koi 300）的 macOS 原生版、Windows 桌面版和 Web 版使用同一份 JSON 结构。你可以在三个版本之间导出/导入。

[English](DATA.md)

## 文件在哪里

| 使用方式 | 路径 |
| --- | --- |
| Web 本地文件模式 | `data/portfolio.json` |
| 本地备份 | `data/backups/portfolio-YYYYMMDD-HHmmss.json` |
| macOS 原生应用 | `~/Library/Application Support/Koi 300/data.json` |
| macOS 原生备份 | `~/Library/Application Support/Koi 300/Backups/` |
| Windows 桌面应用 | `%APPDATA%\Koi 300\data\portfolio.json` |
| Windows 备份 | `%APPDATA%\Koi 300\data\backups\` |
| 浏览器模式 | `localStorage["koi300.data.v1"]` |

应用内「数据与导出」会显示当前实际路径。数据目录名保持 `Koi 300`，不随界面语言变化。

## 顶层结构

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

- `schemaVersion`：当前为 `1`。
- `lastModified`：ISO 8601 时间。
- 缺少的数组会被当作空数组处理；字段类型不正确会拒绝导入。
- 原生 Swift 版本和 Web 版本都会忽略未知字段，但**不要依赖这一点做迁移**。

## 格式约定

- ID：UUID 字符串，例如 `94788131-8295-478E-BDCA-C0662BE0F738`。导入时保留原 ID；新增时生成新 UUID。
- 日期：`YYYY-MM-DD`，本地日期，不带时区。
- 时间戳：ISO 8601，例如 `2026-10-24T08:00:00Z`。
- 金额：JSON number，单位为元。
- 盈亏颜色：红涨绿跌，仅影响展示，不改变数据。
- 300 计数：`trades.length + reviews.length`。
- 语言：界面语言不写入数据文件。原生应用存于 `UserDefaults["app.language"]`，网页存于 `localStorage["koi300.lang"]`。

> macOS 原生应用使用 Swift `JSONDecoder` 的 `.iso8601` 策略，因此时间戳**不要带毫秒**。Web 和 Windows 版本写回时会自动去掉毫秒。

## 枚举：中英文都可以写

原生应用内部保存中文枚举值；英文 Web 界面写入英文枚举值。两端在导入时都会归一化，所以同一份文件可以在中文与英文界面之间来回移动。

| 字段 | 中文 | 英文 |
| --- | --- | --- |
| `category` | `场外基金` | `Fund (OTC)` |
| | `场内基金` | `Fund (ETF)` |
| | `股票` | `Stock` |
| | `养老金` | `Pension` |
| | `黄金` | `Gold` |
| | `现金` | `Cash` |
| `action` | `买入` | `Buy` |
| | `卖出` | `Sell` |
| | `定投` | `DCA` |
| | `转换` | `Switch` |
| | `分红` | `Dividend` |
| `frequency` | `每月` | `Monthly` |
| | `每周` | `Weekly` |
| | `每日` | `Daily` |
| | `每交易日` | `Every trading day` |
| | `一次性` | `One-off` |
| `status` | `进行中` | `Active` |
| | `已暂停` | `Paused` |
| | `资金归集` | `Cash pool` |
| | `已结束` | `Finished` |
| `dataStatus` | `手工填写` | `Manual` |
| | `截图录入` | `From screenshot` |
| | `券商截图` | `Broker screenshot` |
| | `估算` | `Estimate` |
| | `待更新` | `Needs update` |
| `followedPlan` | `待复盘` | `Not reviewed` |
| | `是` | `Yes` |
| | `否` | `No` |
| | `部分按计划` | `Partly` |

macOS 原生版还接受界面上的短写法 `OTC fund` / `ETF` 和旧写法 `Off-exchange fund` / `Exchange-traded fund`，导入时统一归一到中文值。

## assets（持仓）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | UUID |
| `account` | string | 账户名称，例如「长期账户」 |
| `category` | string | 见上方枚举 |
| `code` | string | 基金/股票代码，可为空 |
| `name` | string | 名称 |
| `cost` | number | 投入成本 |
| `value` | number | 当前市值 |
| `units` | number \| null | 持有份额 |
| `costPrice` | number \| null | 成本价 |
| `price` | number \| null | 现价 |
| `note` | string | 备注 |
| `nextStep` | string | 下一步 |
| `dataStatus` | string | 见上方枚举 |
| `updatedAt` | string | ISO 时间 |

## trades（交易）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | UUID |
| `date` | string | `YYYY-MM-DD` |
| `account` | string | 账户 |
| `category` | string | 同 assets |
| `code` | string | 代码，可为空 |
| `name` | string | 名称 |
| `action` | string | 见上方枚举 |
| `amount` | number \| null | 金额 |
| `shares` | number \| null | 份额 |
| `price` | number \| null | 成交价 |
| `fee` | number \| null | 费用 |
| `realizedPnL` | number \| null | 已实现盈亏，可为负 |
| `reason` | string | 为什么做这笔操作 |
| `mood` | string | 情绪，自由文本 |
| `market` | string | 当时的市场环境 |
| `review` | string | 事后复盘 |
| `followedPlan` | string | 见上方枚举 |
| `lesson` | string | 教训 |
| `createdAt` | string | ISO 时间 |

## reviews（每日复盘）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | UUID |
| `date` | string | `YYYY-MM-DD`，同一天只能有一篇 |
| `mood` | number | 1–5 |
| `trigger` | string | 触发 |
| `operations` | string | 操作 |
| `market` | string | 市场 |
| `didRight` | string | 做得对 |
| `didWrong` | string | 做得不对 |
| `nextPlan` | string | 下一步只做哪一件事 |
| `createdAt` | string | ISO 时间 |
| `updatedAt` | string | ISO 时间 |

## plans（定投计划）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | UUID |
| `platform` | string | 平台 |
| `code` | string | 代码，可为空（原生应用使用 `—` 表示空） |
| `name` | string | 名称 |
| `category` | string | 同 assets |
| `frequency` | string | 见上方枚举 |
| `amount` | number \| null | 每期金额 |
| `debitDay` | string | 扣款日，自由文本 |
| `startDate` | string | `YYYY-MM-DD` 或空 |
| `status` | string | 见上方枚举 |
| `note` | string | 备注 |

## snapshots（净值快照）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | UUID |
| `date` | string | `YYYY-MM-DD` |
| `cost` | number | 当日总成本 |
| `value` | number | 当日总市值 |
| `cash` | number | 当日现金 |

修改持仓或当日的复盘后，应用会自动维护当天的快照。导入历史数据时可以一起带入。

## 本地 HTTP API

只有通过 `start-mac.command` / `start-windows.bat` 或 Windows 桌面版启动时，才会有 API。

页面路径：`/` 会按 `koi300.lang` Cookie 或 `Accept-Language` 跳到 `/zh/` 或 `/en/`；两个语言版本共用同一份数据和同一个 API。

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

返回完整的顶层 JSON。

### `PUT /api/data`

- `Content-Type: application/json`
- 最大 8 MB。
- 写入前自动备份，使用临时文件 + rename 原子替换。
- 成功返回 `{ "ok": true, "mtimeMs": ..., "counts": ... }`。

```bash
curl -X PUT -H 'Content-Type: application/json' \
  --data-binary @data/portfolio.json \
  http://127.0.0.1:4877/api/data
```

### `POST /api/backup`

立即复制当前数据文件到 `data/backups/portfolio-YYYYMMDD-HHmmss.json`。

```bash
curl -X POST http://127.0.0.1:4877/api/backup
```

## 安全边界

- 服务只绑定 `127.0.0.1`。
- 校验 `Host` 必须是 `127.0.0.1:<port>`、`localhost:<port>` 或 `[::1]:<port>`，用于阻挡 DNS rebinding。
- 有 `Origin` 时只允许同源请求；不发送 CORS 头。
- 备份最多保留 80 个。
- 这不是一个面向公网的服务。不要反向代理、端口转发或部署到服务器。

## 给 agent 的修改流程

1. 先 `POST /api/backup`，或复制一份 JSON。
2. 读取 `/api/data`（或直接读文件）。
3. 只改必要字段，保留 `schemaVersion`、`id`、日期格式和其它记录的 UUID。
4. 写回 `PUT /api/data`，或直接写文件（应用约 4 秒内检测到 mtime 变化并刷新）。
5. 不要把数据发到外部服务，不要提交到公开仓库。

## 导入导出

- 完整 JSON：包含全部五类数据和 `lastModified`。
- 持仓 CSV：账户、类别、成本、市值、盈亏、备注等。
- 交易 CSV：含理由、情绪、市场、复盘、是否按计划、教训。
- 复盘 CSV：按日期导出全部字段。
- 计划 CSV：平台、频率、扣款日、状态与月估算。
- CSV 使用 UTF-8 BOM，Excel 与 Numbers 可直接打开。

导入会覆盖当前数据；应用会先触发一次备份，再替换。浏览器模式会下载 JSON 备份；文件模式还会在 `data/backups/` 留一份。
