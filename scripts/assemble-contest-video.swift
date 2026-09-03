import AVFoundation
import AppKit
import CoreGraphics
import Foundation
import QuartzCore

struct VisualSegment {
    let filename: String
    let sourceStart: Double
    let timelineStart: Double
    let duration: Double
}

enum AssemblyError: LocalizedError {
    case missingTrack(String)
    case segmentTooShort(String, Double, Double)
    case cannotCreateTrack
    case cannotCreateExporter
    case exportFailed(String)

    var errorDescription: String? {
        switch self {
        case let .missingTrack(path):
            return "No usable media track in \(path)."
        case let .segmentTooShort(path, available, requested):
            return "\(path) has \(available)s available, but the edit requests \(requested)s."
        case .cannotCreateTrack:
            return "Could not create composition tracks."
        case .cannotCreateExporter:
            return "Could not create the video exporter."
        case let .exportFailed(message):
            return "Video export failed: \(message)"
        }
    }
}

@main
struct ContestVideoAssembler {
    static func seconds(_ value: Double) -> CMTime {
        CMTime(seconds: value, preferredTimescale: 600)
    }

    static func main() async throws {
        let repository = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        let captures = repository.appendingPathComponent("artifacts/video/captures")
        let voiceover = repository.appendingPathComponent("artifacts/video/voiceover/codex-ascend-voiceover.wav")
        let outputDirectory = repository.appendingPathComponent("artifacts/video/final")
        let output = outputDirectory.appendingPathComponent("codex-ascend-webmcp-challenge-demo.mp4")

        try FileManager.default.createDirectory(at: outputDirectory, withIntermediateDirectories: true)
        if FileManager.default.fileExists(atPath: output.path) {
            try FileManager.default.removeItem(at: output)
        }

        // The cut follows the narration chapter boundaries. Source overlaps are intentional:
        // they let the tool catalog reveal bridge cleanly into the evidence sequence.
        let segments = [
            VisualSegment(filename: "02-evidence-blocker.mov", sourceStart: 0.0, timelineStart: 0.0, duration: 16.55),
            VisualSegment(filename: "01-basecamp-webmcp-reveal.mov", sourceStart: 0.0, timelineStart: 16.55, duration: 16.50),
            VisualSegment(filename: "01-basecamp-webmcp-reveal.mov", sourceStart: 11.85, timelineStart: 33.05, duration: 20.15),
            VisualSegment(filename: "02-evidence-blocker.mov", sourceStart: 7.0, timelineStart: 53.20, duration: 20.75),
            VisualSegment(filename: "05-human-agent-loop.mov", sourceStart: 0.0, timelineStart: 73.95, duration: 33.40),
            VisualSegment(filename: "06-topology-elevation-v3.mov", sourceStart: 10.50, timelineStart: 107.35, duration: 17.50),
            VisualSegment(filename: "07-verified-summit.mov", sourceStart: 6.65, timelineStart: 124.85, duration: 19.35),
        ]

        let composition = AVMutableComposition()
        guard let videoTrack = composition.addMutableTrack(
            withMediaType: .video,
            preferredTrackID: kCMPersistentTrackID_Invalid
        ), let narrationTrack = composition.addMutableTrack(
            withMediaType: .audio,
            preferredTrackID: kCMPersistentTrackID_Invalid
        ) else {
            throw AssemblyError.cannotCreateTrack
        }

        var sourceTransform: CGAffineTransform?

        for segment in segments {
            let url = captures.appendingPathComponent(segment.filename)
            let asset = AVURLAsset(url: url)
            guard let sourceTrack = try await asset.loadTracks(withMediaType: .video).first else {
                throw AssemblyError.missingTrack(url.path)
            }
            let available = try await asset.load(.duration).seconds - segment.sourceStart
            guard available + 0.05 >= segment.duration else {
                throw AssemblyError.segmentTooShort(url.lastPathComponent, available, segment.duration)
            }
            if sourceTransform == nil {
                sourceTransform = try await sourceTrack.load(.preferredTransform)
            }
            try videoTrack.insertTimeRange(
                CMTimeRange(start: seconds(segment.sourceStart), duration: seconds(segment.duration)),
                of: sourceTrack,
                at: seconds(segment.timelineStart)
            )
        }

        let narrationAsset = AVURLAsset(url: voiceover)
        guard let sourceNarration = try await narrationAsset.loadTracks(withMediaType: .audio).first else {
            throw AssemblyError.missingTrack(voiceover.path)
        }
        let narrationDuration = try await narrationAsset.load(.duration)
        try narrationTrack.insertTimeRange(
            CMTimeRange(start: .zero, duration: narrationDuration),
            of: sourceNarration,
            at: .zero
        )

        let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: videoTrack)
        // Isolate the in-app browser panel, then place it on a clean judge-ready 1080p canvas.
        let preferred = sourceTransform ?? .identity
        let panelTransform = CGAffineTransform(a: 1.28, b: 0, c: 0, d: 1.28, tx: -575, ty: -136)
        let cropAndScale = preferred.concatenating(panelTransform)
        layerInstruction.setTransform(cropAndScale, at: .zero)

        let instruction = AVMutableVideoCompositionInstruction()
        instruction.timeRange = CMTimeRange(start: .zero, duration: seconds(144.20))
        instruction.layerInstructions = [layerInstruction]

        let videoComposition = AVMutableVideoComposition()
        videoComposition.instructions = [instruction]
        videoComposition.renderSize = CGSize(width: 1920, height: 1080)
        videoComposition.frameDuration = CMTime(value: 1, timescale: 30)

        let parentLayer = CALayer()
        parentLayer.frame = CGRect(x: 0, y: 0, width: 1920, height: 1080)
        parentLayer.backgroundColor = CGColor(red: 0.018, green: 0.071, blue: 0.105, alpha: 1)

        let videoLayer = CALayer()
        videoLayer.frame = parentLayer.frame
        parentLayer.addSublayer(videoLayer)

        func panel(x: CGFloat, width: CGFloat) -> CALayer {
            let layer = CALayer()
            layer.frame = CGRect(x: x, y: 0, width: width, height: 1080)
            layer.backgroundColor = CGColor(red: 0.018, green: 0.071, blue: 0.105, alpha: 1)
            return layer
        }

        let leftPanel = panel(x: 0, width: 536)
        let rightPanel = panel(x: 1384, width: 536)
        parentLayer.addSublayer(leftPanel)
        parentLayer.addSublayer(rightPanel)

        func textLayer(
            _ text: String,
            frame: CGRect,
            size: CGFloat,
            color: CGColor,
            weight: CFString = "AvenirNext-DemiBold" as CFString,
            alignment: CATextLayerAlignmentMode = .left
        ) -> CALayer {
            let fontName = weight as String
            let font = NSFont(name: fontName, size: size) ?? NSFont.systemFont(ofSize: size, weight: .semibold)
            let paragraph = NSMutableParagraphStyle()
            paragraph.alignment = alignment == .center ? .center : alignment == .right ? .right : .left
            let image = NSImage(size: frame.size)
            image.lockFocus()
            NSAttributedString(
                string: text,
                attributes: [
                    .font: font,
                    .foregroundColor: NSColor(cgColor: color) ?? .white,
                    .paragraphStyle: paragraph,
                ]
            ).draw(in: CGRect(origin: .zero, size: frame.size))
            image.unlockFocus()
            var imageRect = CGRect(origin: .zero, size: frame.size)
            let layer = CALayer()
            layer.frame = frame
            layer.contents = image.cgImage(forProposedRect: &imageRect, context: nil, hints: nil)
            layer.contentsGravity = .resizeAspect
            return layer
        }

        let white = CGColor(red: 0.92, green: 0.97, blue: 0.98, alpha: 1)
        let muted = CGColor(red: 0.50, green: 0.69, blue: 0.75, alpha: 1)
        let orange = CGColor(red: 1.0, green: 0.36, blue: 0.16, alpha: 1)

        parentLayer.addSublayer(textLayer("CODEX", frame: CGRect(x: 72, y: 905, width: 390, height: 52), size: 28, color: muted))
        parentLayer.addSublayer(textLayer("ASCEND", frame: CGRect(x: 72, y: 835, width: 390, height: 76), size: 54, color: white))
        parentLayer.addSublayer(textLayer("THE MISSION IS\nTHE MOUNTAIN", frame: CGRect(x: 72, y: 720, width: 380, height: 92), size: 25, color: orange))
        parentLayer.addSublayer(textLayer("REAL TOOL CALLS\nLIVE EXPERIENCE", frame: CGRect(x: 72, y: 92, width: 390, height: 76), size: 20, color: muted))

        parentLayer.addSublayer(textLayer("OPENAI", frame: CGRect(x: 1455, y: 905, width: 390, height: 52), size: 27, color: muted))
        parentLayer.addSublayer(textLayer("WEBMCP", frame: CGRect(x: 1455, y: 835, width: 390, height: 76), size: 48, color: white))
        parentLayer.addSublayer(textLayer("AGENT + HUMAN\nVERIFIED EXECUTION", frame: CGRect(x: 1455, y: 720, width: 390, height: 92), size: 23, color: orange))
        parentLayer.addSublayer(textLayer("BASECAMP  →  SUMMIT", frame: CGRect(x: 1455, y: 92, width: 390, height: 42), size: 20, color: muted))

        let leftRule = CALayer()
        leftRule.frame = CGRect(x: 534, y: 0, width: 2, height: 1080)
        leftRule.backgroundColor = orange
        parentLayer.addSublayer(leftRule)
        let rightRule = CALayer()
        rightRule.frame = CGRect(x: 1384, y: 0, width: 2, height: 1080)
        rightRule.backgroundColor = orange
        parentLayer.addSublayer(rightRule)

        let chapters: [(String, Double, Double)] = [
            ("01  LIVE BLOCKER", 0.0, 16.55),
            ("02  BASECAMP", 16.55, 16.50),
            ("03  WEBMCP TOOLS", 33.05, 20.15),
            ("04  EVIDENCE GATE", 53.20, 20.75),
            ("05  HUMAN DECISION", 73.95, 33.40),
            ("06  SCOPE EXPANDS", 107.35, 17.50),
            ("07  VERIFIED SUMMIT", 124.85, 19.35),
        ]
        for (title, start, duration) in chapters {
            let chapter = textLayer(title, frame: CGRect(x: 72, y: 500, width: 390, height: 54), size: 23, color: white)
            chapter.opacity = 0
            let fade = CAKeyframeAnimation(keyPath: "opacity")
            fade.values = [0, 1, 1, 0]
            fade.keyTimes = [0, 0.04, 0.93, 1]
            fade.beginTime = AVCoreAnimationBeginTimeAtZero + start
            fade.duration = duration
            fade.isRemovedOnCompletion = false
            fade.fillMode = .both
            chapter.add(fade, forKey: "chapter")
            parentLayer.addSublayer(chapter)
        }

        videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(
            postProcessingAsVideoLayer: videoLayer,
            in: parentLayer
        )

        guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
            throw AssemblyError.cannotCreateExporter
        }
        exporter.videoComposition = videoComposition
        exporter.shouldOptimizeForNetworkUse = true

        do {
            try await exporter.export(to: output, as: .mp4)
        } catch {
            throw AssemblyError.exportFailed(error.localizedDescription)
        }

        let finalAsset = AVURLAsset(url: output)
        let finalDuration = try await finalAsset.load(.duration).seconds
        print("Created \(output.path)")
        print(String(format: "Duration: %.2f seconds", finalDuration))
    }
}
