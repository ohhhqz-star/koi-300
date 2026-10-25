import Foundation

enum CSVKind {
    case holdings
    case trades
    case reviews

    var title: String {
        switch self {
        case .holdings: return T("当前持仓")
        case .trades: return T("操作记录")
        case .reviews: return T("每日复盘")
        }
    }
}

enum CSVExporter {
    static func string(kind: CSVKind, data: AppData) -> String {
        switch kind {
        case .holdings: return holdingsCSV(data)
        case .trades: return tradesCSV(data)
        case .reviews: return reviewsCSV(data)
        }
    }

    static func write(kind: CSVKind, data: AppData, to url: URL) throws {
        var raw = Data([0xEF, 0xBB, 0xBF])
        guard let text = string(kind: kind, data: data).data(using: .utf8) else {
            throw XLSXError.packageFailed(T("无法编码 CSV。"))
        }
        raw.append(text)
        try raw.write(to: url, options: .atomic)
    }

    private static func holdingsCSV(_ data: AppData) -> String {
        let totalValue = data.assets.reduce(0) { $0 + $1.value }
        let headers = ["账户", "类别", "代码", "名称 / 标的", "投入成本", "当前市值", "浮动盈亏", "盈亏率", "仓位占比", "数量 / 份额", "成本价 / 净值", "现价 / 净值", "我的记录 / 现状", "下一步 / 退出条件", "数据状态"].map { T($0) }
        var lines = [headers.map(textField).joined(separator: ",")]
        for asset in data.assets {
            lines.append([
                textField(asset.account),
                textField(T(asset.category)),
                textField(asset.code),
                textField(asset.name),
                numberField(asset.cost),
                numberField(asset.value),
                numberField(asset.pnl),
                numberField(asset.pnlRate),
                numberField(totalValue == 0 ? 0 : asset.value / totalValue),
                asset.units.map(numberField) ?? "",
                asset.costPrice.map(numberField) ?? "",
                asset.price.map(numberField) ?? "",
                textField(asset.note),
                textField(asset.nextStep),
                textField(T(asset.dataStatus))
            ].joined(separator: ","))
        }
        let totalCost = data.assets.reduce(0) { $0 + $1.cost }
        let totalPnL = totalValue - totalCost
        lines.append([
            textField(T("合计")), "", "", "",
            numberField(totalCost),
            numberField(totalValue),
            numberField(totalPnL),
            numberField(totalCost == 0 ? 0 : totalPnL / totalCost),
            numberField(1)
        ].joined(separator: ","))
        return lines.joined(separator: "\r\n") + "\r\n"
    }

    private static func tradesCSV(_ data: AppData) -> String {
        let headers = ["日期", "账户", "类别", "代码", "名称", "操作", "金额", "份额", "成交价/净值", "手续费", "已实现盈亏", "操作理由", "当时情绪", "市场 / 消息面", "结果复盘", "按计划？", "教训 / 下次"].map { T($0) }
        var lines = [headers.map(textField).joined(separator: ",")]
        let sorted = data.trades.sorted {
            if $0.date == $1.date { return $0.createdAt > $1.createdAt }
            return $0.date > $1.date
        }
        for trade in sorted {
            lines.append([
                textField(trade.date),
                textField(trade.account),
                textField(T(trade.category)),
                textField(trade.code),
                textField(trade.name),
                textField(T(trade.action)),
                trade.amount.map(numberField) ?? "",
                trade.shares.map(numberField) ?? "",
                trade.price.map(numberField) ?? "",
                trade.fee.map(numberField) ?? "",
                trade.realizedPnL.map(numberField) ?? "",
                textField(trade.reason),
                textField(trade.mood),
                textField(trade.market),
                textField(trade.review),
                textField(T(trade.followedPlan)),
                textField(trade.lesson)
            ].joined(separator: ","))
        }
        return lines.joined(separator: "\r\n") + "\r\n"
    }

    private static func reviewsCSV(_ data: AppData) -> String {
        let headers = ["日期", "心态分数", "心态", "情绪 / 触发", "今日操作", "市场观察", "做对的事", "做错的事 / 教训", "明日计划", "当日总资产"].map { T($0) }
        let snapshotMap = Dictionary(uniqueKeysWithValues: data.snapshots.map { ($0.date, $0) })
        var lines = [headers.map(textField).joined(separator: ",")]
        for review in data.reviews.sorted(by: { $0.date > $1.date }) {
            lines.append([
                textField(review.date),
                String(review.mood),
                textField(review.moodLabel),
                textField(review.trigger),
                textField(review.operations),
                textField(review.market),
                textField(review.didRight),
                textField(review.didWrong),
                textField(review.nextPlan),
                snapshotMap[review.date].map { numberField($0.value) } ?? ""
            ].joined(separator: ","))
        }
        return lines.joined(separator: "\r\n") + "\r\n"
    }

    private static func numberField(_ value: Double) -> String {
        String(format: "%.2f", value)
    }

    private static func textField(_ text: String) -> String {
        let safe = text.replacingOccurrences(of: "\"", with: "\"\"")
        return "\"\(safe)\""
    }
}
