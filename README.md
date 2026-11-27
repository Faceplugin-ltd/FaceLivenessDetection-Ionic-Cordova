<div align="center">
<img alt="FacePlugin" src="https://raw.githubusercontent.com/Faceplugin-ltd/faceplugin-assets/main/brand/logo.png" width="400"/>
</div>

#### 🌐 Company Site - [Here](https://faceplugin.com)

#### 🤗 Hugging Face - [Here](https://huggingface.co/FacePlugin-Ltd)

#### 🛟 Help Center - [Here](https://doc.faceplugin.com)

#### 🐳 Docker Hub - [Here](https://hub.docker.com/u/faceplugin)

# FacePlugin Face Liveness Detection — Ionic Cordova (Fully On-Premise)

> The camera screens are the **native** FacePlugin ones, launched from the web layer.
> Jump: [Quick start](#quick-start) · [How it works](#how-it-works) · [Get the engine](#get-the-engine) · [Run the demo](#run-the-demo) · [SDK License](#sdk-license) · [Setup on your own app](#setup-on-your-own-app) · [About SDK](#about-sdk)

## Quick start

- [ ] Clone [FaceLivenessDetection-Ionic-Cordova](https://github.com/Faceplugin-ltd/FaceLivenessDetection-Ionic-Cordova)
- [ ] Engine binaries (auto-downloaded by the runner, or place them yourself) — [Get the engine](#get-the-engine)
- [ ] `python run_android.py` (or `python run_ios.py` on macOS) with a **physical** phone plugged in
- [ ] Home status shows **Ready** → **Active liveness** / **Passive liveness** unlock

That is the whole setup. The scripts do the rest: `npm install`, adding the platform on the first
run, `cordova prepare`, the build, and the install onto the phone. They need Node 18+, JDK 17 and
Cordova 12 (plus Xcode 15+ on macOS) on PATH, and stop with a named hint if anything is missing.

## Introduction

FacePlugin **Face Liveness Detection SDK for Ionic Cordova** is a fully on-device anti-spoofing
demo for KYC and remote identity verification. It detects printed photos, video replay, 3D masks and
deepfake-style attacks — no extra hardware, no cloud.

It runs liveness two ways, and this app ships both:

- **Passive** — the engine scores a single frame. Nothing is asked of the user.
- **Active** — the face is scored for spoofing **first**, and only a face that clears that gate is
  asked for a short sequence of actions (blink, smile, turn your head). A recorded video cannot
  answer a sequence it has never seen, so the two together are the stronger check against replay.

All processing stays on the phone. **No** biometric data leaves the device.

## How it works

This app does **not** re-implement liveness in the web layer. The plugin launches the **native**
FacePlugin screens, so the camera preview, the anti-spoofing gate, the shuffled challenge sequence,
the progress ring and the result card are the same code that
[FaceLivenessDetection-Android](https://github.com/Faceplugin-ltd/FaceLivenessDetection-Android)
and [FaceLivenessDetection-iOS](https://github.com/Faceplugin-ltd/FaceLivenessDetection-iOS) run.
The engine is the same binary too — `facerecognitionsdk`.

There is no camera in the WebView and no frames cross the bridge, which is why a call made in a
browser deliberately **rejects** instead of returning a verdict: an anti-spoofing check that quietly
passes in a browser would be worse than no check at all.

| Layer | Where it lives | What it is |
| ----- | -------------- | ---------- |
| Ionic UI | `src/` | Home, Settings and About — rebuilt to match the native screens |
| TypeScript API | `FacePlugin/lib/` | `FaceLivenessEngine`, `FaceLiveness`, and the typed options/result models |
| Plain-JS API | `FacePlugin/www/` | `cordova.plugins.FaceLivenessSdk`, for pages with no build step |
| Android native | `FacePlugin/src/android/java/` | The bridge, plus the vendored `face-liveness-kit` and `face-liveness-active` |
| iOS native | `FacePlugin/src/ios/` | The Swift bridge, plus the vendored `FaceLivenessKit` and `ActiveLiveness` |

The vendored native sources are copies of the Android `face-liveness-kit` and `face-liveness-active`
modules and their iOS counterparts, `FaceLivenessKit` and `ActiveLiveness`. They are kept in step
with the native repositories rather than maintained separately here.

Cordova compiles plugin sources **into the app module**, which is the one real difference from the
Capacitor build: there is no library module, so `FacePlugin/src/android/aarintegration.gradle` adds
the engine and CameraX to the app, and `hooks/android_prepare.js` points the vendored sources'
`import <package>.R` at whatever the app's package turns out to be.

### Main Functionalities

| Screen | What it does | Built with |
| ------ | ------------ | ---------- |
| **Active liveness** | Anti-spoofing gate, then a guided challenge sequence — face frame, progress ring, per-step instructions, and a pass/fail result listing every check | Native |
| **Passive liveness** | Live camera anti-spoofing with a face box and a liveness / quality / pose HUD | Native |
| **Home** | Engine status, the two liveness demos, settings and about | Ionic |
| **Settings** | Camera lens, passive score threshold, the challenge pool, how many are asked, random order and every engine threshold | Ionic |
| **About** | FacePlugin Face Liveness SDK — on-device anti-spoofing | Ionic |

### Product List

| Platform | Repository |
| -------- | ---------- |
| Android | [FaceLivenessDetection-Android](https://github.com/Faceplugin-ltd/FaceLivenessDetection-Android) |
| iOS | [FaceLivenessDetection-iOS](https://github.com/Faceplugin-ltd/FaceLivenessDetection-iOS) |
| Flutter | [FaceLivenessDetection-Flutter](https://github.com/Faceplugin-ltd/FaceLivenessDetection-Flutter) |
| React Native | [FaceLivenessDetection-ReactNative](https://github.com/Faceplugin-ltd/FaceLivenessDetection-ReactNative) |
| Ionic Capacitor | [FaceLivenessDetection-Ionic-Capacitor](https://github.com/Faceplugin-ltd/FaceLivenessDetection-Ionic-Capacitor) |
| **Ionic Cordova** | **[FaceLivenessDetection-Ionic-Cordova](https://github.com/Faceplugin-ltd/FaceLivenessDetection-Ionic-Cordova)** **(this repo)** |
| .NET MAUI | [FaceLivenessDetection-DotNet-MAUI](https://github.com/Faceplugin-ltd/FaceLivenessDetection-DotNet-MAUI) |
| Linux / Docker | [FaceLivenessDetection-Docker](https://github.com/Faceplugin-ltd/FaceLivenessDetection-Docker) |
| Windows | [FaceLivenessDetection-Windows](https://github.com/Faceplugin-ltd/FaceLivenessDetection-Windows) |

### Related products

- **Face Recognition + Liveness** — [FaceRecognition-LivenessDetection-Ionic-Cordova](https://github.com/Faceplugin-ltd/FaceRecognition-LivenessDetection-Ionic-Cordova) — Recognition + liveness + attributes

Product hubs: [Face Recognition](https://github.com/Faceplugin-ltd/Face-Recognition-SDK) · [ID Document Recognition](https://github.com/Faceplugin-ltd/ID-Document-Recognition-SDK) · [ID Document Liveness](https://github.com/Faceplugin-ltd/ID-Document-LivenessDetection-SDK)

## Before you start

| Step | What you need |
| ---- | ------------- |
| 1 | Node 18+, npm, Cordova 12, and a **physical** phone |
| 2 | `FacePlugin/src/android/facerecognitionsdk.aar` — see [Get the engine](#get-the-engine) |
| 3 | For iOS: macOS, Xcode, and the four frameworks in `FacePlugin/src/ios/Frameworks/` |
| 4 | A licence key for your ids. The demo ships one for `com.faceplugin.faceliveness` |

### System requirements

| Item | Minimum | Recommended |
| ---- | ------- | ----------- |
| Android | `android-minSdkVersion 24` (Android 7.0) | Android 10 or newer |
| iOS | 14.0 (`config.xml` `deployment-target`) | 15 or newer |
| ABI | `arm64-v8a` or `armeabi-v7a` | `arm64-v8a` |
| Device | Physical device | Same; the emulator is not for camera work |

## Get the engine

The engine is the same binary the native apps run, and it is not in git.

**Android** — one file:

```text
FacePlugin/src/android/facerecognitionsdk.aar
```

Download it from the
[FaceRecognition-LivenessDetection-Android release](https://github.com/Faceplugin-ltd/FaceRecognition-LivenessDetection-Android/releases/tag/latest),
or let `python run_android.py` download it from Releases. `hooks/android_prepare.js` places it in
`platforms/android/app/src/main/libs/`, where `aarintegration.gradle` picks it up through a
`flatDir` repository, and fails with a named message if it is absent.

**iOS** — four **device** `.framework` slices, from the
[FaceRecognition-LivenessDetection-iOS release](https://github.com/Faceplugin-ltd/FaceRecognition-LivenessDetection-iOS/releases/tag/latest):

```text
FacePlugin/src/ios/Frameworks/facerecognitionsdk.framework
FacePlugin/src/ios/Frameworks/FacePluginSDK.framework
FacePlugin/src/ios/Frameworks/FacePPlugin.framework
FacePlugin/src/ios/Frameworks/FaceDetect.framework
```

Cordova links these by name, so they are the `ios-arm64` slices, not the xcframeworks. The third
name really is **`FacePPlugin`**, with two Ps: it is the slice inside `FacePlugin.xcframework`, and
linking it under any other name leaves `ld` looking for a `FacePlugin` that does not exist.

`hooks/ios_prepare.js` fails with a named list if any is missing, so a missing engine is reported
before the build rather than as a link error. It also re-signs the frameworks inside the built
`.app`, which vendor frameworks need before a device will accept them.

## Run the demo

```bash
python run_android.py     # or: python run_ios.py on macOS
```

The runner downloads the engine if needed, then runs the usual Cordova steps. By hand:

```bash
npm install
npm run setup:android                     # once — platform + plugin + prepare
npm run android                           # build → cordova prepare → cordova run
```

On macOS, put your Apple team id in `build.json`, then:

```bash
npm run setup:ios                         # once — platform + plugin + prepare
npm run ios                               # builds, then installs via xcrun devicectl
```

`npm run ios` does **not** use `cordova run` / `ios-deploy` (those miss CoreDevice /
wireless phones and fall back to the simulator). It builds with Cordova, finds the
connected iPhone via `xctrace`/`devicectl`, and installs/launches the exported `.ipa`.

`npm run android` bootstraps Gradle when needed (`scripts/with-gradle.js`: system PATH, then the Gradle wrapper cache, then a portable copy under `.tools/`). Cordova needs a Gradle binary on PATH to create the platform wrapper the first time.

| Platform | Identifier |
| -------- | ---------- |
| Android `applicationId` | `com.faceplugin.faceliveness` |
| iOS bundle id | `com.faceplugin.faceliveness.app` |

1. Wait until the home status shows **Ready**.
2. **Active liveness** runs the gate, then the challenges, and ends on a result card.
3. **Passive liveness** scores every frame: a green box is Real, a red box is Spoof, at the
   threshold from Settings.

### Screenshots

| Active liveness(Result) | Passive liveness |
| ----------------- | ------------------ |
| <p align="center"><img src="https://raw.githubusercontent.com/Faceplugin-ltd/faceplugin-assets/main/screenshots/face-liveness/mobile/active_result.png" alt="FacePlugin Face Liveness — Active liveness result: anti-spoofing gate and challenges passed" width="220"/></p> | <p align="center"><img src="https://raw.githubusercontent.com/Faceplugin-ltd/faceplugin-assets/main/screenshots/face-liveness/mobile/passive.png" alt="FacePlugin Face Liveness — Passive liveness: live camera anti-spoofing with liveness, quality and pose" width="220"/></p> |

## SDK License

Licences are **offline** and bound to your `applicationId` / bundle id, so your own app needs its own
key. The demo ships the key for `com.faceplugin.faceliveness`.

> **This build changed engines.** The app now runs on `facerecognitionsdk`, which checks licences
> with its own library. If the home status shows **Invalid license!** or **No activated!** on a clean
> install, the bundled key predates the change — [contact us](#contact) for one issued for these ids
> on this runtime.

The key lives in [`src/license.ts`](src/license.ts). After activation, `FaceLivenessEngine.license`
reports what it unlocks: both liveness screens stay locked unless the key grants **Liveness**.

## Setup on your own app

```bash
cordova plugin add face-liveness-cordova
```

1. Drop `facerecognitionsdk.aar` in the plugin's `src/android/`, and the four frameworks in its
   `src/ios/Frameworks/`.
2. Set `android-minSdkVersion` to 24 and turn Kotlin on in `config.xml`:

```xml
<preference name="android-minSdkVersion" value="24" />
<preference name="AndroidXEnabled" value="true" />
<preference name="GradlePluginKotlinEnabled" value="true" />
<preference name="GradlePluginKotlinVersion" value="1.9.24" />
```

3. Start the engine once, after `deviceready`, then launch a screen:

```ts
import { deviceReady, FaceLiveness, FaceLivenessEngine } from 'face-liveness-cordova';

await deviceReady();
await FaceLivenessEngine.start(yourLicenseKey);

const result = await FaceLiveness.startActiveLiveness({ count: 3 });
if (result?.passed) {
  // live person
}
```

Without a bundler, the same calls are on `cordova.plugins.FaceLivenessSdk` — one promise-returning
method per action, with no engine wrapper and no helpers.

## About SDK

```ts
// Engine lifecycle
await deviceReady();                          // Cordova's bridge exists only after this
await FaceLivenessEngine.start(licenseKey);   // activate + load the models
FaceLivenessEngine.state;                     // 'loading' | 'ready' | 'licenseInvalid' | …
FaceLivenessEngine.license;                   // LicenseStatus: liveness / recognition / label
FaceLivenessEngine.addListener(onStateChange);
await FaceLivenessEngine.machineCode();       // for a node-locked key

// Active liveness — the gate, then the challenges
const result = await FaceLiveness.startActiveLiveness(options);
result?.passed;          // gate cleared and every challenge completed
result?.passivePassed;   // did the anti-spoofing gate clear?
result?.passiveScore;    // averaged score, or -1 when never measured
result?.outcomes;        // one StepState per challenge
failedCheck(result);     // the challenge that ended the attempt

// Passive liveness — one frame at a time, with a HUD
await FaceLiveness.startPassiveLiveness({
  useFrontCamera: true,
  livenessThreshold: 0.5,
});
```

`ActiveLivenessOptions` carries every threshold the native session judges against — the challenge
pool, how many are asked, random order, head-turn and tilt angles, smile and eye-closed confidence,
blinks required, the move-closer growth, the start alignment tolerance, the minimum face size and
the minimum image quality. Every field is optional and the native side falls back to the engine's
own operating points, so the defaults match Android and iOS exactly.

> **Head-pose direction.** Which way `yaw` and `pitch` count as positive is a property of the engine
> build. If a turn challenge accepts the opposite direction on your device, flip
> **Settings → Invert left / right** (or **Invert up / down**) — no rebuild needed.

## Contact

<div align="left">
<a target="_blank" href="mailto:info@faceplugin.com"><img src="https://img.shields.io/badge/email-info@faceplugin.com-blue.svg?logo=gmail" alt="faceplugin.com"></a>&emsp;
<a target="_blank" href="https://t.me/FacePluginSupport"><img src="https://img.shields.io/badge/telegram-@FacePluginSupport-blue.svg?logo=telegram" alt="Telegram @FacePluginSupport"></a>&emsp;
<a target="_blank" href="https://wa.me/+14692784822"><img src="https://img.shields.io/badge/whatsapp-faceplugin-blue.svg?logo=whatsapp" alt="faceplugin.com"></a>
</div>
