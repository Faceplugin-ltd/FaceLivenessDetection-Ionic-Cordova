#!/usr/bin/env node
/**
 * Build + install + launch on a physical iOS device without ios-deploy.
 *
 * `cordova run ios --device` discovers phones via IOUSB + `ios-deploy -c`, which
 * misses CoreDevice / wireless connections and newer iOS. That path then falls
 * back to the simulator with a device .app and fails (Info.plist not found).
 *
 * This script builds with Cordova, then uses `xcrun xctrace` / `devicectl` to
 * find the phone and install/launch from the exported .ipa payload.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const BUNDLE_ID = 'com.faceplugin.faceliveness.app';
const APP_NAME = 'FacePlugin Face Liveness.app';
const IPA_NAME = 'FacePlugin Face Liveness.ipa';
const HOOK = path.join(root, 'FacePlugin', 'hooks', 'ios_prepare.js');

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', env: process.env });
  if (r.status !== 0) process.exit(r.status == null ? 1 : r.status);
  return r;
}

function runSoft(cmd, args) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  return spawnSync(cmd, args, { cwd: root, stdio: 'inherit', env: process.env });
}

function capture(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', env: process.env });
  return `${r.stdout || ''}${r.stderr || ''}`;
}

function pickDevice() {
  const xt = capture('xcrun', ['xctrace', 'list', 'devices']);
  let inSims = false;
  for (const line of xt.split('\n')) {
    if (/^==\s*Simulators/i.test(line) || /Simulator/i.test(line) && /==/.test(line)) {
      inSims = true;
      continue;
    }
    if (inSims || /Simulator/i.test(line)) continue;
    if (!/iPhone|iPad/i.test(line)) continue;
    if (/Mac|Watch|Apple TV/i.test(line)) continue;
    const m = line.match(/\(([0-9A-Fa-f-]{25,})\)\s*$/);
    if (m) {
      console.log(`iOS device: ${line.trim()}`);
      return m[1];
    }
  }
  const dc = capture('xcrun', ['devicectl', 'list', 'devices', '--timeout', '20']);
  for (const line of dc.split('\n')) {
    if (!/connected/i.test(line)) continue;
    if (!/iPhone|iPad/i.test(line)) continue;
    const m = line.match(
      /([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})/
    );
    if (m) {
      console.log(`iOS device (devicectl): ${line.trim()}`);
      return m[1];
    }
  }
  return null;
}

function extractIpaApp() {
  const ipa = path.join(root, 'platforms/ios/build/Debug-iphoneos', IPA_NAME);
  if (!fs.existsSync(ipa)) return null;
  const dest = path.join(os.tmpdir(), `fl-cordova-ipa-${process.pid}`);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  const r = spawnSync('unzip', ['-q', ipa, '-d', dest], { stdio: 'inherit' });
  if (r.status !== 0) return null;
  const app = path.join(dest, 'Payload', APP_NAME);
  return fs.existsSync(app) ? app : null;
}

function findBuiltApp() {
  const fromIpa = extractIpaApp();
  if (fromIpa) return fromIpa;
  const preferred = [
    path.join(root, 'platforms/ios/build/Debug-iphoneos', APP_NAME),
    path.join(root, 'platforms/ios/App.xcarchive/Products/Applications', APP_NAME),
  ];
  for (const c of preferred) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function printTrustHelp() {
  console.error(`
--------------------------------------------------------------------
Install succeeded, but iOS refused to launch (developer not trusted).

On the iPhone:
  Settings → General → VPN & Device Management
  → Apple Development: <your Apple ID>
  → Trust

Unlock the phone, tap Trust, then open the app from the Home Screen
(or re-run: npm run ios).
--------------------------------------------------------------------`);
}

run('npm', ['run', 'build']);
run('npx', ['cordova', 'prepare', 'ios']);
run('npx', ['cordova', 'build', 'ios', '--device', '--buildConfig=build.json']);

if (fs.existsSync(HOOK)) {
  run('node', [HOOK, root, '--sign']);
}

const app = findBuiltApp();
if (!app) {
  console.error(`Built ${APP_NAME} / ${IPA_NAME} not found under platforms/ios`);
  process.exit(1);
}

const device = pickDevice();
if (!device) {
  console.error(
    'No connected iPhone/iPad found (xctrace/devicectl). Unlock the device, trust this Mac, and retry.'
  );
  process.exit(1);
}

console.log(`Installing ${app} on ${device}…`);
run('xcrun', [
  'devicectl',
  'device',
  'install',
  'app',
  '--device',
  device,
  app,
  '--timeout',
  '900',
]);

console.log(`Launching ${BUNDLE_ID}…`);
const launch = runSoft('xcrun', [
  'devicectl',
  'device',
  'process',
  'launch',
  '--device',
  device,
  '--terminate-existing',
  BUNDLE_ID,
]);
if (launch.status !== 0) {
  printTrustHelp();
  process.exit(0);
}
console.log('Done — installed and launched (no debugger attach).');
