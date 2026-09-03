import AVFoundation
import CoreVideo
import Foundation

enum VideoVerificationError: LocalizedError {
    case usage
    case missingTrack(String)
    case cannotRead(String)

    var errorDescription: String? {
        switch self {
        case .usage:
            return "Usage: verify-video-master <video>"
        case let .missingTrack(kind):
            return "The master does not contain a usable \(kind) track."
        case let .cannotRead(kind):
            return "The \(kind) track did not decode completely."
        }
    }
}

@main
struct VideoMasterVerifier {
    static func main() async throws {
        guard CommandLine.arguments.count == 2 else { throw VideoVerificationError.usage }

        let asset = AVURLAsset(url: URL(fileURLWithPath: CommandLine.arguments[1]))
        let duration = try await asset.load(.duration).seconds
        guard let videoTrack = try await asset.loadTracks(withMediaType: .video).first else {
            throw VideoVerificationError.missingTrack("video")
        }
        guard let audioTrack = try await asset.loadTracks(withMediaType: .audio).first else {
            throw VideoVerificationError.missingTrack("audio")
        }

        let naturalSize = try await videoTrack.load(.naturalSize)
        let transform = try await videoTrack.load(.preferredTransform)
        let displayedRect = CGRect(origin: .zero, size: naturalSize).applying(transform)
        let frameRate = try await videoTrack.load(.nominalFrameRate)

        let videoReader = try AVAssetReader(asset: asset)
        let videoOutput = AVAssetReaderTrackOutput(
            track: videoTrack,
            outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
        )
        videoOutput.alwaysCopiesSampleData = false
        videoReader.add(videoOutput)
        videoReader.startReading()
        var decodedFrames = 0
        var lastVideoTime = 0.0
        while let sample = videoOutput.copyNextSampleBuffer() {
            decodedFrames += 1
            lastVideoTime = CMSampleBufferGetPresentationTimeStamp(sample).seconds
        }
        guard videoReader.status == .completed else { throw VideoVerificationError.cannotRead("video") }

        let audioReader = try AVAssetReader(asset: asset)
        let audioOutput = AVAssetReaderTrackOutput(track: audioTrack, outputSettings: [
            AVFormatIDKey: kAudioFormatLinearPCM,
            AVLinearPCMBitDepthKey: 16,
            AVLinearPCMIsFloatKey: false,
            AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsNonInterleaved: false,
        ])
        audioOutput.alwaysCopiesSampleData = false
        audioReader.add(audioOutput)
        audioReader.startReading()

        var audioSamples = 0
        var squaredTotal = 0.0
        var peak = 0.0
        var lastAudioTime = 0.0
        while let sample = audioOutput.copyNextSampleBuffer() {
            lastAudioTime = CMSampleBufferGetPresentationTimeStamp(sample).seconds
            guard let block = CMSampleBufferGetDataBuffer(sample) else { continue }
            let byteCount = CMBlockBufferGetDataLength(block)
            var bytes = [UInt8](repeating: 0, count: byteCount)
            let result = CMBlockBufferCopyDataBytes(block, atOffset: 0, dataLength: byteCount, destination: &bytes)
            guard result == kCMBlockBufferNoErr else { continue }
            bytes.withUnsafeBytes { raw in
                let values = raw.bindMemory(to: Int16.self)
                for value in values {
                    let normalized = Double(value) / Double(Int16.max)
                    squaredTotal += normalized * normalized
                    peak = max(peak, abs(normalized))
                    audioSamples += 1
                }
            }
        }
        guard audioReader.status == .completed else { throw VideoVerificationError.cannotRead("audio") }

        let rms = audioSamples > 0 ? sqrt(squaredTotal / Double(audioSamples)) : 0
        let rmsDBFS = rms > 0 ? 20 * log10(rms) : -.infinity
        let peakDBFS = peak > 0 ? 20 * log10(peak) : -.infinity

        let report: [String: Any] = [
            "durationSeconds": duration,
            "displayWidth": abs(displayedRect.width),
            "displayHeight": abs(displayedRect.height),
            "nominalFrameRate": frameRate,
            "decodedVideoFrames": decodedFrames,
            "lastVideoTimestamp": lastVideoTime,
            "decodedAudioSamples": audioSamples,
            "lastAudioTimestamp": lastAudioTime,
            "audioRMSdBFS": rmsDBFS,
            "audioPeakdBFS": peakDBFS,
            "videoDecode": "complete",
            "audioDecode": "complete",
        ]
        let data = try JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted, .sortedKeys])
        print(String(decoding: data, as: UTF8.self))
    }
}
