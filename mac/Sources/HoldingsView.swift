import SwiftUI

struct HoldingsView: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var ui: AppUI

    @State private var search = ""
    @State private var accountFilter = "全部账户"
    @State private var categoryFilter = "全部类别"
    @State private var selectedID: UUID?
    @State private var pendingDelete: Asset?

    private var filteredAssets: [Asset] {
        store.data.assets.filter { asset in
            let matchesSearch = search.isEmpty
                || asset.name.localizedCaseInsensitiveContains(search)
                || asset.code.localizedCaseInsensitiveContains(search)
                || asset.account.localizedCaseInsensitiveContains(search)
            let matchesAccount = accountFilter == "全部账户" || asset.account == accountFilter
            let matchesCategory = categoryFilter == "全部类别" || asset.category == categoryFilter
            return matchesSearch && matchesAccount && matchesCategory
        }
    }

    private var selectedAsset: Asset? {
        guard let selectedID else { return nil }
        return filteredAssets.first { $0.id == selectedID }
    }

    private var filteredCost: Double { filteredAssets.reduce(0) { $0 + $1.cost } }
    private var filteredValue: Double { filteredAssets.reduce(0) { $0 + $1.value } }
    private var filteredPnL: Double { filteredValue - filteredCost }

    var body: some View {
        VStack(spacing: 16) {
            PageHeader(
                T("当前持仓"),
                subtitle: T("%d 条资产　·　只维护成本与市值，盈亏自动计算　·　金额单位：元", store.data.assets.count)
            ) {
                Button(T("新增持仓")) { ui.modal = .asset(nil) }
                    .buttonStyle(PrimaryButtonStyle(compact: true))
            }

            VStack(spacing: 0) {
                filterBar
                Divider().opacity(0.55)
                assetTable
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
        .padding(.horizontal, 28)
        .padding(.vertical, 24)
        .background(PageBackground())
        .onChange(of: filteredAssets.map(\.id)) {
            if let selectedID, !filteredAssets.contains(where: { $0.id == selectedID }) {
                self.selectedID = nil
            }
        }
        .alert(
            T("删除这条持仓？"),
            isPresented: Binding(
                get: { pendingDelete != nil },
                set: { if !$0 { pendingDelete = nil } }
            )
        ) {
            Button(T("取消"), role: .cancel) { pendingDelete = nil }
            Button(T("删除"), role: .destructive) {
                if let pendingDelete {
                    store.deleteAsset(id: pendingDelete.id)
                    if selectedID == pendingDelete.id { selectedID = nil }
                    ui.showToast(title: T("已删除持仓"), message: pendingDelete.name)
                }
                pendingDelete = nil
            }
        } message: {
            Text(T("删除后今天的净值快照会同步更新。此操作不会影响操作记录。"))
        }
    }

    private var filterBar: some View {
        HStack(spacing: 10) {
            SearchField(text: $search)
                .frame(width: 230)

            FilterMenu(
                options: ["全部账户"] + store.accounts,
                selection: $accountFilter
            )
            .frame(width: 138)

            FilterMenu(
                options: ["全部类别"] + AssetCategory.allCases.map(\.rawValue),
                selection: $categoryFilter
            )
            .frame(width: 118)

            Spacer()

            Text(T("显示 %d 条", filteredAssets.count))
                .font(.system(size: 10.5))
                .foregroundStyle(.tertiary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }

    private var assetTable: some View {
        ZStack {
            Table(filteredAssets, selection: $selectedID) {
                TableColumn(T("名称 / 代码")) { asset in
                VStack(alignment: .leading, spacing: 1) {
                    Text(asset.name)
                        .font(.system(size: 12.5, weight: .medium))
                        .lineLimit(1)
                    Text(asset.code == "—" ? T("现金 / 无代码") : asset.code)
                        .font(.system(size: 9.5, design: .monospaced))
                        .foregroundStyle(.tertiary)
                }
            }
            .width(min: 150, ideal: 210, max: 300)

            TableColumn(T("账户")) { asset in
                Text(asset.account)
                    .font(.system(size: 11.5))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            .width(min: 85, ideal: 112, max: 150)

            TableColumn(T("类别")) { asset in
                Text(T(asset.category))
                    .font(.system(size: 10.5))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Palette.fieldFill)
                    .clipShape(Capsule())
                    .overlay(Capsule().strokeBorder(Palette.border, lineWidth: 0.8))
                    .lineLimit(1)
            }
            .width(min: 66, ideal: 78, max: 90)

            TableColumn(T("投入成本")) { asset in
                tableNumber(Fmt.money(asset.cost))
            }
            .width(min: 78, ideal: 92, max: 110)

            TableColumn(T("当前市值")) { asset in
                tableNumber(Fmt.money(asset.value), weight: .medium)
            }
            .width(min: 78, ideal: 92, max: 110)

            TableColumn(T("浮动盈亏")) { asset in
                tableNumber(Fmt.money(asset.pnl, signed: true), color: Palette.pnl(asset.pnl), weight: .medium)
            }
            .width(min: 82, ideal: 92, max: 110)

            TableColumn(T("盈亏率")) { asset in
                tableNumber(Fmt.percent(asset.pnlRate), color: Palette.pnl(asset.pnl), weight: .medium)
            }
            .width(min: 62, ideal: 72, max: 86)

            TableColumn(T("仓位")) { asset in
                tableNumber(Fmt.percent(store.allocation(of: asset), signed: false), color: .secondary)
            }
            .width(min: 52, ideal: 60, max: 72)
        }
        .tableStyle(.inset(alternatesRowBackgrounds: false))
        .scrollContentBackground(.hidden)
        .contextMenu(forSelectionType: UUID.self) { selection in
            if let id = selection.first, let asset = store.data.assets.first(where: { $0.id == id }) {
                Button(T("编辑持仓…")) { ui.modal = .asset(asset) }
                Divider()
                Button(T("删除持仓"), role: .destructive) { pendingDelete = asset }
            }
        } primaryAction: { selection in
            if let id = selection.first, let asset = store.data.assets.first(where: { $0.id == id }) {
                selectedID = id
                ui.modal = .asset(asset)
            }
        }
        .frame(maxHeight: .infinity)

            if filteredAssets.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: hasActiveFilters ? "line.3.horizontal.decrease.circle" : "chart.pie")
                        .font(.system(size: 22, weight: .light))
                        .foregroundStyle(Palette.gold.opacity(0.8))
                    Text(hasActiveFilters ? T("没有匹配的持仓") : T("还没有持仓记录"))
                        .font(.system(size: 12.5, weight: .medium))
                        .foregroundStyle(.secondary)
                    if hasActiveFilters {
                        Button(T("清除筛选")) {
                            search = ""
                            accountFilter = "全部账户"
                            categoryFilter = "全部类别"
                        }
                        .buttonStyle(.plain)
                        .font(.system(size: 11.5, weight: .semibold))
                        .foregroundStyle(Palette.accent)
                    } else {
                        Button(T("新增持仓")) { ui.modal = .asset(nil) }
                            .buttonStyle(PrimaryButtonStyle(compact: true))
                    }
                }
            }
        }
        .frame(minHeight: 320, maxHeight: .infinity)
    }

    private var hasActiveFilters: Bool {
        !search.isEmpty || accountFilter != "全部账户" || categoryFilter != "全部类别"
    }

    private func tableNumber(_ text: String, color: Color = .primary, weight: Font.Weight = .regular) -> some View {
        HStack {
            Spacer(minLength: 0)
            Text(text)
                .font(.system(size: 11.5, weight: weight, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(color)
                .lineLimit(1)
        }
    }

    private var footer: some View {
        HStack(spacing: 16) {
            if let asset = selectedAsset {
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 7) {
                        Text(asset.name)
                            .font(.system(size: 12, weight: .semibold))
                        Pill(text: asset.account, tint: Palette.accent)
                    }
                    Text(asset.note.isEmpty ? T("还没有写记录。") : asset.note)
                        .font(.system(size: 10.5))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                Spacer()
                Text(asset.nextStep.isEmpty ? T("未设置下一步") : T("下一步：%@", asset.nextStep))
                    .font(.system(size: 10.5))
                    .foregroundStyle(.tertiary)
                    .lineLimit(1)
                    .frame(maxWidth: 230, alignment: .trailing)
                Button(T("编辑")) { ui.modal = .asset(asset) }
                    .buttonStyle(SecondaryButtonStyle(compact: true))
            } else {
                Text(T("共 %d 条", filteredAssets.count))
                    .font(.system(size: 11.5, weight: .medium))
                    .foregroundStyle(.secondary)
                Spacer()
                footerMetric(T("成本"), Fmt.money(filteredCost))
                footerMetric(T("市值"), Fmt.money(filteredValue))
                footerMetric(T("浮盈亏"), Fmt.money(filteredPnL, signed: true), color: Palette.pnl(filteredPnL))
                Text(T("双击一行可编辑"))
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

struct AssetEditorView: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var ui: AppUI
    @Environment(\.dismiss) private var dismiss

    let asset: Asset?

    @State private var account = ""
    @State private var category = AssetCategory.offExchange.rawValue
    @State private var code = ""
    @State private var name = ""
    @State private var costText = ""
    @State private var valueText = ""
    @State private var unitsText = ""
    @State private var costPriceText = ""
    @State private var priceText = ""
    @State private var note = ""
    @State private var nextStep = ""
    @State private var dataStatus = AssetStatus.manual.rawValue
    @State private var errorText: String?
    @State private var showDeleteConfirm = false

    init(asset: Asset?) {
        self.asset = asset
        _account = State(initialValue: asset?.account ?? "")
        _category = State(initialValue: asset?.category ?? AssetCategory.offExchange.rawValue)
        _code = State(initialValue: asset?.code ?? "")
        _name = State(initialValue: asset?.name ?? "")
        _costText = State(initialValue: asset.map { Fmt.money($0.cost) } ?? "")
        _valueText = State(initialValue: asset.map { Fmt.money($0.value) } ?? "")
        _unitsText = State(initialValue: asset.flatMap(\.units).map { Fmt.optionalNumber($0, digits: 4) } ?? "")
        _costPriceText = State(initialValue: asset.flatMap(\.costPrice).map { Fmt.optionalNumber($0, digits: 4) } ?? "")
        _priceText = State(initialValue: asset.flatMap(\.price).map { Fmt.optionalNumber($0, digits: 4) } ?? "")
        _note = State(initialValue: asset?.note ?? "")
        _nextStep = State(initialValue: asset?.nextStep ?? "")
        _dataStatus = State(initialValue: asset?.dataStatus ?? AssetStatus.manual.rawValue)
    }

    private var parsedCost: Double? { Fmt.parseNumber(costText) }
    private var parsedValue: Double? { Fmt.parseNumber(valueText) }

    var body: some View {
        SheetChrome(
            title: asset == nil ? T("新增持仓") : T("编辑持仓"),
            subtitle: T("账户 + 类别 + 金额，是这套记录的最小单位。"),
            canSave: true,
            onCancel: { dismiss() },
            onSave: save,
            onDelete: asset == nil ? nil : { showDeleteConfirm = true }
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

                FormSection(title: T("标的信息")) {
                    FormRow(label: T("账户")) {
                        HStack(spacing: 7) {
                            BareTextField(placeholder: T("例如：理财通-主账户"), text: $account)
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
                    FormRow(label: T("类别")) {
                        StyledPicker(
                            options: AssetCategory.allCases.map { (title: $0.displayName, value: $0.rawValue) },
                            selection: $category
                        )
                    }
                    FormRow(label: T("代码")) {
                        BareTextField(placeholder: T("基金 / 股票代码，现金可填 —"), text: $code, monospaced: true)
                    }
                    FormRow(label: T("名称")) {
                        BareTextField(placeholder: T("名称或标的"), text: $name)
                    }
                }

                FormSection(title: T("金额与市值")) {
                    HStack(alignment: .top, spacing: 16) {
                        FormColumn(label: T("投入成本（元）")) {
                            BareTextField(placeholder: "0.00", text: $costText, monospaced: true)
                        }
                        FormColumn(label: T("当前市值（元）")) {
                            BareTextField(placeholder: "0.00", text: $valueText, monospaced: true)
                        }
                    }
                    if let cost = parsedCost, let value = parsedValue {
                        HStack(spacing: 8) {
                            Text(T("浮动盈亏"))
                                .font(.system(size: 11))
                                .foregroundStyle(.secondary)
                            Text(Fmt.money(value - cost, signed: true))
                                .font(.system(size: 12, weight: .semibold, design: .rounded))
                                .monospacedDigit()
                                .foregroundStyle(Palette.pnl(value - cost))
                            Text(Fmt.percent(cost == 0 ? 0 : (value - cost) / cost))
                                .font(.system(size: 11, weight: .medium, design: .rounded))
                                .monospacedDigit()
                                .foregroundStyle(Palette.pnl(value - cost))
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 7)
                        .background(Color.primary.opacity(0.03))
                        .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
                    }
                }

                FormSection(title: T("持仓明细（可选）")) {
                    HStack(alignment: .top, spacing: 16) {
                        FormColumn(label: T("数量 / 份额")) {
                            BareTextField(placeholder: "—", text: $unitsText, monospaced: true)
                        }
                        FormColumn(label: T("成本价 / 净值")) {
                            BareTextField(placeholder: "—", text: $costPriceText, monospaced: true)
                        }
                        FormColumn(label: T("现价 / 净值")) {
                            BareTextField(placeholder: "—", text: $priceText, monospaced: true)
                        }
                    }
                }

                FormSection(title: T("我的记录")) {
                    FormColumn(label: T("为什么买 / 现状")) {
                        BareTextEditor(placeholder: T("例如：前期赚，7月补仓，想拿一年以上。"), text: $note)
                    }
                    FormColumn(label: T("下一步 / 退出条件")) {
                        BareTextEditor(placeholder: T("例如：持有满一年再评估；跌破某个条件就退出。"), text: $nextStep)
                    }
                    FormRow(label: T("数据状态")) {
                        StyledPicker(
                            options: AssetStatus.allCases.map { (title: $0.displayName, value: $0.rawValue) },
                            selection: $dataStatus
                        )
                    }
                }
            }
        }
        .frame(width: 720, height: SheetFit.height(720))
        .onAppear {
            if account.isEmpty, let first = store.accounts.first {
                account = first
            }
        }
        .alert(T("删除这条持仓？"), isPresented: $showDeleteConfirm) {
            Button(T("取消"), role: .cancel) {}
            Button(T("删除"), role: .destructive) {
                if let asset {
                    store.deleteAsset(id: asset.id)
                    ui.showToast(title: T("已删除持仓"), message: asset.name)
                }
                dismiss()
            }
        } message: {
            Text(T("删除后今天的净值快照会同步更新。此操作不会影响操作记录。"))
        }
    }

    private func save() {
        errorText = nil
        let trimmedAccount = account.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedAccount.isEmpty else {
            errorText = T("请填写账户。")
            return
        }
        guard !trimmedName.isEmpty else {
            errorText = T("请填写名称。")
            return
        }
        guard let cost = parsedCost, let value = parsedValue else {
            errorText = T("投入成本和当前市值需要填写数字。")
            return
        }
        guard cost >= 0, value >= 0 else {
            errorText = T("金额不能为负数。")
            return
        }

        let optionalChecks: [(String, String, Double?)] = [
            ("数量 / 份额", unitsText, Fmt.parseNumber(unitsText)),
            ("成本价 / 净值", costPriceText, Fmt.parseNumber(costPriceText)),
            ("现价 / 净值", priceText, Fmt.parseNumber(priceText))
        ]
        for (label, text, parsed) in optionalChecks {
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { continue }
            guard let parsed else {
                errorText = T("%@需要填写数字，或留空。", T(label))
                return
            }
            guard parsed >= 0 else {
                errorText = T("%@不能为负数。", T(label))
                return
            }
        }

        let created = Asset(
            id: asset?.id ?? UUID(),
            account: trimmedAccount,
            category: category,
            code: code.trimmingCharacters(in: .whitespaces).isEmpty ? "—" : code.trimmingCharacters(in: .whitespaces),
            name: trimmedName,
            cost: cost,
            value: value,
            units: Fmt.parseNumber(unitsText),
            costPrice: Fmt.parseNumber(costPriceText),
            price: Fmt.parseNumber(priceText),
            note: note,
            nextStep: nextStep,
            dataStatus: dataStatus
        )
        store.upsertAsset(created)
        ui.showToast(title: asset == nil ? T("持仓已添加") : T("持仓已更新"), message: trimmedName)
        dismiss()
    }
}
