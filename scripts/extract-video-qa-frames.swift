import AVFoundation
import AppKit
import Foundation

@main
struct VideoQAFrames {
    static func main() async throws {
        let arguments = CommandLine.arguments
        guard arguments.count >= 3 else {
            throw NSError(domain: "VideoQAFrames", code: 1, userInfo: [NSLocalizedDescriptionKey: "Usage: extract-video-qa-frames <video> <output-directory> [seconds...]"])
        }

        let video = URL(fileURLWithPath: arguments[1])
        let outputDirectory = URL(fileURLWithPath: arguments[2])
        let requestedTimes = arguments.dropFirst(3).compactMap(Double.init)
        let times = requestedTimes.isEmpty ? [5, 20, 50, 75, 100, 126, 133] : requestedTimes

        try FileManager.default.createDirectory(at: outputDirectory, withIntermediateDirectories: true)
        let asset = AVURLAsset(url: video)
        let generator = AVAssetImageGenerator(asset: asset)
        generator.appliesPreferredTrackTransform = true
        generator.requestedTimeToleranceBefore = CMTime(seconds: 0.05, preferredTimescale: 600)
        generator.requestedTimeToleranceAfter = CMTime(seconds: 0.05, preferredTimescale: 600)

        for second in times {
            let image = try await generator.image(at: CMTime(seconds: second, preferredTimescale: 600)).image
            let bitmap = NSBitmapImageRep(cgImage: image)
            guard let png = bitmap.representation(using: .png, properties: [:]) else { continue }
            let filename = String(format: "frame-%06.2f.png", second)
            let output = outputDirectory.appendingPathComponent(filename)
            try png.write(to: output)
            print(output.path)
        }
    }
}
