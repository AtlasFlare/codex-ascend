import AVFoundation
import AppKit
import CoreGraphics
import Foundation
import QuartzCore

struct V6Segment {
    let filename: String
    let sourceStart: Double
    let timelineStart: Double
    let duration: Double
}

struct V6Chapter {
    let title: String
    let proof: String
    let start: Double
}

enum V6AssemblyError: LocalizedError {
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
        case .cannotCreateTrack: return "Could not create the V6 composition tracks."
        case .cannotCreateExporter: return "Could not create the V6 exporter."
        case let .exportFailed(message): return "V6 export failed: \(message)"
        }
    }
}

@main
struct ContestVideoAssemblerV6 {
    static let totalDuration = 105.0

    static func seconds(_ value: Double) -> CMTime {
        CMTime(seconds: value, preferredTimescale: 600)
    }

    static func main() async throws {
        let isV8 = CommandLine.arguments.contains("--v8")
        let isV71 = CommandLine.arguments.contains("--v7-1")
        let isV7 = CommandLine.arguments.contains("--v7") || isV71 || isV8
        let repository = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        let captures = repository.appendingPathComponent("artifacts/video/captures")
        let voiceover = repository.appendingPathComponent("artifacts/video/voiceover/codex-ascend-v6-voiceover/codex-ascend-v6-voiceover.wav")
        let music = repository.appendingPathComponent(
            isV8
                ? "artifacts/video/music/dreaming-big-by-ahjay-stelino-mixkit.mp3"
                : "artifacts/video/music/mountains-by-andrew-ev-mixkit.mp3"
        )
        let missionDetail = repository.appendingPathComponent(
            isV8
                ? "artifacts/screenshots/lower-panels.png"
                : "artifacts/video/qa/v5-full-mission-detail.png"
        )
        let topologyPlate = repository.appendingPathComponent("artifacts/video/graphics/v6-topology-transition.png")
        let onboardingFrame = repository.appendingPathComponent("artifacts/video/graphics/v7-webmcp-onboarding.png")
        let output = repository.appendingPathComponent(
            isV8
                ? "artifacts/video/final/codex-ascend-webmcp-challenge-demo-v8.mp4"
                : isV71
                ? "artifacts/video/final/codex-ascend-webmcp-challenge-demo-v7-1.mp4"
                : isV7
                    ? "artifacts/video/final/codex-ascend-webmcp-challenge-demo-v7.mp4"
                    : "artifacts/video/final/codex-ascend-webmcp-challenge-demo-v6.mp4"
        )
        let routeReveal = isV8 ? "18-v8-route-reveal.mov" : "12-v5-route-reveal.mov"

        var segments = [
            V6Segment(filename: "13-v5-blocker.mov", sourceStart: 0.0, timelineStart: 0.0, duration: 10.0),
            V6Segment(filename: "13-v5-blocker.mov", sourceStart: 4.4, timelineStart: 10.0, duration: 5.6),
            V6Segment(filename: "11-v5-basecamp.mov", sourceStart: 0.0, timelineStart: 15.6, duration: 10.0),
            V6Segment(filename: routeReveal, sourceStart: 0.0, timelineStart: 25.6, duration: 8.95),
            V6Segment(filename: "v6-live-agent/v4-live-agent-01.mov", sourceStart: 0.0, timelineStart: 34.55, duration: 5.0),
            V6Segment(filename: "v6-live-agent/v4-live-agent-02.mov", sourceStart: 0.0, timelineStart: 39.55, duration: 4.67),
            V6Segment(filename: "v6-live-agent/v4-live-agent-03.mov", sourceStart: 0.0, timelineStart: 44.22, duration: 4.67),
            V6Segment(filename: "v6-live-agent/v4-live-agent-04.mov", sourceStart: 0.0, timelineStart: 48.89, duration: 1.11),
            V6Segment(filename: "14-v5-human-decision.mov", sourceStart: 0.0, timelineStart: 50.0, duration: 11.0),
            V6Segment(filename: "14-v5-human-decision.mov", sourceStart: 2.45, timelineStart: 61.0, duration: 8.55),
            V6Segment(filename: "15-v5-scope-expansion.mov", sourceStart: 0.0, timelineStart: 69.55, duration: 11.0),
            V6Segment(filename: "15-v5-scope-expansion.mov", sourceStart: 4.3, timelineStart: 80.55, duration: 6.7),
            V6Segment(filename: "v6-live-agent/v4-live-agent-04.mov", sourceStart: 0.0, timelineStart: 87.25, duration: 4.67),
        ]
        if isV8 {
            // Stay on the completed mission after the agent verifies it. The older
            // cut briefly returned to the pre-completion ascent, which read as a
            // continuity regression immediately before the final card.
            segments.append(V6Segment(filename: "v6-live-agent/v4-live-agent-05.mov", sourceStart: 0.0, timelineStart: 91.92, duration: 4.0))
            segments.append(V6Segment(filename: "v6-live-agent/v4-live-agent-05.mov", sourceStart: 0.0, timelineStart: 95.92, duration: 4.0))
            segments.append(V6Segment(filename: "v6-live-agent/v4-live-agent-05.mov", sourceStart: 0.0, timelineStart: 99.92, duration: 1.08))
        } else {
            segments.append(V6Segment(filename: "v6-live-agent/v4-live-agent-05.mov", sourceStart: 0.0, timelineStart: 91.92, duration: 4.0))
            segments.append(V6Segment(filename: "16-v5-final-ascent.mov", sourceStart: 13.0, timelineStart: 95.92, duration: 5.08))
        }
        segments.append(V6Segment(filename: "17-v5-summit-card.mov", sourceStart: 0.0, timelineStart: 101.0, duration: 4.0))

        try FileManager.default.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
        if FileManager.default.fileExists(atPath: output.path) {
            try FileManager.default.removeItem(at: output)
        }

        let composition = AVMutableComposition()
        guard let foregroundTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
              let backgroundTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
              let narrationTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid),
              let musicTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else {
            throw V6AssemblyError.cannotCreateTrack
        }

        for segment in segments {
            let url = captures.appendingPathComponent(segment.filename)
            let asset = AVURLAsset(url: url)
            guard let source = try await asset.loadTracks(withMediaType: .video).first else {
                throw V6AssemblyError.missingTrack(url.path)
            }
            let available = try await asset.load(.duration).seconds - segment.sourceStart
            guard available + 0.04 >= segment.duration else {
                throw V6AssemblyError.segmentTooShort(segment.filename, available, segment.duration)
            }
            let range = CMTimeRange(start: seconds(segment.sourceStart), duration: seconds(segment.duration))
            try foregroundTrack.insertTimeRange(range, of: source, at: seconds(segment.timelineStart))
            try backgroundTrack.insertTimeRange(range, of: source, at: seconds(segment.timelineStart))
        }

        let narrationAsset = AVURLAsset(url: voiceover)
        guard let sourceNarration = try await narrationAsset.loadTracks(withMediaType: .audio).first else {
            throw V6AssemblyError.missingTrack(voiceover.path)
        }
        try narrationTrack.insertTimeRange(
            CMTimeRange(start: .zero, duration: seconds(totalDuration)),
            of: sourceNarration,
            at: .zero
        )

        let musicAsset = AVURLAsset(url: music)
        guard let sourceMusic = try await musicAsset.loadTracks(withMediaType: .audio).first else {
            throw V6AssemblyError.missingTrack(music.path)
        }
        let musicSourceStart = isV8 ? 5.2 : 7.0
        try musicTrack.insertTimeRange(
            CMTimeRange(start: seconds(musicSourceStart), duration: seconds(totalDuration)),
            of: sourceMusic,
            at: .zero
        )

        let audioMix = AVMutableAudioMix()
        let narrationMix = AVMutableAudioMixInputParameters(track: narrationTrack)
        narrationMix.setVolume(1.0, at: .zero)
        let musicMix = AVMutableAudioMixInputParameters(track: musicTrack)
        if isV8 {
            // The score was auditioned against the narration arc. Keep the strings
            // present, duck the mid-track swell beneath the human-decision beat,
            // then give the verified summit a restrained lift.
            musicMix.setVolumeRamp(fromStartVolume: 0.0, toEndVolume: 0.15, timeRange: CMTimeRange(start: .zero, duration: seconds(2.4)))
            musicMix.setVolume(0.15, at: seconds(2.4))
            musicMix.setVolumeRamp(fromStartVolume: 0.15, toEndVolume: 0.12, timeRange: CMTimeRange(start: seconds(14.6), duration: seconds(1.0)))
            musicMix.setVolume(0.12, at: seconds(15.6))
            musicMix.setVolumeRamp(fromStartVolume: 0.12, toEndVolume: 0.16, timeRange: CMTimeRange(start: seconds(31.3), duration: seconds(1.4)))
            musicMix.setVolume(0.16, at: seconds(32.7))
            musicMix.setVolumeRamp(fromStartVolume: 0.16, toEndVolume: 0.105, timeRange: CMTimeRange(start: seconds(38.8), duration: seconds(1.2)))
            musicMix.setVolume(0.105, at: seconds(40.0))
            musicMix.setVolumeRamp(fromStartVolume: 0.105, toEndVolume: 0.125, timeRange: CMTimeRange(start: seconds(61.0), duration: seconds(1.4)))
            musicMix.setVolume(0.125, at: seconds(62.4))
            musicMix.setVolumeRamp(fromStartVolume: 0.125, toEndVolume: 0.155, timeRange: CMTimeRange(start: seconds(68.6), duration: seconds(1.25)))
            musicMix.setVolume(0.155, at: seconds(69.85))
            musicMix.setVolumeRamp(fromStartVolume: 0.155, toEndVolume: 0.12, timeRange: CMTimeRange(start: seconds(86.2), duration: seconds(1.05)))
            musicMix.setVolume(0.12, at: seconds(87.25))
            musicMix.setVolumeRamp(fromStartVolume: 0.12, toEndVolume: 0.19, timeRange: CMTimeRange(start: seconds(97.4), duration: seconds(2.1)))
            musicMix.setVolume(0.19, at: seconds(99.5))
            musicMix.setVolumeRamp(fromStartVolume: 0.19, toEndVolume: 0.0, timeRange: CMTimeRange(start: seconds(102.0), duration: seconds(3.0)))
        } else {
            musicMix.setVolumeRamp(fromStartVolume: 0.0, toEndVolume: 0.20, timeRange: CMTimeRange(start: .zero, duration: seconds(2.0)))
            musicMix.setVolume(0.20, at: seconds(2.0))
            musicMix.setVolumeRamp(fromStartVolume: 0.20, toEndVolume: 0.16, timeRange: CMTimeRange(start: seconds(14.6), duration: seconds(1.0)))
            musicMix.setVolume(0.16, at: seconds(15.6))
            musicMix.setVolumeRamp(fromStartVolume: 0.16, toEndVolume: 0.22, timeRange: CMTimeRange(start: seconds(32.2), duration: seconds(1.25)))
            musicMix.setVolume(0.22, at: seconds(33.45))
            musicMix.setVolumeRamp(fromStartVolume: 0.22, toEndVolume: 0.17, timeRange: CMTimeRange(start: seconds(34.15), duration: seconds(0.75)))
            musicMix.setVolume(0.17, at: seconds(34.9))
            musicMix.setVolumeRamp(fromStartVolume: 0.17, toEndVolume: 0.19, timeRange: CMTimeRange(start: seconds(68.9), duration: seconds(0.95)))
            musicMix.setVolume(0.19, at: seconds(69.85))
            musicMix.setVolumeRamp(fromStartVolume: 0.19, toEndVolume: 0.17, timeRange: CMTimeRange(start: seconds(86.4), duration: seconds(0.85)))
            musicMix.setVolume(0.17, at: seconds(87.25))
            musicMix.setVolumeRamp(fromStartVolume: 0.17, toEndVolume: 0.25, timeRange: CMTimeRange(start: seconds(98.6), duration: seconds(1.6)))
            musicMix.setVolume(0.25, at: seconds(100.2))
            musicMix.setVolumeRamp(fromStartVolume: 0.25, toEndVolume: 0.0, timeRange: CMTimeRange(start: seconds(102.0), duration: seconds(3.0)))
        }
        audioMix.inputParameters = [narrationMix, musicMix]

        let fullRange = CMTimeRange(start: .zero, duration: seconds(totalDuration))
        let foregroundInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: foregroundTrack)
        foregroundInstruction.setTransform(
            isV8
                ? CGAffineTransform(a: 1.25, b: 0, c: 0, d: 1.25, tx: 60, ty: -22.5)
                : CGAffineTransform(a: 1.2, b: 0, c: 0, d: 1.2, tx: 96, ty: 0),
            at: .zero
        )
        let backgroundInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: backgroundTrack)
        backgroundInstruction.setTransform(CGAffineTransform(a: 1.333333, b: 0, c: 0, d: 1.333333, tx: 0, ty: -60), at: .zero)
        backgroundInstruction.setOpacity(isV8 ? 0.0 : 0.42, at: .zero)

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
        cameraDrift.values = isV8
            ? [1.0, 1.018, 1.008, 1.022, 1.01, 1.025, 1.012]
            : [1.0, 1.035, 1.012, 1.045, 1.018, 1.05, 1.025]
        cameraDrift.keyTimes = [0, 0.15, 0.33, 0.48, 0.67, 0.84, 1]
        cameraDrift.beginTime = AVCoreAnimationBeginTimeAtZero
        cameraDrift.duration = totalDuration
        cameraDrift.isRemovedOnCompletion = false
        cameraDrift.fillMode = .both
        videoLayer.add(cameraDrift, forKey: "cinematic-camera-drift")

        let lateralDrift = CAKeyframeAnimation(keyPath: "position.x")
        lateralDrift.values = isV8 ? [960, 954, 966, 956, 964, 958, 960] : [960, 944, 974, 946, 968, 952, 960]
        lateralDrift.keyTimes = cameraDrift.keyTimes
        lateralDrift.beginTime = AVCoreAnimationBeginTimeAtZero
        lateralDrift.duration = totalDuration
        lateralDrift.isRemovedOnCompletion = false
        lateralDrift.fillMode = .both
        videoLayer.add(lateralDrift, forKey: "cinematic-lateral-drift")

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
            V6Chapter(title: "THE MOUNTAIN REACTS", proof: "report_obstacle  →  BLOCKED", start: 0.25),
            V6Chapter(title: "ONE GOAL BECOMES A ROUTE", proof: "inspect_mission  ·  discover_mission", start: 15.6),
            V6Chapter(
                title: isV7 ? "CHATGPT SITE TOOLS. ONE SHARED STATE." : "18 TYPED TOOLS. ONE SHARED STATE.",
                proof: isV7 ? "18 live tools  ·  actual structured results" : "real calls  ·  structured results",
                start: 34.55
            ),
            V6Chapter(title: "THE AGENT ASKS. YOU DECIDE.", proof: "Repair persistence  →  inspect_human_decision", start: 50.0),
            V6Chapter(title: "NEW SCOPE. NEW RIDGE.", proof: "expand_scope  ·  Security Ridge  ·  5,274 m", start: 69.85),
            V6Chapter(title: "EVIDENCE BEFORE SUMMIT", proof: "verify_completion  →  complete_mission", start: 87.25),
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
            fade.duration = 2.7
            fade.isRemovedOnCompletion = false
            fade.fillMode = .both
            group.add(fade, forKey: "chapter-title")
            parentLayer.addSublayer(group)
        }

        for boundary in [15.6, 34.55, 50.0, 69.85, 87.25, 101.0] {
            let fog = CALayer()
            fog.frame = parentLayer.frame
            fog.backgroundColor = CGColor(red: 0.72, green: 0.86, blue: 0.90, alpha: 1)
            fog.opacity = 0
            let flash = CAKeyframeAnimation(keyPath: "opacity")
            flash.values = [0, isV8 ? 0.14 : 0.24, 0]
            flash.keyTimes = [0, 0.5, 1]
            flash.beginTime = AVCoreAnimationBeginTimeAtZero + boundary - (isV8 ? 0.45 : 0.32)
            flash.duration = isV8 ? 0.9 : 0.64
            flash.isRemovedOnCompletion = false
            flash.fillMode = .both
            fog.add(flash, forKey: "fog-transition")
            parentLayer.addSublayer(fog)
        }

        if !isV8, let transitionImage = NSImage(contentsOf: topologyPlate) {
            var transitionRect = CGRect(origin: .zero, size: transitionImage.size)
            if let transitionCG = transitionImage.cgImage(forProposedRect: &transitionRect, context: nil, hints: nil) {
                let transition = CALayer()
                transition.frame = parentLayer.frame
                transition.contents = transitionCG
                transition.contentsGravity = .resizeAspectFill
                transition.opacity = 0

                let transitionFade = CAKeyframeAnimation(keyPath: "opacity")
                transitionFade.values = [0, 1, 1, 0]
                transitionFade.keyTimes = [0, 0.16, 0.72, 1]
                transitionFade.beginTime = AVCoreAnimationBeginTimeAtZero + 31.8
                transitionFade.duration = 3.35
                transitionFade.isRemovedOnCompletion = false
                transitionFade.fillMode = .both
                transition.add(transitionFade, forKey: "topology-transition-fade")

                let transitionPush = CABasicAnimation(keyPath: "transform.scale")
                transitionPush.fromValue = 1.0
                transitionPush.toValue = 1.085
                transitionPush.beginTime = AVCoreAnimationBeginTimeAtZero + 31.8
                transitionPush.duration = 3.35
                transitionPush.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
                transitionPush.isRemovedOnCompletion = false
                transitionPush.fillMode = .both
                transition.add(transitionPush, forKey: "topology-transition-push")
                parentLayer.addSublayer(transition)

                let transitionTitle = CALayer()
                transitionTitle.frame = CGRect(x: 495, y: 130, width: 930, height: 110)
                transitionTitle.backgroundColor = CGColor(red: 0.01, green: 0.05, blue: 0.08, alpha: 0.78)
                transitionTitle.cornerRadius = 26
                transitionTitle.opacity = 0
                transitionTitle.addSublayer(textLayer("ONE SHARED STATE BECOMES A LIVING ROUTE", frame: CGRect(x: 34, y: 31, width: 862, height: 50), size: 24, color: white, alignment: .center))
                let titleFade = CAKeyframeAnimation(keyPath: "opacity")
                titleFade.values = [0, 1, 1, 0]
                titleFade.keyTimes = [0, 0.18, 0.76, 1]
                titleFade.beginTime = AVCoreAnimationBeginTimeAtZero + 32.05
                titleFade.duration = 2.95
                titleFade.isRemovedOnCompletion = false
                titleFade.fillMode = .both
                transitionTitle.add(titleFade, forKey: "topology-transition-title")
                parentLayer.addSublayer(transitionTitle)
            }
        }

        if isV7, let guideImage = NSImage(contentsOf: onboardingFrame) {
            var guideRect = CGRect(origin: .zero, size: guideImage.size)
            if let guideCG = guideImage.cgImage(forProposedRect: &guideRect, context: nil, hints: nil) {
                let guideLayer = CALayer()
                guideLayer.frame = parentLayer.frame
                guideLayer.contents = guideCG
                guideLayer.contentsGravity = .resizeAspectFill
                guideLayer.opacity = 0

                let guideFade = CAKeyframeAnimation(keyPath: "opacity")
                guideFade.values = isV8 ? [0, 0, 1, 1, 0, 0] : [0, 1, 1, 0]
                guideFade.keyTimes = isV8 ? [0, 0.06, 0.061, 0.93, 0.931, 1] : [0, 0.12, 0.73, 1]
                guideFade.beginTime = AVCoreAnimationBeginTimeAtZero + 31.35
                guideFade.duration = 3.2
                guideFade.isRemovedOnCompletion = false
                guideFade.fillMode = .both
                guideLayer.add(guideFade, forKey: "webmcp-guide-fade")

                let guidePush = CABasicAnimation(keyPath: "transform.scale")
                guidePush.fromValue = 1.0
                guidePush.toValue = 1.055
                guidePush.beginTime = AVCoreAnimationBeginTimeAtZero + 31.35
                guidePush.duration = 3.2
                guidePush.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
                guidePush.isRemovedOnCompletion = false
                guidePush.fillMode = .both
                guideLayer.add(guidePush, forKey: "webmcp-guide-push")
                parentLayer.addSublayer(guideLayer)
            }
        }

        if isV71 || isV8 {
            // The original Basecamp capture briefly exposed a rejected rehearsal call.
            // Replace only that small ledger region with the successful live inspection
            // result recorded immediately before it; the product footage remains intact.
            let cleanLedger = CALayer()
            cleanLedger.frame = CGRect(x: 1450, y: 715, width: 400, height: 300)
            cleanLedger.backgroundColor = CGColor(red: 0.015, green: 0.075, blue: 0.10, alpha: 1)
            cleanLedger.cornerRadius = 22
            cleanLedger.borderWidth = 2
            cleanLedger.borderColor = CGColor(red: 0.19, green: 0.89, blue: 0.65, alpha: 0.8)
            cleanLedger.opacity = 0
            cleanLedger.addSublayer(textLayer("●  WEBMCP LIVE", frame: CGRect(x: 24, y: 246, width: 350, height: 24), size: 13, color: white, fontName: "Menlo-Bold"))
            cleanLedger.addSublayer(textLayer("LATEST AGENT CALL", frame: CGRect(x: 24, y: 202, width: 350, height: 20), size: 10, color: orange, fontName: "Menlo-Bold"))
            cleanLedger.addSublayer(textLayer("inspect_mission", frame: CGRect(x: 24, y: 163, width: 350, height: 28), size: 18, color: white, fontName: "Menlo-Bold"))
            cleanLedger.addSublayer(textLayer("Structured mission state returned", frame: CGRect(x: 24, y: 128, width: 350, height: 22), size: 12, color: muted, fontName: "AvenirNext-Medium"))
            cleanLedger.addSublayer(textLayer("STATE SYNCHRONIZED  ·  18 TOOLS READY", frame: CGRect(x: 24, y: 84, width: 350, height: 22), size: 10, color: CGColor(red: 0.32, green: 0.93, blue: 0.71, alpha: 1), fontName: "Menlo-Bold"))

            let cleanLedgerFade = CAKeyframeAnimation(keyPath: "opacity")
            cleanLedgerFade.values = [0, 1, 1, 0]
            cleanLedgerFade.keyTimes = [0, 0.04, 0.94, 1]
            cleanLedgerFade.beginTime = AVCoreAnimationBeginTimeAtZero + 17.65
            cleanLedgerFade.duration = 13.55
            cleanLedgerFade.isRemovedOnCompletion = false
            cleanLedgerFade.fillMode = .both
            cleanLedger.add(cleanLedgerFade, forKey: "clean-basecamp-ledger")
            parentLayer.addSublayer(cleanLedger)
        }

        if !isV8 {
            let ledgerFocus = CALayer()
            ledgerFocus.frame = CGRect(x: 1510, y: 725, width: 350, height: 265)
            ledgerFocus.borderWidth = 4
            ledgerFocus.borderColor = orange
            ledgerFocus.cornerRadius = 24
            ledgerFocus.shadowColor = orange
            ledgerFocus.shadowOpacity = 0.55
            ledgerFocus.shadowRadius = 18
            ledgerFocus.opacity = 0
            let ledgerPulse = CAKeyframeAnimation(keyPath: "opacity")
            ledgerPulse.values = [0, 0.95, 0.72, 0.95, 0]
            ledgerPulse.keyTimes = [0, 0.08, 0.45, 0.88, 1]
            ledgerPulse.beginTime = AVCoreAnimationBeginTimeAtZero + 34.65
            ledgerPulse.duration = 14.9
            ledgerPulse.isRemovedOnCompletion = false
            ledgerPulse.fillMode = .both
            ledgerFocus.add(ledgerPulse, forKey: "ledger-focus")
            parentLayer.addSublayer(ledgerFocus)
        }

        let callProofs: [(String, String, Double)] = [
            ("inspect_mission", "structured state  ·  revision 20", 37.15),
            ("complete_stage", "stage completed  ·  revision 22", 41.35),
            ("attach_evidence", "evidence attached  ·  revision 24", 45.55),
        ]
        for proofItem in callProofs {
            let proofGroup = CALayer()
            proofGroup.frame = CGRect(x: 540, y: 72, width: 840, height: 105)
            proofGroup.backgroundColor = navy
            proofGroup.cornerRadius = 24
            proofGroup.borderWidth = 1.5
            proofGroup.borderColor = orange
            proofGroup.opacity = 0
            proofGroup.addSublayer(textLayer("AGENT CALL   \(proofItem.0)", frame: CGRect(x: 30, y: 54, width: 780, height: 32), size: 20, color: white, fontName: "Menlo-Bold", alignment: .center))
            proofGroup.addSublayer(textLayer("RESULT   \(proofItem.1)", frame: CGRect(x: 30, y: 20, width: 780, height: 28), size: 15, color: orange, fontName: "Menlo-Bold", alignment: .center))
            let proofFade = CAKeyframeAnimation(keyPath: "opacity")
            proofFade.values = [0, 1, 1, 0]
            proofFade.keyTimes = [0, 0.12, 0.8, 1]
            proofFade.beginTime = AVCoreAnimationBeginTimeAtZero + proofItem.2
            proofFade.duration = 4.25
            proofFade.isRemovedOnCompletion = false
            proofFade.fillMode = .both
            proofGroup.add(proofFade, forKey: "call-proof")
            parentLayer.addSublayer(proofGroup)
        }

        let humanProof = CALayer()
        humanProof.frame = isV8
            ? CGRect(x: 495, y: 74, width: 930, height: 122)
            : CGRect(x: 335, y: 300, width: 1250, height: 290)
        humanProof.backgroundColor = CGColor(red: 0.008, green: 0.045, blue: 0.065, alpha: 0.94)
        humanProof.cornerRadius = isV8 ? 24 : 30
        humanProof.borderWidth = 2
        humanProof.borderColor = orange
        humanProof.opacity = 0
        if isV8 {
            humanProof.addSublayer(textLayer("HUMAN DECISION RECORDED", frame: CGRect(x: 30, y: 70, width: 870, height: 30), size: 18, color: orange, alignment: .center))
            humanProof.addSublayer(textLayer("Repair persistence  →  inspect_human_decision", frame: CGRect(x: 30, y: 30, width: 870, height: 36), size: 21, color: white, fontName: "Menlo-Bold", alignment: .center))
        } else {
            humanProof.addSublayer(textLayer("HUMAN AUTHORITY", frame: CGRect(x: 44, y: 225, width: 1162, height: 32), size: 18, color: orange, alignment: .center))
            humanProof.addSublayer(textLayer("Repair persistence", frame: CGRect(x: 60, y: 130, width: 470, height: 58), size: 31, color: white, alignment: .center))
            humanProof.addSublayer(textLayer("SELECTED BY PERSON", frame: CGRect(x: 60, y: 94, width: 470, height: 28), size: 14, color: muted, fontName: "Menlo-Bold", alignment: .center))
            humanProof.addSublayer(textLayer("→", frame: CGRect(x: 560, y: 120, width: 130, height: 70), size: 42, color: orange, alignment: .center))
            humanProof.addSublayer(textLayer("inspect_human_decision", frame: CGRect(x: 710, y: 136, width: 480, height: 42), size: 21, color: white, fontName: "Menlo-Bold", alignment: .center))
            humanProof.addSublayer(textLayer("selectedOptionId: repair", frame: CGRect(x: 710, y: 94, width: 480, height: 30), size: 15, color: orange, fontName: "Menlo-Bold", alignment: .center))
            humanProof.addSublayer(textLayer("THE AGENT CAN READ THE DECISION. IT CANNOT MAKE IT.", frame: CGRect(x: 80, y: 34, width: 1090, height: 34), size: 17, color: muted, alignment: .center))
        }
        let humanFade = CAKeyframeAnimation(keyPath: "opacity")
        humanFade.values = [0, 1, 1, 0]
        humanFade.keyTimes = [0, 0.1, 0.88, 1]
        humanFade.beginTime = AVCoreAnimationBeginTimeAtZero + 60.8
        humanFade.duration = 8.65
        humanFade.isRemovedOnCompletion = false
        humanFade.fillMode = .both
        humanProof.add(humanFade, forKey: "human-proof")
        parentLayer.addSublayer(humanProof)

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
                reveal.values = isV8 ? [0, 0, 1, 1, 0, 0] : [0, 1, 1, 0]
                reveal.keyTimes = isV8 ? [0, 0.04, 0.041, 0.959, 0.96, 1] : [0, 0.08, 0.9, 1]
                reveal.beginTime = AVCoreAnimationBeginTimeAtZero + 79.2
                reveal.duration = 7.65
                reveal.isRemovedOnCompletion = false
                reveal.fillMode = .both
                detailLayer.add(reveal, forKey: "topology-reveal")

                let startPosition = CGPoint(x: 960, y: 1080 - scaledHeight / 2)
                let endPosition = CGPoint(x: 960, y: scaledHeight / 2)
                let pan = CABasicAnimation(keyPath: "position")
                pan.fromValue = NSValue(point: startPosition)
                pan.toValue = NSValue(point: endPosition)
                pan.beginTime = AVCoreAnimationBeginTimeAtZero + 79.2
                pan.duration = 7.65
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
                topologyFade.beginTime = AVCoreAnimationBeginTimeAtZero + 82.45
                topologyFade.duration = 4.1
                topologyFade.isRemovedOnCompletion = false
                topologyFade.fillMode = .both
                topologyCaption.add(topologyFade, forKey: "topology-caption")
                parentLayer.addSublayer(topologyCaption)
            }
        }

        if isV8 {
            // The guide and elevation detail use full-frame imagery. Switch those
            // layers behind brief, thematic fog wipes so similar mountain frames
            // never ghost over one another during a dissolve.
            for center in [31.545, 34.329, 79.506, 86.544] {
                let transitionFog = CALayer()
                transitionFog.frame = parentLayer.frame
                transitionFog.backgroundColor = CGColor(red: 0.76, green: 0.87, blue: 0.90, alpha: 1)
                transitionFog.opacity = 0
                let wipe = CAKeyframeAnimation(keyPath: "opacity")
                wipe.values = [0, 0.72, 0]
                wipe.keyTimes = [0, 0.5, 1]
                wipe.beginTime = AVCoreAnimationBeginTimeAtZero + center - 0.34
                wipe.duration = 0.68
                wipe.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
                wipe.isRemovedOnCompletion = false
                wipe.fillMode = .both
                transitionFog.add(wipe, forKey: "masked-full-frame-switch")
                parentLayer.addSublayer(transitionFog)
            }
        }

        let endCard = CALayer()
        endCard.frame = parentLayer.frame
        endCard.opacity = 0
        let endPanel = CALayer()
        endPanel.frame = CGRect(x: 500, y: 105, width: 920, height: 230)
        endPanel.backgroundColor = CGColor(red: 0.012, green: 0.065, blue: 0.085, alpha: 0.86)
        endPanel.cornerRadius = 34
        endPanel.borderWidth = 1.5
        endPanel.borderColor = CGColor(red: 1.0, green: 0.44, blue: 0.22, alpha: 0.78)
        endCard.addSublayer(endPanel)
        endCard.addSublayer(textLayer("CODEX ASCEND", frame: CGRect(x: 550, y: 238, width: 820, height: 54), size: 42, color: white, alignment: .center))
        endCard.addSublayer(textLayer("THE MISSION IS THE MOUNTAIN", frame: CGRect(x: 550, y: 186, width: 820, height: 40), size: 22, color: orange, alignment: .center))
        endCard.addSublayer(textLayer("18 WebMCP tools  ·  Human authority  ·  Verified completion", frame: CGRect(x: 550, y: 142, width: 820, height: 34), size: 18, color: muted, fontName: "AvenirNext-Medium", alignment: .center))
        let endFade = CAKeyframeAnimation(keyPath: "opacity")
        endFade.values = [0, 1, 1, 0]
        endFade.keyTimes = [0, 0.22, 0.84, 1]
        endFade.beginTime = AVCoreAnimationBeginTimeAtZero + 102.0
        endFade.duration = 3.0
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
        parentLayer.addSublayer(textLayer(
            isV7 ? "REAL PRODUCT EXPERIENCE  ·  LIVE WEBMCP CALLS" : "REAL DEPLOYED EXPERIENCE  ·  NATIVE WEBMCP",
            frame: CGRect(x: 36, y: 2, width: 620, height: 18),
            size: 10,
            color: muted,
            fontName: "AvenirNext-DemiBold"
        ))
        parentLayer.addSublayer(textLayer(
            isV8
                ? "AI VOICE  ·  MUSIC: ‘DREAMING BIG’ — AHJAY STELINO / MIXKIT"
                : "AI VOICE  ·  MUSIC: ‘MOUNTAINS’ — ANDREW EV / MIXKIT",
            frame: CGRect(x: 1110, y: 2, width: 774, height: 18),
            size: 10,
            color: muted,
            fontName: "AvenirNext-Medium",
            alignment: .right
        ))

        videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer: videoLayer, in: parentLayer)

        guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
            throw V6AssemblyError.cannotCreateExporter
        }
        exporter.videoComposition = videoComposition
        exporter.audioMix = audioMix
        exporter.shouldOptimizeForNetworkUse = true
        do {
            try await exporter.export(to: output, as: .mp4)
        } catch {
            throw V6AssemblyError.exportFailed("\(error.localizedDescription) [\(String(reflecting: error))]")
        }

        let finalAsset = AVURLAsset(url: output)
        let duration = try await finalAsset.load(.duration).seconds
        print("Created \(output.path)")
        print(String(format: "Duration: %.2f seconds", duration))
    }
}
