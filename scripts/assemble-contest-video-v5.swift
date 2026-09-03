import AVFoundation
import AppKit
import CoreGraphics
import Foundation
import QuartzCore

struct V5Segment {
    let filename: String
    let sourceStart: Double
    let timelineStart: Double
    let duration: Double
}

struct V5Chapter {
    let title: String
    let proof: String
    let start: Double
}

enum V5AssemblyError: LocalizedError {
    case missingTrack(String)
    case segmentTooShort(String, Double, Double)
    case cannotCreateTrack
    case cannotCreateExporter
    case exportFailed(String)

    var errorDescription: String? {
        switch self {
        case let .missingTrack(path): return "No usable media track in \(path)."
        case let .segmentTooShort(path, available, requested):
            return "\(path) has \(available)s available, but the edit requests \(requested)s."
        case .cannotCreateTrack: return "Could not create the V5 composition tracks."
        case .cannotCreateExporter: return "Could not create the V5 exporter."
        case let .exportFailed(message): return "V5 export failed: \(message)"
        }
    }
}

@main
struct ContestVideoAssemblerV5 {
    static let totalDuration = 125.25

    static func seconds(_ value: Double) -> CMTime {
        CMTime(seconds: value, preferredTimescale: 600)
    }

    static func main() async throws {
        let repository = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        let captures = repository.appendingPathComponent("artifacts/video/captures")
        let voiceover = repository.appendingPathComponent("artifacts/video/voiceover/codex-ascend-v5-voiceover/codex-ascend-v5-voiceover.wav")
        let music = repository.appendingPathComponent("artifacts/video/music/mountains-by-andrew-ev-mixkit.mp3")
        let missionDetail = repository.appendingPathComponent("artifacts/video/qa/v5-full-mission-detail.png")
        let output = repository.appendingPathComponent("artifacts/video/final/codex-ascend-webmcp-challenge-demo-v5.mp4")

        let segments = [
            V5Segment(filename: "13-v5-blocker.mov", sourceStart: 0.0, timelineStart: 0.0, duration: 10.0),
            V5Segment(filename: "13-v5-blocker.mov", sourceStart: 3.15, timelineStart: 10.0, duration: 6.8),
            V5Segment(filename: "11-v5-basecamp.mov", sourceStart: 0.0, timelineStart: 16.8, duration: 2.2),
            V5Segment(filename: "12-v5-route-reveal.mov", sourceStart: 2.0, timelineStart: 19.0, duration: 8.0),
            V5Segment(filename: "12-v5-route-reveal.mov", sourceStart: 2.0, timelineStart: 27.0, duration: 8.0),
            V5Segment(filename: "12-v5-route-reveal.mov", sourceStart: 5.0, timelineStart: 35.0, duration: 4.85),
            V5Segment(filename: "16-v5-final-ascent.mov", sourceStart: 0.0, timelineStart: 39.85, duration: 10.0),
            V5Segment(filename: "16-v5-final-ascent.mov", sourceStart: 10.0, timelineStart: 49.85, duration: 10.0),
            V5Segment(filename: "14-v5-human-decision.mov", sourceStart: 0.0, timelineStart: 59.85, duration: 2.8),
            V5Segment(filename: "14-v5-human-decision.mov", sourceStart: 0.0, timelineStart: 62.65, duration: 2.8),
            V5Segment(filename: "14-v5-human-decision.mov", sourceStart: 0.0, timelineStart: 65.45, duration: 2.8),
            V5Segment(filename: "14-v5-human-decision.mov", sourceStart: 0.0, timelineStart: 68.25, duration: 2.8),
            V5Segment(filename: "14-v5-human-decision.mov", sourceStart: 0.0, timelineStart: 71.05, duration: 2.8),
            V5Segment(filename: "14-v5-human-decision.mov", sourceStart: 2.8, timelineStart: 73.85, duration: 8.2),
            V5Segment(filename: "14-v5-human-decision.mov", sourceStart: 5.0, timelineStart: 82.05, duration: 2.05),
            V5Segment(filename: "15-v5-scope-expansion.mov", sourceStart: 5.7, timelineStart: 84.1, duration: 5.3),
            V5Segment(filename: "15-v5-scope-expansion.mov", sourceStart: 5.7, timelineStart: 89.4, duration: 5.1),
            V5Segment(filename: "16-v5-final-ascent.mov", sourceStart: 0.0, timelineStart: 94.5, duration: 10.05),
            V5Segment(filename: "16-v5-final-ascent.mov", sourceStart: 13.0, timelineStart: 104.55, duration: 5.4),
            V5Segment(filename: "16-v5-final-ascent.mov", sourceStart: 18.4, timelineStart: 109.95, duration: 3.05),
            V5Segment(filename: "17-v5-summit-card.mov", sourceStart: 0.0, timelineStart: 113.0, duration: 8.0),
            V5Segment(filename: "17-v5-summit-card.mov", sourceStart: 3.5, timelineStart: 121.0, duration: 4.25),
        ]

        try FileManager.default.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
        if FileManager.default.fileExists(atPath: output.path) {
            try FileManager.default.removeItem(at: output)
        }

        let composition = AVMutableComposition()
        guard let foregroundTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
              let backgroundTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
              let narrationTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid),
              let musicTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else {
            throw V5AssemblyError.cannotCreateTrack
        }

        for segment in segments {
            let url = captures.appendingPathComponent(segment.filename)
            let asset = AVURLAsset(url: url)
            guard let source = try await asset.loadTracks(withMediaType: .video).first else {
                throw V5AssemblyError.missingTrack(url.path)
            }
            let available = try await asset.load(.duration).seconds - segment.sourceStart
            guard available + 0.04 >= segment.duration else {
                throw V5AssemblyError.segmentTooShort(segment.filename, available, segment.duration)
            }
            let range = CMTimeRange(start: seconds(segment.sourceStart), duration: seconds(segment.duration))
            try foregroundTrack.insertTimeRange(range, of: source, at: seconds(segment.timelineStart))
            try backgroundTrack.insertTimeRange(range, of: source, at: seconds(segment.timelineStart))
        }

        let narrationAsset = AVURLAsset(url: voiceover)
        guard let sourceNarration = try await narrationAsset.loadTracks(withMediaType: .audio).first else {
            throw V5AssemblyError.missingTrack(voiceover.path)
        }
        try narrationTrack.insertTimeRange(
            CMTimeRange(start: .zero, duration: seconds(totalDuration)),
            of: sourceNarration,
            at: .zero
        )

        let musicAsset = AVURLAsset(url: music)
        guard let sourceMusic = try await musicAsset.loadTracks(withMediaType: .audio).first else {
            throw V5AssemblyError.missingTrack(music.path)
        }
        try musicTrack.insertTimeRange(
            CMTimeRange(start: seconds(7.0), duration: seconds(totalDuration)),
            of: sourceMusic,
            at: .zero
        )

        let audioMix = AVMutableAudioMix()
        let narrationMix = AVMutableAudioMixInputParameters(track: narrationTrack)
        narrationMix.setVolume(1.0, at: .zero)
        let musicMix = AVMutableAudioMixInputParameters(track: musicTrack)
        musicMix.setVolumeRamp(fromStartVolume: 0.0, toEndVolume: 0.13, timeRange: CMTimeRange(start: .zero, duration: seconds(2.2)))
        musicMix.setVolume(0.13, at: seconds(2.2))
        musicMix.setVolumeRamp(fromStartVolume: 0.13, toEndVolume: 0.10, timeRange: CMTimeRange(start: seconds(15.9), duration: seconds(0.9)))
        musicMix.setVolume(0.10, at: seconds(16.8))
        musicMix.setVolumeRamp(fromStartVolume: 0.10, toEndVolume: 0.12, timeRange: CMTimeRange(start: seconds(58.9), duration: seconds(1.25)))
        musicMix.setVolume(0.12, at: seconds(60.15))
        musicMix.setVolumeRamp(fromStartVolume: 0.12, toEndVolume: 0.145, timeRange: CMTimeRange(start: seconds(82.9), duration: seconds(1.2)))
        musicMix.setVolume(0.145, at: seconds(84.1))
        musicMix.setVolumeRamp(fromStartVolume: 0.145, toEndVolume: 0.115, timeRange: CMTimeRange(start: seconds(103.7), duration: seconds(0.85)))
        musicMix.setVolume(0.115, at: seconds(104.55))
        musicMix.setVolumeRamp(fromStartVolume: 0.115, toEndVolume: 0.17, timeRange: CMTimeRange(start: seconds(116.0), duration: seconds(1.5)))
        musicMix.setVolume(0.17, at: seconds(117.5))
        musicMix.setVolumeRamp(fromStartVolume: 0.17, toEndVolume: 0.0, timeRange: CMTimeRange(start: seconds(122.4), duration: seconds(2.85)))
        audioMix.inputParameters = [narrationMix, musicMix]

        let fullRange = CMTimeRange(start: .zero, duration: seconds(totalDuration))
        let foregroundInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: foregroundTrack)
        foregroundInstruction.setTransform(CGAffineTransform(a: 1.2, b: 0, c: 0, d: 1.2, tx: 96, ty: 0), at: .zero)
        let backgroundInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: backgroundTrack)
        backgroundInstruction.setTransform(CGAffineTransform(a: 1.333333, b: 0, c: 0, d: 1.333333, tx: 0, ty: -60), at: .zero)
        backgroundInstruction.setOpacity(0.42, at: .zero)

        let instruction = AVMutableVideoCompositionInstruction()
        instruction.timeRange = fullRange
        instruction.layerInstructions = [foregroundInstruction, backgroundInstruction]

        let videoComposition = AVMutableVideoComposition()
        videoComposition.instructions = [instruction]
        videoComposition.renderSize = CGSize(width: 1920, height: 1080)
        videoComposition.frameDuration = CMTime(value: 1, timescale: 30)

        let parentLayer = CALayer()
        parentLayer.frame = CGRect(x: 0, y: 0, width: 1920, height: 1080)
        parentLayer.backgroundColor = CGColor(red: 0.015, green: 0.055, blue: 0.075, alpha: 1)
        parentLayer.masksToBounds = true

        let videoLayer = CALayer()
        videoLayer.frame = parentLayer.frame
        parentLayer.addSublayer(videoLayer)

        let cameraDrift = CAKeyframeAnimation(keyPath: "transform.scale")
        cameraDrift.values = [1.0, 1.018, 1.006, 1.022, 1.008]
        cameraDrift.keyTimes = [0, 0.24, 0.48, 0.76, 1]
        cameraDrift.beginTime = AVCoreAnimationBeginTimeAtZero
        cameraDrift.duration = totalDuration
        cameraDrift.isRemovedOnCompletion = false
        cameraDrift.fillMode = .both
        videoLayer.add(cameraDrift, forKey: "cinematic-camera-drift")

        let navy = CGColor(red: 0.015, green: 0.075, blue: 0.10, alpha: 0.92)
        let white = CGColor(red: 0.96, green: 0.99, blue: 1.0, alpha: 1)
        let orange = CGColor(red: 1.0, green: 0.37, blue: 0.18, alpha: 1)
        let muted = CGColor(red: 0.73, green: 0.87, blue: 0.90, alpha: 1)

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
            NSAttributedString(string: text, attributes: [
                .font: font,
                .foregroundColor: NSColor(cgColor: color) ?? .white,
                .paragraphStyle: paragraph,
            ]).draw(in: CGRect(origin: .zero, size: frame.size))
            image.unlockFocus()
            var imageRect = CGRect(origin: .zero, size: frame.size)
            let layer = CALayer()
            layer.frame = frame
            layer.contents = image.cgImage(forProposedRect: &imageRect, context: nil, hints: nil)
            layer.contentsGravity = .resizeAspect
            return layer
        }

        for frame in [CGRect(x: 0, y: 0, width: 96, height: 1080), CGRect(x: 1824, y: 0, width: 96, height: 1080)] {
            let edge = CALayer()
            edge.frame = frame
            edge.backgroundColor = CGColor(red: 0.01, green: 0.05, blue: 0.07, alpha: 0.28)
            parentLayer.addSublayer(edge)
        }

        let chapters = [
            V5Chapter(title: "THE MOUNTAIN REACTS", proof: "report_obstacle  →  BLOCKED", start: 0.25),
            V5Chapter(title: "ONE GOAL BECOMES A ROUTE", proof: "inspect_mission  ·  discover_mission", start: 16.8),
            V5Chapter(title: "18 TYPED TOOLS. ONE SHARED STATE.", proof: "WebMCP  ·  deterministic command engine", start: 39.85),
            V5Chapter(title: "THE AGENT ASKS. YOU DECIDE.", proof: "Repair persistence  →  inspect_human_decision", start: 60.15),
            V5Chapter(title: "NEW SCOPE. NEW RIDGE.", proof: "expand_scope  ·  Security Ridge  ·  5,274 m", start: 84.1),
            V5Chapter(title: "EVIDENCE BEFORE SUMMIT", proof: "verify_completion  →  complete_mission", start: 104.55),
        ]

        for chapter in chapters {
            let group = CALayer()
            group.frame = CGRect(x: 96, y: 56, width: 1728, height: 150)
            group.opacity = 0

            let panel = CALayer()
            panel.frame = CGRect(x: 42, y: 22, width: 760, height: 106)
            panel.backgroundColor = navy
            panel.cornerRadius = 24
            panel.borderWidth = 1.5
            panel.borderColor = CGColor(red: 0.92, green: 0.38, blue: 0.20, alpha: 0.72)
            group.addSublayer(panel)
            group.addSublayer(textLayer(chapter.title, frame: CGRect(x: 72, y: 70, width: 705, height: 38), size: 27, color: white))
            group.addSublayer(textLayer(chapter.proof, frame: CGRect(x: 72, y: 37, width: 705, height: 28), size: 16, color: orange, fontName: "Menlo-Bold"))

            let fade = CAKeyframeAnimation(keyPath: "opacity")
            fade.values = [0, 1, 1, 0]
            fade.keyTimes = [0, 0.12, 0.72, 1]
            fade.beginTime = AVCoreAnimationBeginTimeAtZero + chapter.start
            fade.duration = 4.2
            fade.isRemovedOnCompletion = false
            fade.fillMode = .both
            group.add(fade, forKey: "chapter-title")
            parentLayer.addSublayer(group)
        }

        for boundary in [16.8, 39.85, 60.15, 84.1, 104.55, 113.0] {
            let fog = CALayer()
            fog.frame = parentLayer.frame
            fog.backgroundColor = CGColor(red: 0.72, green: 0.86, blue: 0.90, alpha: 1)
            fog.opacity = 0
            let flash = CAKeyframeAnimation(keyPath: "opacity")
            flash.values = [0, 0.24, 0]
            flash.keyTimes = [0, 0.5, 1]
            flash.beginTime = AVCoreAnimationBeginTimeAtZero + boundary - 0.32
            flash.duration = 0.64
            flash.isRemovedOnCompletion = false
            flash.fillMode = .both
            fog.add(flash, forKey: "fog-transition")
            parentLayer.addSublayer(fog)
        }

        if let detailImage = NSImage(contentsOf: missionDetail) {
            var imageRect = CGRect(origin: .zero, size: detailImage.size)
            if let cgImage = detailImage.cgImage(forProposedRect: &imageRect, context: nil, hints: nil) {
                let detailLayer = CALayer()
                let scaledHeight = CGFloat(cgImage.height) * (1920.0 / CGFloat(cgImage.width))
                detailLayer.frame = CGRect(x: 0, y: 1080 - scaledHeight, width: 1920, height: scaledHeight)
                detailLayer.contents = cgImage
                detailLayer.contentsGravity = .resizeAspectFill
                detailLayer.opacity = 0

                let reveal = CAKeyframeAnimation(keyPath: "opacity")
                reveal.values = [0, 1, 1, 0]
                reveal.keyTimes = [0, 0.08, 0.9, 1]
                reveal.beginTime = AVCoreAnimationBeginTimeAtZero + 94.5
                reveal.duration = 10.05
                reveal.isRemovedOnCompletion = false
                reveal.fillMode = .both
                detailLayer.add(reveal, forKey: "topology-reveal")

                let startPosition = CGPoint(x: 960, y: 1080 - scaledHeight / 2)
                let endPosition = CGPoint(x: 960, y: scaledHeight / 2)
                let pan = CABasicAnimation(keyPath: "position")
                pan.fromValue = NSValue(point: startPosition)
                pan.toValue = NSValue(point: endPosition)
                pan.beginTime = AVCoreAnimationBeginTimeAtZero + 94.5
                pan.duration = 10.05
                pan.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
                pan.isRemovedOnCompletion = false
                pan.fillMode = .both
                detailLayer.add(pan, forKey: "topology-pan")
                parentLayer.addSublayer(detailLayer)

                let topologyCaption = CALayer()
                topologyCaption.frame = CGRect(x: 570, y: 70, width: 780, height: 74)
                topologyCaption.backgroundColor = navy
                topologyCaption.cornerRadius = 22
                topologyCaption.opacity = 0
                topologyCaption.addSublayer(textLayer("THE ELEVATION PROFILE IS LIVE TOPOLOGY", frame: CGRect(x: 28, y: 17, width: 724, height: 40), size: 22, color: white, alignment: .center))
                let topologyFade = CAKeyframeAnimation(keyPath: "opacity")
                topologyFade.values = [0, 1, 1, 0]
                topologyFade.keyTimes = [0, 0.12, 0.86, 1]
                topologyFade.beginTime = AVCoreAnimationBeginTimeAtZero + 94.8
                topologyFade.duration = 8.9
                topologyFade.isRemovedOnCompletion = false
                topologyFade.fillMode = .both
                topologyCaption.add(topologyFade, forKey: "topology-caption")
                parentLayer.addSublayer(topologyCaption)
            }
        }

        let endCard = CALayer()
        endCard.frame = parentLayer.frame
        endCard.opacity = 0
        let endPanel = CALayer()
        endPanel.frame = CGRect(x: 440, y: 340, width: 1040, height: 300)
        endPanel.backgroundColor = CGColor(red: 0.012, green: 0.065, blue: 0.085, alpha: 0.86)
        endPanel.cornerRadius = 34
        endPanel.borderWidth = 1.5
        endPanel.borderColor = CGColor(red: 1.0, green: 0.44, blue: 0.22, alpha: 0.78)
        endCard.addSublayer(endPanel)
        endCard.addSublayer(textLayer("CODEX ASCEND", frame: CGRect(x: 520, y: 510, width: 880, height: 64), size: 48, color: white, alignment: .center))
        endCard.addSublayer(textLayer("THE MISSION IS THE MOUNTAIN", frame: CGRect(x: 520, y: 446, width: 880, height: 48), size: 24, color: orange, alignment: .center))
        endCard.addSublayer(textLayer("18 WebMCP tools  ·  Human authority  ·  Verified completion", frame: CGRect(x: 520, y: 390, width: 880, height: 38), size: 20, color: muted, fontName: "AvenirNext-Medium", alignment: .center))
        let endFade = CAKeyframeAnimation(keyPath: "opacity")
        endFade.values = [0, 1, 1, 0]
        endFade.keyTimes = [0, 0.22, 0.84, 1]
        endFade.beginTime = AVCoreAnimationBeginTimeAtZero + 121.0
        endFade.duration = 4.25
        endFade.isRemovedOnCompletion = false
        endFade.fillMode = .both
        endCard.add(endFade, forKey: "end-card")
        parentLayer.addSublayer(endCard)

        let topBar = CALayer()
        topBar.frame = CGRect(x: 0, y: 1056, width: 1920, height: 24)
        topBar.backgroundColor = CGColor(red: 0.006, green: 0.032, blue: 0.043, alpha: 0.72)
        parentLayer.addSublayer(topBar)
        let bottomBar = CALayer()
        bottomBar.frame = CGRect(x: 0, y: 0, width: 1920, height: 24)
        bottomBar.backgroundColor = CGColor(red: 0.006, green: 0.032, blue: 0.043, alpha: 0.78)
        parentLayer.addSublayer(bottomBar)
        parentLayer.addSublayer(textLayer("REAL DEPLOYED EXPERIENCE  ·  NATIVE WEBMCP", frame: CGRect(x: 36, y: 2, width: 620, height: 18), size: 10, color: muted, fontName: "AvenirNext-DemiBold"))
        parentLayer.addSublayer(textLayer("AI VOICE  ·  MUSIC: ‘MOUNTAINS’ — ANDREW EV / MIXKIT", frame: CGRect(x: 1210, y: 2, width: 674, height: 18), size: 10, color: muted, fontName: "AvenirNext-Medium", alignment: .right))

        videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer: videoLayer, in: parentLayer)

        guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
            throw V5AssemblyError.cannotCreateExporter
        }
        exporter.videoComposition = videoComposition
        exporter.audioMix = audioMix
        exporter.shouldOptimizeForNetworkUse = true
        do {
            try await exporter.export(to: output, as: .mp4)
        } catch {
            throw V5AssemblyError.exportFailed("\(error.localizedDescription) [\(String(reflecting: error))]")
        }

        let finalAsset = AVURLAsset(url: output)
        let duration = try await finalAsset.load(.duration).seconds
        print("Created \(output.path)")
        print(String(format: "Duration: %.2f seconds", duration))
    }
}
