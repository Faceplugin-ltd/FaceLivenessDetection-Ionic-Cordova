#!/usr/bin/env node
/**
 * One-shot iOS setup: build the web app and the plugin's TypeScript, add the platform,
 * reinstall the local plugin, and prepare. After this, `python run_ios.py` / `npm run ios` deploys.
 *
 * macOS only — Cordova's iOS platform needs Xcode.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const frameworks = path.join(root, 'FacePlugin', 'src', 'ios', 'Frameworks');

/** Device frameworks Cordova links by name (FacePPlugin, not FacePlugin.xcframework). */
const ENGINE = [
  'facerecognitionsdk.framework',
  'FacePluginSDK.framework',
  'FacePPlugin.framework',
  'FaceDetect.framework',
];

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit', shell: true });
}

if (process.platform !== 'darwin') {
  console.error('The iOS platform needs Xcode, so this only runs on macOS.');
  process.exit(1);
}

const missing = ENGINE.filter((name) => !fs.existsSync(path.join(frameworks, name)));
if (missing.length > 0) {
  console.error(
    'Missing engine framework(s) in FacePlugin/src/ios/Frameworks:\n' +
      missing.map((name) => `  ${name}`).join('\n') +
      '\n\nSee FacePlugin/src/ios/Frameworks/README.md.'
  );
  process.exit(1);
}

run('npm run build');
run('npm run plugin:build');

if (!fs.existsSync(path.join(root, 'platforms', 'ios'))) {
  run('npx cordova platform add ios');
} else {
  console.log('platforms/ios already present');
}

// Cordova freezes FacePlugin into plugins/ + platforms/ at add time — always reinstall.
if (fs.existsSync(path.join(root, 'plugins', 'face-liveness-cordova'))) {
  run('npx cordova plugin remove face-liveness-cordova --nosave');
}
run('npx cordova plugin add ./FacePlugin --nofetch --nosave');
run('npx cordova prepare ios');
console.log('\niOS setup complete. Deploy with: python run_ios.py');
