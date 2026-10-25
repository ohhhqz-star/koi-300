import Foundation
import Combine

struct GroupSummary: Identifiable {
    var name: String
    var cost: Double
    var value: Double

    var id: String { name }
    var pnl: Double { value - cost }
    var pnlRate: Double { cost == 0 ? 0 : pnl / cost }
}

@MainActor
final class AppStore: ObservableObject {
    @Published private(set) var data: AppData
    @Published var errorMessage: String?

    let dataDirectory: URL
    let backupsDirectory: URL
    let dataURL: URL

    init(dataDirectory: URL? = nil, seedURL: URL? = nil) {
        let customDirectory = dataDirectory ?? Self.customDataDirectory()
        let directory = customDirectory ?? Self.resolveDataDirectory()
        if customDirectory == nil {
            Self.migrateLegacyDataIfNeeded(to: directory)
        }
        self.dataDirectory = directory
        self.dataURL = directory.appendingPathComponent("data.json")
        self.backupsDirectory = directory.appendingPathComponent("Backups")

        let fm = FileManager.default
        var loadedData: AppData?
        var loadError: String?

        if let existing = try? Data(contentsOf: self.dataURL) {
            do {
                loadedData = try Self.decode(existing)
            } catch {
                let stamp = DateFmt.timestamp.string(from: Date())
                let corruptURL = directory.appendingPathComponent("data-corrupt-\(stamp).json")
                try? fm.copyItem(at: self.dataURL, to: corruptURL)
                loadError = T("数据文件无法读取，已保留损坏副本并从初始数据恢复。")
            }
        }

        if loadedData == nil {
            let resolvedSeed = seedURL ?? Bundle.main.url(forResource: "SeedData", withExtension: "json")
            if let resolvedSeed, let raw = try? Data(contentsOf: resolvedSeed) {
                loadedData = try? Self.decode(raw)
            }
        }

        self.data = loadedData ?? AppData()
        self.errorMessage = loadError

        do {
            try fm.createDirectory(at: directory, withIntermediateDirectories: true)
            try fm.createDirectory(at: self.backupsDirectory, withIntermediateDirectories: true)
            if !fm.fileExists(atPath: self.dataURL.path) {
                try Self.write(self.data, to: self.dataURL)
            }
        } catch {
            self.errorMessage = T("无法创建数据目录：%@", error.localizedDescription)
        }
    }

    static func customDataDirectory() -> URL? {
        if let index = ProcessInfo.processInfo.arguments.firstIndex(of: "--data-dir"),
           index + 1 < ProcessInfo.processInfo.arguments.count {
            return URL(fileURLWithPath: ProcessInfo.processInfo.arguments[index + 1], isDirectory: true)
        }
        if let custom = ProcessInfo.processInfo.environment["REVIEW_DATA_DIR"], !custom.isEmpty {
            return URL(fileURLWithPath: custom, isDirectory: true)
        }
        return nil
    }

    static func resolveDataDirectory() -> URL {
        customDataDirectory() ?? applicationSupportBase().appendingPathComponent("Koi 300", isDirectory: true)
    }

    static func applicationSupportBase() -> URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support")
    }

    static func migrateLegacyDataIfNeeded(to directory: URL) {
        let fm = FileManager.default
        guard !fm.fileExists(atPath: directory.appendingPathComponent("data.json").path) else { return }
        let base = applicationSupportBase()
        for legacyName in ["复盘 300", "投资复盘", "fupan-300"] {
            let legacy = base.appendingPathComponent(legacyName, isDirectory: true)
            guard legacy.standardizedFileURL != directory.standardizedFileURL,
                  let entries = try? fm.contentsOfDirectory(at: legacy, includingPropertiesForKeys: nil),
                  entries.contains(where: { $0.lastPathComponent == "data.json" }) else { continue }
            try? fm.createDirectory(at: directory, withIntermediateDirectories: true)
            for entry in entries {
                let target = directory.appendingPathComponent(entry.lastPathComponent)
                guard !fm.fileExists(atPath: target.path) else { continue }
                try? fm.copyItem(at: entry, to: target)
            }
            return
        }
    }

    static let enumAliases: [String: String] = [
        "Fund (OTC)": "场外基金", "OTC fund": "场外基金", "Off-exchange fund": "场外基金",
        "Fund (ETF)": "场内基金", "ETF": "场内基金", "Exchange-traded fund": "场内基金",
        "Stock": "股票", "Pension": "养老金", "Gold": "黄金", "Cash": "现金",
        "Buy": "买入", "Sell": "卖出", "DCA": "定投", "Switch": "转换", "Dividend": "分红",
        "Monthly": "每月", "Weekly": "每周", "Daily": "每日",
        "Every trading day": "每交易日", "One-off": "一次性",
        "Active": "进行中", "Paused": "已暂停", "Cash pool": "资金归集", "Finished": "已结束",
        "Manual": "手工填写", "From screenshot": "截图录入",
        "Broker screenshot": "券商截图", "Estimate": "估算", "Needs update": "待更新",
        "Not reviewed": "待复盘", "Yes": "是", "No": "否", "Partly": "部分按计划",
    ]

    static func canonical(_ value: String) -> String { enumAliases[value] ?? value }

    static func decode(_ raw: Data) throws -> AppData {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        var data = try decoder.decode(AppData.self, from: raw)
        for index in data.assets.indices {
            var asset = data.assets[index]
            asset.category = canonical(asset.category)
            asset.dataStatus = canonical(asset.dataStatus)
            data.assets[index] = asset
        }
        for index in data.trades.indices {
            var trade = data.trades[index]
            trade.category = canonical(trade.category)
            trade.action = canonical(trade.action)
            trade.followedPlan = canonical(trade.followedPlan)
            data.trades[index] = trade
        }
        for index in data.plans.indices {
            var plan = data.plans[index]
            plan.category = canonical(plan.category)
            plan.frequency = canonical(plan.frequency)
            plan.status = canonical(plan.status)
            data.plans[index] = plan
        }
        return data
    }

    static func encode(_ data: AppData) throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        encoder.dateEncodingStrategy = .iso8601
        return try encoder.encode(data)
    }

    static func write(_ data: AppData, to url: URL) throws {
        let raw = try encode(data)
        try raw.write(to: url, options: .atomic)
    }

    // MARK: - Totals

    var totalCost: Double { data.assets.reduce(0) { $0 + $1.cost } }
    var totalValue: Double { data.assets.reduce(0) { $0 + $1.value } }
    var totalPnL: Double { totalValue - totalCost }
    var totalRate: Double { totalCost == 0 ? 0 : totalPnL / totalCost }
    var totalCash: Double {
        data.assets.filter { $0.category == AssetCategory.cash.rawValue }.reduce(0) { $0 + $1.value }
    }
    var holdingsValue: Double { totalValue - totalCash }
    var cashShare: Double { totalValue == 0 ? 0 : totalCash / totalValue }

    var accountSummaries: [GroupSummary] {
        var order: [String] = []
        var costMap: [String: Double] = [:]
        var valueMap: [String: Double] = [:]
        for asset in data.assets {
            if !order.contains(asset.account) { order.append(asset.account) }
            costMap[asset.account, default: 0] += asset.cost
            valueMap[asset.account, default: 0] += asset.value
        }
        return order.map { GroupSummary(name: $0, cost: costMap[$0] ?? 0, value: valueMap[$0] ?? 0) }
    }

    var categorySummaries: [GroupSummary] {
        AssetCategory.allCases.compactMap { category in
            let items = data.assets.filter { $0.category == category.rawValue }
            guard !items.isEmpty else { return nil }
            return GroupSummary(
                name: category.rawValue,
                cost: items.reduce(0) { $0 + $1.cost },
                value: items.reduce(0) { $0 + $1.value }
            )
        }
    }

    var accounts: [String] { accountSummaries.map(\.name) }
    var topHolding: Asset? { data.assets.max(by: { $0.value < $1.value }) }
    var biggestLoss: Asset? { data.assets.min(by: { $0.pnl < $1.pnl }) }
    var monthlyInvesting: Double { data.plans.reduce(0) { $0 + $1.monthlyEstimate } }
    var activePlansCount: Int { data.plans.filter { $0.status == PlanStatus.active.rawValue }.count }
    var cashPoolPlan: DcaPlan? { data.plans.first(where: \.isCashPool) }

    var recordCount300: Int { Record300.count(trades: data.trades.count, reviews: data.reviews.count) }
    var recordProgress300: Double { Record300.progress(recordCount300) }

    var reviewsSorted: [DailyReview] { data.reviews.sorted { $0.date > $1.date } }
    var tradesSorted: [Trade] {
        data.trades.sorted {
            if $0.date == $1.date { return $0.createdAt > $1.createdAt }
            return $0.date > $1.date
        }
    }
    var snapshotsSorted: [NetWorthSnapshot] { data.snapshots.sorted { $0.date < $1.date } }

    func review(on date: String) -> DailyReview? { data.reviews.first { $0.date == date } }
    func snapshot(on date: String) -> NetWorthSnapshot? { data.snapshots.first { $0.date == date } }
    func reviewExists(on date: String, excluding id: UUID?) -> Bool {
        data.reviews.contains { $0.date == date && $0.id != id }
    }

    func allocation(of asset: Asset) -> Double {
        totalValue == 0 ? 0 : asset.value / totalValue
    }

    func accountAllocation(_ summary: GroupSummary) -> Double {
        totalValue == 0 ? 0 : summary.value / totalValue
    }

    // MARK: - Mutations

    func upsertAsset(_ asset: Asset) {
        var changed = asset
        changed.updatedAt = Date()
        if let index = data.assets.firstIndex(where: { $0.id == changed.id }) {
            data.assets[index] = changed
        } else {
            data.assets.append(changed)
        }
        refreshTodaySnapshot()
        commit()
    }

    func deleteAsset(id: UUID) {
        data.assets.removeAll { $0.id == id }
        refreshTodaySnapshot()
        commit()
    }

    func upsertTrade(_ trade: Trade) {
        if let index = data.trades.firstIndex(where: { $0.id == trade.id }) {
            data.trades[index] = trade
        } else {
            data.trades.append(trade)
        }
        commit()
    }

    func deleteTrade(id: UUID) {
        data.trades.removeAll { $0.id == id }
        commit()
    }

    func upsertReview(_ review: DailyReview) {
        var changed = review
        changed.updatedAt = Date()
        if let index = data.reviews.firstIndex(where: { $0.id == changed.id }) {
            data.reviews[index] = changed
        } else {
            data.reviews.append(changed)
        }
        if changed.date == DateFmt.today() {
            refreshTodaySnapshot()
        }
        commit()
    }

    func deleteReview(id: UUID) {
        data.reviews.removeAll { $0.id == id }
        commit()
    }

    func upsertPlan(_ plan: DcaPlan) {
        if let index = data.plans.firstIndex(where: { $0.id == plan.id }) {
            data.plans[index] = plan
        } else {
            data.plans.append(plan)
        }
        commit()
    }

    func deletePlan(id: UUID) {
        data.plans.removeAll { $0.id == id }
        commit()
    }

    func importData(_ imported: AppData) throws {
        if FileManager.default.fileExists(atPath: dataURL.path),
           let current = try? Data(contentsOf: dataURL) {
            let stamp = DateFmt.timestamp.string(from: Date())
            let backupURL = backupsDirectory.appendingPathComponent("data-before-import-\(stamp).json")
            try current.write(to: backupURL, options: .atomic)
        }
        data = imported
        data.schemaVersion = max(imported.schemaVersion, 1)
        commit()
    }

    func backupNow() throws -> URL {
        let fm = FileManager.default
        try fm.createDirectory(at: backupsDirectory, withIntermediateDirectories: true)
        let stamp = DateFmt.timestamp.string(from: Date())
        let url = backupsDirectory.appendingPathComponent("manual-\(stamp).json")
        let raw = try Self.encode(data)
        try raw.write(to: url, options: .atomic)
        return url
    }

    func backupFiles() -> [URL] {
        let fm = FileManager.default
        guard let files = try? fm.contentsOfDirectory(
            at: backupsDirectory,
            includingPropertiesForKeys: [.contentModificationDateKey],
            options: [.skipsHiddenFiles]
        ) else { return [] }
        return files
            .filter { $0.pathExtension == "json" }
            .sorted {
                let l = (try? $0.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast
                let r = (try? $1.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast
                return l > r
            }
    }

    // MARK: - Persistence

    private func refreshTodaySnapshot() {
        let today = DateFmt.today()
        let snapshot = NetWorthSnapshot(date: today, cost: totalCost, value: totalValue, cash: totalCash)
        if let index = data.snapshots.firstIndex(where: { $0.date == today }) {
            let oldID = data.snapshots[index].id
            var updated = snapshot
            updated.id = oldID
            data.snapshots[index] = updated
        } else {
            data.snapshots.append(snapshot)
        }
        data.snapshots.sort { $0.date < $1.date }
    }

    private func commit() {
        data.lastModified = Date()
        do {
            try createDailyBackupIfNeeded()
            try Self.write(data, to: dataURL)
        } catch {
            errorMessage = T("保存失败：%@", error.localizedDescription)
        }
    }

    private func createDailyBackupIfNeeded() throws {
        let fm = FileManager.default
        try fm.createDirectory(at: backupsDirectory, withIntermediateDirectories: true)
        let day = DateFmt.today()
        let backupURL = backupsDirectory.appendingPathComponent("data-\(day).json")
        if !fm.fileExists(atPath: backupURL.path), fm.fileExists(atPath: dataURL.path) {
            try fm.copyItem(at: dataURL, to: backupURL)
        }
        pruneBackups()
    }

    private func pruneBackups() {
        let fm = FileManager.default
        guard let files = try? fm.contentsOfDirectory(
            at: backupsDirectory,
            includingPropertiesForKeys: [.contentModificationDateKey],
            options: [.skipsHiddenFiles]
        ) else { return }
        let dated = files
            .filter { $0.pathExtension == "json" }
            .sorted {
                let l = (try? $0.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast
                let r = (try? $1.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast
                return l > r
            }
        for stale in dated.dropFirst(60) {
            try? fm.removeItem(at: stale)
        }
    }
}
