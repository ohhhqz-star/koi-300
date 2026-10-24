import Foundation

enum AssetCategory: String, CaseIterable, Identifiable {
    case offExchange = "场外基金"
    case onExchange = "场内基金"
    case stock = "股票"
    case pension = "养老金"
    case gold = "黄金"
    case cash = "现金"

    var id: String { rawValue }

    var symbol: String {
        switch self {
        case .offExchange: return "building.columns"
        case .onExchange: return "chart.line.uptrend.xyaxis"
        case .stock: return "chart.bar.xaxis"
        case .pension: return "person.badge.shield.checkmark"
        case .gold: return "circle.hexagongrid"
        case .cash: return "banknote"
        }
    }
}

enum AssetStatus: String, CaseIterable, Identifiable {
    case manual = "手工填写"
    case screenshot = "截图录入"
    case broker = "券商截图"
    case estimate = "估算"
    case needsUpdate = "待更新"

    var id: String { rawValue }
}

enum TradeAction: String, CaseIterable, Identifiable {
    case buy = "买入"
    case sell = "卖出"
    case dca = "定投"
    case convert = "转换"
    case dividend = "分红"

    var id: String { rawValue }

    var colorName: String {
        switch self {
        case .buy, .dca: return "gain"
        case .sell: return "loss"
        case .convert: return "accent"
        case .dividend: return "gold"
        }
    }
}

enum Frequency: String, CaseIterable, Identifiable {
    case monthly = "每月"
    case weekly = "每周"
    case daily = "每日"
    case tradingDay = "每交易日"
    case once = "一次性"

    var id: String { rawValue }

    func monthlyEstimate(_ amount: Double) -> Double {
        switch self {
        case .monthly: return amount
        case .weekly: return amount * 52 / 12
        case .daily: return amount * 30
        case .tradingDay: return amount * 21.75
        case .once: return 0
        }
    }
}

enum PlanStatus: String, CaseIterable, Identifiable {
    case active = "进行中"
    case paused = "已暂停"
    case cashPool = "资金归集"
    case finished = "已结束"

    var id: String { rawValue }

    var isInvesting: Bool { self == .active }
}

struct Asset: Identifiable, Codable, Hashable {
    var id: UUID
    var account: String
    var category: String
    var code: String
    var name: String
    var cost: Double
    var value: Double
    var units: Double?
    var costPrice: Double?
    var price: Double?
    var note: String
    var nextStep: String
    var dataStatus: String
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        account: String,
        category: String,
        code: String,
        name: String,
        cost: Double,
        value: Double,
        units: Double? = nil,
        costPrice: Double? = nil,
        price: Double? = nil,
        note: String = "",
        nextStep: String = "",
        dataStatus: String = AssetStatus.manual.rawValue,
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.account = account
        self.category = category
        self.code = code
        self.name = name
        self.cost = cost
        self.value = value
        self.units = units
        self.costPrice = costPrice
        self.price = price
        self.note = note
        self.nextStep = nextStep
        self.dataStatus = dataStatus
        self.updatedAt = updatedAt
    }

    var pnl: Double { value - cost }
    var pnlRate: Double { cost == 0 ? 0 : pnl / cost }
    var categoryKind: AssetCategory? { AssetCategory(rawValue: category) }
}

struct Trade: Identifiable, Codable, Hashable {
    var id: UUID
    var date: String
    var account: String
    var category: String
    var code: String
    var name: String
    var action: String
    var amount: Double?
    var shares: Double?
    var price: Double?
    var fee: Double?
    var realizedPnL: Double?
    var reason: String
    var mood: String
    var market: String
    var review: String
    var followedPlan: String
    var lesson: String
    var createdAt: Date

    init(
        id: UUID = UUID(),
        date: String,
        account: String = "",
        category: String = AssetCategory.offExchange.rawValue,
        code: String = "",
        name: String = "",
        action: String = TradeAction.buy.rawValue,
        amount: Double? = nil,
        shares: Double? = nil,
        price: Double? = nil,
        fee: Double? = nil,
        realizedPnL: Double? = nil,
        reason: String = "",
        mood: String = "",
        market: String = "",
        review: String = "",
        followedPlan: String = "待复盘",
        lesson: String = "",
        createdAt: Date = Date()
    ) {
        self.id = id
        self.date = date
        self.account = account
        self.category = category
        self.code = code
        self.name = name
        self.action = action
        self.amount = amount
        self.shares = shares
        self.price = price
        self.fee = fee
        self.realizedPnL = realizedPnL
        self.reason = reason
        self.mood = mood
        self.market = market
        self.review = review
        self.followedPlan = followedPlan
        self.lesson = lesson
        self.createdAt = createdAt
    }
}

struct DailyReview: Identifiable, Codable, Hashable {
    var id: UUID
    var date: String
    var mood: Int
    var trigger: String
    var operations: String
    var market: String
    var didRight: String
    var didWrong: String
    var nextPlan: String
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        date: String,
        mood: Int = 3,
        trigger: String = "",
        operations: String = "",
        market: String = "",
        didRight: String = "",
        didWrong: String = "",
        nextPlan: String = "",
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.date = date
        self.mood = mood
        self.trigger = trigger
        self.operations = operations
        self.market = market
        self.didRight = didRight
        self.didWrong = didWrong
        self.nextPlan = nextPlan
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    var moodLabel: String {
        switch mood {
        case 1: return "很差"
        case 2: return "偏低"
        case 3: return "一般"
        case 4: return "不错"
        default: return "很好"
        }
    }
}

struct DcaPlan: Identifiable, Codable, Hashable {
    var id: UUID
    var platform: String
    var code: String
    var name: String
    var category: String
    var frequency: String
    var amount: Double?
    var debitDay: String
    var startDate: String
    var status: String
    var note: String

    init(
        id: UUID = UUID(),
        platform: String,
        code: String = "—",
        name: String,
        category: String = AssetCategory.offExchange.rawValue,
        frequency: String = Frequency.monthly.rawValue,
        amount: Double? = nil,
        debitDay: String = "",
        startDate: String = "",
        status: String = PlanStatus.active.rawValue,
        note: String = ""
    ) {
        self.id = id
        self.platform = platform
        self.code = code
        self.name = name
        self.category = category
        self.frequency = frequency
        self.amount = amount
        self.debitDay = debitDay
        self.startDate = startDate
        self.status = status
        self.note = note
    }

    var monthlyEstimate: Double {
        guard status == PlanStatus.active.rawValue, let amount else { return 0 }
        return (Frequency(rawValue: frequency) ?? .monthly).monthlyEstimate(amount)
    }

    var isCashPool: Bool { status == PlanStatus.cashPool.rawValue || category == AssetCategory.cash.rawValue }
}

struct NetWorthSnapshot: Identifiable, Codable, Hashable {
    var id: UUID
    var date: String
    var cost: Double
    var value: Double
    var cash: Double

    init(id: UUID = UUID(), date: String, cost: Double, value: Double, cash: Double) {
        self.id = id
        self.date = date
        self.cost = cost
        self.value = value
        self.cash = cash
    }

    var pnl: Double { value - cost }
}

struct AppData: Codable {
    var schemaVersion: Int
    var assets: [Asset]
    var trades: [Trade]
    var reviews: [DailyReview]
    var plans: [DcaPlan]
    var snapshots: [NetWorthSnapshot]
    var lastModified: Date

    init(
        schemaVersion: Int = 1,
        assets: [Asset] = [],
        trades: [Trade] = [],
        reviews: [DailyReview] = [],
        plans: [DcaPlan] = [],
        snapshots: [NetWorthSnapshot] = [],
        lastModified: Date = Date()
    ) {
        self.schemaVersion = schemaVersion
        self.assets = assets
        self.trades = trades
        self.reviews = reviews
        self.plans = plans
        self.snapshots = snapshots
        self.lastModified = lastModified
    }
}

enum Record300 {
    static let goal = 300

    static func count(trades: Int, reviews: Int) -> Int { trades + reviews }

    static func progress(_ count: Int) -> Double {
        min(max(Double(count) / Double(goal), 0), 1)
    }

    static func stage(_ count: Int) -> String {
        switch count {
        case 0: return "第一笔，从今天开始"
        case 1..<30: return "先观察自己"
        case 30..<100: return "节奏正在出现"
        case 100..<200: return "纪律开始成形"
        case 200..<goal: return "风格就在附近"
        default: return "风格已自成一套"
        }
    }
}

enum DateFmt {
    static let iso: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = .current
        return f
    }()

    static let chinese: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "zh_CN")
        f.dateFormat = "yyyy年M月d日 EEEE"
        return f
    }()

    static let chineseShort: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "zh_CN")
        f.dateFormat = "M月d日"
        return f
    }()

    static let dateTimeChinese: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "zh_CN")
        f.dateFormat = "yyyy年M月d日 HH:mm"
        return f
    }()

    static let timestamp: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyyMMdd-HHmm"
        return f
    }()

    static func today() -> String { iso.string(from: Date()) }
    static func parse(_ string: String) -> Date { iso.date(from: string) ?? Date() }
    static func display(_ string: String) -> String {
        guard let d = iso.date(from: string) else { return string }
        return chinese.string(from: d)
    }
    static func short(_ string: String) -> String {
        guard let d = iso.date(from: string) else { return string }
        return chineseShort.string(from: d)
    }
}

enum Fmt {
    static func money(_ v: Double, signed: Bool = false) -> String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.minimumFractionDigits = 2
        f.maximumFractionDigits = 2
        f.usesGroupingSeparator = true
        let body = f.string(from: NSNumber(value: abs(v))) ?? String(format: "%.2f", abs(v))
        if v < 0 { return "-" + body }
        if signed && v > 0 { return "+" + body }
        return body
    }

    static func percent(_ v: Double, signed: Bool = true) -> String {
        let p = v * 100
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.minimumFractionDigits = 2
        f.maximumFractionDigits = 2
        let body = (f.string(from: NSNumber(value: abs(p))) ?? String(format: "%.2f", abs(p))) + "%"
        if p < 0 { return "-" + body }
        if signed && p > 0 { return "+" + body }
        return body
    }

    static func optionalNumber(_ v: Double?, digits: Int = 2) -> String {
        guard let v else { return "—" }
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.minimumFractionDigits = 0
        f.maximumFractionDigits = digits
        return f.string(from: NSNumber(value: v)) ?? "\(v)"
    }

    static func parseNumber(_ text: String) -> Double? {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: ",", with: "")
            .replacingOccurrences(of: "，", with: "")
        if trimmed.isEmpty { return nil }
        return Double(trimmed)
    }
}
