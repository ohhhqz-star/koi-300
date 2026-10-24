import SwiftUI

struct TradesView: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var ui: AppUI

    @State private var search = ""
    @State private var actionFilter = "全部操作"
    @State private var accountFilter = "全部账户"
    @State private var selectedID: UUID?
    @State private var pendingDelete: Trade?

    private var filteredTrades: [Trade] {
        store.tradesSorted.filter { trade in
            let matchesSearch = search.isEmpty
                || trade.name.localizedCaseInsensitiveContains(search)
                || trade.code.localizedCaseInsensitiveContains(search)
                || trade.reason.localizedCaseInsensitiveContains(search)
            let matchesAction = actionFilter == "全部操作" || trade.action == actionFilter
            let matchesAccount = accountFilter == "全部账户" || trade.account == accountFilter
            return matchesSearch && matchesAction && matchesAccount
        }
    }

    private var selectedTrade: Trade? {
        guard let selectedID else { return nil }
        return filteredTrades.first { $0.id == selectedID }
    }

    private var buyTotal: Double {
        filteredTrades.filter { $0.action == TradeAction.buy.rawValue || $0.action == TradeAction.dca.rawValue }
            .reduce(0) { $0 + ($1.amount ?? 0) }
    }

    private var sellTotal: Double {
        filteredTrades.filter { $0.action == TradeAction.sell.rawValue }.reduce(0) { $0 + ($1.amount ?? 0) }
    }

    private var realizedTotal: Double {
        filteredTrades.reduce(0) { $0 + ($1.realizedPnL ?? 0) }
    }

    var body: some View {
        VStack(spacing: 16) {
            PageHeader(
                "操作记录",
                subtitle: "\(store.data.trades.count) 笔　·　操作只用于复盘，不会自动回写持仓成本"
            ) {
                Button("记一笔操作") { ui.modal = .trade(nil) }
                    .buttonStyle(PrimaryButtonStyle(compact: true))
            }

            if store.data.trades.isEmpty {
                Card {
                    EmptyState(
                        icon: "arrow.left.arrow.right",
                        title: "还没有操作记录",
                        message: "每一笔买入、卖出、定投或转换，都值得留下当时的理由和情绪。以后回看，原因往往比结果更重要。",
                        actionTitle: "记下第一笔",
                        action: { ui.modal = .trade(nil) }
                    )
                    .frame(maxWidth: .infinity, minHeight: 300)
                }
                Spacer(minLength: 0)
            } else {
                VStack(spacing: 0) {
                    filterBar
                    Divider().opacity(0.55)
                    tradesTable
                    Divider().opacity(0.55)
                    footer
                }
                .background(Palette.card)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(Palette.border, lineWidth: 1)
                )
                .frame(maxHeight: .infinity)
            }
        }
        .padding(.horizontal, 28)
        .padding(.vertical, 24)
        .background(PageBackground())
        .onChange(of: filteredTrades.map(\.id)) {
            if let selectedID, !filteredTrades.contains(where: { $0.id == selectedID }) {
                self.selectedID = nil
            }
        }
        .alert(
            "删除这条操作记录？",
            isPresented: Binding(
                get: { pendingDelete != nil },
                set: { if !$0 { pendingDelete = nil } }
            )
        ) {
            Button("取消", role: .cancel) { pendingDelete = nil }
            Button("删除", role: .destructive) {
                if let pendingDelete {
                    store.deleteTrade(id: pendingDelete.id)
                    if selectedID == pendingDelete.id { selectedID = nil }
                    ui.showToast(title: "已删除操作记录", message: pendingDelete.name)
                }
                pendingDelete = nil
            }
        } message: {
            Text("删除只影响这条记录，不会改变当前持仓。")
        }
    }

    private var filterBar: some View {
        HStack(spacing: 10) {
            SearchField(placeholder: "搜索名称、代码或理由", text: $search)
                .frame(width: 250)

            FilterMenu(
                options: ["全部操作"] + TradeAction.allCases.map(\.rawValue),
                selection: $actionFilter
            )
            .frame(width: 112)

            FilterMenu(
                options: ["全部账户"] + store.accounts,
                selection: $accountFilter
            )
            .frame(width: 138)

            Spacer()

            Text("显示 \(filteredTrades.count) 笔")
                .font(.system(size: 10.5))
                .foregroundStyle(.tertiary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }

    private var tradesTable: some View {
        ZStack {
            Table(filteredTrades, selection: $selectedID) {
                TableColumn("日期") { trade in
                    Text(trade.date)
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundStyle(.secondary)
                }
                .width(min: 80, ideal: 92, max: 104)

                TableColumn("名称 / 代码") { trade in
                    VStack(alignment: .leading, spacing: 1) {
                        Text(trade.name.isEmpty ? "未填写名称" : trade.name)
                            .font(.system(size: 12.5, weight: .medium))
                            .lineLimit(1)
                        Text(trade.code.isEmpty ? "—" : trade.code)
                            .font(.system(size: 9.5, design: .monospaced))
                            .foregroundStyle(.tertiary)
                    }
                }
                .width(min: 140, ideal: 190, max: 260)

                TableColumn("操作") { trade in
                    Pill(text: trade.action, tint: actionColor(trade.action))
                }
                .width(min: 56, ideal: 64, max: 76)

                TableColumn("金额") { trade in
                    HStack {
                        Spacer()
                        Text(trade.amount.map { Fmt.money($0) } ?? "—")
                            .font(.system(size: 11.5, weight: .medium, design: .rounded))
                            .monospacedDigit()
                    }
                }
                .width(min: 84, ideal: 96, max: 120)

                TableColumn("操作理由") { trade in
                    Text(trade.reason.isEmpty ? "—" : trade.reason)
                        .font(.system(size: 11.5))
                        .foregroundStyle(trade.reason.isEmpty ? .tertiary : .secondary)
                        .lineLimit(2)
                }
                .width(min: 160, ideal: 260, max: 420)

                TableColumn("当时情绪") { trade in
                    Text(trade.mood.isEmpty ? "—" : trade.mood)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                .width(min: 70, ideal: 90, max: 120)

                TableColumn("按计划？") { trade in
                    Text(trade.followedPlan.isEmpty ? "—" : trade.followedPlan)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
                .width(min: 62, ideal: 72, max: 86)
            }
            .tableStyle(.inset(alternatesRowBackgrounds: false))
            .scrollContentBackground(.hidden)
            .contextMenu(forSelectionType: UUID.self) { selection in
                if let id = selection.first, let trade = store.data.trades.first(where: { $0.id == id }) {
                    Button("编辑操作…") { ui.modal = .trade(trade) }
                    Divider()
                    Button("删除操作", role: .destructive) { pendingDelete = trade }
                }
            } primaryAction: { selection in
                if let id = selection.first, let trade = store.data.trades.first(where: { $0.id == id }) {
                    selectedID = id
                    ui.modal = .trade(trade)
                }
            }

            if filteredTrades.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "line.3.horizontal.decrease.circle")
                        .font(.system(size: 22, weight: .light))
                        .foregroundStyle(Palette.gold.opacity(0.8))
                    Text("没有匹配的操作")
                        .font(.system(size: 12.5, weight: .medium))
                        .foregroundStyle(.secondary)
                    Button("清除筛选") {
                        search = ""
                        actionFilter = "全部操作"
                        accountFilter = "全部账户"
                    }
                    .buttonStyle(.plain)
                    .font(.system(size: 11.5, weight: .semibold))
                    .foregroundStyle(Palette.accent)
                }
            }
        }
        .frame(minHeight: 320, maxHeight: .infinity)
    }

    private func actionColor(_ action: String) -> Color {
        switch action {
        case TradeAction.buy.rawValue, TradeAction.dca.rawValue: return Palette.gain
        case TradeAction.sell.rawValue: return Palette.loss
        case TradeAction.dividend.rawValue: return Palette.gold
        default: return Palette.accent
        }
    }

    private var footer: some View {
        HStack(spacing: 16) {
            if let trade = selectedTrade {
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 7) {
                        Text(trade.name.isEmpty ? "未命名操作" : trade.name)
                            .font(.system(size: 12, weight: .semibold))
                        Pill(text: trade.action, tint: actionColor(trade.action))
                    }
                    Text(trade.reason.isEmpty ? "还没有写操作理由。" : trade.reason)
                        .font(.system(size: 10.5))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                Spacer()
                if !trade.market.isEmpty {
                    Text("市场：\(trade.market)")
                        .font(.system(size: 10.5))
                        .foregroundStyle(.tertiary)
                        .lineLimit(1)
                        .frame(maxWidth: 220, alignment: .trailing)
                }
                Button("编辑") { ui.modal = .trade(trade) }
                    .buttonStyle(SecondaryButtonStyle(compact: true))
            } else {
                Text("共 \(filteredTrades.count) 笔")
                    .font(.system(size: 11.5, weight: .medium))
                    .foregroundStyle(.secondary)
                Spacer()
                footerMetric("买入 / 定投", Fmt.money(buyTotal))
                footerMetric("卖出", Fmt.money(sellTotal))
                footerMetric("已实现盈亏", Fmt.money(realizedTotal, signed: true), color: Palette.pnl(realizedTotal))
                Text("双击一行可编辑")
                    .font(.system(size: 10))
                    .foregroundStyle(.tertiary)
                    .padding(.leading, 6)
            }
        }
        .padding(.horizontal, 16)
        .frame(minHeight: 54)
    }

    private func footerMetric(_ label: String, _ value: String, color: Color = .primary) -> some View {
        HStack(spacing: 5) {
            Text(label)
                .font(.system(size: 10))
                .foregroundStyle(.tertiary)
            Text(value)
                .font(.system(size: 11.5, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(color)
        }
    }
}

struct TradeEditorView: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var ui: AppUI
    @Environment(\.dismiss) private var dismiss

    let trade: Trade?

    @State private var date: Date
    @State private var account = ""
    @State private var category = AssetCategory.offExchange.rawValue
    @State private var code = ""
    @State private var name = ""
    @State private var tradeAction = TradeAction.buy.rawValue
    @State private var amountText = ""
    @State private var sharesText = ""
    @State private var priceText = ""
    @State private var feeText = ""
    @State private var realizedText = ""
    @State private var reason = ""
    @State private var mood = ""
    @State private var market = ""
    @State private var review = ""
    @State private var followedPlan = "待复盘"
    @State private var lesson = ""
    @State private var linkID = ""
    @State private var errorText: String?
    @State private var showDeleteConfirm = false

    init(trade: Trade?) {
        self.trade = trade
        _date = State(initialValue: trade.map { DateFmt.parse($0.date) } ?? Date())
        _account = State(initialValue: trade?.account ?? "")
        _category = State(initialValue: trade?.category ?? AssetCategory.offExchange.rawValue)
        _code = State(initialValue: trade?.code ?? "")
        _name = State(initialValue: trade?.name ?? "")
        _tradeAction = State(initialValue: trade?.action ?? TradeAction.buy.rawValue)
        _amountText = State(initialValue: trade?.amount.map { Fmt.money($0) } ?? "")
        _sharesText = State(initialValue: trade?.shares.map { Fmt.optionalNumber($0, digits: 4) } ?? "")
        _priceText = State(initialValue: trade?.price.map { Fmt.optionalNumber($0, digits: 4) } ?? "")
        _feeText = State(initialValue: trade?.fee.map { Fmt.money($0) } ?? "")
        _realizedText = State(initialValue: trade?.realizedPnL.map { Fmt.money($0) } ?? "")
        _reason = State(initialValue: trade?.reason ?? "")
        _mood = State(initialValue: trade?.mood ?? "")
        _market = State(initialValue: trade?.market ?? "")
        _review = State(initialValue: trade?.review ?? "")
        _followedPlan = State(initialValue: trade?.followedPlan ?? "待复盘")
        _lesson = State(initialValue: trade?.lesson ?? "")
    }

    var body: some View {
        SheetChrome(
            title: trade == nil ? "记一笔操作" : "编辑操作",
            subtitle: "先记事实，再记为什么；操作记录不会自动改持仓。",
            onCancel: { dismiss() },
            onSave: save,
            onDelete: trade == nil ? nil : { showDeleteConfirm = true }
        ) {
            VStack(alignment: .leading, spacing: 16) {
                if let errorText {
                    Text(errorText)
                        .font(.system(size: 12))
                        .foregroundStyle(Palette.danger)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 9)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Palette.danger.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .strokeBorder(Palette.danger.opacity(0.18), lineWidth: 1)
                        )
                }

                FormSection(title: "基本信息") {
                    FormRow(label: "日期") {
                        HStack {
                            DatePicker("", selection: $date, in: ...Date(), displayedComponents: .date)
                                .labelsHidden()
                                .datePickerStyle(.compact)
                            Spacer()
                            Text(DateFmt.chinese.string(from: date))
                                .font(.system(size: 11))
                                .foregroundStyle(.tertiary)
                        }
                    }
                    FormRow(label: "从未持仓带入") {
                        StyledPicker(
                            options: [(title: "手动填写", value: "")] + store.data.assets.map {
                                (title: "\($0.name) · \($0.account)", value: $0.id.uuidString)
                            },
                            selection: $linkID
                        )
                        .onChange(of: linkID) {
                            guard let id = UUID(uuidString: linkID),
                                  let asset = store.data.assets.first(where: { $0.id == id }) else { return }
                            account = asset.account
                            category = asset.category
                            code = asset.code
                            name = asset.name
                        }
                    }
                    FormRow(label: "账户") {
                        HStack(spacing: 7) {
                            BareTextField(placeholder: "账户", text: $account)
                            Menu {
                                ForEach(store.accounts, id: \.self) { item in
                                    Button(item) { account = item }
                                }
                            } label: {
                                Image(systemName: "chevron.down")
                                    .font(.system(size: 9, weight: .semibold))
                                    .foregroundStyle(.secondary)
                                    .frame(width: 30, height: 32)
                                    .background(Palette.fieldFill)
                                    .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
                            }
                            .menuStyle(.borderlessButton)
                            .menuIndicator(.hidden)
                            .fixedSize()
                        }
                    }
                    HStack(alignment: .top, spacing: 16) {
                        FormColumn(label: "类别") {
                            StyledPicker(
                                options: AssetCategory.allCases.map { (title: $0.rawValue, value: $0.rawValue) },
                                selection: $category
                            )
                        }
                        FormColumn(label: "操作") {
                            StyledPicker(
                                options: TradeAction.allCases.map { (title: $0.rawValue, value: $0.rawValue) },
                                selection: $tradeAction
                            )
                        }
                    }
                    HStack(alignment: .top, spacing: 16) {
                        FormColumn(label: "代码") {
                            BareTextField(placeholder: "代码", text: $code, monospaced: true)
                        }
                        FormColumn(label: "名称") {
                            BareTextField(placeholder: "名称 / 标的", text: $name)
                        }
                    }
                }

                FormSection(title: "金额与费用") {
                    HStack(alignment: .top, spacing: 16) {
                        FormColumn(label: "金额（元）") {
                            BareTextField(placeholder: "0.00", text: $amountText, monospaced: true)
                        }
                        FormColumn(label: "份额") {
                            BareTextField(placeholder: "—", text: $sharesText, monospaced: true)
                        }
                    }
                    HStack(alignment: .top, spacing: 16) {
                        FormColumn(label: "成交价 / 净值") {
                            BareTextField(placeholder: "—", text: $priceText, monospaced: true)
                        }
                        FormColumn(label: "手续费") {
                            BareTextField(placeholder: "0.00", text: $feeText, monospaced: true)
                        }
                        FormColumn(label: "已实现盈亏") {
                            BareTextField(placeholder: "仅卖出 / 分红", text: $realizedText, monospaced: true)
                        }
                    }
                }

                FormSection(title: "当时的判断") {
                    FormColumn(label: "操作理由") {
                        BareTextEditor(placeholder: "为什么这个时候买 / 卖 / 停？", text: $reason, minHeight: 62)
                    }
                    HStack(alignment: .top, spacing: 16) {
                        FormColumn(label: "当时情绪") {
                            BareTextField(placeholder: "例如：着急、怕错过、平静", text: $mood)
                        }
                        FormColumn(label: "按计划？") {
                            StyledPicker(
                                options: ["是", "部分", "否", "待复盘"].map { (title: $0, value: $0) },
                                selection: $followedPlan
                            )
                        }
                    }
                    FormColumn(label: "市场 / 消息面") {
                        BareTextEditor(placeholder: "当时发生了什么？", text: $market, minHeight: 54)
                    }
                }

                FormSection(title: "事后复盘") {
                    FormColumn(label: "结果复盘") {
                        BareTextEditor(placeholder: "这笔操作后来怎么样了？可以过几天补。", text: $review, minHeight: 56)
                    }
                    FormColumn(label: "教训 / 下次") {
                        BareTextEditor(placeholder: "如果重来一次，你会怎么做？", text: $lesson, minHeight: 56)
                    }
                }
            }
        }
        .frame(width: 740, height: SheetFit.height(760))
        .onAppear {
            if account.isEmpty, let first = store.accounts.first {
                account = first
            }
        }
        .alert("删除这条操作记录？", isPresented: $showDeleteConfirm) {
            Button("取消", role: .cancel) {}
            Button("删除", role: .destructive) {
                if let trade {
                    store.deleteTrade(id: trade.id)
                    ui.showToast(title: "已删除操作记录", message: trade.name)
                }
                dismiss()
            }
        } message: {
            Text("删除只影响这条记录，不会改变当前持仓。")
        }
    }

    private func save() {
        errorText = nil
        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorText = "请填写名称，或从上面的持仓中选择一个标的。"
            return
        }

        let amount = Fmt.parseNumber(amountText)
        let shares = Fmt.parseNumber(sharesText)
        let price = Fmt.parseNumber(priceText)
        let fee = Fmt.parseNumber(feeText)
        let realized = Fmt.parseNumber(realizedText)
        let checks: [(String, String, Double?)] = [
            ("金额", amountText, amount),
            ("份额", sharesText, shares),
            ("成交价", priceText, price),
            ("手续费", feeText, fee),
            ("已实现盈亏", realizedText, realized)
        ]
        for (label, text, parsed) in checks {
            if !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, parsed == nil {
                errorText = "\(label)需要填写数字，或留空。"
                return
            }
        }
        let nonNegative: [(String, Double?)] = [
            ("金额", amount), ("份额", shares), ("成交价", price), ("手续费", fee)
        ]
        for (label, value) in nonNegative {
            if let value, value < 0 {
                errorText = "\(label)不能为负数。"
                return
            }
        }

        let created = Trade(
            id: trade?.id ?? UUID(),
            date: DateFmt.iso.string(from: date),
            account: account.trimmingCharacters(in: .whitespacesAndNewlines),
            category: category,
            code: code.trimmingCharacters(in: .whitespacesAndNewlines),
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            action: tradeAction,
            amount: amount,
            shares: shares,
            price: price,
            fee: fee,
            realizedPnL: realized,
            reason: reason,
            mood: mood,
            market: market,
            review: review,
            followedPlan: followedPlan,
            lesson: lesson,
            createdAt: trade?.createdAt ?? Date()
        )
        store.upsertTrade(created)
        ui.showToast(title: trade == nil ? "操作已记录" : "操作已更新", message: created.name)
        dismiss()
    }
}
