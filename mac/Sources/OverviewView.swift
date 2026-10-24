import SwiftUI

enum ChartPalette {
    static let colors: [Color] = [
        Palette.color(light: 0x2C5D57, dark: 0x63A99B),
        Palette.color(light: 0xB08D50, dark: 0xD9BE8A),
        Palette.color(light: 0x5B7C99, dark: 0x8FB0C9),
        Palette.color(light: 0x8C6B8E, dark: 0xBE9FBE),
        Palette.color(light: 0xB06A4F, dark: 0xD99B7E),
        Palette.color(light: 0x7E8B76, dark: 0xAAB89F),
        Palette.color(light: 0xD3B38C, dark: 0xE5CFA9)
    ]

    static func color(_ index: Int) -> Color {
        colors[index % colors.count]
    }
}

struct OverviewView: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var ui: AppUI

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                PageHeader(
                    "概览",
                    subtitle: "\(DateFmt.chinese.string(from: Date()))　·　\(store.data.assets.count) 条资产　·　更新于 \(store.data.lastModified.formatted(date: .omitted, time: .shortened))"
                ) {
                    Button("记一笔操作") { ui.modal = .trade(nil) }
                        .buttonStyle(SecondaryButtonStyle(compact: true))
                    Button("写今日复盘") { ui.openTodayReview(store: store) }
                        .buttonStyle(PrimaryButtonStyle(compact: true))
                }

                hero
                recordStrip
                insightRow

                HStack(alignment: .top, spacing: 18) {
                    accountDistribution
                        .frame(maxWidth: .infinity, alignment: .top)
                    categoryCard
                        .frame(width: 360)
                }

                HStack(alignment: .top, spacing: 18) {
                    recentReviews
                        .frame(maxWidth: .infinity, alignment: .top)
                    dcaCard
                        .frame(width: 360)
                }
            }
            .padding(.horizontal, 28)
            .padding(.vertical, 24)
            .frame(maxWidth: 1420)
            .frame(maxWidth: .infinity)
        }
        .background(PageBackground())
    }

    private var hero: some View {
        HStack(alignment: .center, spacing: 30) {
            VStack(alignment: .leading, spacing: 15) {
                HStack(spacing: 7) {
                    Text("当前总资产")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Color.white.opacity(0.58))
                    Text("元")
                        .font(.system(size: 10))
                        .foregroundStyle(Color.white.opacity(0.38))
                }

                HStack(alignment: .firstTextBaseline, spacing: 12) {
                    Text(Fmt.money(store.totalValue))
                        .font(.system(size: 43, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(Color(hex: 0xF8F3E8))
                        .minimumScaleFactor(0.6)
                        .lineLimit(1)
                    heroPnLChip
                }

                HStack(spacing: 26) {
                    heroStat("总投入成本", Fmt.money(store.totalCost))
                    Rectangle().fill(Color.white.opacity(0.10)).frame(width: 1, height: 28)
                    heroStat("持仓市值", Fmt.money(store.holdingsValue))
                    Rectangle().fill(Color.white.opacity(0.10)).frame(width: 1, height: 28)
                    heroStat("现金", Fmt.money(store.totalCash))
                }
                .padding(.top, 2)
            }

            Spacer(minLength: 10)

            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("净值走势")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Color.white.opacity(0.56))
                    Spacer()
                    Text("\(store.data.snapshots.count) 个记录日")
                        .font(.system(size: 10))
                        .foregroundStyle(Color.white.opacity(0.36))
                }
                NetWorthSparkline(snapshots: store.snapshotsSorted)
                    .frame(height: 76)
                HStack {
                    Text(store.snapshotsSorted.first.map { DateFmt.short($0.date) } ?? "今天开始")
                        .font(.system(size: 9.5))
                        .foregroundStyle(Color.white.opacity(0.34))
                    Spacer()
                    Text(store.snapshotsSorted.last.map { DateFmt.short($0.date) } ?? DateFmt.short(DateFmt.today()))
                        .font(.system(size: 9.5))
                        .foregroundStyle(Color.white.opacity(0.34))
                }
            }
            .frame(width: 258)
        }
        .padding(.horizontal, 30)
        .padding(.vertical, 27)
        .background {
            ZStack(alignment: .topTrailing) {
                Palette.accentDeep
                KoiSilhouette(color: Color(hex: 0xE4D0A6).opacity(0.075))
                    .frame(width: 300)
                    .offset(x: -22, y: 30)
                    .rotationEffect(.degrees(-7))
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .strokeBorder(Color.white.opacity(0.055), lineWidth: 1)
        )
    }

    private var heroPnLChip: some View {
        let positive = store.totalPnL >= 0
        let color = store.totalPnL == 0 ? Color.white.opacity(0.65) : (positive ? Color(hex: 0xEBA79B) : Color(hex: 0x94D2B7))
        return HStack(spacing: 5) {
            Image(systemName: positive ? "arrow.up.right" : "arrow.down.right")
                .font(.system(size: 9, weight: .bold))
            Text(Fmt.money(store.totalPnL, signed: true))
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .monospacedDigit()
            Text(Fmt.percent(store.totalRate))
                .font(.system(size: 11, weight: .regular, design: .rounded))
                .monospacedDigit()
                .opacity(0.75)
        }
        .foregroundStyle(color)
    }

    private func heroStat(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label)
                .font(.system(size: 9.5))
                .foregroundStyle(Color.white.opacity(0.45))
            Text(value)
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(Color.white.opacity(0.9))
        }
    }

    private var recordStrip: some View {
        let count = store.recordCount300
        return Card(padding: 16) {
            HStack(spacing: 20) {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text("\(count)")
                        .font(.system(size: 26, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(Palette.accent)
                    Text("/ 300")
                        .font(.system(size: 11, weight: .medium, design: .rounded))
                        .foregroundStyle(.tertiary)
                }
                .frame(width: 92, alignment: .leading)

                VStack(alignment: .leading, spacing: 7) {
                    HStack(spacing: 8) {
                        Text("300 记录计划")
                            .font(.system(size: 11.5, weight: .semibold))
                        Text(Record300.stage(count))
                            .font(.system(size: 10.5))
                            .foregroundStyle(.secondary)
                    }
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(Color.primary.opacity(0.055))
                            Capsule()
                                .fill(Palette.accent.opacity(0.72))
                                .frame(width: max(geo.size.width * store.recordProgress300, count > 0 ? 4 : 0))
                        }
                    }
                    .frame(height: 4)
                    Text("交易与每日复盘都计入　·　不用一次写很多，写真的就行")
                        .font(.system(size: 9.5))
                        .foregroundStyle(.tertiary)
                }

                Rectangle()
                    .fill(Palette.border)
                    .frame(width: 1, height: 42)

                VStack(alignment: .leading, spacing: 3) {
                    Text("在买入前，先写 300 次。")
                        .font(.system(size: 12, weight: .semibold))
                    Text("风格不是想出来的，是记出来的。")
                        .font(.system(size: 10.5))
                        .foregroundStyle(.secondary)
                }
                .fixedSize(horizontal: true, vertical: false)
                Spacer(minLength: 0)
            }
        }
    }

    private var insightRow: some View {
        HStack(spacing: 16) {
            InsightCard(
                icon: "arrow.down.right",
                label: "最大浮亏",
                value: store.biggestLoss.map { Fmt.money($0.pnl, signed: true) } ?? "—",
                detail: store.biggestLoss.map { "\($0.name)　\(Fmt.percent($0.pnlRate))" } ?? "暂无持仓",
                tint: Palette.loss
            )
            InsightCard(
                icon: "chart.pie",
                label: "仓位最重",
                value: store.topHolding.map { Fmt.money($0.value) } ?? "—",
                detail: store.topHolding.map { "\($0.name)　\(Fmt.percent(store.allocation(of: $0), signed: false))" } ?? "暂无持仓",
                tint: Palette.accent
            )
            InsightCard(
                icon: "banknote",
                label: "现金占比",
                value: Fmt.percent(store.cashShare, signed: false),
                detail: "现金 \(Fmt.money(store.totalCash)) 元　·　共 \(store.data.assets.filter { $0.category == AssetCategory.cash.rawValue }.count) 笔",
                tint: Palette.gold
            )
        }
    }

    private var accountDistribution: some View {
        Card {
            VStack(alignment: .leading, spacing: 16) {
                CardTitle(title: "账户分布", subtitle: "按当前市值", icon: "square.stack.3d.up")
                if store.accountSummaries.isEmpty {
                    EmptyState(
                        icon: "tray",
                        title: "还没有持仓",
                        message: "先加一条资产，账户分布、类别和净值走势会自动更新。",
                        actionTitle: "新增持仓"
                    ) {
                        ui.modal = .asset(nil)
                    }
                } else {
                    VStack(spacing: 13) {
                        ForEach(Array(store.accountSummaries.enumerated()), id: \.element.id) { index, account in
                            accountRow(account, color: ChartPalette.color(index))
                        }
                    }
                    Divider().opacity(0.55)
                    HStack {
                        Text("合计")
                            .font(.system(size: 11.5, weight: .semibold))
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text(Fmt.money(store.totalValue))
                            .font(.system(size: 12.5, weight: .semibold, design: .rounded))
                            .monospacedDigit()
                        Text(Fmt.percent(store.totalPnL / max(store.totalCost, 1)))
                            .font(.system(size: 11, weight: .semibold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(Palette.pnl(store.totalPnL))
                            .frame(width: 70, alignment: .trailing)
                    }
                }
            }
        }
    }

    private func accountRow(_ account: GroupSummary, color: Color) -> some View {
        let share = store.accountAllocation(account)
        return VStack(spacing: 6) {
            HStack(spacing: 8) {
                Circle()
                    .fill(color)
                    .frame(width: 6, height: 6)
                Text(account.name)
                    .font(.system(size: 12, weight: .medium))
                    .lineLimit(1)
                Spacer(minLength: 8)
                Text(Fmt.money(account.value))
                    .font(.system(size: 11.5, weight: .medium, design: .rounded))
                    .monospacedDigit()
                Text(Fmt.percent(share, signed: false))
                    .font(.system(size: 10.5, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
                    .frame(width: 52, alignment: .trailing)
                Text(Fmt.percent(account.pnlRate))
                    .font(.system(size: 10.5, weight: .medium, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Palette.pnl(account.pnl))
                    .frame(width: 58, alignment: .trailing)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.primary.opacity(0.055))
                    Capsule()
                        .fill(color.opacity(0.78))
                        .frame(width: max(share * geo.size.width, share > 0 ? 3 : 0))
                }
            }
            .frame(height: 4)
        }
    }

    private var categoryCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 14) {
                CardTitle(title: "资产类别", subtitle: "含现金", icon: "chart.pie")
                HStack(spacing: 22) {
                    DonutChart(summaries: store.categorySummaries, total: store.totalValue)
                        .frame(width: 142, height: 142)
                    VStack(alignment: .leading, spacing: 9) {
                        ForEach(Array(store.categorySummaries.enumerated()), id: \.element.id) { index, category in
                            HStack(spacing: 7) {
                                RoundedRectangle(cornerRadius: 2)
                                    .fill(ChartPalette.color(index))
                                    .frame(width: 7, height: 7)
                                Text(category.name)
                                    .font(.system(size: 11))
                                Spacer(minLength: 4)
                                Text(Fmt.percent(store.totalValue == 0 ? 0 : category.value / store.totalValue, signed: false))
                                    .font(.system(size: 10.5, design: .rounded))
                                    .monospacedDigit()
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
                Divider().opacity(0.55)
                HStack(alignment: .firstTextBaseline) {
                    Text("持仓 \(Fmt.money(store.holdingsValue))")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("现金 \(Fmt.money(store.totalCash))")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private var recentReviews: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    CardTitle(title: "最近复盘", subtitle: "先记事实，再记感受", icon: "book.closed")
                    Spacer()
                    if !store.reviewsSorted.isEmpty {
                        Button("查看全部") { ui.section = .reviews }
                            .buttonStyle(.plain)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(Palette.accent)
                    }
                }

                if store.reviewsSorted.isEmpty {
                    VStack(alignment: .leading, spacing: 9) {
                        Text("今天写下第一句就够。")
                            .font(.system(size: 15, weight: .semibold))
                        Text("市场怎么样、你做了什么、下一步只做哪一件事。3–5 行即可。")
                            .font(.system(size: 11.5))
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                        Button("写今日复盘") { ui.openTodayReview(store: store) }
                            .buttonStyle(PrimaryButtonStyle(compact: true))
                            .padding(.top, 3)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 8)
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(store.reviewsSorted.prefix(2))) { review in
                            ReviewPreviewRow(review: review) {
                                ui.modal = .review(review)
                            }
                            if review.id != store.reviewsSorted.prefix(2).last?.id {
                                Divider().opacity(0.55).padding(.vertical, 2)
                            }
                        }
                    }
                }
            }
        }
    }

    private var dcaCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 13) {
                HStack {
                    CardTitle(title: "定投节奏", subtitle: "按当前计划估算", icon: "calendar.badge.clock")
                    Spacer()
                    Button("管理") { ui.section = .plans }
                        .buttonStyle(.plain)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Palette.accent)
                }

                HStack(alignment: .firstTextBaseline, spacing: 5) {
                    Text(Fmt.money(store.monthlyInvesting))
                        .font(.system(size: 25, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(Palette.accent)
                    Text("元 / 月")
                        .font(.system(size: 10.5))
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("\(store.activePlansCount) 个进行中")
                        .font(.system(size: 10.5))
                        .foregroundStyle(.secondary)
                }

                VStack(spacing: 8) {
                    ForEach(Array(store.data.plans.filter { $0.status == PlanStatus.active.rawValue }.prefix(3))) { plan in
                        HStack(spacing: 8) {
                            Circle().fill(Palette.accent.opacity(0.7)).frame(width: 4, height: 4)
                            Text(plan.name)
                                .font(.system(size: 11.5))
                                .lineLimit(1)
                            Spacer()
                            Text(Fmt.money(plan.amount ?? 0))
                                .font(.system(size: 11, weight: .medium, design: .rounded))
                                .monospacedDigit()
                            Text("/ \(plan.frequency)")
                                .font(.system(size: 9.5))
                                .foregroundStyle(.tertiary)
                        }
                    }
                }

                Divider().opacity(0.55)
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("每月备用金")
                            .font(.system(size: 10))
                            .foregroundStyle(.secondary)
                        Text(store.cashPoolPlan?.amount.map { Fmt.money($0) } ?? "—")
                            .font(.system(size: 12.5, weight: .semibold, design: .rounded))
                            .monospacedDigit()
                    }
                    Spacer()
                    Text("实际以扣款为准")
                        .font(.system(size: 9.5))
                        .foregroundStyle(.tertiary)
                }
            }
        }
    }
}

private struct InsightCard: View {
    var icon: String
    var label: String
    var value: String
    var detail: String
    var tint: Color

    var body: some View {
        Card(padding: 16) {
            HStack(alignment: .top, spacing: 11) {
                Image(systemName: icon)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(tint)
                    .frame(width: 28, height: 28)
                    .background(tint.opacity(0.10))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                VStack(alignment: .leading, spacing: 3) {
                    Text(label)
                        .font(.system(size: 10.5, weight: .medium))
                        .foregroundStyle(.secondary)
                    Text(value)
                        .font(.system(size: 17, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Text(detail)
                        .font(.system(size: 10.5))
                        .foregroundStyle(.tertiary)
                        .lineLimit(1)
                }
                Spacer(minLength: 0)
            }
        }
    }
}

struct DonutChart: View {
    var summaries: [GroupSummary]
    var total: Double

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.primary.opacity(0.055), lineWidth: 15)

            if total > 0 {
                ForEach(Array(segments.enumerated()), id: \.offset) { _, segment in
                    Circle()
                        .trim(from: segment.start, to: segment.end)
                        .stroke(
                            ChartPalette.color(segment.index),
                            style: StrokeStyle(lineWidth: 15, lineCap: .butt)
                        )
                        .rotationEffect(.degrees(-90))
                }
            }

            VStack(spacing: 2) {
                Text(Fmt.percent(total == 0 ? 0 : summaries.filter { $0.name != AssetCategory.cash.rawValue }.reduce(0) { $0 + $1.value } / total, signed: false))
                    .font(.system(size: 20, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                Text("持仓占比")
                    .font(.system(size: 8.5))
                    .foregroundStyle(.tertiary)
            }
        }
    }

    private struct Segment {
        var index: Int
        var start: CGFloat
        var end: CGFloat
    }

    private var segments: [Segment] {
        var result: [Segment] = []
        var cursor: Double = 0
        for (index, summary) in summaries.enumerated() {
            guard total > 0 else { break }
            let share = summary.value / total
            let start = cursor
            let end = min(cursor + share, 1)
            if end > start {
                result.append(Segment(index: index, start: start, end: end))
            }
            cursor = end
        }
        return result
    }
}

struct NetWorthSparkline: View {
    var snapshots: [NetWorthSnapshot]

    var body: some View {
        GeometryReader { geo in
            let values = snapshots.map(\.value)
            let width = geo.size.width
            let height = geo.size.height
            let minValue = values.min() ?? 0
            let maxValue = values.max() ?? 0
            let span = max(maxValue - minValue, 1)
            let points: [CGPoint] = values.enumerated().map { index, value in
                let x: CGFloat
                if values.count <= 1 {
                    x = width / 2
                } else {
                    x = 4 + CGFloat(index) / CGFloat(values.count - 1) * (width - 8)
                }
                let ratio = (value - minValue) / span
                let y = height - 6 - CGFloat(ratio) * (height - 12)
                return CGPoint(x: x, y: y)
            }

            ZStack {
                if points.count > 1 {
                    Path { path in
                        path.move(to: CGPoint(x: points[0].x, y: height))
                        for point in points {
                            path.addLine(to: point)
                        }
                        path.addLine(to: CGPoint(x: points[points.count - 1].x, y: height))
                        path.closeSubpath()
                    }
                    .fill(Color(hex: 0xE4D0A6).opacity(0.07))

                    Path { path in
                        path.move(to: points[0])
                        for point in points.dropFirst() {
                            path.addLine(to: point)
                        }
                    }
                    .stroke(
                        Color(hex: 0xE4D0A6).opacity(0.72),
                        style: StrokeStyle(lineWidth: 1.6, lineCap: .round, lineJoin: .round)
                    )
                } else {
                    Path { path in
                        path.move(to: CGPoint(x: 0, y: height / 2))
                        path.addLine(to: CGPoint(x: width, y: height / 2))
                    }
                    .stroke(Color.white.opacity(0.13), style: StrokeStyle(lineWidth: 1, dash: [3, 4]))
                }

                if let last = points.last {
                    Circle()
                        .fill(Color(hex: 0xE4D0A6))
                        .frame(width: 6, height: 6)
                        .position(x: last.x, y: last.y)
                }
            }
        }
    }
}

private struct ReviewPreviewRow: View {
    var review: DailyReview
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(alignment: .top, spacing: 12) {
                VStack(spacing: 1) {
                    Text(dayString)
                        .font(.system(size: 19, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                    Text(monthString)
                        .font(.system(size: 8.5, weight: .medium))
                        .foregroundStyle(.tertiary)
                }
                .frame(width: 40, height: 42)
                .background(Palette.accent.opacity(0.07))
                .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))

                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 7) {
                        Pill(text: review.moodLabel, tint: moodTint, filled: false)
                        Text(review.trigger.isEmpty ? "当日记录" : review.trigger)
                            .font(.system(size: 12, weight: .semibold))
                            .lineLimit(1)
                    }
                    Text(review.nextPlan.isEmpty ? (review.market.isEmpty ? "还没有写下一步。" : review.market) : "下一步：\(review.nextPlan)")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(.quaternary)
                    .padding(.top, 5)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .padding(.vertical, 5)
    }

    private var dayString: String {
        guard let date = DateFmt.iso.date(from: review.date) else { return "—" }
        return String(Calendar.current.component(.day, from: date))
    }

    private var monthString: String {
        guard let date = DateFmt.iso.date(from: review.date) else { return "" }
        return "\(Calendar.current.component(.month, from: date))月"
    }

    private var moodTint: Color {
        switch review.mood {
        case 1, 2: return Palette.gain
        case 4, 5: return Palette.loss
        default: return Palette.gold
        }
    }
}
