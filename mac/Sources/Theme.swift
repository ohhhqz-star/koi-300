import SwiftUI
import AppKit

extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: alpha
        )
    }
}

enum AppTheme: String, CaseIterable, Identifiable {
    case warm
    case blush
    case mist
    case snow
    case night

    static let storageKey = "app.theme"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .warm: return "暖米"
        case .blush: return "淡粉"
        case .mist: return "淡蓝"
        case .snow: return "纯白"
        case .night: return "黑夜"
        }
    }

    var isDark: Bool { self == .night }

    var pageHex: UInt32 {
        switch self {
        case .warm: return 0xF6F2EA
        case .blush: return 0xFBF4F2
        case .mist: return 0xF2F6F8
        case .snow: return 0xFAFAF9
        case .night: return 0x0F1315
        }
    }

    var cardHex: UInt32 {
        switch self {
        case .warm: return 0xFFFDF9
        case .blush: return 0xFFFCFB
        case .mist: return 0xFCFEFF
        case .snow: return 0xFFFFFF
        case .night: return 0x171C1E
        }
    }

    var sidebarHex: UInt32 {
        switch self {
        case .warm: return 0xF1ECE2
        case .blush: return 0xF8EFEE
        case .mist: return 0xEEF4F7
        case .snow: return 0xF4F4F2
        case .night: return 0x12171A
        }
    }

    var fieldHex: UInt32 {
        switch self {
        case .warm: return 0xF4EFE6
        case .blush: return 0xF7EFEF
        case .mist: return 0xEFF4F6
        case .snow: return 0xF6F6F4
        case .night: return 0xFFFFFF
        }
    }

    var borderHex: UInt32 {
        switch self {
        case .warm: return 0xE1D9CA
        case .blush: return 0xE9D9D9
        case .mist: return 0xD9E4EA
        case .snow: return 0xE4E3DF
        case .night: return 0xFFFFFF
        }
    }

    var accentHex: UInt32 {
        switch self {
        case .warm: return 0x1F4E4A
        case .blush: return 0x8A5A63
        case .mist: return 0x346074
        case .snow: return 0x3E3E3A
        case .night: return 0x9DC9C1
        }
    }

    var accentSolidHex: UInt32 {
        switch self {
        case .warm: return 0x1E4B43
        case .blush: return 0x7C4D56
        case .mist: return 0x2D5668
        case .snow: return 0x2A2A27
        case .night: return 0x2E5D55
        }
    }

    var accentDeepHex: UInt32 {
        switch self {
        case .warm: return 0x173F38
        case .blush: return 0x693F49
        case .mist: return 0x244757
        case .snow: return 0x20201E
        case .night: return 0x1B3734
        }
    }

    var goldHex: UInt32 {
        switch self {
        case .warm: return 0xA98852
        case .blush: return 0xB08763
        case .mist: return 0xA8895F
        case .snow: return 0x998A6D
        case .night: return 0xD4B98B
        }
    }

    var cinnabarHex: UInt32 {
        switch self {
        case .warm: return 0xA64032
        case .blush: return 0xA9483E
        case .mist: return 0xA4453B
        case .snow: return 0xA83F30
        case .night: return 0xE09484
        }
    }

    var lossHex: UInt32 {
        switch self {
        case .warm: return 0x216A4F
        case .blush: return 0x4E7460
        case .mist: return 0x2E6A58
        case .snow: return 0x306B50
        case .night: return 0x7FC7A5
        }
    }

    var preview: (page: Color, accent: Color) {
        (Color(hex: pageHex), Color(hex: accentHex))
    }

    static var stored: AppTheme {
        guard let raw = UserDefaults.standard.string(forKey: storageKey),
              let theme = AppTheme(rawValue: raw) else { return .warm }
        return theme
    }
}

enum ThemeRuntime {
    static var theme: AppTheme = .stored
}

enum Palette {
    private static func dual(
        light: UInt32,
        dark: UInt32,
        lightAlpha: Double = 1,
        darkAlpha: Double = 1
    ) -> Color {
        Color(nsColor: NSColor(name: nil) { appearance in
            let isDark = appearance.bestMatch(from: [.aqua, .darkAqua]) == .darkAqua
            let hex = isDark ? dark : light
            return NSColor(
                srgbRed: CGFloat((hex >> 16) & 0xFF) / 255,
                green: CGFloat((hex >> 8) & 0xFF) / 255,
                blue: CGFloat(hex & 0xFF) / 255,
                alpha: CGFloat(isDark ? darkAlpha : lightAlpha)
            )
        })
    }

    private static var theme: AppTheme { ThemeRuntime.theme }

    // 五套纸色，红涨绿跌沿用 A 股习惯。
    static var accentSolid: Color { Color(hex: theme.accentSolidHex) }
    static var accentDeep: Color { Color(hex: theme.accentDeepHex) }
    static var accent: Color { Color(hex: theme.accentHex) }
    static var gold: Color { Color(hex: theme.goldHex) }
    static var cinnabar: Color { Color(hex: theme.cinnabarHex) }

    static var gain: Color { cinnabar }
    static var loss: Color { Color(hex: theme.lossHex) }
    static var success: Color { loss }
    static var danger: Color { cinnabar }

    static var page: Color { Color(hex: theme.pageHex) }
    static var card: Color { Color(hex: theme.cardHex) }
    static var border: Color {
        Color(hex: theme.borderHex, alpha: theme.isDark ? 0.10 : 1)
    }
    static var hoverFill: Color {
        theme.isDark
            ? Color(hex: 0xFFFFFF, alpha: 0.06)
            : Color(hex: theme.accentHex, alpha: 0.05)
    }
    static var fieldFill: Color {
        theme.isDark
            ? Color(hex: 0xFFFFFF, alpha: 0.055)
            : Color(hex: theme.fieldHex)
    }

    static var sidebarSurface: Color { Color(hex: theme.sidebarHex) }

    static func pnl(_ value: Double) -> Color {
        if value > 0 { return gain }
        if value < 0 { return loss }
        return .secondary
    }

    static func color(light: UInt32, dark: UInt32) -> Color {
        dual(light: light, dark: dark)
    }
}

enum SheetFit {
    static func height(_ ideal: CGFloat) -> CGFloat {
        let screen = NSScreen.main?.visibleFrame.height ?? 900
        return min(ideal, max(560, screen - 96))
    }
}

// MARK: - 剪影

struct KoiSilhouette: View {
    var color: Color = Palette.gold.opacity(0.16)

    var body: some View {
        KoiShape()
            .fill(color)
            .aspectRatio(2.15, contentMode: .fit)
            .allowsHitTesting(false)
    }
}

struct KoiShape: Shape {
    private func pt(_ x: CGFloat, _ y: CGFloat, in rect: CGRect) -> CGPoint {
        CGPoint(x: rect.minX + x * rect.width, y: rect.minY + y * rect.height)
    }

    func path(in rect: CGRect) -> Path {
        var p = Path()

        // 鱼身
        p.move(to: pt(0.91, 0.48, in: rect))
        p.addCurve(
            to: pt(0.58, 0.29, in: rect),
            control1: pt(0.83, 0.35, in: rect),
            control2: pt(0.69, 0.29, in: rect)
        )
        p.addCurve(
            to: pt(0.30, 0.42, in: rect),
            control1: pt(0.49, 0.30, in: rect),
            control2: pt(0.38, 0.34, in: rect)
        )
        p.addCurve(
            to: pt(0.31, 0.56, in: rect),
            control1: pt(0.26, 0.45, in: rect),
            control2: pt(0.26, 0.53, in: rect)
        )
        p.addCurve(
            to: pt(0.58, 0.66, in: rect),
            control1: pt(0.38, 0.61, in: rect),
            control2: pt(0.48, 0.65, in: rect)
        )
        p.addCurve(
            to: pt(0.91, 0.48, in: rect),
            control1: pt(0.73, 0.68, in: rect),
            control2: pt(0.84, 0.61, in: rect)
        )
        p.closeSubpath()

        // 尾鳍
        p.move(to: pt(0.30, 0.42, in: rect))
        p.addCurve(
            to: pt(0.03, 0.24, in: rect),
            control1: pt(0.22, 0.38, in: rect),
            control2: pt(0.12, 0.29, in: rect)
        )
        p.addCurve(
            to: pt(0.09, 0.48, in: rect),
            control1: pt(0.05, 0.36, in: rect),
            control2: pt(0.06, 0.44, in: rect)
        )
        p.addCurve(
            to: pt(0.03, 0.70, in: rect),
            control1: pt(0.06, 0.54, in: rect),
            control2: pt(0.06, 0.61, in: rect)
        )
        p.addCurve(
            to: pt(0.31, 0.56, in: rect),
            control1: pt(0.13, 0.67, in: rect),
            control2: pt(0.23, 0.61, in: rect)
        )
        p.closeSubpath()

        // 背鳍
        p.move(to: pt(0.46, 0.32, in: rect))
        p.addCurve(
            to: pt(0.63, 0.17, in: rect),
            control1: pt(0.53, 0.23, in: rect),
            control2: pt(0.59, 0.17, in: rect)
        )
        p.addCurve(
            to: pt(0.61, 0.33, in: rect),
            control1: pt(0.64, 0.24, in: rect),
            control2: pt(0.63, 0.28, in: rect)
        )
        p.closeSubpath()

        // 胸鳍
        p.move(to: pt(0.49, 0.58, in: rect))
        p.addCurve(
            to: pt(0.40, 0.78, in: rect),
            control1: pt(0.45, 0.66, in: rect),
            control2: pt(0.40, 0.73, in: rect)
        )
        p.addCurve(
            to: pt(0.58, 0.64, in: rect),
            control1: pt(0.50, 0.72, in: rect),
            control2: pt(0.55, 0.68, in: rect)
        )
        p.closeSubpath()

        return p
    }
}

struct PageBackground: View {
    var body: some View {
        Palette.page.ignoresSafeArea()
    }
}

// MARK: - 容器

struct Card<Content: View>: View {
    var padding: CGFloat = 20
    @ViewBuilder var content: () -> Content

    var body: some View {
        content()
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.card)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(Palette.border, lineWidth: 1)
            )
    }
}

struct CardTitle: View {
    var title: String
    var subtitle: String? = nil
    var icon: String? = nil

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            if let icon {
                Image(systemName: icon)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Palette.accent.opacity(0.85))
            }
            Text(title)
                .font(.system(size: 14.5, weight: .semibold))
            if let subtitle {
                Text(subtitle)
                    .font(.system(size: 10.5))
                    .foregroundStyle(.tertiary)
            }
            Spacer(minLength: 8)
        }
    }
}

struct PageHeader<Trailing: View>: View {
    var title: String
    var subtitle: String?
    @ViewBuilder var trailing: () -> Trailing

    init(_ title: String, subtitle: String? = nil, @ViewBuilder trailing: @escaping () -> Trailing) {
        self.title = title
        self.subtitle = subtitle
        self.trailing = trailing
    }

    var body: some View {
        HStack(alignment: .center, spacing: 16) {
            VStack(alignment: .leading, spacing: 5) {
                Text(title)
                    .font(.system(size: 26, weight: .semibold))
                if let subtitle {
                    Text(subtitle)
                        .font(.system(size: 12.5))
                        .foregroundStyle(.secondary)
                }
            }
            Spacer(minLength: 20)
            HStack(spacing: 10) { trailing() }
        }
    }
}

struct Pill: View {
    var text: String
    var tint: Color = Palette.accent
    var filled: Bool = false

    var body: some View {
        Text(text)
            .font(.system(size: 10.5, weight: .semibold))
            .foregroundStyle(filled ? Color(hex: 0xFBF3E3) : tint)
            .padding(.horizontal, 8)
            .padding(.vertical, 3.5)
            .background(
                Capsule(style: .continuous)
                    .fill(filled ? tint : tint.opacity(0.09))
            )
    }
}

struct SearchField: View {
    var placeholder: String = "搜索名称、代码或账户"
    @Binding var text: String
    @FocusState private var focused: Bool

    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(focused ? Palette.accent : Color.secondary)
            TextField(placeholder, text: $text)
                .textFieldStyle(.plain)
                .font(.system(size: 12.5))
                .focused($focused)
            if !text.isEmpty {
                Button {
                    text = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 11))
                        .foregroundStyle(.tertiary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 10)
        .frame(height: 30)
        .background(Palette.fieldFill)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .strokeBorder(focused ? Palette.accent.opacity(0.55) : Palette.border, lineWidth: 1)
        )
    }
}

struct FilterMenu: View {
    var options: [String]
    @Binding var selection: String

    var body: some View {
        Menu {
            ForEach(options, id: \.self) { option in
                Button {
                    selection = option
                } label: {
                    if selection == option {
                        Label(option, systemImage: "checkmark")
                    } else {
                        Text(option)
                    }
                }
            }
        } label: {
            HStack(spacing: 6) {
                Text(selection)
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                Spacer(minLength: 2)
                Image(systemName: "chevron.down")
                    .font(.system(size: 8, weight: .semibold))
                    .foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 10)
            .frame(height: 30)
            .background(Palette.fieldFill)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .strokeBorder(Palette.border, lineWidth: 1)
            )
            .contentShape(Rectangle())
        }
        .menuStyle(.button)
        .buttonStyle(.plain)
        .menuIndicator(.hidden)
    }
}

struct EmptyState: View {
    var icon: String
    var title: String
    var message: String
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 23, weight: .light))
                .foregroundStyle(Palette.accent.opacity(0.8))
                .frame(width: 52, height: 52)
                .background(Palette.accent.opacity(0.06))
                .clipShape(Circle())
            Text(title)
                .font(.system(size: 15, weight: .semibold))
            Text(message)
                .font(.system(size: 12.5))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 380)
                .fixedSize(horizontal: false, vertical: true)
            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .buttonStyle(PrimaryButtonStyle(compact: true))
                    .padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 34)
    }
}

struct ToastView: View {
    var toast: ToastInfo
    var onReveal: (URL) -> Void
    var onClose: () -> Void

    private var tint: Color { toast.isError ? Palette.danger : Palette.success }

    var body: some View {
        HStack(alignment: .top, spacing: 11) {
            Image(systemName: toast.isError ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(tint)
                .padding(.top, 1)
            VStack(alignment: .leading, spacing: 3) {
                Text(toast.title)
                    .font(.system(size: 12.5, weight: .semibold))
                if let message = toast.message {
                    Text(message)
                        .font(.system(size: 11.5))
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                if let url = toast.folderURL {
                    Button("在 Finder 中显示") { onReveal(url) }
                        .buttonStyle(.plain)
                        .font(.system(size: 11.5, weight: .semibold))
                        .foregroundStyle(Palette.accent)
                        .padding(.top, 3)
                }
            }
            Spacer(minLength: 6)
            Button(action: onClose) {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(.tertiary)
            }
            .buttonStyle(.plain)
        }
        .padding(13)
        .frame(width: 330, alignment: .leading)
        .background(Palette.card)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(Palette.border, lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.10), radius: 16, y: 7)
    }
}

// MARK: - 按钮与弹窗

struct PrimaryButtonStyle: ButtonStyle {
    var compact: Bool = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: compact ? 12.5 : 13.5, weight: .semibold))
            .foregroundStyle(Color(hex: 0xFBF3E3))
            .padding(.horizontal, compact ? 13 : 17)
            .frame(height: compact ? 30 : 36)
            .background(
                Capsule(style: .continuous)
                    .fill(Palette.accentSolid.opacity(configuration.isPressed ? 0.86 : 1))
            )
            .contentShape(Capsule())
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    var compact: Bool = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: compact ? 12.5 : 13.5, weight: .semibold))
            .foregroundStyle(.primary)
            .padding(.horizontal, compact ? 13 : 17)
            .frame(height: compact ? 30 : 36)
            .background(
                Capsule(style: .continuous)
                    .fill(configuration.isPressed ? Palette.hoverFill : Palette.card)
            )
            .overlay(
                Capsule(style: .continuous)
                    .strokeBorder(Palette.border, lineWidth: 1)
            )
            .contentShape(Capsule())
    }
}

struct SheetChrome<Content: View>: View {
    var title: String
    var subtitle: String?
    var saveTitle: String = "保存"
    var canSave: Bool = true
    var onCancel: () -> Void
    var onSave: () -> Void
    var onDelete: (() -> Void)? = nil
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: 16) {
                VStack(alignment: .leading, spacing: 5) {
                    Text(title)
                        .font(.system(size: 21, weight: .semibold))
                    if let subtitle {
                        Text(subtitle)
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer()
                Button(action: onCancel) {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.secondary)
                        .frame(width: 28, height: 28)
                        .background(Palette.hoverFill)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .keyboardShortcut(.cancelAction)
            }
            .padding(.horizontal, 26)
            .padding(.top, 22)
            .padding(.bottom, 18)

            Divider().overlay(Palette.border)

            ScrollView {
                content()
                    .padding(.horizontal, 26)
                    .padding(.vertical, 22)
            }

            Divider().overlay(Palette.border)

            HStack(spacing: 10) {
                if let onDelete {
                    Button("删除这条记录", action: onDelete)
                        .buttonStyle(.plain)
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(Palette.danger)
                }
                Spacer()
                Button("取消", action: onCancel)
                    .buttonStyle(SecondaryButtonStyle(compact: true))
                Button(saveTitle, action: onSave)
                    .buttonStyle(PrimaryButtonStyle(compact: true))
                    .disabled(!canSave)
                    .opacity(canSave ? 1 : 0.45)
                    .keyboardShortcut(.defaultAction)
            }
            .padding(.horizontal, 26)
            .padding(.vertical, 15)
        }
        .background(PageBackground())
    }
}

// MARK: - 表单

struct FormSection<Content: View>: View {
    var title: String
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 13) {
            Text(title)
                .font(.system(size: 11.5, weight: .semibold))
                .foregroundStyle(Palette.accent)
            content()
        }
        .padding(17)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.card)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(Palette.border, lineWidth: 1)
        )
    }
}

struct FormRow<Content: View>: View {
    var label: String
    @ViewBuilder var content: () -> Content

    var body: some View {
        HStack(alignment: .center, spacing: 14) {
            Text(label)
                .font(.system(size: 12.5))
                .foregroundStyle(.secondary)
                .frame(width: 86, alignment: .leading)
            content()
                .frame(maxWidth: .infinity)
        }
    }
}

struct FormColumn<Content: View>: View {
    var label: String
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
            content()
        }
    }
}

struct BareTextField: View {
    var placeholder: String
    @Binding var text: String
    var monospaced: Bool = false
    @FocusState private var focused: Bool

    var body: some View {
        TextField(placeholder, text: $text)
            .textFieldStyle(.plain)
            .font(.system(size: 12.5, design: monospaced ? .monospaced : .default))
            .padding(.horizontal, 10)
            .frame(height: 32)
            .background(Palette.fieldFill)
            .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 7, style: .continuous)
                    .strokeBorder(focused ? Palette.accent.opacity(0.55) : Palette.border, lineWidth: 1)
            )
            .focused($focused)
    }
}

struct BareTextEditor: View {
    var placeholder: String
    @Binding var text: String
    var minHeight: CGFloat = 68
    @FocusState private var focused: Bool

    var body: some View {
        ZStack(alignment: .topLeading) {
            if text.isEmpty {
                Text(placeholder)
                    .font(.system(size: 12.5))
                    .foregroundStyle(.tertiary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 9)
            }
            TextEditor(text: $text)
                .font(.system(size: 12.5))
                .scrollContentBackground(.hidden)
                .padding(.horizontal, 5)
                .padding(.vertical, 3)
                .frame(minHeight: minHeight)
                .focused($focused)
        }
        .background(Palette.fieldFill)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .strokeBorder(focused ? Palette.accent.opacity(0.55) : Palette.border, lineWidth: 1)
        )
    }
}

struct StyledPicker<Value: Hashable>: View {
    var options: [(title: String, value: Value)]
    @Binding var selection: Value

    private var selectedTitle: String {
        options.first { $0.value == selection }?.title ?? "—"
    }

    var body: some View {
        Menu {
            ForEach(options, id: \.value) { option in
                Button {
                    selection = option.value
                } label: {
                    if option.value == selection {
                        Label(option.title, systemImage: "checkmark")
                    } else {
                        Text(option.title)
                    }
                }
            }
        } label: {
            HStack(spacing: 6) {
                Text(selectedTitle)
                    .font(.system(size: 12.5))
                    .lineLimit(1)
                Spacer(minLength: 4)
                Image(systemName: "chevron.down")
                    .font(.system(size: 8.5, weight: .semibold))
                    .foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 10)
            .frame(height: 32)
            .background(Palette.fieldFill)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .strokeBorder(Palette.border, lineWidth: 1)
            )
            .contentShape(Rectangle())
        }
        .menuStyle(.button)
        .buttonStyle(.plain)
        .menuIndicator(.hidden)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct IconMenu<Content: View>: View {
    @ViewBuilder var content: () -> Content

    var body: some View {
        Menu {
            content()
        } label: {
            Image(systemName: "ellipsis")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.secondary)
                .frame(width: 24, height: 24)
                .contentShape(Rectangle())
        }
        .menuStyle(.button)
        .buttonStyle(.plain)
        .menuIndicator(.hidden)
        .fixedSize()
    }
}

struct ThemePicker: View {
    @AppStorage(AppTheme.storageKey) private var stored = AppTheme.warm.rawValue

    private var current: AppTheme { AppTheme(rawValue: stored) ?? .warm }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("纸色")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(.tertiary)
                Spacer()
                Text(current.title)
                    .font(.system(size: 10))
                    .foregroundStyle(.secondary)
            }
            HStack(spacing: 8) {
                ForEach(AppTheme.allCases) { theme in
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            stored = theme.rawValue
                        }
                    } label: {
                        ZStack {
                            Circle().fill(theme.preview.page)
                            Circle()
                                .fill(theme.preview.accent)
                                .frame(width: 5, height: 5)
                            Circle()
                                .strokeBorder(
                                    theme == current ? theme.preview.accent : Palette.border,
                                    lineWidth: theme == current ? 1.6 : 1
                                )
                        }
                        .frame(width: 17, height: 17)
                        .padding(3)
                        .overlay {
                            if theme == current {
                                Circle()
                                    .strokeBorder(theme.preview.accent.opacity(0.35), lineWidth: 1)
                            }
                        }
                        .contentShape(Circle())
                    }
                    .buttonStyle(.plain)
                    .help(theme.title)
                }
                Spacer(minLength: 0)
            }
        }
    }
}
