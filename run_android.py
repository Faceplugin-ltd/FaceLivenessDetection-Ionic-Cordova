#!/usr/bin/env python3
"""Fetch facerecognitionsdk.aar if missing, then run the Cordova Android demo.

Standard Cordova flow: npm install → platform/plugin → cordova prepare/run.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
IS_WIN = os.name == "nt"
PLUGIN_ID = "face-liveness-cordova"
AAR = ROOT / "FacePlugin" / "src" / "android" / "facerecognitionsdk.aar"


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


def plugin_registered() -> bool:
    path = ROOT / "platforms" / "android" / "android.json"
    if not path.is_file():
        return False
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False
    return PLUGIN_ID in (data.get("installed_plugins") or {})


def ensure_android_platform(npx: str) -> None:
    """cordova platform add + local plugin (once / when android.json is incomplete)."""
    run([need("npm", "Install Node.js"), "run", "build"])
    run([need("npm", "Install Node.js"), "run", "plugin:build"])
    if not (ROOT / "platforms" / "android").is_dir():
        run([npx, "cordova", "platform", "add", "android"])
    plugins = ROOT / "plugins" / PLUGIN_ID
    if plugins.is_dir():
        run([npx, "cordova", "plugin", "remove", PLUGIN_ID, "--nosave"])
    run([npx, "cordova", "plugin", "add", "./FacePlugin", "--nofetch", "--nosave"])
    run([npx, "cordova", "prepare", "android"])


def main() -> None:
    import fp_releases

    npm = need("npm", "Install Node.js from https://nodejs.org/")
    npx = need("npx", "Install Node.js from https://nodejs.org/")
    print(f"{ROOT.name}: android (cordova)")
    fp_releases.ensure_engine_aar(ROOT, AAR)
    if not (ROOT / "node_modules").is_dir():
        run([npm, "install"])
    if not (ROOT / "platforms" / "android").is_dir() or not plugin_registered():
        ensure_android_platform(npx)
    run([npm, "run", "android"])


if __name__ == "__main__":
    main()
