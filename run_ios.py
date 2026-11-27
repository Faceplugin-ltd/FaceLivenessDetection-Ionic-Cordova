#!/usr/bin/env python3
# Windows:  python run_ios.py          (prints that iOS needs a Mac)
# macOS:    python3 run_ios.py   or  ./run_ios.py
"""Deploy the Face Liveness Cordova iOS demo to a plugged-in iPhone."""
from __future__ import annotations

import os
import plistlib
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
IS_MAC = sys.platform == "darwin"
IOS_BUNDLE_ID = "com.faceplugin.faceliveness.app"
FW_DEST = ROOT / "FacePlugin" / "src" / "ios" / "Frameworks"
IOS_APP = ROOT.parent / "Face-LivenessDetection-iOS"
ENGINE_NAMES = (
    "facerecognitionsdk.framework",
    "FacePluginSDK.xcframework",
    "FacePlugin.xcframework",
    "FaceDetect.xcframework",
)
# Cordova links the device slices by framework name (FacePPlugin, not FacePlugin).
DEVICE_SLICES = (
    "FacePluginSDK.framework",
    "FacePPlugin.framework",
    "FaceDetect.framework",
)


def die(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(1)


def which(name: str) -> str | None:
    return shutil.which(name)


def need(name: str, hint: str) -> str:
    path = which(name)
    if not path:
        die(f"{name} is not on PATH. {hint}")
    return path


def run(args: list[str], cwd: Path | None = None) -> None:
    print("+", " ".join(str(a) for a in args))
    r = subprocess.run(args, cwd=str(cwd or ROOT))
    if r.returncode:
        raise SystemExit(r.returncode)


def copy_if_missing(src: Path, dest: Path) -> bool:
    if dest.exists() or not src.exists():
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    if src.is_dir():
        shutil.copytree(src, dest, symlinks=True)
    else:
        shutil.copy2(src, dest)
    print(f"copied {src.name} -> {dest}")
    return True


def ensure_ios_runtimes() -> None:
    import fp_releases

    fp_releases.ensure_ios_engine(ROOT, FW_DEST, with_bridge=False)
    # FacePlugin.xcframework's ios-arm64 slice is FacePPlugin — Cordova ld needs that name.
    for xc, fw_name in (
        ("FacePluginSDK.xcframework", "FacePluginSDK.framework"),
        ("FacePlugin.xcframework", "FacePPlugin.framework"),
        ("FaceDetect.xcframework", "FaceDetect.framework"),
    ):
        slice_fw = FW_DEST / xc / "ios-arm64" / fw_name
        copy_if_missing(slice_fw, FW_DEST / fw_name)
    missing = [n for n in ("facerecognitionsdk.framework", *DEVICE_SLICES) if not (FW_DEST / n).is_dir()]
    if missing:
        die(f"missing device frameworks in {FW_DEST}:
  " + "
  ".join(missing))


def ios_udid() -> str:
    need("xcrun", "Install Xcode and its command-line tools.")
    raw = subprocess.check_output(
        ["xcrun", "xctrace", "list", "devices"],
        text=True,
        stderr=subprocess.STDOUT,
        errors="replace",
    )
    in_sims = False
    for line in raw.splitlines():
        lower = line.lower()
        if "simulator" in lower:
            in_sims = True
            continue
        if in_sims or "(" not in line or ")" not in line:
            continue
        if "mac" in lower or "watch" in lower or "apple tv" in lower:
            continue
        udid = line.rsplit("(", 1)[-1].strip().rstrip(")")
        token = udid.replace("-", "")
        if len(token) >= 16 and token.isalnum():
            print(f"iOS device: {line.strip()}")
            return udid
    die("no physical iPhone. Plug one in and trust this computer.")
    raise SystemExit(1)


def npm_install() -> None:
    if not (ROOT / "node_modules").is_dir():
        run([need("npm", "Install Node.js from https://nodejs.org/"), "install"], cwd=ROOT)


def cordova_device_app() -> tuple[Path, str]:
    """Signed device .app (unpack the IPA when ios-deploy skipped install)."""
    build_dir = ROOT / "platforms" / "ios" / "build" / "Debug-iphoneos"
    apps = [p for p in build_dir.glob("*.app") if (p / "Info.plist").is_file()]
    if not apps:
        ipas = sorted(build_dir.glob("*.ipa"))
        if not ipas:
            die(f"no device app in {build_dir}")
        run(["unzip", "-o", "-qq", ipas[-1].name], cwd=build_dir)
        payload = build_dir / "Payload"
        unpacked = [p for p in payload.glob("*.app") if (p / "Info.plist").is_file()]
        if not unpacked:
            die(f"{ipas[-1].name} has no Payload app")
        dest = build_dir / unpacked[0].name
        if dest.exists():
            shutil.rmtree(dest)
        shutil.move(str(unpacked[0]), str(dest))
        shutil.rmtree(payload, ignore_errors=True)
        apps = [dest]
    app = apps[0]
    with app.joinpath("Info.plist").open("rb") as fh:
        bundle = str(plistlib.load(fh).get("CFBundleIdentifier") or "")
    if not bundle:
        die(f"{app} has no CFBundleIdentifier")
    return app, bundle


def install_and_launch(device: str) -> None:
    app, bundle = cordova_device_app()
    if bundle != IOS_BUNDLE_ID:
        print(f"warning: built bundle id is {bundle!r}, expected {IOS_BUNDLE_ID!r}")
    run(["xcrun", "devicectl", "device", "install", "app", "--device", device, str(app)])
    run(
        [
            "xcrun",
            "devicectl",
            "device",
            "process",
            "launch",
            "--terminate-existing",
            "--device",
            device,
            bundle,
        ]
    )


def main() -> None:
    if not IS_MAC:
        die("iOS builds need macOS and Xcode. Use python run_android.py on this machine.")
    print(f"{ROOT.name}: ios (cordova)")
    npm = need("npm", "Install Node.js from https://nodejs.org/")
    npx = need("npx", "Install Node.js from https://nodejs.org/")
    npm_install()
    ensure_ios_runtimes()
    device = ios_udid()
    run([npm, "run", "plugin:build"], cwd=ROOT)
    run([npm, "run", "build"], cwd=ROOT)
    setup = ROOT / "scripts" / "setup-ios.js"
    if setup.is_file():
        run([need("node", "Install Node.js."), str(setup)], cwd=ROOT)
    else:
        run([npx, "cordova", "prepare", "ios"], cwd=ROOT)
    print("+", npx, "cordova run ios --device --target", device)
    launched = subprocess.run(
        [npx, "cordova", "run", "ios", "--device", "--target", device],
        cwd=str(ROOT),
    )
    if launched.returncode == 0:
        return
    # ios-deploy on newer iOS often cannot see the phone after archive export.
    print("cordova run exited", launched.returncode, "; installing with devicectl")
    install_and_launch(device)


if __name__ == "__main__":
    main()
