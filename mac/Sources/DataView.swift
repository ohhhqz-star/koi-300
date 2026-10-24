import SwiftUI
import AppKit

struct DataView: View {
    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var ui: AppUI

    @State private var pendingImport: ImportPreview?

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                PageHeader(
                    "数据与导出",
                    subtitle: "随时导出，数据只保存在这台 Mac　·　当前共 \(store.data.assets.count) 条资产、\(store.data.trades.count) 笔操作、\(store.data.reviews.count) 条复盘"
                ) {
                    Button("导出 Excel") { runExport(.excel, store: store, ui: ui) }
                        .buttonStyle(PrimaryButtonStyle(compact: true))
                }

                HStack(alignment: .top, spacing: 16) {
                    exportCard
                        .frame(maxWidth: .infinity, alignment: .top)
                    VStack(spacing: 16) {
                        localDataCard
                        restoreCard
                    }
                    .frame(width: 380)
                }

                aboutCard
            }
            .padding(.horizontal, 28)
            .padding(.vertical, 24)
            .frame(maxWidth: 1180)
            .frame(maxWidth: .infinity)
        }
        .background(PageBackground())
        .alert("恢复这份备份？", isPresented: Binding(
            get: { pendingImport != nil },
            set: { if !$0 { pendingImport = nil } }
        )) {
            Button("取消", role: .cancel) { pendingImport = nil }
            Button("恢复", role: .destructive) {
                guard let preview = pendingImport else { return }
                do {
                    try store.importData(preview.data)
                    ui.showToast(
                        title: "备份已恢复",
                        message: "\(preview.assetCount) 条资产 · \(preview.tradeCount) 笔操作 · \(preview.reviewCount) 条复盘"
                    )
                } catch {
                    ui.showToast(title: "恢复失败", message: error.localizedDescription, isError: true)
                }
                pendingImport = nil
            }
        } message: {
            if let preview = pendingImport {
                Text("将用 \(preview.fileName) 替换当前数据。恢复前会自动保留一份当前数据的备份。\n\n备份内容：\(preview.assetCount) 条资产、\(preview.tradeCount) 笔操作、\(preview.reviewCount) 条复盘。")
            }
        }
    }

    private var exportCard: some View {
        Card(padding: 20) {
            VStack(alignment: .leading, spacing: 14) {
                CardTitle(title: "导出", subtitle: "任何时候都可以导出", icon: "square.and.arrow.up")

                Button {
                    runExport(.excel, store: store, ui: ui)
                } label: {
                    HStack(spacing: 13) {
                        Image(systemName: "tablecells")
                            .font(.system(size: 17, weight: .medium))
                            .foregroundStyle(Color(hex: 0xF3EEE2))
                            .frame(width: 40, height: 40)
                            .background(Color.white.opacity(0.09))
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        VStack(alignment: .leading, spacing: 3) {
                            Text("Excel 工作簿")
                                .font(.system(size: 13.5, weight: .semibold))
                                .foregroundStyle(Color(hex: 0xF7F3E9))
                            Text("概览、当前持仓、操作记录、每日复盘、定投计划、净值快照，共 6 个工作表。")
                                .font(.system(size: 10.5))
                                .foregroundStyle(Color(hex: 0xF7F3E9).opacity(0.62))
                                .multilineTextAlignment(.leading)
                        }
                        Spacer()
                        Text("导出")
                            .font(.system(size: 11.5, weight: .semibold))
                            .foregroundStyle(Palette.accentDeep)
                            .padding(.horizontal, 13)
                            .frame(height: 28)
                            .background(Capsule().fill(Color(hex: 0xF3EEE2)))
                    }
                    .padding(13)
                    .background(Palette.accentSolid)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                Divider().opacity(0.55)

                VStack(spacing: 2) {
                    exportRow(
                        icon: "doc.zipper",
                        title: "完整 JSON 备份",
                        subtitle: "包含所有数据，可在本应用中恢复。",
                        action: { runExport(.backupJSON, store: store, ui: ui) }
                    )
                    exportRow(
                        icon: "tablecells.badge.ellipsis",
                        title: "当前持仓 CSV",
                        subtitle: "适合 Excel / Numbers 直接打开。",
                        action: { runExport(.holdingsCSV, store: store, ui: ui) }
                    )
                    exportRow(
                        icon: "list.bullet.rectangle",
                        title: "操作记录 CSV",
                        subtitle: "每一笔操作及当时的理由。",
                        action: { runExport(.tradesCSV, store: store, ui: ui) }
                    )
                    exportRow(
                        icon: "book",
                        title: "每日复盘 CSV",
                        subtitle: "按日期导出心态与复盘记录。",
                        action: { runExport(.reviewsCSV, store: store, ui: ui) }
                    )
                }

                Text("导出的文件不会覆盖原始工作簿，也不会改动应用里的数据。")
                    .font(.system(size: 10))
                    .foregroundStyle(.tertiary)
                    .padding(.top, 2)
            }
        }
    }

    private func exportRow(icon: String, title: String, subtitle: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 11) {
                Image(systemName: icon)
                    .font(.system(size: 12.5, weight: .medium))
                    .foregroundStyle(.secondary)
                    .frame(width: 28, height: 28)
                    .background(Color.primary.opacity(0.04))
                    .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 12, weight: .medium))
                    Text(subtitle)
                        .font(.system(size: 10))
                        .foregroundStyle(.tertiary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(.quaternary)
            }
            .padding(.horizontal, 9)
            .padding(.vertical, 7)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var localDataCard: some View {
        Card(padding: 18) {
            VStack(alignment: .leading, spacing: 12) {
                CardTitle(title: "本地数据", subtitle: "自动保存", icon: "externaldrive")
                VStack(alignment: .leading, spacing: 6) {
                    Text("数据文件")
                        .font(.system(size: 9.5, weight: .semibold))
                        .foregroundStyle(.tertiary)
                    Text(store.dataURL.path)
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundStyle(.secondary)
                        .lineLimit(3)
                        .textSelection(.enabled)
                    HStack(spacing: 8) {
                        Text(dataFileSize)
                            .font(.system(size: 9.5))
                            .foregroundStyle(.tertiary)
                        Text("·")
                            .foregroundStyle(.quaternary)
                        Text("自动备份 \(store.backupFiles().count) 份")
                            .font(.system(size: 9.5))
                            .foregroundStyle(.tertiary)
                    }
                }
                .padding(11)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Palette.fieldFill)
                .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))

                HStack(spacing: 8) {
                    Button("在 Finder 中显示") { ExportService.reveal(store.dataURL) }
                        .buttonStyle(SecondaryButtonStyle(compact: true))
                    Button("立即备份") { runBackupNow(store: store, ui: ui) }
                        .buttonStyle(SecondaryButtonStyle(compact: true))
                    Spacer()
                    Button {
                        NSPasteboard.general.clearContents()
                        NSPasteboard.general.setString(store.dataURL.path, forType: .string)
                        ui.showToast(title: "路径已复制")
                    } label: {
                        Image(systemName: "doc.on.doc")
                            .font(.system(size: 11))
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                    .help("复制数据文件路径")
                }

                if !recentBackups.isEmpty {
                    Divider().opacity(0.55)
                    VStack(alignment: .leading, spacing: 6) {
                        Text("最近备份")
                            .font(.system(size: 9.5, weight: .semibold))
                            .foregroundStyle(.tertiary)
                        ForEach(recentBackups, id: \.self) { url in
                            HStack(spacing: 7) {
                                Image(systemName: "clock.arrow.circlepath")
                                    .font(.system(size: 9))
                                    .foregroundStyle(.tertiary)
                                Text(url.lastPathComponent)
                                    .font(.system(size: 9.5, design: .monospaced))
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                                    .truncationMode(.middle)
                                Spacer()
                                Button("显示") { ExportService.reveal(url) }
                                    .buttonStyle(.plain)
                                    .font(.system(size: 9.5, weight: .medium))
                                    .foregroundStyle(Palette.accent)
                            }
                        }
                    }
                }
            }
        }
    }

    private var restoreCard: some View {
        Card(padding: 18) {
            VStack(alignment: .leading, spacing: 10) {
                CardTitle(title: "恢复备份", subtitle: "谨慎操作", icon: "arrow.counterclockwise")
                Text("从本应用导出的 JSON 备份恢复全部数据。恢复前会自动把当前数据另存一份。")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                Button {
                    chooseImport()
                } label: {
                    Label("选择 JSON 备份…", systemImage: "doc.badge.arrow.up")
                }
                .buttonStyle(SecondaryButtonStyle(compact: true))
                .padding(.top, 1)
            }
        }
    }

    private var aboutCard: some View {
        Card(padding: 18) {
            HStack(alignment: .top, spacing: 16) {
                Image(systemName: "lock.shield")
                    .font(.system(size: 16, weight: .light))
                    .foregroundStyle(Palette.accent)
                    .frame(width: 36, height: 36)
                    .background(Palette.accent.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                VStack(alignment: .leading, spacing: 4) {
                    Text("Koi 300 · 本地版 1.2.1")
                        .font(.system(size: 12.5, weight: .semibold))
                    Text("没有账号、没有云端、不发起网络请求。数据保存在 Application Support，导出文件可以在 Excel 或 Numbers 中打开。")
                        .font(.system(size: 10.5))
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer()
                Text("macOS 14+")
                    .font(.system(size: 9.5, weight: .medium))
                    .foregroundStyle(.tertiary)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 3)
                    .background(Color.primary.opacity(0.045))
                    .clipShape(Capsule())
            }
        }
    }

    private var recentBackups: [URL] {
        Array(store.backupFiles().prefix(3))
    }

    private var dataFileSize: String {
        guard let attributes = try? FileManager.default.attributesOfItem(atPath: store.dataURL.path),
              let size = attributes[.size] as? Int else { return "—" }
        return ByteCountFormatter.string(fromByteCount: Int64(size), countStyle: .file)
    }

    private func chooseImport() {
        guard let url = ExportService.chooseImportFile() else { return }
        do {
            let data = try ExportService.loadBackup(url)
            pendingImport = ImportPreview(url: url, data: data)
        } catch {
            ui.showToast(title: "无法读取备份", message: error.localizedDescription, isError: true)
        }
    }
}

private struct ImportPreview: Identifiable {
    let id = UUID()
    let url: URL
    let data: AppData

    var fileName: String { url.lastPathComponent }
    var assetCount: Int { data.assets.count }
    var tradeCount: Int { data.trades.count }
    var reviewCount: Int { data.reviews.count }
}
