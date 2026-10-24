import Foundation
import AppKit
import UniformTypeIdentifiers

enum ExportRequest {
    case excel
    case holdingsCSV
    case tradesCSV
    case reviewsCSV
    case backupJSON

    var menuTitle: String {
        switch self {
        case .excel: return "导出 Excel 工作簿…"
        case .holdingsCSV: return "导出当前持仓 CSV…"
        case .tradesCSV: return "导出操作记录 CSV…"
        case .reviewsCSV: return "导出每日复盘 CSV…"
        case .backupJSON: return "导出完整 JSON 备份…"
        }
    }

    var panelTitle: String {
        switch self {
        case .excel: return "导出 Excel 工作簿"
        case .holdingsCSV: return "导出当前持仓"
        case .tradesCSV: return "导出操作记录"
        case .reviewsCSV: return "导出每日复盘"
        case .backupJSON: return "导出完整备份"
        }
    }

    var fileExtension: String {
        switch self {
        case .excel: return "xlsx"
        case .holdingsCSV, .tradesCSV, .reviewsCSV: return "csv"
        case .backupJSON: return "json"
        }
    }

    var contentType: UTType {
        switch self {
        case .excel:
            return UTType(filenameExtension: "xlsx") ?? .data
        case .holdingsCSV, .tradesCSV, .reviewsCSV:
            return .commaSeparatedText
        case .backupJSON:
            return .json
        }
    }

    func defaultName(date: String) -> String {
        switch self {
        case .excel: return "Koi300_\(date).xlsx"
        case .holdingsCSV: return "Koi300_当前持仓_\(date).csv"
        case .tradesCSV: return "Koi300_操作记录_\(date).csv"
        case .reviewsCSV: return "Koi300_每日复盘_\(date).csv"
        case .backupJSON: return "Koi300_完整备份_\(date).json"
        }
    }
}

@MainActor
enum ExportService {
    private static let lastDirectoryKey = "lastExportDirectory"

    static func export(_ request: ExportRequest, data: AppData) throws -> URL? {
        let panel = NSSavePanel()
        panel.title = request.panelTitle
        panel.prompt = "导出"
        panel.nameFieldStringValue = request.defaultName(date: DateFmt.today())
        panel.allowedContentTypes = [request.contentType]
        panel.allowsOtherFileTypes = false
        panel.isExtensionHidden = false
        panel.canCreateDirectories = true
        if let directory = savedDirectory() {
            panel.directoryURL = directory
        } else {
            panel.directoryURL = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first
        }

        guard panel.runModal() == .OK, var url = panel.url else { return nil }
        if url.pathExtension.lowercased() != request.fileExtension {
            url = url.appendingPathExtension(request.fileExtension)
        }

        switch request {
        case .excel:
            let sheets = WorkbookBuilder.sheets(from: data)
            try XLSXExporter.write(sheets: sheets, to: url)
        case .holdingsCSV:
            try CSVExporter.write(kind: .holdings, data: data, to: url)
        case .tradesCSV:
            try CSVExporter.write(kind: .trades, data: data, to: url)
        case .reviewsCSV:
            try CSVExporter.write(kind: .reviews, data: data, to: url)
        case .backupJSON:
            let raw = try AppStore.encode(data)
            try raw.write(to: url, options: .atomic)
        }

        UserDefaults.standard.set(url.deletingLastPathComponent().path, forKey: lastDirectoryKey)
        return url
    }

    static func chooseImportFile() -> URL? {
        let panel = NSOpenPanel()
        panel.title = "选择投资复盘 JSON 备份"
        panel.prompt = "读取备份"
        panel.allowedContentTypes = [.json]
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        if let directory = savedDirectory() {
            panel.directoryURL = directory
        }
        guard panel.runModal() == .OK else { return nil }
        return panel.url
    }

    static func loadBackup(_ url: URL) throws -> AppData {
        let raw = try Data(contentsOf: url)
        return try AppStore.decode(raw)
    }

    static func reveal(_ url: URL) {
        NSWorkspace.shared.activateFileViewerSelecting([url])
    }

    static func revealDirectory(_ url: URL) {
        NSWorkspace.shared.open(url)
    }

    private static func savedDirectory() -> URL? {
        guard let path = UserDefaults.standard.string(forKey: lastDirectoryKey), !path.isEmpty else { return nil }
        var isDirectory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: path, isDirectory: &isDirectory), isDirectory.boolValue else {
            return nil
        }
        return URL(fileURLWithPath: path, isDirectory: true)
    }
}

@MainActor
func runExport(_ request: ExportRequest, store: AppStore, ui: AppUI) {
    do {
        guard let url = try ExportService.export(request, data: store.data) else { return }
        ui.showToast(
            title: "已导出",
            message: url.lastPathComponent,
            folderURL: url.deletingLastPathComponent()
        )
    } catch {
        ui.showToast(
            title: "导出失败",
            message: error.localizedDescription,
            isError: true
        )
    }
}

@MainActor
func runBackupNow(store: AppStore, ui: AppUI) {
    do {
        let url = try store.backupNow()
        ui.showToast(title: "本地备份已创建", message: url.lastPathComponent, folderURL: url.deletingLastPathComponent())
    } catch {
        ui.showToast(title: "备份失败", message: error.localizedDescription, isError: true)
    }
}
