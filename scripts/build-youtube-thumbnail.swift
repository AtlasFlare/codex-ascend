import AppKit
import Foundation

enum ThumbnailError: LocalizedError {
    case usage
    case unreadableImage
    case encodingFailed

    var errorDescription: String? {
        switch self {
        case .usage: return "Usage: build-youtube-thumbnail <background> <output>"
        case .unreadableImage: return "Could not read the thumbnail background."
        case .encodingFailed: return "Could not encode the thumbnail."
        }
    }
}

@main
struct YouTubeThumbnailBuilder {
    static func main() throws {
        guard CommandLine.arguments.count == 3 else { throw ThumbnailError.usage }
        guard let source = NSImage(contentsOfFile: CommandLine.arguments[1]) else {
            throw ThumbnailError.unreadableImage
        }

        let canvasSize = NSSize(width: 1280, height: 720)
        let canvas = NSImage(size: canvasSize)
        canvas.lockFocus()

        let sourceRatio = source.size.width / source.size.height
        let canvasRatio = canvasSize.width / canvasSize.height
        let drawSize: NSSize
        if sourceRatio > canvasRatio {
            drawSize = NSSize(width: canvasSize.height * sourceRatio, height: canvasSize.height)
        } else {
            drawSize = NSSize(width: canvasSize.width, height: canvasSize.width / sourceRatio)
        }
        let drawRect = NSRect(
            x: (canvasSize.width - drawSize.width) / 2,
            y: (canvasSize.height - drawSize.height) / 2,
            width: drawSize.width,
            height: drawSize.height
        )
        source.draw(in: drawRect, from: .zero, operation: .sourceOver, fraction: 1)

        let shade = NSGradient(colorsAndLocations:
            (NSColor(calibratedRed: 0.015, green: 0.045, blue: 0.065, alpha: 0.90), 0),
            (NSColor(calibratedRed: 0.015, green: 0.045, blue: 0.065, alpha: 0.62), 0.46),
            (NSColor(calibratedRed: 0.015, green: 0.045, blue: 0.065, alpha: 0.0), 0.78)
        )
        shade?.draw(in: NSRect(x: 0, y: 0, width: 930, height: 720), angle: 0)

        func drawText(_ value: String, rect: NSRect, font: NSFont, color: NSColor, tracking: CGFloat = 0) {
            let style = NSMutableParagraphStyle()
            style.alignment = .left
            NSAttributedString(string: value, attributes: [
                .font: font,
                .foregroundColor: color,
                .kern: tracking,
                .paragraphStyle: style,
            ]).draw(in: rect)
        }

        let orange = NSColor(calibratedRed: 1.0, green: 0.36, blue: 0.17, alpha: 1)
        let white = NSColor(calibratedRed: 0.97, green: 0.99, blue: 1.0, alpha: 1)
        let muted = NSColor(calibratedRed: 0.74, green: 0.88, blue: 0.92, alpha: 1)

        let badgeRect = NSRect(x: 64, y: 604, width: 365, height: 42)
        let badgePath = NSBezierPath(roundedRect: badgeRect, xRadius: 21, yRadius: 21)
        NSColor(calibratedRed: 0.02, green: 0.11, blue: 0.14, alpha: 0.86).setFill()
        badgePath.fill()
        orange.setStroke()
        badgePath.lineWidth = 2
        badgePath.stroke()
        drawText("OPENAI WEBMCP CHALLENGE", rect: NSRect(x: 88, y: 614, width: 320, height: 23), font: NSFont.systemFont(ofSize: 17, weight: .bold), color: white, tracking: 1.1)

        drawText("CODEX", rect: NSRect(x: 58, y: 408, width: 550, height: 92), font: NSFont.systemFont(ofSize: 78, weight: .black), color: white, tracking: 0.3)
        drawText("ASCEND", rect: NSRect(x: 58, y: 323, width: 600, height: 92), font: NSFont.systemFont(ofSize: 78, weight: .black), color: orange, tracking: 0.3)
        drawText("THE MISSION IS THE MOUNTAIN", rect: NSRect(x: 64, y: 268, width: 620, height: 40), font: NSFont.systemFont(ofSize: 27, weight: .bold), color: white, tracking: 0.5)

        let rule = NSBezierPath()
        rule.move(to: NSPoint(x: 64, y: 247))
        rule.line(to: NSPoint(x: 520, y: 247))
        orange.setStroke()
        rule.lineWidth = 5
        rule.stroke()

        drawText("18 native tools  •  Human authority  •  Verified Summit", rect: NSRect(x: 64, y: 194, width: 760, height: 36), font: NSFont.systemFont(ofSize: 21, weight: .semibold), color: muted)

        canvas.unlockFocus()

        guard let data = canvas.tiffRepresentation,
              let bitmap = NSBitmapImageRep(data: data),
              let encoded = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.9]) else {
            throw ThumbnailError.encodingFailed
        }
        try encoded.write(to: URL(fileURLWithPath: CommandLine.arguments[2]))
        print(CommandLine.arguments[2])
    }
}
