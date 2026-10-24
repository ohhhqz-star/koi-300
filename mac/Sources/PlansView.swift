import SwiftUI

struct PlansView: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var ui: AppUI

    @State private var pendingDelete: DcaPlan?

    private var sortedPlans: [DcaPlan] {
        store.data.plans.sorted { lhs, rhs in
            rank(lhs) == rank(rhs) ? lhs.name < rhs.name : rank(lhs) < rank(rhs)
        }
    }

    private func rank(_ plan: DcaPlan) -> Int {
        switch plan.status {
        case PlanStatus.active.rawValue: return 0
        case PlanStatus.paused.rawValue: return 1
        case PlanStatus.cashPool.rawValue: return 2
        default: return 3
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                PageHeader(
                    "定投计划",
                    subtitle: "\(store.data.plans.count) 个计划　·　\(store.activePlansCount) 个进行中　·　月均按当前金额与频率估算"
                ) {
                    Button("新增计划") { ui.modal = .plan(nil) }
                        .buttonStyle(PrimaryButtonStyle(compact: true))
                }

                summary

                if store.data.plans.isEmpty {
                    Card {
                        EmptyState(
                            icon: "calendar.badge.clock",
                            title: "还没有定投计划",
                            message: "把正在扣款的计划记下来，月底对账会轻松很多。",
                            actionTitle: "新增一个计划",
                            action: { ui.modal = .plan(nil) }
                        )
                    }
                } else {
                    LazyVGrid(
                        columns: [
                            GridItem(.flexible(), spacing: 16),
                            GridItem(.flexible(), spacing: 16)
                        ],
                        alignment: .leading,
                        spacing: 16
                    ) {
                        ForEach(sortedPlans) { plan in
                            planCard(plan)
                        }
                    }
                }
            }
            .padding(.horizontal, 28)
            .padding(.vertical, 24)
            .frame(maxWidth: 1180)
            .frame(maxWidth: .infinity)
        }
        .background(PageBackground())
        .alert(
            "删除这个定投计划？",
            isPresented: Binding(
                get: { pendingDelete != nil },
                set: { if !$0 { pendingDelete = nil } }
            )
        ) {
            Button("取消", role: .cancel) { pendingDelete = nil }
            Button("删除", role: .destructive) {
                if let pendingDelete {
                    store.deletePlan(id: pendingDelete.id)
                    ui.showToast(title: "已删除计划", message: pendingDelete.name)
                }
                pendingDelete = nil
            }
        } message: {
            Text("删除只影响计划列表，不会改变已持有的基金。")
        }
    }

    private var summary: some View {
        Card {
            HStack(spacing: 24) {
                VStack(alignment: .leading, spacing: 5) {
                    Text("进行中计划月均")
                        .font(.system(size: 10.5))
                        .foregroundStyle(.secondary)
                    HStack(alignment: .firstTextBaseline, spacing: 5) {
                        Text(Fmt.money(store.monthlyInvesting))
                            .font(.system(size: 27, weight: .semibold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(Palette.accent)
                        Text("元 / 月")
                            .font(.system(size: 10.5))
                            .foregroundStyle(.secondary)
                    }
                }
                Rectangle().fill(Palette.border).frame(width: 1, height: 38)
                summaryMetric("进行中计划", "\(store.activePlansCount) 个")
                summaryMetric("资金归集 / 月", store.cashPoolPlan?.amount.map { Fmt.money($0) } ?? "—")
                summaryMetric("全部计划", "\(store.data.plans.count) 个")
                Spacer()
                VStack(alignment: .trailing, spacing: 3) {
                    Text("估算口径")
                        .font(.system(size: 9.5, weight: .semibold))
                        .foregroundStyle(.tertiary)
                    Text("每交易日 21.75 天 · 每日 30 天 · 每周 52/12 周")
                        .font(.system(size: 9.5))
                        .foregroundStyle(.tertiary)
                    Text("实际以平台扣款为准")
                        .font(.system(size: 9.5))
                        .foregroundStyle(.tertiary)
                }
            }
        }
    }

    private func summaryMetric(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 10))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .monospacedDigit()
        }
    }

    private func planCard(_ plan: DcaPlan) -> some View {
        Card(padding: 18) {
            VStack(alignment: .leading, spacing: 13) {
                HStack(alignment: .top, spacing: 11) {
                    Image(systemName: plan.isCashPool ? "banknote" : "calendar.badge.clock")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(plan.isCashPool ? Palette.gold : Palette.accent)
                        .frame(width: 30, height: 30)
                        .background((plan.isCashPool ? Palette.gold : Palette.accent).opacity(0.10))
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

                    VStack(alignment: .leading, spacing: 3) {
                        Text(plan.name)
                            .font(.system(size: 14, weight: .semibold))
                            .lineLimit(1)
                        Text("\(plan.platform)　·　\(plan.code)")
                            .font(.system(size: 10))
                            .foregroundStyle(.tertiary)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 8)
                    Pill(text: plan.status, tint: statusColor(plan.status))
                    IconMenu {
                        Button("编辑计划…") { ui.modal = .plan(plan) }
                        Divider()
                        Button("删除计划", role: .destructive) { pendingDelete = plan }
                    }
                }

                HStack(alignment: .firstTextBaseline, spacing: 5) {
                    Text(plan.amount.map { Fmt.money($0) } ?? "—")
                        .font(.system(size: 22, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                    Text("/ \(plan.frequency)")
                        .font(.system(size: 10.5))
                        .foregroundStyle(.secondary)
                    Spacer()
                    if plan.isCashPool {
                        Text("用于定投的资金池")
                            .font(.system(size: 10.5))
                            .foregroundStyle(.tertiary)
                    } else if plan.status == PlanStatus.active.rawValue {
                        Text("约 \(Fmt.money(plan.monthlyEstimate)) / 月")
                            .font(.system(size: 11.5, weight: .semibold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(Palette.accent)
                    }
                }

                HStack(spacing: 16) {
                    labelValue("扣款", plan.debitDay.isEmpty ? "—" : plan.debitDay)
                    labelValue("起始", plan.startDate.isEmpty ? "—" : plan.startDate)
                    labelValue("类别", plan.category)
                }

                if !plan.note.isEmpty {
                    Text(plan.note)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Divider().opacity(0.5)
                HStack {
                    if plan.status == PlanStatus.paused.rawValue {
                        Text("已暂停扣款")
                            .font(.system(size: 10))
                            .foregroundStyle(.tertiary)
                    } else if plan.isCashPool {
                        Text("不计入月均定投")
                            .font(.system(size: 10))
                            .foregroundStyle(.tertiary)
                    } else if plan.debitDay.isEmpty || plan.debitDay == plan.frequency {
                        Text("按计划持续扣款")
                            .font(.system(size: 10))
                            .foregroundStyle(.tertiary)
                    } else {
                        Text("扣款日 \(plan.debitDay)")
                            .font(.system(size: 10))
                            .foregroundStyle(.tertiary)
                    }
                    Spacer()
                    Button("编辑") { ui.modal = .plan(plan) }
                        .buttonStyle(.plain)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Palette.accent)
                }
            }
            .opacity(plan.status == PlanStatus.paused.rawValue ? 0.68 : 1)
        }
        .contextMenu {
            Button("编辑计划…") { ui.modal = .plan(plan) }
            Divider()
            Button("删除计划", role: .destructive) { pendingDelete = plan }
        }
    }

    private func labelValue(_ label: String, _ value: String) -> some View {
        HStack(spacing: 4) {
            Text(label)
                .font(.system(size: 9.5))
                .foregroundStyle(.tertiary)
            Text(value)
                .font(.system(size: 10.5, weight: .medium))
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case PlanStatus.active.rawValue: return Palette.loss
        case PlanStatus.paused.rawValue: return Palette.gold
        case PlanStatus.cashPool.rawValue: return Palette.accent
        default: return Color.secondary
        }
    }
}

struct PlanEditorView: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var ui: AppUI
    @Environment(\.dismiss) private var dismiss

    let plan: DcaPlan?

    @State private var platform = ""
    @State private var code = ""
    @State private var name = ""
    @State private var category = AssetCategory.offExchange.rawValue
    @State private var frequency = Frequency.monthly.rawValue
    @State private var amountText = ""
    @State private var debitDay = ""
    @State private var startDate = ""
    @State private var status = PlanStatus.active.rawValue
    @State private var note = ""
    @State private var errorText: String?
    @State private var showDeleteConfirm = false

    init(plan: DcaPlan?) {
        self.plan = plan
        _platform = State(initialValue: plan?.platform ?? "")
        _code = State(initialValue: plan?.code ?? "")
        _name = State(initialValue: plan?.name ?? "")
        _category = State(initialValue: plan?.category ?? AssetCategory.offExchange.rawValue)
        _frequency = State(initialValue: plan?.frequency ?? Frequency.monthly.rawValue)
        _amountText = State(initialValue: plan?.amount.map { Fmt.money($0) } ?? "")
        _debitDay = State(initialValue: plan?.debitDay ?? "")
        _startDate = State(initialValue: plan?.startDate ?? "")
        _status = State(initialValue: plan?.status ?? PlanStatus.active.rawValue)
        _note = State(initialValue: plan?.note ?? "")
    }

    private var amount: Double? { Fmt.parseNumber(amountText) }
    private var monthlyEstimate: Double {
        guard status == PlanStatus.active.rawValue, let amount else { return 0 }
        return (Frequency(rawValue: frequency) ?? .monthly).monthlyEstimate(amount)
    }

    var body: some View {
        SheetChrome(
            title: plan == nil ? "新增定投计划" : "编辑定投计划",
            subtitle: "只记计划与节奏，不重复记市值。",
            onCancel: { dismiss() },
            onSave: save,
            onDelete: plan == nil ? nil : { showDeleteConfirm = true }
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

                FormSection(title: "计划信息") {
                    FormRow(label: "平台") {
                        HStack(spacing: 7) {
                            BareTextField(placeholder: "例如：理财通-主账户", text: $platform)
                            Menu {
                                ForEach(store.accounts, id: \.self) { item in
                                    Button(item) { platform = item }
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
                        FormColumn(label: "代码") {
                            BareTextField(placeholder: "代码或 —", text: $code, monospaced: true)
                        }
                        FormColumn(label: "名称") {
                            BareTextField(placeholder: "计划名称", text: $name)
                        }
                    }
                    HStack(alignment: .top, spacing: 16) {
                        FormColumn(label: "类别") {
                            StyledPicker(
                                options: AssetCategory.allCases.map { (title: $0.rawValue, value: $0.rawValue) },
                                selection: $category
                            )
                        }
                        FormColumn(label: "状态") {
                            StyledPicker(
                                options: PlanStatus.allCases.map { (title: $0.rawValue, value: $0.rawValue) },
                                selection: $status
                            )
                        }
                    }
                }

                FormSection(title: "扣款节奏") {
                    HStack(alignment: .top, spacing: 16) {
                        FormColumn(label: "频率") {
                            StyledPicker(
                                options: Frequency.allCases.map { (title: $0.rawValue, value: $0.rawValue) },
                                selection: $frequency
                            )
                        }
                        FormColumn(label: "每期金额（元）") {
                            BareTextField(placeholder: "0.00", text: $amountText, monospaced: true)
                        }
                    }
                    HStack(alignment: .top, spacing: 16) {
                        FormColumn(label: "扣款日") {
                            BareTextField(placeholder: "例如：每日 / 每周一 / 每月 8 日", text: $debitDay)
                        }
                        FormColumn(label: "起始时间") {
                            BareTextField(placeholder: "例如：2026-07", text: $startDate)
                        }
                    }
                    HStack(spacing: 7) {
                        Text("月均估算")
                            .font(.system(size: 11))
                            .foregroundStyle(.secondary)
                        Text(Fmt.money(monthlyEstimate))
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(Palette.accent)
                        Text("元 / 月")
                            .font(.system(size: 10.5))
                            .foregroundStyle(.secondary)
                        if status != PlanStatus.active.rawValue {
                            Text("（仅进行中的计划计入）")
                                .font(.system(size: 10))
                                .foregroundStyle(.tertiary)
                        }
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(Color.primary.opacity(0.03))
                    .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
                }

                FormSection(title: "备注") {
                    FormColumn(label: "为什么投 / 注意事项") {
                        BareTextEditor(placeholder: "例如：纳指限购后转投；亏近 20%，每月复盘一次。", text: $note, minHeight: 72)
                    }
                }
            }
        }
        .frame(width: 700, height: SheetFit.height(680))
        .onAppear {
            if platform.isEmpty, let first = store.accounts.first {
                platform = first
            }
        }
        .alert("删除这个定投计划？", isPresented: $showDeleteConfirm) {
            Button("取消", role: .cancel) {}
            Button("删除", role: .destructive) {
                if let plan {
                    store.deletePlan(id: plan.id)
                    ui.showToast(title: "已删除计划", message: plan.name)
                }
                dismiss()
            }
        } message: {
            Text("删除只影响计划列表，不会改变已持有的基金。")
        }
    }

    private func save() {
        errorText = nil
        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorText = "请填写计划名称。"
            return
        }
        guard !platform.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorText = "请填写平台或账户。"
            return
        }
        if !amountText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, amount == nil {
            errorText = "每期金额需要填写数字，或留空。"
            return
        }
        if status == PlanStatus.active.rawValue, amount == nil {
            errorText = "进行中的计划需要填写每期金额。"
            return
        }
        if let amount, amount < 0 {
            errorText = "每期金额不能为负数。"
            return
        }
        if status == PlanStatus.active.rawValue, let amount, amount == 0 {
            errorText = "进行中的计划，每期金额需要大于 0。"
            return
        }

        let created = DcaPlan(
            id: plan?.id ?? UUID(),
            platform: platform.trimmingCharacters(in: .whitespacesAndNewlines),
            code: code.trimmingCharacters(in: .whitespaces).isEmpty ? "—" : code.trimmingCharacters(in: .whitespaces),
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            category: status == PlanStatus.cashPool.rawValue ? AssetCategory.cash.rawValue : category,
            frequency: frequency,
            amount: amount,
            debitDay: debitDay,
            startDate: startDate,
            status: status,
            note: note
        )
        store.upsertPlan(created)
        ui.showToast(title: plan == nil ? "计划已添加" : "计划已更新", message: created.name)
        dismiss()
    }
}
