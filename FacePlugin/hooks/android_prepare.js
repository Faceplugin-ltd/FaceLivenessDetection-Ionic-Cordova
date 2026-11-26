#!/usr/bin/env node
/**
 * Cordova Android hooks for Face Liveness (after_prepare / before_build / before_run).
 *
 * Three jobs:
 *
 * 1. Re-copy the plugin's Kotlin and resource files into `plugins/` and `platforms/`. Cordova
 *    copies `source-file` / `resource-file` entries at install time and does not refresh them
 *    when a local (`file:FacePlugin`) plugin changes, so editing the plugin would otherwise have
 *    no effect until it was reinstalled.
 *
 * 2. Point the vendored sources' `import <package>.R` at the app's real package. Cordova compiles
 *    plugin sources *into the app module*, so their R is the app's — which is only known once the
 *    platform has been generated, and differs for every app that installs this plugin.
 *
 * 3. Settings the engine needs: Jetifier off (the AAR is large enough to OOM it) and a 4 GB
 *    Gradle heap. Plus a long-standing cordova-android nuisance where splash colours are written
 *    as `0x…` instead of `#…`.
 */
const fs = require('fs');
const path = require('path');

const PLUGIN_ID = 'face-liveness-cordova';
const TAG = `[${PLUGIN_ID}]`;

/** The package the vendored sources are shipped importing R from. */
const SHIPPED_R_PACKAGE = 'com.faceplugin.faceliveness';

const R_IMPORT = /^import\s+([\w.]+)\.R$/m;

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

/** Every file under `dir`, as paths relative to it. */
function walk(dir, prefix = '') {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const rel = prefix ? `${prefix}/${name}` : name;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...walk(full, rel));
    else out.push(rel);
  }
  return out;
}

/**
 * The app module's package, which owns the R the plugin sources compile against.
 *
 * `namespace` in the generated app/build.gradle is authoritative; the manifest's `package`
 * attribute is the fallback for older cordova-android.
 */
function appPackage(androidDir) {
  const gradle = path.join(androidDir, 'app', 'build.gradle');
  if (fs.existsSync(gradle)) {
    const match = /^\s*namespace\s+["']([\w.]+)["']/m.exec(
      fs.readFileSync(gradle, 'utf8')
    );
    if (match) return match[1];
  }
  const manifest = path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');
  if (fs.existsSync(manifest)) {
    const match = /\bpackage="([\w.]+)"/.exec(fs.readFileSync(manifest, 'utf8'));
    if (match) return match[1];
  }
  return null;
}

/** Copies one Kotlin file, rewriting its R import to `pkg`. */
function copyKotlin(src, dest, pkg) {
  let text = fs.readFileSync(src, 'utf8');
  if (pkg && pkg !== SHIPPED_R_PACKAGE) {
    text = text.replace(R_IMPORT, `import ${pkg}.R`);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest) && fs.readFileSync(dest, 'utf8') === text) return false;
  fs.writeFileSync(dest, text);
  return true;
}

function syncAndroidSources(projectRoot, androidDir) {
  const srcRoot = path.join(projectRoot, 'FacePlugin', 'src', 'android');
  if (!fs.existsSync(srcRoot)) return;

  const pkg = appPackage(androidDir);
  const pluginRoot = path.join(projectRoot, 'plugins', PLUGIN_ID, 'src', 'android');
  const appMain = path.join(androidDir, 'app', 'src', 'main');

  let kotlin = 0;
  for (const rel of walk(path.join(srcRoot, 'java'))) {
    const src = path.join(srcRoot, 'java', rel);
    // plugins/ keeps the pristine copy; platforms/ gets the one with the app's R.
    if (fs.existsSync(path.dirname(pluginRoot))) {
      copyFile(src, path.join(pluginRoot, 'java', rel));
    }
    if (copyKotlin(src, path.join(appMain, 'java', rel), pkg)) kotlin += 1;
  }

  let resources = 0;
  for (const rel of walk(path.join(srcRoot, 'res'))) {
    const src = path.join(srcRoot, 'res', rel);
    if (fs.existsSync(path.dirname(pluginRoot))) {
      copyFile(src, path.join(pluginRoot, 'res', rel));
    }
    copyFile(src, path.join(appMain, 'res', rel));
    resources += 1;
  }

  for (const name of ['aarintegration.gradle', 'build-extras.gradle',
    'faceplugin-proguard-rules.pro']) {
    const src = path.join(srcRoot, name);
    if (!fs.existsSync(src)) continue;
    if (fs.existsSync(path.dirname(pluginRoot))) copyFile(src, path.join(pluginRoot, name));
    if (name !== 'aarintegration.gradle') {
      copyFile(src, path.join(androidDir, 'app', name));
    }
  }

  console.log(
    `${TAG} synced ${kotlin} Kotlin file(s) and ${resources} resource(s)` +
      (pkg ? ` · R → ${pkg}` : ' · app package unknown, R import left as shipped')
  );
}

/** The engine AAR, which is far too large for git and so is not a tracked resource-file. */
function requireEngine(projectRoot, androidDir) {
  const src = path.join(projectRoot, 'FacePlugin', 'src', 'android', 'facerecognitionsdk.aar');
  if (!fs.existsSync(src)) {
    throw new Error(
      [
        `${TAG} missing the Face Liveness Android runtime:`,
        '  FacePlugin/src/android/facerecognitionsdk.aar',
        '',
        'It is the same AAR Face-LivenessDetection-Android links. Get it from the',
        'FaceLivenessDetection-Android release and drop it in FacePlugin/src/android/,',
        'then run `cordova prepare android` again.',
      ].join('\n')
    );
  }
  const dest = path.join(androidDir, 'app', 'src', 'main', 'libs', 'facerecognitionsdk.aar');
  if (fs.existsSync(dest) && fs.statSync(dest).size === fs.statSync(src).size) return;
  copyFile(src, dest);
  console.log(`${TAG} copied the engine AAR into app/src/main/libs`);
}

function prepareAndroid(projectRoot) {
  const androidDir = path.join(projectRoot, 'platforms', 'android');
  if (!fs.existsSync(androidDir)) return;

  requireEngine(projectRoot, androidDir);
  syncAndroidSources(projectRoot, androidDir);

  const gp = path.join(androidDir, 'gradle.properties');
  if (fs.existsSync(gp)) {
    let text = fs.readFileSync(gp, 'utf8');
    const ensure = (key, value) => {
      const re = new RegExp(`^\\s*${key}=.*$`, 'm');
      if (re.test(text)) text = text.replace(re, `${key}=${value}`);
      else text += `\n${key}=${value}\n`;
    };
    ensure('android.useAndroidX', 'true');
    // Jetifier rewrites every class in every dependency; the engine AAR OOMs it.
    ensure('android.enableJetifier', 'false');
    ensure('org.gradle.jvmargs', '-Xmx4096m -Dfile.encoding=UTF-8');
    fs.writeFileSync(gp, text);
    console.log(`${TAG} gradle.properties: Jetifier off, heap 4g`);
  }

  const colors = path.join(androidDir, 'app', 'src', 'main', 'res', 'values', 'colors.xml');
  if (fs.existsSync(colors)) {
    const text = fs.readFileSync(colors, 'utf8');
    const fixed = text.replace(/>0x([0-9a-fA-F]{8})</g, '>#$1<');
    if (fixed !== text) {
      fs.writeFileSync(colors, fixed);
      console.log(`${TAG} fixed colors.xml hex format`);
    }
  }
}

module.exports = function (ctx) {
  const projectRoot =
    (ctx && ctx.opts && ctx.opts.projectRoot) || process.argv[2] || process.cwd();
  prepareAndroid(projectRoot);
};

if (require.main === module) {
  prepareAndroid(process.argv[2] || process.cwd());
}
