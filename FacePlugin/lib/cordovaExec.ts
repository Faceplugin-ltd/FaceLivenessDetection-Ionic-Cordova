/**
 * `cordova.exec`, as a promise.
 *
 * Cordova's bridge is callback-based and only exists once `deviceready` has fired, so every call
 * goes through here: it waits for the bridge, then resolves or rejects a single invocation.
 */

/** The native error payload: the plugin rejects with a message and a short code. */
export interface NativeError {
  message: string;
  code?: string;
}

const PLUGIN = 'FaceLivenessSdk';

interface CordovaBridge {
  exec(
    success: (value: unknown) => void,
    failure: (reason: unknown) => void,
    service: string,
    action: string,
    args: unknown[],
  ): void;
  platformId?: string;
  require?: (module: string) => { onDeviceReady?: { state?: number } } | undefined;
}

function bridge(): CordovaBridge | null {
  const cordova = (window as Window & { cordova?: CordovaBridge }).cordova;
  return cordova && typeof cordova.exec === 'function' ? cordova : null;
}

/** True once Cordova's `deviceready` channel has fired. */
function alreadyReady(cordova: CordovaBridge): boolean {
  if (cordova.platformId) return true;
  try {
    // Channel state 2 is "fired"; a listener added afterwards would still run, but checking
    // keeps the first call from waiting a tick for nothing.
    return cordova.require?.('cordova/channel')?.onDeviceReady?.state === 2;
  } catch {
    return false;
  }
}

/** Resolves once `deviceready` has fired; immediately if it already has. */
let ready: Promise<void> | null = null;

export function deviceReady(timeoutMs = 8000): Promise<void> {
  if (ready) return ready;
  ready = new Promise<void>((resolve) => {
    const cordova = bridge();
    // In a plain browser `cordova` is never injected. Resolve anyway: `exec` below reports the
    // missing bridge with a far clearer message than a promise that never settles.
    if (!cordova || alreadyReady(cordova)) {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    document.addEventListener('deviceready', finish, { once: true });
    // A webview that never fires deviceready would otherwise hang the UI with no explanation.
    window.setTimeout(finish, timeoutMs);
  });
  return ready;
}

/** True on a device build where the native plugin can be reached. */
export function isNativeAvailable(): boolean {
  return bridge() !== null;
}

/**
 * Calls one plugin action. Rejects with an `Error` whose `message` is the native message, so the
 * UI can show it as-is.
 */
export async function exec<T>(action: string, options: Record<string, unknown> = {}): Promise<T> {
  await deviceReady();
  const cordova = bridge();
  if (!cordova) {
    // Liveness runs in the native engine and on the native screens, so there is nothing to do in
    // a browser. Rejecting is deliberate: an anti-spoofing check that quietly passes would be
    // worse than no check at all.
    throw new Error(
      `FaceLivenessSdk.${action}() is only available on Android and iOS: the engine and both ` +
        `liveness screens are native.`,
    );
  }
  return new Promise<T>((resolve, reject) => {
    cordova.exec(
      (value) => resolve(value as T),
      (reason) => reject(toError(action, reason)),
      PLUGIN,
      action,
      [options],
    );
  });
}

function toError(action: string, reason: unknown): Error {
  if (reason instanceof Error) return reason;
  if (typeof reason === 'string') return new Error(reason);
  if (reason && typeof reason === 'object') {
    const { message, code } = reason as Partial<NativeError>;
    const error = new Error(message ?? `FaceLivenessSdk.${action}() failed`);
    if (code) error.name = code;
    return error;
  }
  return new Error(`FaceLivenessSdk.${action}() failed`);
}
