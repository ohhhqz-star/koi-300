import SwiftUI
import AppKit

@main
struct InvestmentReviewApp: App {
    @StateObject private var store: AppStore
    @StateObject private var ui = AppUI()

    init() {
        _store = StateObject(wrappedValue: AppStore())
        if let iconURL = Bundle.main.url(forResource: "AppIcon", withExtension: "icns"),
           let icon = NSImage(contentsOf: iconURL) {
            NSApplication.shared.applicationIconImage = icon
        }
        let theme = AppTheme.stored
        ThemeRuntime.theme = theme
        NSApplication.shared.appearance = NSAppearance(named: theme.isDark ? .darkAqua : .aqua)
    }

    var body: some Scene {
        WindowGroup("Koi 300") {
            ContentView()
                .environmentObject(store)
                .environmentObject(ui)
                .frame(minWidth: 1060, minHeight: 700)
        }
        .defaultSize(width: 1260, height: 840)
        .windowResizability(.contentMinSize)
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("写今日复盘") { ui.openTodayReview(store: store) }
                    .keyboardShortcut("n", modifiers: .command)
                Button("记一笔操作…") { ui.modal = .trade(nil) }
                    .keyboardShortcut("n", modifiers: [.command, .shift])
                Button("新增持仓…") { ui.modal = .asset(nil) }
                Button("新增定投计划…") { ui.modal = .plan(nil) }
            }

            CommandMenu("前往") {
                ForEach(Array(SidebarSection.allCases.enumerated()), id: \.element.id) { index, section in
                    Button(section.title) { ui.section = section }
                        .keyboardShortcut(KeyEquivalent(Character("\(index + 1)")), modifiers: .command)
                }
            }

            CommandMenu("导出") {
                Button("导出 Excel 工作簿…") { runExport(.excel, store: store, ui: ui) }
                    .keyboardShortcut("e", modifiers: [.command, .shift])
                Divider()
                Button("导出当前持仓 CSV…") { runExport(.holdingsCSV, store: store, ui: ui) }
                Button("导出操作记录 CSV…") { runExport(.tradesCSV, store: store, ui: ui) }
                Button("导出每日复盘 CSV…") { runExport(.reviewsCSV, store: store, ui: ui) }
                Divider()
                Button("导出完整 JSON 备份…") { runExport(.backupJSON, store: store, ui: ui) }
                Button("立即创建本地备份") { runBackupNow(store: store, ui: ui) }
                Divider()
                Button("在 Finder 中打开数据文件夹") {
                    ExportService.revealDirectory(store.dataDirectory)
                }
            }
        }
    }
}
