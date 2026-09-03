import AVFoundation
import AppKit
import CoreGraphics
import Foundation
import QuartzCore

struct V4Overlay {
    let filename: String
    let timelineStart: Double
    let duration: Double
}

enum V4AssemblyError: LocalizedError {
    case missingTrack(String)
    case cannotCreateTrack
    case cannotCreateExporter
    case exportFailed(String)

    var errorDescription: String? {
        switch self {
        case let .missingTrack(path): return "No usable media track in \(path)."
        case .cannotCreateTrack: return "Could not create a composition track."
        case .cannotCreateExporter: return "Could not create the V4 exporter."
        case let .exportFailed(message): return "V4 export failed: \(message)"
        }
    }
}

@main
struct ContestVideoAssemblerV4 {
    static let totalDuration = 135.0
    static func seconds(_ value: Double) -> CMTime { CMTime(seconds: value, preferredTimescale: 600) }

    static func main() async throws {
        let repository = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        let captures = repository.appendingPathComponent("artifacts/video/captures")
        let baseURL = repository.appendingPathComponent("artifacts/video/final/codex-ascend-webmcp-challenge-demo-v3.mp4")
        let output = repository.appendingPathComponent("artifacts/video/final/codex-ascend-webmcp-challenge-demo-v4.mp4")
        let overlays = [
            // Real deployed attach_evidence and complete_stage calls appear during
            // the WebMCP/evidence explanation, well before the first minute ends.
            V4Overlay(filename: "08-v4-evidence-to-approach.mov", timelineStart: 43.0, duration: 4.67),
            // Preserve the deterministic verification gate, then show the
            // resulting Summit scenario while narration reaches its conclusion.
            V4Overlay(filename: "09-v4-verified-summit.mov", timelineStart: 115.75, duration: 4.67),
            V4Overlay(filename: "10-v4-summit-card.mov", timelineStart: 120.42, duration: 4.0),
        ]

        let fileManager = FileManager.default
        try fileManager.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
        if fileManager.fileExists(atPath: output.path) { try fileManager.removeItem(at: output) }

        let composition = AVMutableComposition()
        let baseAsset = AVURLAsset(url: baseURL)
        guard let baseVideoSource = try await baseAsset.loadTracks(withMediaType: .video).first,
              let baseAudioSource = try await baseAsset.loadTracks(withMediaType: .audio).first,
              let baseVideo = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
              let baseAudio = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else {
            throw V4AssemblyError.missingTrack(baseURL.path)
        }
        let fullRange = CMTimeRange(start: .zero, duration: seconds(totalDuration))
        try baseVideo.insertTimeRange(fullRange, of: baseVideoSource, at: .zero)
        try baseAudio.insertTimeRange(fullRange, of: baseAudioSource, at: .zero)

        let baseLayer = AVMutableVideoCompositionLayerInstruction(assetTrack: baseVideo)
        baseLayer.setTransform(try await baseVideoSource.load(.preferredTransform), at: .zero)
        var overlayLayers: [AVMutableVideoCompositionLayerInstruction] = []

        for overlay in overlays {
            let url = captures.appendingPathComponent(overlay.filename)
            let asset = AVURLAsset(url: url)
            guard let source = try await asset.loadTracks(withMediaType: .video).first,
                  let track = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else {
                throw V4AssemblyError.missingTrack(url.path)
            }
            try track.insertTimeRange(
                CMTimeRange(start: .zero, duration: seconds(overlay.duration)),
                of: source,
                at: seconds(overlay.timelineStart)
            )

            let layer = AVMutableVideoCompositionLayerInstruction(assetTrack: track)
            let preferred = try await source.load(.preferredTransform)
            let fullBleedTransform = preferred.concatenating(
                CGAffineTransform(a: 1.2, b: 0, c: 0, d: 1.2, tx: 96, ty: 0)
            )
            layer.setTransform(fullBleedTransform, at: seconds(overlay.timelineStart))
            layer.setOpacity(0, at: .zero)
            layer.setOpacityRamp(
                fromStartOpacity: 0,
                toEndOpacity: 1,
                timeRange: CMTimeRange(start: seconds(overlay.timelineStart), duration: seconds(0.22))
            )
            layer.setOpacity(1, at: seconds(overlay.timelineStart + 0.22))
            layer.setOpacityRamp(
                fromStartOpacity: 1,
                toEndOpacity: 0,
                timeRange: CMTimeRange(start: seconds(overlay.timelineStart + overlay.duration - 0.24), duration: seconds(0.24))
            )
            overlayLayers.append(layer)
        }

        let instruction = AVMutableVideoCompositionInstruction()
        instruction.timeRange = fullRange
        instruction.layerInstructions = overlayLayers.reversed() + [baseLayer]

        let videoComposition = AVMutableVideoComposition()
        videoComposition.instructions = [instruction]
        videoComposition.renderSize = CGSize(width: 1920, height: 1080)
        videoComposition.frameDuration = CMTime(value: 1, timescale: 30)

        let parentLayer = CALayer()
        parentLayer.frame = CGRect(x: 0, y: 0, width: 1920, height: 1080)
        let videoLayer = CALayer()
        videoLayer.frame = parentLayer.frame
        parentLayer.addSublayer(videoLayer)

        func labelLayer(_ text: String) -> CALayer {
            let frame = CGRect(x: 118, y: 72, width: 530, height: 48)
            let image = NSImage(size: frame.size)
            image.lockFocus()
            let font = NSFont(name: "AvenirNext-DemiBold", size: 18) ?? NSFont.systemFont(ofSize: 18, weight: .semibold)
            NSAttributedString(string: text, attributes: [
                .font: font,
                .foregroundColor: NSColor.white,
                .kern: 1.8,
            ]).draw(in: CGRect(origin: .zero, size: frame.size))
            image.unlockFocus()
            var imageRect = CGRect(origin: .zero, size: image.size)
            let layer = CALayer()
            layer.frame = frame
            layer.contents = image.cgImage(forProposedRect: &imageRect, context: nil, hints: nil)
            layer.contentsGravity = .resizeAspect
            layer.backgroundColor = CGColor(red: 0.018, green: 0.09, blue: 0.12, alpha: 0.86)
            layer.cornerRadius = 14
            layer.borderWidth = 1
            layer.borderColor = CGColor(red: 0.32, green: 0.88, blue: 0.66, alpha: 0.9)
            layer.opacity = 0
            return layer
        }

        func proofFade(for overlay: V4Overlay) -> CAKeyframeAnimation {
            let fade = CAKeyframeAnimation(keyPath: "opacity")
            fade.values = [0, 1, 1, 0]
            fade.keyTimes = [0, 0.06, 0.92, 1]
            fade.beginTime = AVCoreAnimationBeginTimeAtZero + overlay.timelineStart
            fade.duration = overlay.duration
            fade.isRemovedOnCompletion = false
            fade.fillMode = .both
            return fade
        }

        for overlay in overlays {
            // The 1440x900 capture scales to a 1728x1080 proof viewport. Clean
            // side curtains prevent the underlying V3 editorial frame from
            // peeking through during these full-focus live moments.
            for frame in [CGRect(x: 0, y: 0, width: 96, height: 1080), CGRect(x: 1824, y: 0, width: 96, height: 1080)] {
                let curtain = CALayer()
                curtain.frame = frame
                curtain.backgroundColor = CGColor(red: 0.014, green: 0.064, blue: 0.086, alpha: 1)
                curtain.opacity = 0
                curtain.add(proofFade(for: overlay), forKey: "proof-curtain")
                parentLayer.addSublayer(curtain)
            }

            let label = labelLayer("LIVE DEPLOYED V4  ·  REAL WEBMCP STATE CHANGE")
            let fade = proofFade(for: overlay)
            label.add(fade, forKey: "live-proof")
            parentLayer.addSublayer(label)
        }

        videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(
            postProcessingAsVideoLayer: videoLayer,
            in: parentLayer
        )

        guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
            throw V4AssemblyError.cannotCreateExporter
        }
        exporter.videoComposition = videoComposition
        exporter.shouldOptimizeForNetworkUse = true
        do {
            try await exporter.export(to: output, as: .mp4)
        } catch {
            throw V4AssemblyError.exportFailed("\(error.localizedDescription) [\(String(reflecting: error))]")
        }

        let finalAsset = AVURLAsset(url: output)
        let duration = try await finalAsset.load(.duration).seconds
        print("Created \(output.path)")
        print(String(format: "Duration: %.2f seconds", duration))
    }
}
