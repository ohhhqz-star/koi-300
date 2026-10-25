import SwiftUI

struct ReviewsView: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var ui: AppUI

    @State private var pendingDelete: DailyReview?

    private var todayReview: DailyReview? { store.review(on: DateFmt.today()) }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                PageHeader(
                    T("每日复盘"),
                    subtitle: T("%d 条记录　·　不用写长，3–5 行就够　·　先记事实，再记感受", store.data.reviews.count)
                ) {
                    Button(todayReview == nil ? T("写今日复盘") : T("继续今天")) {
                        ui.openTodayReview(store: store)
                    }
                    .buttonStyle(PrimaryButtonStyle(compact: true))
                }

                if store.data.reviews.isEmpty {
                    emptyPrompt
                } else {
                    VStack(spacing: 14) {
                        ForEach(store.reviewsSorted) { review in
                            reviewCard(review)
                        }
                    }
                }
            }
            .padding(.horizontal, 28)
            .padding(.vertical, 24)
            .frame(maxWidth: 1040)
            .frame(maxWidth: .infinity)
        }
        .background(PageBackground())
        .alert(
            T("删除这条复盘？"),
            isPresented: Binding(
                get: { pendingDelete != nil },
                set: { if !$0 { pendingDelete = nil } }
            )
        ) {
            Button(T("取消"), role: .cancel) { pendingDelete = nil }
            Button(T("删除"), role: .destructive) {
                if let pendingDelete {
                    store.deleteReview(id: pendingDelete.id)
                    ui.showToast(title: T("已删除复盘"), message: DateFmt.display(pendingDelete.date))
                }
                pendingDelete = nil
            }
        } message: {
            Text(T("当天的净值快照会保留，不会随复盘一起删除。"))
        }
    }

    private var emptyPrompt: some View {
        Card(padding: 24) {
            VStack(alignment: .leading, spacing: 20) {
                HStack(alignment: .top, spacing: 16) {
                    Image(systemName: "text.book.closed")
                        .font(.system(size: 22, weight: .light))
                        .foregroundStyle(Palette.accent)
                        .frame(width: 46, height: 46)
                        .background(Palette.accent.opacity(0.09))
                        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                    VStack(alignment: .leading, spacing: 5) {
                        Text(T("今天只回答三个问题。"))
                            .font(.system(size: 19, weight: .semibold))
                        Text(T("复盘不是写报告，是把当时的判断留下来。哪怕只有一句话。"))
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                }

                VStack(spacing: 10) {
                    promptRow("01", T("今天市场发生了什么？"), T("只写你真正看到、会影响判断的事。"))
                    promptRow("02", T("你做了什么，为什么？"), T("操作、忍住没操作，都算。"))
                    promptRow("03", T("下一步只做哪一件事？"), T("越具体越好，例如“明天不再补仓”。"))
                }

                HStack {
                    Button(T("写今天的第一条")) { ui.openTodayReview(store: store) }
                        .buttonStyle(PrimaryButtonStyle(compact: true))
                    Spacer()
                    Text(T("保存时自动记录当日净值，方便以后回看。"))
                        .font(.system(size: 10.5))
                        .foregroundStyle(.tertiary)
                }
            }
        }
    }

    private func promptRow(_ number: String, _ title: String, _ detail: String) -> some View {
        HStack(alignment: .top, spacing: 13) {
            Text(number)
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .foregroundStyle(Palette.accent)
                .frame(width: 24, height: 24)
                .background(Palette.accent.opacity(0.08))
                .clipShape(Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 12.5, weight: .semibold))
                Text(detail)
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(.horizontal, 13)
        .padding(.vertical, 10)
        .background(Palette.fieldFill)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private func reviewCard(_ review: DailyReview) -> some View {
        let snapshot = store.snapshot(on: review.date)
        return Card(padding: 22) {
            VStack(alignment: .leading, spacing: 15) {
                HStack(alignment: .top, spacing: 14) {
                    DateBadge(date: review.date)
                    VStack(alignment: .leading, spacing: 5) {
                        Text(DateFmt.display(review.date))
                            .font(.system(size: 15, weight: .semibold))
                        HStack(spacing: 7) {
                            Pill(text: T("心态 · %@", review.moodLabel), tint: moodTint(review.mood))
                            if let snapshot {
                                Text(T("当日资产 %@", Fmt.money(snapshot.value)))
                                    .font(.system(size: 10, design: .rounded))
                                    .monospacedDigit()
                                    .foregroundStyle(.tertiary)
                            }
                        }
                    }
                    Spacer()
                    Button(T("编辑")) { ui.modal = .review(review) }
                        .buttonStyle(SecondaryButtonStyle(compact: true))
                    IconMenu {
                        Button(T("编辑这条复盘…")) { ui.modal = .review(review) }
                        Divider()
                        Button(T("删除这条复盘"), role: .destructive) { pendingDelete = review }
                    }
                }

                let fields = reviewFields(review)
                if fields.isEmpty {
                    Text(T("只记录了心情，也是一条记录。"))
                        .font(.system(size: 12))
                        .foregroundStyle(.tertiary)
                        .padding(.vertical, 3)
                } else {
                    LazyVGrid(
                        columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)],
                        alignment: .leading,
                        spacing: 12
                    ) {
                        ForEach(fields) { field in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(field.label)
                                    .font(.system(size: 9.5, weight: .semibold))
                                    .foregroundStyle(Palette.accent.opacity(0.9))
                                Text(field.value)
                                    .font(.system(size: 12))
                                    .foregroundStyle(.primary.opacity(0.88))
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Palette.fieldFill)
                            .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                        }
                    }
                }
            }
        }
        .contextMenu {
            Button(T("编辑复盘…")) { ui.modal = .review(review) }
            Divider()
            Button(T("删除复盘"), role: .destructive) { pendingDelete = review }
        }
    }

    private func reviewFields(_ review: DailyReview) -> [ReviewField] {
        var fields: [ReviewField] = []
        if !review.trigger.isEmpty { fields.append(ReviewField(label: T("情绪 / 触发"), value: review.trigger)) }
        if !review.operations.isEmpty { fields.append(ReviewField(label: T("今日操作"), value: review.operations)) }
        if !review.market.isEmpty { fields.append(ReviewField(label: T("市场观察"), value: review.market)) }
        if !review.didRight.isEmpty { fields.append(ReviewField(label: T("做对的事"), value: review.didRight)) }
        if !review.didWrong.isEmpty { fields.append(ReviewField(label: T("做错的事 / 教训"), value: review.didWrong)) }
        if !review.nextPlan.isEmpty { fields.append(ReviewField(label: T("下一步"), value: review.nextPlan)) }
        return fields
    }

    private func moodTint(_ mood: Int) -> Color {
        switch mood {
        case 1, 2: return Palette.gain
        case 4, 5: return Palette.loss
        default: return Palette.gold
        }
    }
}

private struct ReviewField: Identifiable {
    let label: String
    let value: String
    var id: String { label }
}

private struct DateBadge: View {
    var date: String

    var body: some View {
        let components = date.split(separator: "-")
        let month = components.count > 1 ? Int(components[1]) ?? 0 : 0
        let day = components.count > 2 ? Int(components[2]) ?? 0 : 0
        return VStack(spacing: 0) {
            Text("\(day)")
                .font(.system(size: 21, weight: .semibold, design: .rounded))
                .monospacedDigit()
            Text(monthLabel(month))
                .font(.system(size: 8.5, weight: .medium))
                .foregroundStyle(.tertiary)
        }
        .frame(width: 44, height: 46)
        .background(Palette.accent.opacity(0.07))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private func monthLabel(_ month: Int) -> String {
        guard Lang.isEnglish, let value = DateFmt.iso.date(from: date) else { return "\(month) 月" }
        return value.formatted(.dateTime.month(.abbreviated))
    }
}

struct ReviewEditorView: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var ui: AppUI
    @Environment(\.dismiss) private var dismiss

    let review: DailyReview?

    @State private var date: Date
    @State private var mood: Int
    @State private var trigger = ""
    @State private var operations = ""
    @State private var market = ""
    @State private var didRight = ""
    @State private var didWrong = ""
    @State private var nextPlan = ""
    @State private var errorText: String?
    @State private var showDeleteConfirm = false

    init(review: DailyReview?) {
        self.review = review
        _date = State(initialValue: review.map { DateFmt.parse($0.date) } ?? Date())
        _mood = State(initialValue: review?.mood ?? 3)
        _trigger = State(initialValue: review?.trigger ?? "")
        _operations = State(initialValue: review?.operations ?? "")
        _market = State(initialValue: review?.market ?? "")
        _didRight = State(initialValue: review?.didRight ?? "")
        _didWrong = State(initialValue: review?.didWrong ?? "")
        _nextPlan = State(initialValue: review?.nextPlan ?? "")
    }

    private var dateString: String { DateFmt.iso.string(from: date) }
    private var isToday: Bool { dateString == DateFmt.today() }

    var body: some View {
        SheetChrome(
            title: review == nil ? T("写今日复盘") : T("编辑复盘"),
            subtitle: isToday ? T("保存时会把今天的总资产记入净值快照。") : T("补记过去的一天；当日净值不会自动补。"),
            onCancel: { dismiss() },
            onSave: save,
            onDelete: review == nil ? nil : { showDeleteConfirm = true }
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

                FormSection(title: T("这一天")) {
                    HStack(alignment: .top, spacing: 20) {
                        FormColumn(label: T("日期")) {
                            HStack {
                                DatePicker("", selection: $date, in: ...Date(), displayedComponents: .date)
                                    .labelsHidden()
                                    .datePickerStyle(.compact)
                                Spacer()
                            }
                        }
                        FormColumn(label: T("心态")) {
                            MoodPicker(selection: $mood)
                        }
                    }
                }

                FormSection(title: T("事实与感受")) {
                    FormColumn(label: T("情绪 / 触发")) {
                        BareTextEditor(placeholder: T("今天因为什么起了情绪？先描述事实。"), text: $trigger, minHeight: 52)
                    }
                    FormColumn(label: T("今日操作")) {
                        BareTextEditor(placeholder: T("买了什么、卖了什么、或者忍住了没做什么。"), text: $operations, minHeight: 52)
                    }
                    FormColumn(label: T("市场观察")) {
                        BareTextEditor(placeholder: T("只看真正影响判断的信息。"), text: $market, minHeight: 52)
                    }
                }

                FormSection(title: T("复盘与下一步")) {
                    HStack(alignment: .top, spacing: 16) {
                        FormColumn(label: T("做对的事")) {
                            BareTextEditor(placeholder: T("哪怕很小，也写下来。"), text: $didRight, minHeight: 58)
                        }
                        FormColumn(label: T("做错的事 / 教训")) {
                            BareTextEditor(placeholder: T("下次怎么避免？"), text: $didWrong, minHeight: 58)
                        }
                    }
                    FormColumn(label: T("下一步只做一件事")) {
                        BareTextEditor(placeholder: T("越具体越好，例如“明天不补仓，先看完这份复盘”。"), text: $nextPlan, minHeight: 58)
                    }
                }
            }
        }
        .frame(width: 760, height: SheetFit.height(740))
        .alert(T("删除这条复盘？"), isPresented: $showDeleteConfirm) {
            Button(T("取消"), role: .cancel) {}
            Button(T("删除"), role: .destructive) {
                if let review {
                    store.deleteReview(id: review.id)
                    ui.showToast(title: T("已删除复盘"), message: DateFmt.display(review.date))
                }
                dismiss()
            }
        } message: {
            Text(T("当天的净值快照会保留，不会随复盘一起删除。"))
        }
    }

    private func save() {
        errorText = nil
        if store.reviewExists(on: dateString, excluding: review?.id) {
            errorText = T("这一天已经有一条复盘了。请直接编辑原来那条，避免覆盖。")
            return
        }

        let created = DailyReview(
            id: review?.id ?? UUID(),
            date: dateString,
            mood: mood,
            trigger: trigger,
            operations: operations,
            market: market,
            didRight: didRight,
            didWrong: didWrong,
            nextPlan: nextPlan,
            createdAt: review?.createdAt ?? Date()
        )
        store.upsertReview(created)
        ui.showToast(title: review == nil ? T("复盘已保存") : T("复盘已更新"), message: isToday ? T("今日净值快照已同步。") : nil)
        dismiss()
    }
}

private struct MoodPicker: View {
    @Binding var selection: Int

    private let labels = ["很差", "偏低", "一般", "不错", "很好"]

    var body: some View {
        HStack(spacing: 4) {
            ForEach(1...5, id: \.self) { value in
                Button {
                    selection = value
                } label: {
                    VStack(spacing: 2) {
                        Text("\(value)")
                            .font(.system(size: 11.5, weight: .semibold, design: .rounded))
                        Text(T(labels[value - 1]))
                            .font(.system(size: 8.5))
                    }
                    .foregroundStyle(selection == value ? Color.white : Color.secondary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 38)
                    .background(
                        RoundedRectangle(cornerRadius: 7, style: .continuous)
                            .fill(selection == value ? Palette.accentSolid : Palette.fieldFill)
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }
}
