#!/usr/bin/env node
/**
 * One-shot Android setup: build the web app and the plugin's TypeScript, add the platform, install
 * the local plugin, and prepare. After this, `npm run android` builds and deploys.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const aar = path.join(root, 'FacePlugin', 'src', 'android', 'facerecognitionsdk.aar');

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit', shell: true });
}

if (!fs.existsSync(aar)) {
  console.error(
    'Missing FacePlugin/src/android/facerecognitionsdk.aar\n' +
      'It is the same AAR Face-LivenessDetection-Android links. See\n' +
      'FacePlugin/src/android/AAR_README.md.'
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

if (!fs.existsSync(path.join(root, 'plugins', 'face-liveness-cordova'))) {
  run('npx cordova plugin add ./FacePlugin --nofetch');
} else {
  console.log('face-liveness-cordova already installed — re-preparing');
}

run('npx cordova prepare android');
console.log('\nAndroid setup complete. Run: npm run android');
