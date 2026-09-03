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

struct ChapterCard {
    let number: String
    let title: String
    let call: String
    let result: String
    let start: Double
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
struct ContestVideoAssemblerV2 {
    static let totalDuration = 135.0

    static func seconds(_ value: Double) -> CMTime {
        CMTime(seconds: value, preferredTimescale: 600)
    }

    static func main() async throws {
        let isV3 = CommandLine.arguments.contains("--v3")
        let outputV3 = isV3 || CommandLine.arguments.contains("--output-v3")
        let enableTransitions = isV3 && !CommandLine.arguments.contains("--no-transitions")
        let useV3Audio = isV3 && !CommandLine.arguments.contains("--legacy-audio")
        let useV3Frame = isV3 && !CommandLine.arguments.contains("--legacy-frame")
        let repository = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        let captures = repository.appendingPathComponent("artifacts/video/captures")
        let voiceover = repository.appendingPathComponent("artifacts/video/voiceover/codex-ascend-v2-voiceover/codex-ascend-v2-voiceover.wav")
        let music = repository.appendingPathComponent("artifacts/video/music/mountains-by-andrew-ev-mixkit.mp3")
        let outputDirectory = repository.appendingPathComponent("artifacts/video/final")
        let output = outputDirectory.appendingPathComponent(outputV3
            ? "codex-ascend-webmcp-challenge-demo-v3.mp4"
            : "codex-ascend-webmcp-challenge-demo-v2.mp4")

        try FileManager.default.createDirectory(at: outputDirectory, withIntermediateDirectories: true)
        if FileManager.default.fileExists(atPath: output.path) {
            try FileManager.default.removeItem(at: output)
        }

        // Each source selection ends on the visual consequence discussed by the narration.
        let segments = [
            VisualSegment(filename: "02-evidence-blocker.mov", sourceStart: 10.0, timelineStart: 0.0, duration: 17.95),
            VisualSegment(filename: "01-basecamp-webmcp-reveal.mov", sourceStart: 0.0, timelineStart: 17.95, duration: 24.25),
            VisualSegment(filename: "02-evidence-blocker.mov", sourceStart: 0.0, timelineStart: 42.2, duration: 24.8),
            VisualSegment(filename: "05-human-agent-loop.mov", sourceStart: 0.0, timelineStart: 67.0, duration: 26.5),
            VisualSegment(filename: "06-topology-elevation-v3.mov", sourceStart: 5.73, timelineStart: 93.5, duration: 22.25),
            VisualSegment(filename: "07-verified-summit.mov", sourceStart: 6.74, timelineStart: 115.75, duration: 19.25),
        ]

        let composition = AVMutableComposition()
        guard let videoTrack = composition.addMutableTrack(
            withMediaType: .video,
            preferredTrackID: kCMPersistentTrackID_Invalid
        ), let narrationTrack = composition.addMutableTrack(
            withMediaType: .audio,
            preferredTrackID: kCMPersistentTrackID_Invalid
        ), let musicTrack = composition.addMutableTrack(
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
        try narrationTrack.insertTimeRange(
            CMTimeRange(start: .zero, duration: seconds(totalDuration)),
            of: sourceNarration,
            at: .zero
        )

        let musicAsset = AVURLAsset(url: music)
        guard let sourceMusic = try await musicAsset.loadTracks(withMediaType: .audio).first else {
            throw AssemblyError.missingTrack(music.path)
        }
        // Start twelve seconds into the track to enter on its settled, gentler texture.
        try musicTrack.insertTimeRange(
            CMTimeRange(start: seconds(12), duration: seconds(totalDuration)),
            of: sourceMusic,
            at: .zero
        )

        let audioMix = AVMutableAudioMix()
        let narrationMix = AVMutableAudioMixInputParameters(track: narrationTrack)
        narrationMix.setVolume(1.0, at: .zero)
        let musicMix = AVMutableAudioMixInputParameters(track: musicTrack)
        if useV3Audio {
            musicMix.setVolumeRamp(fromStartVolume: 0.0, toEndVolume: 0.07, timeRange: CMTimeRange(start: .zero, duration: seconds(2.0)))
            musicMix.setVolume(0.07, at: seconds(2.0))
            musicMix.setVolumeRamp(fromStartVolume: 0.07, toEndVolume: 0.055, timeRange: CMTimeRange(start: seconds(41.8), duration: seconds(0.4)))
            musicMix.setVolume(0.055, at: seconds(42.2))
            musicMix.setVolumeRamp(fromStartVolume: 0.055, toEndVolume: 0.072, timeRange: CMTimeRange(start: seconds(66.6), duration: seconds(0.4)))
            musicMix.setVolume(0.072, at: seconds(67.0))
            musicMix.setVolumeRamp(fromStartVolume: 0.072, toEndVolume: 0.082, timeRange: CMTimeRange(start: seconds(93.1), duration: seconds(0.4)))
            musicMix.setVolume(0.082, at: seconds(93.5))
            musicMix.setVolumeRamp(fromStartVolume: 0.082, toEndVolume: 0.076, timeRange: CMTimeRange(start: seconds(115.35), duration: seconds(0.4)))
            musicMix.setVolume(0.076, at: seconds(115.75))
            musicMix.setVolumeRamp(fromStartVolume: 0.076, toEndVolume: 0.0, timeRange: CMTimeRange(start: seconds(132.0), duration: seconds(3.0)))
        } else {
            musicMix.setVolumeRamp(fromStartVolume: 0.0, toEndVolume: 0.04, timeRange: CMTimeRange(start: .zero, duration: seconds(2.0)))
            musicMix.setVolume(0.04, at: seconds(2.0))
            musicMix.setVolumeRamp(fromStartVolume: 0.04, toEndVolume: 0.0, timeRange: CMTimeRange(start: seconds(132.0), duration: seconds(3.0)))
        }
        audioMix.inputParameters = [narrationMix, musicMix]

        let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: videoTrack)
        let preferred = sourceTransform ?? .identity
        // Reframe the captured in-app browser to the product viewport itself.
        // This removes the browser import prompt while keeping the live app and controls visible.
        let panelTransform = useV3Frame
            ? CGAffineTransform(a: 1.5, b: 0, c: 0, d: 1.5, tx: -800, ty: -360)
            : CGAffineTransform(a: 1.28, b: 0, c: 0, d: 1.28, tx: -575, ty: -307)
        layerInstruction.setTransform(preferred.concatenating(panelTransform), at: .zero)

        let instruction = AVMutableVideoCompositionInstruction()
        instruction.timeRange = CMTimeRange(start: .zero, duration: seconds(totalDuration))
        instruction.layerInstructions = [layerInstruction]

        let videoComposition = AVMutableVideoComposition()
        videoComposition.instructions = [instruction]
        videoComposition.renderSize = CGSize(width: 1920, height: 1080)
        videoComposition.frameDuration = CMTime(value: 1, timescale: 30)

        let parentLayer = CALayer()
        parentLayer.frame = CGRect(x: 0, y: 0, width: 1920, height: 1080)
        parentLayer.backgroundColor = CGColor(red: 0.015, green: 0.061, blue: 0.091, alpha: 1)

        let videoLayer = CALayer()
        videoLayer.frame = parentLayer.frame
        parentLayer.addSublayer(videoLayer)

        if enableTransitions {
            // A short atmospheric dissolve masks source cuts while the fixed
            // judging frame remains stable and readable.
            for boundary in [17.95, 42.2, 67.0, 93.5, 115.75] {
                let transitionLayer = CALayer()
                transitionLayer.frame = CGRect(x: 463, y: 0, width: 994, height: 1080)
                transitionLayer.backgroundColor = CGColor(red: 0.46, green: 0.67, blue: 0.76, alpha: 1)
                transitionLayer.opacity = 0
                let transition = CAKeyframeAnimation(keyPath: "opacity")
                transition.values = [0, 0.68, 0.68, 0]
                transition.keyTimes = [0, 0.42, 0.58, 1]
                transition.beginTime = AVCoreAnimationBeginTimeAtZero + boundary - 0.28
                transition.duration = 0.56
                transition.isRemovedOnCompletion = false
                transition.fillMode = .both
                transitionLayer.add(transition, forKey: "atmospheric-dissolve-\(boundary)")
                parentLayer.addSublayer(transitionLayer)
            }
        }

        // The live retest verified the elevation view after Security Ridge was added.
        // Show that actual captured panel long enough for judges to read the topology change.
        let elevationProofURL = repository.appendingPathComponent("artifacts/video/qa/elevation-profile-live.png")
        if let elevationImage = NSImage(contentsOf: elevationProofURL) {
            var imageRect = CGRect(origin: .zero, size: elevationImage.size)
            if let cgImage = elevationImage.cgImage(forProposedRect: &imageRect, context: nil, hints: nil) {
                let elevationLayer = CALayer()
                elevationLayer.frame = CGRect(x: 536, y: 0, width: 848, height: 1080)
                elevationLayer.contents = cgImage
                elevationLayer.contentsGravity = .resizeAspectFill
                elevationLayer.backgroundColor = CGColor(red: 0.02, green: 0.08, blue: 0.11, alpha: 1)
                elevationLayer.opacity = 0
                let elevationFade = CAKeyframeAnimation(keyPath: "opacity")
                elevationFade.values = [0, 1, 1, 0]
                elevationFade.keyTimes = [0, 0.08, 0.92, 1]
                elevationFade.beginTime = AVCoreAnimationBeginTimeAtZero + 110.2
                elevationFade.duration = 5.55
                elevationFade.isRemovedOnCompletion = false
                elevationFade.fillMode = .both
                elevationLayer.add(elevationFade, forKey: "elevation-proof")
                parentLayer.addSublayer(elevationLayer)
            }
        }

        let white = CGColor(red: 0.93, green: 0.98, blue: 0.99, alpha: 1)
        let muted = CGColor(red: 0.48, green: 0.67, blue: 0.73, alpha: 1)
        let orange = CGColor(red: 1.0, green: 0.36, blue: 0.16, alpha: 1)
        let green = CGColor(red: 0.38, green: 0.87, blue: 0.62, alpha: 1)
        let panelBackground = CGColor(red: 0.025, green: 0.095, blue: 0.13, alpha: 0.98)

        func textLayer(
            _ text: String,
            frame: CGRect,
            size: CGFloat,
            color: CGColor,
            fontName: String = "AvenirNext-DemiBold",
            alignment: NSTextAlignment = .left
        ) -> CALayer {
            let font = NSFont(name: fontName, size: size) ?? NSFont.systemFont(ofSize: size, weight: .semibold)
            let paragraph = NSMutableParagraphStyle()
            paragraph.alignment = alignment
            paragraph.lineSpacing = size * 0.12
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

        func sidebar(x: CGFloat) -> CALayer {
            let layer = CALayer()
            layer.frame = CGRect(x: x, y: 0, width: 536, height: 1080)
            layer.backgroundColor = panelBackground
            return layer
        }

        let viewportLeft: CGFloat = isV3 ? 463 : 536
        let viewportWidth: CGFloat = isV3 ? 994 : 848
        let rightSidebarX: CGFloat = viewportLeft + viewportWidth
        let rightPanelInset: CGFloat = rightSidebarX + (isV3 ? 24 : 48)
        let rightPanelWidth: CGFloat = 1920 - rightPanelInset - (isV3 ? 24 : 48)
        parentLayer.addSublayer(sidebar(x: 0))
        let rightSidebar = sidebar(x: rightSidebarX)
        rightSidebar.frame.size.width = 1920 - rightSidebarX
        parentLayer.addSublayer(rightSidebar)

        let viewportFooter = CALayer()
        viewportFooter.frame = CGRect(x: viewportLeft, y: 0, width: viewportWidth, height: isV3 ? 132 : 170)
        viewportFooter.backgroundColor = CGColor(red: 0.018, green: 0.071, blue: 0.105, alpha: 1)
        parentLayer.addSublayer(viewportFooter)
        parentLayer.addSublayer(textLayer("LIVE ASCEND VIEWPORT", frame: CGRect(x: viewportLeft + 50, y: isV3 ? 66 : 89, width: viewportWidth - 100, height: 34), size: 17, color: orange, alignment: .center))
        parentLayer.addSublayer(textLayer("Authoritative mission state · deterministic demo path", frame: CGRect(x: viewportLeft + 50, y: isV3 ? 28 : 49, width: viewportWidth - 100, height: 30), size: 15, color: muted, fontName: "AvenirNext-Medium", alignment: .center))

        for x in [viewportLeft - 2, rightSidebarX] {
            let rule = CALayer()
            rule.frame = CGRect(x: x, y: 0, width: 2, height: 1080)
            rule.backgroundColor = orange
            parentLayer.addSublayer(rule)
        }

        parentLayer.addSublayer(textLayer("CODEX ASCEND", frame: CGRect(x: 62, y: 934, width: 410, height: 48), size: 28, color: white))
        parentLayer.addSublayer(textLayer("THE MISSION IS THE MOUNTAIN", frame: CGRect(x: 62, y: 888, width: 420, height: 38), size: 17, color: orange))
        parentLayer.addSublayer(textLayer("OPENAI WEBMCP CHALLENGE", frame: CGRect(x: rightSidebarX + 60, y: 934, width: 1920 - rightSidebarX - 92, height: 48), size: isV3 ? 20 : 23, color: white))
        parentLayer.addSublayer(textLayer("LIVE TOOLS · SHARED STATE", frame: CGRect(x: rightSidebarX + 60, y: 888, width: 1920 - rightSidebarX - 92, height: 38), size: isV3 ? 15 : 17, color: orange))
        parentLayer.addSublayer(textLayer("AI-GENERATED VOICE · MUSIC: ‘MOUNTAINS’ — ANDREW EV / MIXKIT", frame: CGRect(x: 62, y: 30, width: 1790, height: 24), size: 12, color: muted))

        let chapters = [
            ChapterCard(number: "01", title: "A TOOL CALL\nCHANGES THE WORLD", call: "AGENT CALL\nreport_obstacle", result: "RESULT\nstatus: blocked\nrevision: 11", start: 0.0, duration: 17.95),
            ChapterCard(number: "02", title: "BASECAMP BECOMES\nA SHARED GRAPH", call: "AGENT CALL\ninspect_mission", result: "RESULT\ndraft · revision 0\nbasecamp ready", start: 17.95, duration: 24.25),
            ChapterCard(number: "03", title: "WEBMCP IS THE\nINTERACTION MODEL", call: "TOOL SURFACE\ninspect_mission\nreport_obstacle\nattach_evidence\nrequest_human_decision", result: "SAME ENGINE\nexpand_scope\nverify_completion\ncomplete_mission", start: 42.2, duration: 24.8),
            ChapterCard(number: "04", title: "THE AGENT ASKS.\nTHE HUMAN DECIDES.", call: "HUMAN DECISION\nRepair persistence", result: "AGENT CONTINUES\nselectedOptionId: repair\nresolve_obstacle → ok", start: 67.0, duration: 26.5),
            ChapterCard(number: "05", title: "NEW SCOPE RESHAPES\nTHE MOUNTAIN", call: "AGENT CALL\nexpand_scope", result: "RESULT\nSecurity Ridge · 5,274 m\nstatus: available", start: 93.5, duration: 22.25),
            ChapterCard(number: "06", title: "EVIDENCE, THEN\nVERIFIED SUMMIT", call: "AGENT CALL\nverify_completion\n→ completion_ready", result: "FINAL ACTION\ncomplete_mission\n→ completed · 100%", start: 115.75, duration: 19.25),
        ]

        func addAnimatedCard(_ card: ChapterCard) {
            let group = CALayer()
            group.frame = parentLayer.frame
            group.opacity = 0

            group.addSublayer(textLayer(card.number, frame: CGRect(x: 62, y: 740, width: 140, height: 88), size: 68, color: orange))
            group.addSublayer(textLayer(card.title, frame: CGRect(x: 62, y: 612, width: 410, height: 118), size: 25, color: white))

            let callCard = CALayer()
            callCard.frame = CGRect(x: rightPanelInset, y: 566, width: rightPanelWidth, height: 214)
            callCard.backgroundColor = CGColor(red: 0.055, green: 0.145, blue: 0.18, alpha: 1)
            callCard.cornerRadius = 22
            callCard.borderWidth = 1
            callCard.borderColor = CGColor(red: 0.22, green: 0.42, blue: 0.48, alpha: 1)
            callCard.addSublayer(textLayer(card.call, frame: CGRect(x: 28, y: 24, width: rightPanelWidth - 56, height: 164), size: isV3 ? 18 : 20, color: white, fontName: "Menlo-Bold"))
            group.addSublayer(callCard)

            let resultCard = CALayer()
            resultCard.frame = CGRect(x: rightPanelInset, y: 304, width: rightPanelWidth, height: 226)
            resultCard.backgroundColor = CGColor(red: 0.035, green: 0.125, blue: 0.11, alpha: 1)
            resultCard.cornerRadius = 22
            resultCard.borderWidth = 1
            resultCard.borderColor = green
            resultCard.addSublayer(textLayer(card.result, frame: CGRect(x: 28, y: 24, width: rightPanelWidth - 56, height: 176), size: isV3 ? 17 : 19, color: green, fontName: "Menlo-Bold"))
            group.addSublayer(resultCard)

            let fade = CAKeyframeAnimation(keyPath: "opacity")
            fade.values = [0, 1, 1, 0]
            fade.keyTimes = [0, 0.035, 0.96, 1]
            fade.beginTime = AVCoreAnimationBeginTimeAtZero + card.start
            fade.duration = card.duration
            fade.isRemovedOnCompletion = false
            fade.fillMode = .both
            group.add(fade, forKey: "chapter")
            parentLayer.addSublayer(group)
        }

        chapters.forEach(addAnimatedCard)

        videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(
            postProcessingAsVideoLayer: videoLayer,
            in: parentLayer
        )

        guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
            throw AssemblyError.cannotCreateExporter
        }
        exporter.videoComposition = videoComposition
        exporter.audioMix = audioMix
        exporter.shouldOptimizeForNetworkUse = true

        do {
            try await exporter.export(to: output, as: .mp4)
        } catch {
            let details = String(reflecting: error)
            throw AssemblyError.exportFailed("\(error.localizedDescription) [\(details)]")
        }

        let finalAsset = AVURLAsset(url: output)
        let finalDuration = try await finalAsset.load(.duration).seconds
        print("Created \(output.path)")
        print(String(format: "Duration: %.2f seconds", finalDuration))
    }
}
