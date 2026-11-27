#!/usr/bin/env node
/**
 * One-shot Android setup: build the web app and the plugin's TypeScript, add the platform, install
 * the local plugin, and prepare. After this, `npm run android` builds and deploys.
 *
 * Always reinstalls face-liveness-cordova so gradleReference (aarintegration.gradle) is registered
 * even when a previous prepare left plugins/face-liveness-cordova on disk without android.json.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const aar = path.join(root, 'FacePlugin', 'src', 'android', 'facerecognitionsdk.aar');
const pluginsDir = path.join(root, 'plugins');

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit', shell: true });
}

if (!fs.existsSync(aar) || fs.statSync(aar).size === 0) {
  console.error(
    'Missing FacePlugin/src/android/facerecognitionsdk.aar\n' +
      'Run `python run_android.py` first (downloads from GitHub Releases), or place\n' +
      'the AAR from FaceRecognition-LivenessDetection-Android Releases there.\n' +
      'See FacePlugin/src/android/AAR_README.md.'
  );
  process.exit(1);
}

run('npm run build');
run('npm run plugin:build');

if (!fs.existsSync(path.join(root, 'platforms', 'android'))) {
  run('npx cordova platform add android');
} else {
  console.log('platforms/android already present');
}

// Always reinstall from ./FacePlugin so framework gradleReference lands in the platform.
if (fs.existsSync(path.join(pluginsDir, 'face-liveness-cordova'))) {
  run('npx cordova plugin remove face-liveness-cordova --nosave');
}
run('npx cordova plugin add ./FacePlugin --nofetch --nosave');

run('npx cordova prepare android');
console.log('\nAndroid setup complete. Run: npm run android');
