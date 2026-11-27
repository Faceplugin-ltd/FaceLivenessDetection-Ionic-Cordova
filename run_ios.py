#!/usr/bin/env python3
"""Fetch iOS frameworks if missing, then run the Cordova iOS demo (macOS only).

Standard Cordova flow: npm install → platform/plugin → cordova prepare/run.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
IS_WIN = os.name == "nt"
PLUGIN_ID = "face-liveness-cordova"
FW = ROOT / "FacePlugin" / "src" / "ios" / "Frameworks"


def die(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(1)


def which(name: str) -> str | None:
    hits = [shutil.which(name)]
    if IS_WIN:
        hits.extend([shutil.which(name + ".cmd"), shutil.which(name + ".exe")])
    return next((h for h in hits if h), None)


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


def ensure_ios_platform(npx: str) -> None:
    npm = need("npm", "Install Node.js")
    run([npm, "run", "build"])
    run([npm, "run", "plugin:build"])
    if not (ROOT / "platforms" / "ios").is_dir():
        run([npx, "cordova", "platform", "add", "ios"])
    if (ROOT / "plugins" / PLUGIN_ID).is_dir():
        run([npx, "cordova", "plugin", "remove", PLUGIN_ID, "--nosave"])
    run([npx, "cordova", "plugin", "add", "./FacePlugin", "--nofetch", "--nosave"])
    run([npx, "cordova", "prepare", "ios"])


def main() -> None:
    import fp_releases

    if sys.platform != "darwin":
        die("iOS builds need macOS and Xcode. Use python run_android.py on this machine.")
    npm = need("npm", "Install Node.js from https://nodejs.org/")
    npx = need("npx", "Install Node.js from https://nodejs.org/")
    print(f"{ROOT.name}: ios (cordova)")
    fp_releases.ensure_ios_engine(ROOT, FW, with_bridge=False)
    if not (ROOT / "node_modules").is_dir():
        run([npm, "install"])
    if not (ROOT / "platforms" / "ios").is_dir():
        ensure_ios_platform(npx)
    run([npm, "run", "ios"])


if __name__ == "__main__":
    main()
