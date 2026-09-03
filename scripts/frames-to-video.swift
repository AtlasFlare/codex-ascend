import AVFoundation
import AppKit
import CoreGraphics
import CoreVideo
import Foundation

enum FrameVideoError: LocalizedError {
    case usage
    case noFrames(String)
    case imageUnreadable(String)
    case writerSetup(String)
    case appendFailed(Int, String)

    var errorDescription: String? {
        switch self {
        case .usage:
            return "Usage: frames-to-video.swift <frames-directory> <output.mov> [fps]"
        case let .noFrames(path):
            return "No frame-*.jpg images found in \(path)."
        case let .imageUnreadable(path):
            return "Could not read image \(path)."
        case let .writerSetup(message):
            return "Could not prepare video writer: \(message)"
        case let .appendFailed(index, message):
            return "Could not append frame \(index): \(message)"
        }
    }
}

func pixelBuffer(from image: CGImage, width: Int, height: Int, pool: CVPixelBufferPool) throws -> CVPixelBuffer {
    var optionalBuffer: CVPixelBuffer?
    let status = CVPixelBufferPoolCreatePixelBuffer(nil, pool, &optionalBuffer)
    guard status == kCVReturnSuccess, let buffer = optionalBuffer else {
        throw FrameVideoError.writerSetup("pixel buffer allocation failed with status \(status)")
    }

    CVPixelBufferLockBaseAddress(buffer, [])
    defer { CVPixelBufferUnlockBaseAddress(buffer, []) }
    guard let baseAddress = CVPixelBufferGetBaseAddress(buffer) else {
        throw FrameVideoError.writerSetup("pixel buffer has no base address")
    }

    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let context = CGContext(
        data: baseAddress,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
    ) else {
        throw FrameVideoError.writerSetup("could not create frame drawing context")
    }

    context.setFillColor(CGColor(gray: 0.02, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.interpolationQuality = .high
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    return buffer
}

@main
struct FramesToVideo {
    static func main() async throws {
        let arguments = CommandLine.arguments
        guard arguments.count >= 3 else { throw FrameVideoError.usage }

        let fileManager = FileManager.default
        let inputDirectory = URL(fileURLWithPath: arguments[1], isDirectory: true)
        let output = URL(fileURLWithPath: arguments[2])
        let fps = Int32(arguments.count > 3 ? arguments[3] : "15") ?? 15
        let frameURLs = try fileManager.contentsOfDirectory(
            at: inputDirectory,
            includingPropertiesForKeys: nil,
            options: [.skipsHiddenFiles]
        ).filter { $0.lastPathComponent.hasPrefix("frame-") && $0.pathExtension.lowercased() == "jpg" }
            .sorted { $0.lastPathComponent < $1.lastPathComponent }

        guard let firstURL = frameURLs.first else { throw FrameVideoError.noFrames(inputDirectory.path) }
        guard let firstImage = NSImage(contentsOf: firstURL) else { throw FrameVideoError.imageUnreadable(firstURL.path) }
        var firstRect = CGRect(origin: .zero, size: firstImage.size)
        guard let firstCGImage = firstImage.cgImage(forProposedRect: &firstRect, context: nil, hints: nil) else {
            throw FrameVideoError.imageUnreadable(firstURL.path)
        }
        let width = firstCGImage.width
        let height = firstCGImage.height

        try fileManager.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
        if fileManager.fileExists(atPath: output.path) { try fileManager.removeItem(at: output) }

        let writer = try AVAssetWriter(outputURL: output, fileType: .mov)
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
            AVVideoCodecKey: AVVideoCodecType.proRes422,
            AVVideoWidthKey: width,
            AVVideoHeightKey: height,
        ])
        input.expectsMediaDataInRealTime = false
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(
            assetWriterInput: input,
            sourcePixelBufferAttributes: [
                kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
                kCVPixelBufferWidthKey as String: width,
                kCVPixelBufferHeightKey as String: height,
            ]
        )

        guard writer.canAdd(input) else { throw FrameVideoError.writerSetup("video input was rejected") }
        writer.add(input)
        guard writer.startWriting() else {
            throw FrameVideoError.writerSetup(writer.error?.localizedDescription ?? "startWriting failed")
        }
        writer.startSession(atSourceTime: .zero)
        guard let pool = adaptor.pixelBufferPool else { throw FrameVideoError.writerSetup("pixel buffer pool unavailable") }

        for (index, frameURL) in frameURLs.enumerated() {
            while !input.isReadyForMoreMediaData { try await Task.sleep(for: .milliseconds(2)) }
            guard let image = NSImage(contentsOf: frameURL) else { throw FrameVideoError.imageUnreadable(frameURL.path) }
            var imageRect = CGRect(origin: .zero, size: image.size)
            guard let cgImage = image.cgImage(forProposedRect: &imageRect, context: nil, hints: nil) else {
                throw FrameVideoError.imageUnreadable(frameURL.path)
            }
            let buffer = try pixelBuffer(from: cgImage, width: width, height: height, pool: pool)
            let presentationTime = CMTime(value: CMTimeValue(index), timescale: fps)
            guard adaptor.append(buffer, withPresentationTime: presentationTime) else {
                throw FrameVideoError.appendFailed(index, writer.error?.localizedDescription ?? "append returned false")
            }
        }

        input.markAsFinished()
        await writer.finishWriting()
        guard writer.status == .completed else {
            throw FrameVideoError.writerSetup(writer.error?.localizedDescription ?? "finishWriting failed")
        }
        let duration = Double(frameURLs.count) / Double(fps)
        print("Created \(output.path)")
        print(String(format: "%d frames · %dx%d · %.2f seconds", frameURLs.count, width, height, duration))
    }
}
