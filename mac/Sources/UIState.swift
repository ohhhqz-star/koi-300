import Foundation
import SwiftUI

enum SidebarSection: String, CaseIterable, Identifiable {
    case overview
    case holdings
    case trades
    case reviews
    case plans
    case data

    var id: String { rawValue }

    var title: String {
        switch self {
        case .overview: return "概览"
        case .holdings: return "当前持仓"
        case .trades: return "操作记录"
        case .reviews: return "每日复盘"
        case .plans: return "定投计划"
        case .data: return "数据与导出"
        }
    }

    var icon: String {
        switch self {
        case .overview: return "square.grid.2x2"
        case .holdings: return "chart.pie"
        case .trades: return "arrow.left.arrow.right"
        case .reviews: return "book.closed"
        case .plans: return "calendar.badge.clock"
        case .data: return "externaldrive"
        }
    }
}

enum ModalRoute: Identifiable {
    case asset(Asset?)
    case trade(Trade?)
    case review(DailyReview?)
    case plan(DcaPlan?)

    var id: String {
        switch self {
        case .asset(let value): return "asset-\(value?.id.uuidString ?? "new")"
        case .trade(let value): return "trade-\(value?.id.uuidString ?? "new")"
        case .review(let value): return "review-\(value?.id.uuidString ?? "new")"
        case .plan(let value): return "plan-\(value?.id.uuidString ?? "new")"
        }
    }
}

struct ToastInfo: Identifiable {
    let id = UUID()
    var title: String
    var message: String?
    var folderURL: URL?
    var isError: Bool = false
}

@MainActor
final class AppUI: ObservableObject {
    @Published var section: SidebarSection
    @Published var modal: ModalRoute?
    @Published var toast: ToastInfo?

    init() {
        let args = ProcessInfo.processInfo.arguments
        if let index = args.firstIndex(of: "--section"), index + 1 < args.count,
           let parsed = SidebarSection(rawValue: args[index + 1]) {
            section = parsed
        } else {
            section = .overview
        }
    }

    func showToast(title: String, message: String? = nil, folderURL: URL? = nil, isError: Bool = false) {
        withAnimation(.spring(response: 0.32, dampingFraction: 0.86)) {
            toast = ToastInfo(title: title, message: message, folderURL: folderURL, isError: isError)
        }
    }

    func openTodayReview(store: AppStore) {
        if let existing = store.review(on: DateFmt.today()) {
            modal = .review(existing)
        } else {
            modal = .review(nil)
        }
    }
}
