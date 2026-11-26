import type {
  ActiveLivenessOptions,
  ActiveLivenessResult,
  EngineState,
  FaceLivenessSdkPlugin,
  LicenseStatus,
} from './definitions';
import { messageForCode, NOT_LICENSED, SdkCode, stateForCode } from './definitions';
import { exec } from './cordovaExec';

export * from './definitions';
export { deviceReady, isNativeAvailable } from './cordovaExec';

/**
 * The native bridge, one promise-returning method per plugin action.
 *
 * Prefer `FaceLivenessEngine` and `FaceLiveness` below; this is the raw surface, and the same
 * one `cordova.plugins.FaceLivenessSdk` exposes to non-bundled code.
 */
export const FaceLivenessSdk: FaceLivenessSdkPlugin = {
  start: (options) => exec('start', { ...options }),
  licenseStatus: () => exec('licenseStatus'),
  lastLicenseError: () => exec('lastLicenseError'),
  machineCode: () => exec('machineCode'),
  startActiveLiveness: (options) => exec('startActiveLiveness', { ...options }),
  startPassiveLiveness: (options) => exec('startPassiveLiveness', { ...options }),
};

/**
 * Process-wide engine owner: activation, and the licence state the UI reads.
 *
 * The engine is `FaceRecognitionSDK` — the same build the native Android and iOS liveness apps
 * run, loaded natively. Call `start` once, after `deviceReady()`.
 *
 * Mirrors Android `face-liveness-kit/FaceEngine` and iOS `FaceEngine`.
 */
class Engine {
  private _state: EngineState = 'loading';
  private _license: LicenseStatus = NOT_LICENSED;
  private _lastCode: number = SdkCode.initFailed;
  private _listeners = new Set<(state: EngineState) => void>();

  get state(): EngineState {
    return this._state;
  }

  get isReady(): boolean {
    return this._state === 'ready';
  }

  /** What the last `start` found the key to unlock. */
  get license(): LicenseStatus {
    return this._license;
  }

  get lastCode(): number {
    return this._lastCode;
  }

  /** Called whenever the state changes. Returns an unsubscribe function. */
  addListener(listener: (state: EngineState) => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private publish(next: EngineState): void {
    this._state = next;
    this._listeners.forEach((listener) => listener(next));
  }

  /**
   * Activate with `license` and load the models. Safe to call more than once; a ready engine
   * returns immediately.
   */
  async start(license: string): Promise<number> {
    if (this.isReady) return SdkCode.success;
    this.publish('loading');
    const { code } = await FaceLivenessSdk.start({ license });
    this._lastCode = code;
    this.publish(stateForCode(code));
    await this.refreshLicense();
    return code;
  }

  async refreshLicense(): Promise<LicenseStatus> {
    this._license = (await FaceLivenessSdk.licenseStatus()) ?? NOT_LICENSED;
    return this._license;
  }

  async lastLicenseError(): Promise<string> {
    const { message } = await FaceLivenessSdk.lastLicenseError();
    return message ?? '';
  }

  async machineCode(): Promise<string> {
    const { code } = await FaceLivenessSdk.machineCode();
    return code ?? '';
  }

  /** The message the native home screen shows in its status pill. */
  async statusMessage(): Promise<string> {
    switch (this._state) {
      case 'loading':
        return 'Loading on-device models…';
      case 'ready':
        return `Ready · ${this._license.label}`;
      case 'failed': {
        const detail = (await this.lastLicenseError()).trim();
        return detail ? `Init error! ${detail}` : 'Init error!';
      }
      default:
        return messageForCode(this._lastCode);
    }
  }
}

/** The engine, as one process-wide instance. */
export const FaceLivenessEngine = new Engine();

/**
 * Launches the native liveness screens.
 *
 * `FaceLivenessEngine.start` has to have succeeded first; the screens refuse to run on an engine
 * that is not ready.
 */
export const FaceLiveness = {
  /**
   * Opens the guided active-liveness screen and waits for the attempt to finish.
   *
   * One attempt runs in three stages: the face is found and aligned, the **passive anti-spoofing
   * gate** scores it, and only then are the challenges asked — so a printed photo or a replayed
   * video is turned away before it is ever invited to blink.
   *
   * Resolves to `null` when the user closed the screen before an attempt produced a result.
   */
  async startActiveLiveness(
    options: ActiveLivenessOptions = {},
  ): Promise<ActiveLivenessResult | null> {
    const { result } = await FaceLivenessSdk.startActiveLiveness(options);
    return result ?? null;
  },

  /**
   * Opens the passive-liveness screen: every camera frame is scored on its own, with no action
   * asked of the user, and the HUD shows liveness, quality and head pose.
   */
  startPassiveLiveness(
    options: { useFrontCamera?: boolean; livenessThreshold?: number } = {},
  ): Promise<void> {
    return FaceLivenessSdk.startPassiveLiveness({
      useFrontCamera: options.useFrontCamera ?? true,
      livenessThreshold: options.livenessThreshold ?? 0.5,
    });
  },
};
