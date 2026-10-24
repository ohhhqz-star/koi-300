import SwiftUI
import AppKit

struct SidebarView: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var ui: AppUI

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 11) {
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .fill(Palette.accentSolid)
                    .frame(width: 34, height: 34)
                    .overlay {
                        KoiMark(eyeColor: Palette.accentSolid)
                            .padding(5)
                    }

                VStack(alignment: .leading, spacing: 2) {
                    Text("复盘 300")
                        .font(.system(size: 14.5, weight: .semibold))
                    Text("每天 3 分钟")
                        .font(.system(size: 10.5))
                        .foregroundStyle(.secondary)
                }
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.top, 20)
            .padding(.bottom, 22)

            Text("记录")
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(.tertiary)
                .tracking(0.8)
                .padding(.horizontal, 19)
                .padding(.bottom, 7)

            VStack(spacing: 2) {
                ForEach(SidebarSection.allCases) { section in
                    SidebarRow(
                        section: section,
                        badge: badge(for: section),
                        selected: ui.section == section
                    ) {
                        withAnimation(.easeInOut(duration: 0.16)) {
                            ui.section = section
                        }
                    }
                }
            }
            .padding(.horizontal, 10)

            Spacer(minLength: 20)

            VStack(alignment: .leading, spacing: 10) {
                recordProgress
                Divider().overlay(Palette.border)
                ThemePicker()
                Divider().overlay(Palette.border)
                HStack(spacing: 7) {
                    Circle()
                        .fill(Palette.loss)
                        .frame(width: 5.5, height: 5.5)
                    Text("自动保存")
                        .font(.system(size: 10.5))
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(store.data.lastModified, style: .time)
                        .font(.system(size: 10))
                        .foregroundStyle(.tertiary)
                }
                HStack(spacing: 7) {
                    Image(systemName: "lock.shield")
                        .font(.system(size: 10))
                        .foregroundStyle(.tertiary)
                    Text("数据只保存在这台 Mac")
                        .font(.system(size: 10))
                        .foregroundStyle(.tertiary)
                    Spacer()
                    Button {
                        ExportService.revealDirectory(store.dataDirectory)
                    } label: {
                        Image(systemName: "folder")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                    .help("在 Finder 中打开数据文件夹")
                }
            }
            .padding(.horizontal, 17)
            .padding(.bottom, 16)
        }
        .background(Palette.sidebarSurface.ignoresSafeArea())
    }

    private var recordProgress: some View {
        let count = store.recordCount300
        return VStack(alignment: .leading, spacing: 5) {
            HStack(alignment: .firstTextBaseline, spacing: 5) {
                Text("300 记录")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(.secondary)
                Spacer()
                Text("\(count)")
                    .font(.system(size: 10.5, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Palette.accent)
                Text("/ 300")
                    .font(.system(size: 9.5, design: .rounded))
                    .foregroundStyle(.tertiary)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.primary.opacity(0.055))
                    Capsule()
                        .fill(Palette.accent.opacity(0.72))
                        .frame(width: max(geo.size.width * store.recordProgress300, count > 0 ? 4 : 0))
                }
            }
            .frame(height: 3)
        }
    }

    private func badge(for section: SidebarSection) -> Int? {
        switch section {
        case .holdings: return store.data.assets.count
        case .trades: return store.data.trades.isEmpty ? nil : store.data.trades.count
        case .reviews: return store.data.reviews.isEmpty ? nil : store.data.reviews.count
        case .plans: return store.activePlansCount == 0 ? nil : store.activePlansCount
        default: return nil
        }
    }
}

private struct SidebarRow: View {
    var section: SidebarSection
    var badge: Int?
    var selected: Bool
    var action: () -> Void

    @State private var hovering = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: section.icon)
                    .font(.system(size: 12.5, weight: .medium))
                    .frame(width: 18)
                    .foregroundStyle(selected ? Palette.accent : Color.secondary)
                Text(section.title)
                    .font(.system(size: 12.5, weight: selected ? .semibold : .regular))
                Spacer()
                if let badge {
                    Text("\(badge)")
                        .font(.system(size: 9.5, weight: .medium, design: .rounded))
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 5.5)
                        .padding(.vertical, 1.5)
                        .background(
                            Capsule()
                                .fill(Color.primary.opacity(0.05))
                        )
                }
            }
            .foregroundStyle(selected ? Color.primary : Color.secondary)
            .padding(.horizontal, 11)
            .frame(height: 33)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(
                        selected
                            ? Palette.accent.opacity(0.085)
                            : (hovering ? Color.primary.opacity(0.035) : Color.clear)
                    )
            )
            .overlay(alignment: .leading) {
                if selected {
                    Capsule()
                        .fill(Palette.accent)
                        .frame(width: 2.5, height: 14)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { hovering = $0 }
    }
}

struct ContentView: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var ui: AppUI
    @AppStorage(AppTheme.storageKey) private var themeRaw = AppTheme.warm.rawValue

    private var theme: AppTheme { AppTheme(rawValue: themeRaw) ?? .warm }

    var body: some View {
        ThemeRuntime.theme = theme
        return NavigationSplitView {
            SidebarView()
                .navigationSplitViewColumnWidth(min: 206, ideal: 222, max: 250)
        } detail: {
            ZStack {
                PageBackground()
                page
            }
        }
        .navigationTitle("复盘 300")
        .tint(Palette.accent)
        .accentColor(Palette.accent)
        .toolbarBackground(Palette.page, for: .windowToolbar)
        .toolbarBackground(.visible, for: .windowToolbar)
        .toolbar {
            ToolbarItemGroup(placement: .primaryAction) {
                Menu {
                    Button("写今日复盘") { ui.openTodayReview(store: store) }
                    Button("记一笔操作…") { ui.modal = .trade(nil) }
                    Button("新增持仓…") { ui.modal = .asset(nil) }
                    Button("新增定投计划…") { ui.modal = .plan(nil) }
                } label: {
                    Label("记录", systemImage: "plus")
                        .labelStyle(.titleAndIcon)
                }
                .help("新增一条记录")

                Menu {
                    Button(ExportRequest.excel.menuTitle) { runExport(.excel, store: store, ui: ui) }
                    Divider()
                    Button(ExportRequest.holdingsCSV.menuTitle) { runExport(.holdingsCSV, store: store, ui: ui) }
                    Button(ExportRequest.tradesCSV.menuTitle) { runExport(.tradesCSV, store: store, ui: ui) }
                    Button(ExportRequest.reviewsCSV.menuTitle) { runExport(.reviewsCSV, store: store, ui: ui) }
                    Divider()
                    Button(ExportRequest.backupJSON.menuTitle) { runExport(.backupJSON, store: store, ui: ui) }
                    Button("立即创建本地备份") { runBackupNow(store: store, ui: ui) }
                    Divider()
                    Button("在 Finder 中打开数据文件夹") {
                        ExportService.revealDirectory(store.dataDirectory)
                    }
                } label: {
                    Label("导出", systemImage: "square.and.arrow.up")
                        .labelStyle(.titleAndIcon)
                }
                .help("随时导出 Excel、CSV 或完整备份")
            }
        }
        .id(themeRaw)
        .sheet(item: $ui.modal) { route in
            modalContent(for: route)
                .environmentObject(store)
                .environmentObject(ui)
        }
        .overlay(alignment: .topTrailing) {
            if let toast = ui.toast {
                ToastView(
                    toast: toast,
                    onReveal: { ExportService.reveal($0) },
                    onClose: { withAnimation(.easeOut(duration: 0.16)) { ui.toast = nil } }
                )
                .padding(.top, 12)
                .padding(.trailing, 16)
                .transition(.move(edge: .top).combined(with: .opacity))
                .task(id: toast.id) {
                    try? await Task.sleep(nanoseconds: 6_000_000_000)
                    if ui.toast?.id == toast.id {
                        withAnimation(.easeOut(duration: 0.2)) { ui.toast = nil }
                    }
                }
            }
        }
        .alert(
            "提示",
            isPresented: Binding(
                get: { store.errorMessage != nil },
                set: { if !$0 { store.errorMessage = nil } }
            )
        ) {
            Button("知道了") { store.errorMessage = nil }
        } message: {
            Text(store.errorMessage ?? "")
        }
        .onAppear {
            applyThemeAppearance()
            NSApp.activate(ignoringOtherApps: true)
            DispatchQueue.main.async {
                NSApp.keyWindow?.makeFirstResponder(nil)
            }
        }
        .onChange(of: themeRaw) { _, _ in
            applyThemeAppearance()
        }
    }

    private func applyThemeAppearance() {
        ThemeRuntime.theme = theme
        NSApp.appearance = NSAppearance(named: theme.isDark ? .darkAqua : .aqua)
    }

    @ViewBuilder
    private var page: some View {
        switch ui.section {
        case .overview:
            OverviewView()
        case .holdings:
            HoldingsView()
        case .trades:
            TradesView()
        case .reviews:
            ReviewsView()
        case .plans:
            PlansView()
        case .data:
            DataView()
        }
    }

    @ViewBuilder
    private func modalContent(for route: ModalRoute) -> some View {
        switch route {
        case .asset(let asset):
            AssetEditorView(asset: asset)
        case .trade(let trade):
            TradeEditorView(trade: trade)
        case .review(let review):
            ReviewEditorView(review: review)
        case .plan(let plan):
            PlanEditorView(plan: plan)
        }
    }
}
