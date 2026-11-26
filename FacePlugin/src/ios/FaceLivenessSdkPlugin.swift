import Foundation
import UIKit

/**
 * Bridges Cordova to the native FacePlugin liveness implementation.
 *
 * The engine and both camera screens are the native ones — `FaceEngine` from the vendored
 * `FaceLivenessKit`, `ActiveLivenessViewController` and `LivenessCameraViewController`. Nothing
 * about liveness is re-implemented in the web layer, so the camera preview, the anti-spoofing
 * gate, the challenge sequence and the result card behave exactly as they do in
 * Face-LivenessDetection-iOS.
 */
@objc(FaceLivenessSdkPlugin)
public class FaceLivenessSdkPlugin: CDVPlugin {

    // MARK: - Engine

    @objc(start:)
    func start(command: CDVInvokedUrlCommand) {
        let options = Options(command)
        let license = options.string("license") ?? ""
        guard !license.trimmingCharacters(in: .whitespaces).isEmpty else {
            reject(command, "A license key is required.", code: "E_LICENSE")
            return
        }
        // The kit activates and initialises on its own worker and calls back on the main queue.
        FaceEngine.shared.start(license: license) { [weak self] code in
            self?.resolve(command, ["code": code])
        }
    }

    @objc(licenseStatus:)
    func licenseStatus(command: CDVInvokedUrlCommand) {
        FaceEngine.shared.async { [weak self] in
            let status = FaceEngine.shared.licenseStatus()
            DispatchQueue.main.async { self?.resolve(command, Self.map(status)) }
        }
    }

    @objc(lastLicenseError:)
    func lastLicenseError(command: CDVInvokedUrlCommand) {
        resolve(command, ["message": FaceEngine.shared.lastLicenseError()])
    }

    @objc(machineCode:)
    func machineCode(command: CDVInvokedUrlCommand) {
        FaceEngine.shared.async { [weak self] in
            let code = FaceEngine.shared.machineCode()
            DispatchQueue.main.async { self?.resolve(command, ["code": code]) }
        }
    }

    // MARK: - Screens

    @objc(startActiveLiveness:)
    func startActiveLiveness(command: CDVInvokedUrlCommand) {
        let options = Options(command)
        DispatchQueue.main.async { [weak self] in
            guard let self, let host = self.viewController else {
                self?.reject(command, "No view controller to present from.",
                             code: "E_NO_VIEW_CONTROLLER")
                return
            }
            AppSettings.useFrontCamera = options.bool("useFrontCamera") ?? true
            AppSettings.livenessThreshold = options.float("livenessThreshold")
                ?? ActiveLivenessOptions.defaultLivenessThreshold

            ActiveLivenessViewController.present(
                from: host,
                options: Self.options(from: options)
            ) { [weak self] outcome in
                // A closed screen produces no result, which the web layer reads as null.
                var payload: [String: Any] = [:]
                if let outcome { payload["result"] = Self.map(outcome) }
                self?.resolve(command, payload)
            }
        }
    }

    @objc(startPassiveLiveness:)
    func startPassiveLiveness(command: CDVInvokedUrlCommand) {
        let options = Options(command)
        DispatchQueue.main.async { [weak self] in
            guard let self, let host = self.viewController else {
                self?.reject(command, "No view controller to present from.",
                             code: "E_NO_VIEW_CONTROLLER")
                return
            }
            AppSettings.useFrontCamera = options.bool("useFrontCamera") ?? true
            AppSettings.livenessThreshold = options.float("livenessThreshold") ?? 0.5

            let controller = LivenessCameraViewController()
            let nav = UINavigationController(rootViewController: controller)
            nav.modalPresentationStyle = .fullScreen
            nav.setNavigationBarHidden(true, animated: false)
            host.present(nav, animated: true)
            self.resolve(command, [:])
        }
    }

    // MARK: - Callbacks

    private func resolve(_ command: CDVInvokedUrlCommand, _ payload: [String: Any]) {
        let result = CDVPluginResult(status: .ok, messageAs: payload)
        commandDelegate?.send(result, callbackId: command.callbackId)
    }

    private func reject(_ command: CDVInvokedUrlCommand, _ message: String, code: String) {
        let result = CDVPluginResult(status: .error, messageAs: ["message": message, "code": code])
        commandDelegate?.send(result, callbackId: command.callbackId)
    }

    // MARK: - Mapping

    /// The first argument of a Cordova call, read the way `CAPPluginCall` reads its options.
    private struct Options {
        private let values: [String: Any]

        init(_ command: CDVInvokedUrlCommand) {
            values = (command.arguments.first as? [String: Any]) ?? [:]
        }

        func string(_ key: String) -> String? { values[key] as? String }
        func bool(_ key: String) -> Bool? { values[key] as? Bool }
        func int(_ key: String) -> Int? { (values[key] as? NSNumber)?.intValue }
        func float(_ key: String) -> Float? { (values[key] as? NSNumber)?.floatValue }
        func strings(_ key: String) -> [String]? { values[key] as? [String] }
    }

    /// Builds the native options from the web payload, falling back to engine defaults.
    private static func options(from payload: Options) -> ActiveLivenessOptions {
        var options = ActiveLivenessOptions()
        if let keys = payload.strings("pool") {
            // Keep the canonical enum order so the pool is stable when randomize is off.
            let wanted = Set(keys)
            let pool = ActiveCheck.allCases.filter { wanted.contains($0.key) }
            if !pool.isEmpty { options.pool = pool }
        }
        func float(_ key: String, _ fallback: Float) -> Float { payload.float(key) ?? fallback }
        func int(_ key: String, _ fallback: Int) -> Int { payload.int(key) ?? fallback }
        func bool(_ key: String, _ fallback: Bool) -> Bool { payload.bool(key) ?? fallback }

        options.count = int("count", options.count)
        options.randomize = bool("randomize", options.randomize)
        options.livenessThreshold = float("livenessThreshold", options.livenessThreshold)
        options.passiveSamples = int("passiveSamples", options.passiveSamples)
        options.framesWait = int("framesWait", options.framesWait)
        options.yawThreshold = float("yawThreshold", options.yawThreshold)
        options.pitchThreshold = float("pitchThreshold", options.pitchThreshold)
        options.smileThreshold = float("smileThreshold", options.smileThreshold)
        options.blinkThreshold = float("blinkThreshold", options.blinkThreshold)
        options.blinksNumber = int("blinksNumber", options.blinksNumber)
        options.perspectiveThreshold = float("perspectiveThreshold", options.perspectiveThreshold)
        options.alignAngle = float("alignAngle", options.alignAngle)
        options.minFaceFraction = float("minFaceFraction", options.minFaceFraction)
        options.qualityThreshold = float("qualityThreshold", options.qualityThreshold)
        options.invertTurn = bool("invertTurn", options.invertTurn)
        options.invertTilt = bool("invertTilt", options.invertTilt)
        return options
    }

    private static func map(_ status: LicenseStatus) -> [String: Any] {
        [
            "licensed": status.licensed,
            "level": status.level,
            "levelName": status.levelName,
            "recognition": status.recognition,
            "liveness": status.liveness,
            "label": status.label,
        ]
    }

    private static func map(_ result: ActiveLivenessResult) -> [String: Any] {
        [
            "passed": result.passed,
            "failure": wire(result.failure),
            "passiveScore": result.passiveScore,
            "passivePassed": result.passivePassed,
            "challenges": result.challenges.map { $0.key },
            "outcomes": result.outcomes.map(wire),
            "durationMs": result.durationMs,
        ]
    }

    /// The wire names the web layer and Android share.
    private static func wire(_ failure: ActiveLivenessSession.Failure) -> String {
        switch failure {
        case .none: return "NONE"
        case .spoof: return "SPOOF"
        case .check: return "CHECK"
        case .timeout: return "TIMEOUT"
        case .cancelled: return "CANCELLED"
        }
    }

    private static func wire(_ step: ActiveLivenessSession.StepState) -> String {
        switch step {
        case .pending: return "PENDING"
        case .active: return "ACTIVE"
        case .passed: return "PASSED"
        case .failed: return "FAILED"
        }
    }
}
