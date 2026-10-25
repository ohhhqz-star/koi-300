import SwiftUI
import Foundation

enum AppLanguage: String, CaseIterable, Identifiable {
    case zh
    case en

    static let storageKey = "app.language"

    var id: String { rawValue }

    var label: String { self == .zh ? "中文" : "EN" }

    static var stored: AppLanguage {
        if let raw = UserDefaults.standard.string(forKey: storageKey),
           let language = AppLanguage(rawValue: raw) {
            return language
        }
        let preferred = Locale.preferredLanguages.first?.lowercased() ?? "zh"
        return preferred.hasPrefix("zh") ? .zh : .en
    }
}

final class LanguageStore: ObservableObject {
    static let shared = LanguageStore()

    @Published private(set) var language: AppLanguage

    private init() {
        language = AppLanguage.stored
    }

    func set(_ language: AppLanguage) {
        guard language != self.language else { return }
        self.language = language
        UserDefaults.standard.set(language.rawValue, forKey: AppLanguage.storageKey)
    }
}

enum Lang {
    static var current: AppLanguage { LanguageStore.shared.language }
    static var isEnglish: Bool { current == .en }

    static func text(_ key: String) -> String {
        isEnglish ? (Localization.english[key] ?? key) : key
    }
}

func T(_ key: String, _ args: CVarArg...) -> String {
    let template = Lang.text(key)
    guard !args.isEmpty else { return template }
    return String(format: template, arguments: args)
}

enum Brand {
    static var name: String { Lang.isEnglish ? "Koi 300" : "锦记" }
}

enum Localization {
    static let english: [String: String] = [
        // Structure and navigation
        "概览": "Overview",
        "当前持仓": "Holdings",
        "操作记录": "Trades",
        "每日复盘": "Daily reviews",
        "定投计划": "Plans",
        "数据与导出": "Data & export",
        "记录": "Records",
        "操作": "Action",
        "新增一条记录": "Add a record",
        "搜索名称、代码或理由": "Search name, ticker or reason",
        "搜索名称、代码或账户": "Search name, ticker or account",
        "数据只保存在这台 Mac": "Data stays on this Mac",
        "数据文件无法读取，已保留损坏副本并从初始数据恢复。": "The data file couldn't be read. A damaged copy was kept and the app restored from seed data.",
        "随时导出 Excel、CSV 或完整备份": "Export Excel, CSV or a full backup anytime",
        "读取备份": "Read backup",
        "%d 条资产 · %d 笔操作 · %d 条复盘": "%d assets · %d trades · %d reviews",
        "名称 / 标的": "Name / instrument",
        "300 记录": "300 records",
        "300 记录计划": "The 300-record plan",
        "每天 3 分钟": "3 minutes a day",
        "语言": "Language",
        "纸色": "Paper",
        "暖米": "Warm",
        "淡粉": "Blush",
        "淡蓝": "Mist",
        "纯白": "Snow",
        "黑夜": "Night",
        "保存": "Save",
        "取消": "Cancel",
        "删除": "Delete",
        "编辑": "Edit",
        "管理": "Manage",
        "查看全部": "View all",
        "前往": "Go",
        "显示": "Show",
        "合计": "Total",
        "提示": "Notice",
        "知道了": "Got it",

        // Shared labels
        "账户": "Account",
        "类别": "Category",
        "代码": "Ticker",
        "名称": "Name",
        "日期": "Date",
        "备注": "Notes",
        "说明": "Notes",
        "状态": "Status",
        "金额": "Amount",
        "金额（元）": "Amount (CNY)",
        "份额": "Units",
        "手续费": "Fee",
        "成交价": "Price",
        "成交价 / 净值": "Price / NAV",
        "成交价/净值": "Price/NAV",
        "成本价 / 净值": "Cost / NAV",
        "现价 / 净值": "Price / NAV",
        "数量 / 份额": "Quantity / units",
        "投入成本": "Cost",
        "投入成本（元）": "Cost (CNY)",
        "当前市值": "Market value",
        "当前市值（元）": "Market value (CNY)",
        "总投入成本": "Total cost",
        "持仓市值": "Holdings value",
        "现金": "Cash",
        "市值": "Value",
        "成本": "Cost",
        "仓位": "Weight",
        "仓位占比": "Weight",
        "盈亏率": "Return",
        "浮动盈亏": "Unrealized P/L",
        "浮盈亏": "P/L",
        "已实现盈亏": "Realized P/L",
        "元": "CNY",
        "元 / 月": "CNY / month",
        "持仓占比": "Holdings share",
        "当日资产 %@": "Assets that day %@",
        "当日总资产": "Total assets that day",
        "心态": "Mood",
        "心态分数": "Mood score",
        "情绪 / 触发": "Emotion / trigger",
        "今日操作": "What I did today",
        "市场观察": "Market notes",
        "做对的事": "What went right",
        "做错的事 / 教训": "What went wrong / lessons",
        "下一步": "Next step",
        "下一步：%@": "Next: %@",
        "明日计划": "Tomorrow's plan",
        "下一步 / 退出条件": "Next step / exit rule",
        "我的记录 / 现状": "My notes / status",
        "数据状态": "Data source",
        "市场 / 消息面": "Market / news",
        "市场：%@": "Market: %@",
        "当时情绪": "Mood",
        "操作理由": "Why",
        "结果复盘": "How it turned out",
        "教训 / 下次": "Lesson / next time",
        "按计划？": "On plan?",
        "风险": "Risk",
        "占总资产": "Share of assets",
        "总投入": "Total cost",
        "总资产": "Total assets",
        "每期金额": "Amount / cycle",
        "起始": "Start",
        "扣款": "Debit",
        "扣款日": "Debit day",
        "扣款日 %@": "Debit day %@",
        "频率": "Frequency",
        "平台": "Platform",

        // Enum values
        "场外基金": "OTC fund",
        "场内基金": "ETF",
        "股票": "Stock",
        "养老金": "Pension",
        "黄金": "Gold",
        "手工填写": "Manual",
        "截图录入": "Screenshot",
        "券商截图": "Broker screenshot",
        "估算": "Estimate",
        "待更新": "Needs update",
        "买入": "Buy",
        "卖出": "Sell",
        "定投": "DCA",
        "转换": "Switch",
        "分红": "Dividend",
        "每月": "Monthly",
        "每周": "Weekly",
        "每日": "Daily",
        "每交易日": "Every trading day",
        "一次性": "One-time",
        "进行中": "Active",
        "已暂停": "Paused",
        "资金归集": "Cash pool",
        "已结束": "Finished",
        "是": "Yes",
        "部分": "Partially",
        "否": "No",
        "待复盘": "To review",
        "很差": "Very low",
        "偏低": "Low",
        "一般": "Neutral",
        "不错": "Good",
        "很好": "Very good",
        "全部账户": "All accounts",
        "全部类别": "All types",
        "全部操作": "All actions",
        "全部计划": "All plans",

        // Overview
        "%@　·　%d 条资产　·　更新于 %@": "%@ · %d assets · updated %@",
        "当前总资产": "Total assets",
        "净值走势": "Net worth",
        "%d 个记录日": "%d days recorded",
        "今天开始": "Starting today",
        "最大浮亏": "Largest unrealized loss",
        "仓位最重": "Largest position",
        "现金占比": "Cash share",
        "暂无持仓": "No holdings yet",
        "现金 %@ 元　·　共 %d 笔": "Cash %@ CNY · %d entries",
        "账户分布": "By account",
        "按当前市值": "At current value",
        "还没有持仓": "No holdings yet",
        "先加一条资产，账户分布、类别和净值走势会自动更新。": "Add an asset and the account split, categories and net worth update automatically.",
        "新增持仓": "Add holding",
        "新增持仓…": "Add holding…",
        "资产类别": "Asset classes",
        "含现金": "Including cash",
        "持仓 %@": "Holdings %@",
        "现金 %@": "Cash %@",
        "最近复盘": "Recent reviews",
        "先记事实，再记感受": "Facts first, feelings second",
        "定投节奏": "Investing rhythm",
        "按当前计划估算": "Estimated from current plans",
        "%d 个进行中": "%d active",
        "每月备用金": "Monthly reserve",
        "实际以扣款为准": "Actual debits may differ",
        "当日记录": "Note for the day",
        "还没有写下一步。": "No next step written yet.",
        "今天写下第一句就够。": "One sentence today is enough.",
        "市场怎么样、你做了什么、下一步只做哪一件事。3–5 行即可。": "What the market did, what you did, and the one next step. 3–5 lines.",
        "交易与每日复盘都计入　·　不用一次写很多，写真的就行": "Trades and daily reviews both count · Write little, write true",
        "在买入前，先写 300 次。": "Before buying, write it 300 times.",
        "风格不是想出来的，是记出来的。": "Style isn't imagined. It's recorded.",
        "第一笔，从今天开始": "The first entry starts today",
        "先观察自己": "Observe yourself first",
        "节奏正在出现": "A rhythm is emerging",
        "纪律开始成形": "Discipline is taking shape",
        "风格就在附近": "Style is within reach",
        "风格已自成一套": "Your style is now your own",

        // Holdings
        "%d 条资产　·　只维护成本与市值，盈亏自动计算　·　金额单位：元": "%d assets · cost and value only, P/L is automatic · Amounts in CNY",
        "名称 / 代码": "Name / ticker",
        "现金 / 无代码": "Cash / no ticker",
        "显示 %d 条": "Showing %d",
        "没有匹配的持仓": "No matching holdings",
        "还没有持仓记录": "No holdings recorded yet",
        "清除筛选": "Clear filters",
        "还没有写记录。": "No note written yet.",
        "未设置下一步": "No next step set",
        "共 %d 条": "%d records",
        "双击一行可编辑": "Double-click a row to edit",
        "删除这条持仓？": "Delete this holding?",
        "删除后今天的净值快照会同步更新。此操作不会影响操作记录。": "Today's net-worth snapshot updates too. Trades are not affected.",
        "删除持仓": "Delete holding",
        "删除操作": "Delete trade",
        "已删除持仓": "Holding deleted",
        "编辑持仓": "Edit holding",
        "编辑持仓…": "Edit holding…",
        "账户 + 类别 + 金额，是这套记录的最小单位。": "Account + category + amount: the smallest unit of this record.",
        "标的信息": "Instrument",
        "例如：理财通-主账户": "e.g. Main account",
        "基金 / 股票代码，现金可填 —": "Fund or stock ticker; use — for cash",
        "名称或标的": "Name or instrument",
        "金额与市值": "Cost & value",
        "投入成本和当前市值需要填写数字。": "Cost and market value must be numbers.",
        "金额不能为负数。": "Amount can't be negative.",
        "持仓明细（可选）": "Position details (optional)",
        "我的记录": "My notes",
        "为什么买 / 现状": "Why I bought / status",
        "例如：前期赚，7月补仓，想拿一年以上。": "e.g. Was up early, added in July, plan to hold over a year.",
        "例如：持有满一年再评估；跌破某个条件就退出。": "e.g. Reassess after one year; exit if a set condition breaks.",
        "请填写账户。": "Enter an account.",
        "请填写名称。": "Enter a name.",
        "持仓已添加": "Holding added",
        "持仓已更新": "Holding updated",

        // Trades
        "%d 笔　·　操作只用于复盘，不会自动回写持仓成本": "%d trades · for review only, never rewrites holding cost",
        "还没有操作记录": "No trades yet",
        "每一笔买入、卖出、定投或转换，都值得留下当时的理由和情绪。以后回看，原因往往比结果更重要。": "Every buy, sell, DCA or switch deserves its reason and mood. Looking back, the why often matters more than the result.",
        "记下第一笔": "Log the first trade",
        "没有匹配的操作": "No matching trades",
        "显示 %d 笔": "Showing %d trades",
        "未填写名称": "Name not filled",
        "未命名操作": "Untitled trade",
        "还没有写操作理由。": "No reason written yet.",
        "共 %d 笔": "%d trades",
        "买入 / 定投": "Buys / DCA",
        "删除这条操作记录？": "Delete this trade?",
        "删除只影响这条记录，不会改变当前持仓。": "This only removes the record; current holdings are unchanged.",
        "已删除操作记录": "Trade deleted",
        "记一笔操作": "Log a trade",
        "记一笔操作…": "Log a trade…",
        "编辑操作": "Edit trade",
        "编辑操作…": "Edit trade…",
        "先记事实，再记为什么；操作记录不会自动改持仓。": "Facts first, then the why; trades never change holdings automatically.",
        "基本信息": "Basics",
        "从持仓带入": "Prefill from holding",
        "手动填写": "Enter manually",
        "代码或 —": "Ticker or —",
        "金额与费用": "Amount & fees",
        "仅卖出 / 分红": "Sell / dividend only",
        "当时的判断": "The call",
        "为什么这个时候买 / 卖 / 停？": "Why buy / sell / pause now?",
        "例如：着急、怕错过、平静": "e.g. anxious, fear of missing out, calm",
        "当时发生了什么？": "What was happening?",
        "事后复盘": "After the fact",
        "这笔操作后来怎么样了？可以过几天补。": "How did this trade turn out? You can fill it in later.",
        "如果重来一次，你会怎么做？": "If you could do it again, what would you change?",
        "请填写名称，或从上面的持仓中选择一个标的。": "Enter a name, or pick an instrument from your holdings above.",
        "操作已记录": "Trade logged",
        "操作已更新": "Trade updated",

        // Reviews
        "%d 条记录　·　不用写长，3–5 行就够　·　先记事实，再记感受": "%d entries · 3–5 lines is enough · facts first, feelings second",
        "继续今天": "Continue today",
        "写今日复盘": "Write today's review",
        "删除这条复盘？": "Delete this review?",
        "删除这条复盘": "Delete this review",
        "删除复盘": "Delete review",
        "当天的净值快照会保留，不会随复盘一起删除。": "That day's net-worth snapshot stays even if the review is deleted.",
        "已删除复盘": "Review deleted",
        "今天只回答三个问题。": "Answer three questions today.",
        "复盘不是写报告，是把当时的判断留下来。哪怕只有一句话。": "A review isn't a report. It's keeping the call you made. One sentence is enough.",
        "今天市场发生了什么？": "What happened in the market today?",
        "只写你真正看到、会影响判断的事。": "Only what you actually saw that could affect your judgment.",
        "你做了什么，为什么？": "What did you do, and why?",
        "操作、忍住没操作，都算。": "Acting, or holding back, both count.",
        "下一步只做哪一件事？": "What's the one next step?",
        "越具体越好，例如“明天不再补仓”。": "Be specific, e.g. 'No more adding tomorrow.'",
        "写今天的第一条": "Write the first entry today",
        "保存时自动记录当日净值，方便以后回看。": "The day's net worth is saved automatically for later review.",
        "心态 · %@": "Mood · %@",
        "只记录了心情，也是一条记录。": "Even a mood alone is a valid entry.",
        "编辑复盘": "Edit review",
        "编辑复盘…": "Edit review…",
        "编辑这条复盘…": "Edit this review…",
        "保存时会把今天的总资产记入净值快照。": "Saving records today's total value in the net-worth snapshot.",
        "补记过去的一天；当日净值不会自动补。": "Backfilling a past day; its net worth won't be added automatically.",
        "这一天": "The day",
        "事实与感受": "Facts & feelings",
        "今天因为什么起了情绪？先描述事实。": "What stirred your emotions today? Start with the facts.",
        "买了什么、卖了什么、或者忍住了没做什么。": "What you bought, sold, or resisted doing.",
        "只看真正影响判断的信息。": "Only what truly affects your judgment.",
        "复盘与下一步": "Review & next step",
        "哪怕很小，也写下来。": "Write it down, even if it's small.",
        "下次怎么避免？": "How to avoid it next time?",
        "下一步只做一件事": "One next step only",
        "越具体越好，例如“明天不补仓，先看完这份复盘”。": "Be specific, e.g. 'No adding tomorrow; finish this review first.'",
        "这一天已经有一条复盘了。请直接编辑原来那条，避免覆盖。": "There's already a review for this day. Edit that one instead to avoid overwriting.",
        "复盘已保存": "Review saved",
        "复盘已更新": "Review updated",
        "今日净值快照已同步。": "Today's net-worth snapshot is synced.",

        // Plans
        "%d 个计划　·　%d 个进行中　·　月均按当前金额与频率估算": "%d plans · %d active · monthly average based on current amount and frequency",
        "新增计划": "New plan",
        "新增定投计划": "New plan",
        "新增定投计划…": "New plan…",
        "还没有定投计划": "No plans yet",
        "把正在扣款的计划记下来，月底对账会轻松很多。": "Log the plans that debit automatically; month-end checks get much easier.",
        "新增一个计划": "Add a plan",
        "删除这个定投计划？": "Delete this plan?",
        "删除计划": "Delete plan",
        "删除只影响计划列表，不会改变已持有的基金。": "This only removes the plan; existing holdings are unchanged.",
        "已删除计划": "Plan deleted",
        "进行中计划月均": "Active monthly average",
        "进行中计划": "Active plans",
        "%d 个": "%d",
        "资金归集 / 月": "Cash pool / month",
        "估算口径": "How estimates work",
        "每交易日 21.75 天 · 每日 30 天 · 每周 52/12 周": "Trading days 21.75 · daily 30 · weekly 52/12",
        "实际以平台扣款为准": "Actual platform debits apply",
        "用于定投的资金池": "Cash pool for investing",
        "约 %@ / 月": "about %@ / month",
        "已暂停扣款": "Debits paused",
        "不计入月均定投": "Excluded from monthly average",
        "按计划持续扣款": "Investing on schedule",
        "编辑计划…": "Edit plan…",
        "编辑定投计划": "Edit plan",
        "只记计划与节奏，不重复记市值。": "Track the plan and cadence; value lives elsewhere.",
        "计划信息": "Plan details",
        "计划名称": "Plan name",
        "扣款节奏": "Debit schedule",
        "每期金额（元）": "Amount per cycle (CNY)",
        "例如：每日 / 每周一 / 每月 8 日": "e.g. Daily / every Monday / the 8th",
        "起始时间": "Start date",
        "例如：2026-07": "e.g. 2026-07",
        "月均估算": "Monthly estimate",
        "（仅进行中的计划计入）": "(Active plans only)",
        "为什么投 / 注意事项": "Why I invest / watch-outs",
        "例如：纳指限购后转投；亏近 20%，每月复盘一次。": "e.g. Switched after Nasdaq purchases were capped; down nearly 20%, review monthly.",
        "请填写计划名称。": "Enter a plan name.",
        "请填写平台或账户。": "Enter a platform or account.",
        "每期金额需要填写数字，或留空。": "Per-cycle amount must be a number, or left blank.",
        "进行中的计划需要填写每期金额。": "Active plans need a per-cycle amount.",
        "每期金额不能为负数。": "Per-cycle amount can't be negative.",
        "进行中的计划，每期金额需要大于 0。": "Active plans need a per-cycle amount greater than 0.",
        "计划已添加": "Plan added",
        "计划已更新": "Plan updated",
        "资金归集计划不重复计入“月均定投”；基金当前市值统一在“当前持仓”中维护。": "Cash-pool plans aren't counted in the monthly DCA total; fund values live under Holdings.",
        "进行中计划月均估算 %@ 元　｜　每交易日按 21.75 天、每日按 30 天、每周按 52/12 周估算": "Estimated %@ CNY/month from active plans | Trading days ×21.75, daily ×30, weekly ×52/12",

        // Data & export
        "随时导出，数据只保存在这台 Mac　·　当前共 %d 条资产、%d 笔操作、%d 条复盘": "Export anytime; data stays on this Mac · %d assets, %d trades, %d reviews",
        "导出 Excel": "Export Excel",
        "导出": "Export",
        "任何时候都可以导出": "Export anytime",
        "Excel 工作簿": "Excel workbook",
        "概览、当前持仓、操作记录、每日复盘、定投计划、净值快照，共 6 个工作表。": "Overview, holdings, trades, daily reviews, plans and net-worth snapshots — 6 sheets.",
        "完整 JSON 备份": "Full JSON backup",
        "包含所有数据，可在本应用中恢复。": "Everything, restorable in this app.",
        "当前持仓 CSV": "Holdings CSV",
        "适合 Excel / Numbers 直接打开。": "Opens directly in Excel or Numbers.",
        "操作记录 CSV": "Trades CSV",
        "每一笔操作及当时的理由。": "Every trade and the reason at the time.",
        "每日复盘 CSV": "Daily reviews CSV",
        "按日期导出心态与复盘记录。": "Moods and reviews by date.",
        "导出的文件不会覆盖原始工作簿，也不会改动应用里的数据。": "Exports never overwrite the workbook or change data in the app.",
        "本地数据": "Local data",
        "自动保存": "Auto-saved",
        "数据文件": "Data file",
        "自动备份 %d 份": "%d automatic backups",
        "在 Finder 中显示": "Reveal in Finder",
        "立即备份": "Back up now",
        "复制数据文件路径": "Copy data file path",
        "路径已复制": "Path copied",
        "最近备份": "Recent backups",
        "恢复备份": "Restore backup",
        "谨慎操作": "Careful",
        "从本应用导出的 JSON 备份恢复全部数据。恢复前会自动把当前数据另存一份。": "Restore all data from a JSON backup exported by this app. Current data is backed up first.",
        "选择 JSON 备份…": "Choose JSON backup…",
        "选择投资复盘 JSON 备份": "Choose investment review JSON backup",
        "恢复这份备份？": "Restore this backup?",
        "恢复": "Restore",
        "将用 %@ 替换当前数据。恢复前会自动保留一份当前数据的备份。\n\n备份内容：%d 条资产、%d 笔操作、%d 条复盘。": "%@ will replace the current data. A backup of the current data is kept first.\n\nBackup contains: %d assets, %d trades, %d reviews.",
        "备份已恢复": "Backup restored",
        "恢复失败": "Restore failed",
        "无法读取备份": "Couldn't read the backup",
        "本地备份已创建": "Local backup created",
        "备份失败": "Backup failed",
        "Koi 300 · 本地版 1.2.2": "Koi 300 · Local 1.2.2",
        "没有账号、没有云端、不发起网络请求。数据保存在 Application Support，导出文件可以在 Excel 或 Numbers 中打开。": "No account, no cloud, no network requests. Data lives in Application Support; exports open in Excel or Numbers.",

        // Export and file names
        "导出 Excel 工作簿": "Export Excel workbook",
        "导出 Excel 工作簿…": "Export Excel workbook…",
        "导出当前持仓": "Export holdings",
        "导出当前持仓 CSV…": "Export holdings CSV…",
        "导出操作记录": "Export trades",
        "导出操作记录 CSV…": "Export trades CSV…",
        "导出每日复盘": "Export daily reviews",
        "导出每日复盘 CSV…": "Export daily reviews CSV…",
        "导出完整 JSON 备份…": "Export full JSON backup…",
        "导出完整备份": "Export full backup",
        "导出失败": "Export failed",
        "已导出": "Exported",
        "导出文件没有生成。": "The export file wasn't created.",
        "没有可导出的工作表。": "There are no sheets to export.",
        "无法编码 CSV。": "Couldn't encode CSV.",
        "无法编码 XML。": "Couldn't encode XML.",
        "生成 xlsx 压缩包失败（zip 退出码 %d）。": "Couldn't build the xlsx archive (zip exit code %d).",
        "Koi 300 · 数据导出": "Koi 300 · Data export",
        "导出时间 %@　｜　数据截至 %@　｜　金额单位：元": "Exported %@ | Data as of %@ | Amounts in CNY",
        "关键指标": "Key metrics",
        "共 %d 条资产记录　｜　金额单位：元　｜　浮动盈亏按“当前市值 − 投入成本”计算": "%d asset records | Amounts in CNY | Unrealized P/L = market value − cost",
        "金额单位：元；占总资产按当前总资产（含现金）计算，四舍五入可能有 ±0.1% 的误差。": "Amounts in CNY; share of total uses total assets including cash, so rounding may vary by ±0.1%.",
        "持仓成本与当前市值由用户在本地应用中维护；操作记录用于复盘，不自动回写持仓成本。": "Cost and market value are kept in the local app; trades are for review and never rewrite holding cost.",
        "本文件由“Koi 300”本地应用导出，数据只保存在这台 Mac 上。": "Exported by the local Koi 300 app. Your data stays on this Mac.",
        "一行一笔；只记操作与当时的判断，不自动计入持仓。共 %d 笔。": "One row per trade; records the action and the call, not holdings. %d trades.",
        "先记事实，再记感受，最后写下一步。共 %d 条。": "Facts first, feelings second, then the next step. %d entries.",
        "暂无操作记录。可在“操作记录”页记录第一笔买入、卖出或定投。": "No trades yet. Log your first buy, sell or DCA under Trades.",
        "暂无复盘记录。每天 3 分钟，先写下今天的事实和下一步。": "No reviews yet. Take 3 minutes to note today's facts and next step.",
        "暂无定投计划。": "No plans yet.",
        "暂无快照。更新持仓后会自动记录当天数据。": "No snapshots yet. Updating holdings records the day automatically.",
        "净值快照": "Net-worth snapshots",
        "记录每天的总投入、总资产和现金；用于观察净值走势。": "Track total cost, total assets and cash each day to watch net worth.",
        "在 Finder 中打开数据文件夹": "Open data folder in Finder",
        "立即创建本地备份": "Create a local backup now",
        "单笔": "Single",
        "删除这条记录": "Delete this record",

        // Errors
        "%@不能为负数。": "%@ can't be negative.",
        "%@需要填写数字，或留空。": "%@ must be a number, or left blank.",
        "保存失败：%@": "Couldn't save: %@",
        "无法创建数据目录：%@": "Couldn't create the data folder: %@"
    ]
}

struct LanguagePicker: View {
    @ObservedObject private var store = LanguageStore.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(T("语言"))
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(.tertiary)
            HStack(spacing: 6) {
                ForEach(AppLanguage.allCases) { language in
                    Button {
                        withAnimation(.easeInOut(duration: 0.16)) {
                            store.set(language)
                        }
                    } label: {
                        Text(language.label)
                            .font(.system(size: 10.5, weight: .semibold))
                            .foregroundStyle(
                                store.language == language
                                    ? Color(hex: 0xFBF3E3)
                                    : Color.secondary
                            )
                            .padding(.horizontal, 11)
                            .frame(height: 24)
                            .background(
                                Capsule(style: .continuous)
                                    .fill(
                                        store.language == language
                                            ? Palette.accentSolid
                                            : Palette.fieldFill
                                    )
                            )
                            .overlay(
                                Capsule(style: .continuous)
                                    .strokeBorder(
                                        store.language == language
                                            ? Color.clear
                                            : Palette.border,
                                        lineWidth: 1
                                    )
                            )
                    }
                    .buttonStyle(.plain)
                }
                Spacer(minLength: 0)
            }
        }
    }
}
