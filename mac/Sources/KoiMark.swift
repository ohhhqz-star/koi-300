import SwiftUI

struct KoiMark: View {
    var bodyColor: Color = Color(hex: 0xF3E9D6)
    var eyeColor: Color = Color(hex: 0x2C5D57)
    var accentColor: Color = Color(hex: 0xB06A4F)

    var body: some View {
        Canvas { context, size in
            let scale = min(size.width, size.height) / 512
            context.scaleBy(x: scale, y: scale)
            context.fill(bodyPath, with: .color(bodyColor))
            context.fill(circle(x: 378, y: 210, radius: 8), with: .color(eyeColor))
            context.fill(circle(x: 381, y: 207, radius: 2.6), with: .color(bodyColor))
            context.fill(circle(x: 424, y: 104, radius: 24), with: .color(accentColor))
        }
        .accessibilityLabel("复盘 300")
    }

    private var bodyPath: Path {
        Path { p in
            p.move(to: CGPoint(x: 415, y: 225))
            p.addCurve(to: CGPoint(x: 332, y: 170), control1: CGPoint(x: 402, y: 190), control2: CGPoint(x: 370, y: 172))
            p.addCurve(to: CGPoint(x: 198, y: 222), control1: CGPoint(x: 280, y: 168), control2: CGPoint(x: 232, y: 188))
            p.addCurve(to: CGPoint(x: 172, y: 252), control1: CGPoint(x: 186, y: 234), control2: CGPoint(x: 178, y: 244))
            p.addCurve(to: CGPoint(x: 84, y: 190), control1: CGPoint(x: 144, y: 226), control2: CGPoint(x: 114, y: 206))
            p.addCurve(to: CGPoint(x: 132, y: 272), control1: CGPoint(x: 104, y: 218), control2: CGPoint(x: 120, y: 248))
            p.addCurve(to: CGPoint(x: 80, y: 354), control1: CGPoint(x: 116, y: 310), control2: CGPoint(x: 104, y: 334))
            p.addCurve(to: CGPoint(x: 172, y: 302), control1: CGPoint(x: 116, y: 330), control2: CGPoint(x: 142, y: 318))
            p.addCurve(to: CGPoint(x: 306, y: 348), control1: CGPoint(x: 210, y: 340), control2: CGPoint(x: 258, y: 356))
            p.addCurve(to: CGPoint(x: 415, y: 258), control1: CGPoint(x: 352, y: 340), control2: CGPoint(x: 392, y: 304))
            p.addCurve(to: CGPoint(x: 415, y: 225), control1: CGPoint(x: 420, y: 244), control2: CGPoint(x: 420, y: 234))
            p.closeSubpath()

            p.move(to: CGPoint(x: 304, y: 180))
            p.addCurve(to: CGPoint(x: 356, y: 136), control1: CGPoint(x: 312, y: 148), control2: CGPoint(x: 332, y: 130))
            p.addCurve(to: CGPoint(x: 330, y: 180), control1: CGPoint(x: 348, y: 154), control2: CGPoint(x: 338, y: 168))
            p.closeSubpath()

            p.move(to: CGPoint(x: 322, y: 320))
            p.addCurve(to: CGPoint(x: 274, y: 378), control1: CGPoint(x: 318, y: 344), control2: CGPoint(x: 300, y: 366))
            p.addCurve(to: CGPoint(x: 322, y: 320), control1: CGPoint(x: 282, y: 352), control2: CGPoint(x: 296, y: 332))
            p.closeSubpath()
        }
    }

    private func circle(x: CGFloat, y: CGFloat, radius: CGFloat) -> Path {
        Path(ellipseIn: CGRect(x: x - radius, y: y - radius, width: radius * 2, height: radius * 2))
    }
}
