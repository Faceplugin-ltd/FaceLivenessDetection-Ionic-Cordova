import {
  IonContent,
  IonPage,
  useIonRouter,
  useIonToast,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  type ActiveLivenessResult,
  checkInfo,
  deviceReady,
  failedCheck,
  FaceLiveness,
  FaceLivenessEngine,
} from 'face-liveness-cordova';
import { useEffect, useState } from 'react';

import { demoLicense } from '../license';
import { routes } from '../nav';
import { loadSettings, toOptions, type LivenessSettings } from '../settings';
import logo from '../assets/fp_logo.png';

/**
 * Home: engine status, the two liveness demos, settings and about.
 *
 * Mirrors Android `ui/MainActivity` + `activity_main.xml` and iOS `ViewController` — hero header
 * with the status pill, an Active-liveness and a Passive-liveness card, Settings and About tiles,
 * and a row that opens the integration guide.
 */
export default function Home() {
  const router = useIonRouter();
  const [present] = useIonToast();
  const [status, setStatus] = useState('Loading on-device models…');
  const [statusColor, setStatusColor] = useState('var(--fp-status-info)');
  const [livenessAllowed, setLivenessAllowed] = useState(false);
  const [settings, setSettings] = useState<LivenessSettings>(loadSettings);

  // Settings can change while this page stays mounted, so re-read on entry.
  useIonViewWillEnter(() => setSettings(loadSettings()));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // Cordova's native bridge only exists once `deviceready` has fired.
        await deviceReady();
        await FaceLivenessEngine.start(demoLicense());
        const message = await FaceLivenessEngine.statusMessage();
        if (cancelled) return;
        setStatus(message);
        setStatusColor(
          FaceLivenessEngine.isReady ? 'var(--fp-status-ok)' : 'var(--fp-status-error)',
        );
        setLivenessAllowed(FaceLivenessEngine.license.liveness);
      } catch (error) {
        if (cancelled) return;
        // In a browser the plugin is deliberately unavailable; say so rather than looking broken.
        setStatus(error instanceof Error ? error.message : 'SDK not ready');
        setStatusColor('var(--fp-status-error)');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toast = (message: string) =>
    present({ message, duration: 3000, position: 'bottom' });

  const ensureAllowed = (): boolean => {
    if (!FaceLivenessEngine.isReady) {
      void toast('SDK not ready');
      return false;
    }
    if (!livenessAllowed) {
      void toast('Liveness is not available on this license');
      return false;
    }
    return true;
  };

  /** The demo only reports the verdict; a real integration would act on it. */
  const describe = (result: ActiveLivenessResult): string => {
    if (result.passed) return 'Liveness confirmed — live person';
    if (!result.passivePassed) {
      return 'Anti-spoofing check failed — no challenges were asked';
    }
    const failed = failedCheck(result);
    if (failed) {
      return `Liveness not confirmed — “${checkInfo(failed).title}” was not completed`;
    }
    return 'Liveness not confirmed';
  };

  const openActive = async () => {
    if (!ensureAllowed()) return;
    const result = await FaceLiveness.startActiveLiveness(toOptions(settings));
    if (result) void toast(describe(result));
  };

  const openPassive = async () => {
    if (!ensureAllowed()) return;
    await FaceLiveness.startPassiveLiveness({
      useFrontCamera: settings.useFrontCamera,
      livenessThreshold: settings.livenessThreshold,
    });
  };

  const gate = livenessAllowed ? '' : ' fp-disabled';

  return (
    <IonPage>
      <IonContent fullscreen style={{ '--background': 'var(--fp-bg)' } as React.CSSProperties}>
        <div style={{ padding: 16 }}>
          {/* Hero */}
          <div className="fp-hero">
            <a href="https://faceplugin.com" target="_blank" rel="noreferrer">
              <img src={logo} alt="FacePlugin" style={{ height: 40 }} />
            </a>
            <h1
              style={{
                color: 'var(--fp-text)',
                fontSize: 26,
                fontWeight: 700,
                margin: '16px 0 0',
                lineHeight: 1.15,
              }}
            >
              On-device face liveness
            </h1>
            <p style={{ color: 'var(--fp-muted)', fontSize: 14, lineHeight: 1.35, margin: '10px 0 14px' }}>
              Passive anti-spoofing and guided active checks. Every frame is processed on this phone
              — no biometric data leaves the device.
            </p>
            <span
              className="fp-pill"
              style={{ color: statusColor, background: `${statusColor}26`, borderColor: `${statusColor}66` }}
            >
              {status}
            </span>
          </div>

          <div className="fp-section">LIVENESS CHECKS</div>

          {/* Active liveness — the primary card */}
          <button
            type="button"
            onClick={openActive}
            className={`fp-row fp-tile-primary${gate}`}
            style={{ width: '100%', border: 0, padding: '18px 16px', marginBottom: 12, textAlign: 'left' }}
          >
            <span className="fp-bubble" style={{ background: 'rgba(255,255,255,0.18)' }}>
              <span style={{ color: '#fff', fontSize: 20 }}>⚡</span>
            </span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', color: '#fff', fontSize: 18, fontWeight: 700 }}>
                Active liveness
              </span>
              <span style={{ display: 'block', color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 }}>
                Anti-spoofing gate, then blink, smile, turn your head
              </span>
            </span>
            <span style={{ color: '#fff', fontSize: 24 }}>›</span>
          </button>

          {/* Passive liveness */}
          <button
            type="button"
            onClick={openPassive}
            className={`fp-row fp-card${gate}`}
            style={{ width: '100%', padding: '18px 16px', marginBottom: 12, textAlign: 'left', borderRadius: 24 }}
          >
            <span className="fp-bubble" style={{ background: 'var(--fp-accent-dim)' }}>
              <span style={{ color: 'var(--fp-accent)', fontSize: 20 }}>◎</span>
            </span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', color: 'var(--fp-text)', fontSize: 18, fontWeight: 700 }}>
                Passive liveness
              </span>
              <span style={{ display: 'block', color: 'var(--fp-muted)', fontSize: 13, marginTop: 4 }}>
                Single-frame anti-spoofing with a live score HUD
              </span>
            </span>
            <span style={{ color: 'var(--fp-muted)', fontSize: 24 }}>›</span>
          </button>

          <div className="fp-section">MORE</div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Tile
              glyph="⚙"
              title="Settings"
              subtitle="Camera, thresholds, challenge sequence"
              onClick={() => router.push(routes.settings)}
            />
            <Tile
              glyph="i"
              title="About"
              subtitle="SDK, license and contact"
              onClick={() => router.push(routes.about)}
            />
          </div>

          <button
            type="button"
            className="fp-row fp-card"
            onClick={() => window.open('https://doc.faceplugin.com', '_blank')}
            style={{ width: '100%', padding: 16, marginTop: 12, textAlign: 'left' }}
          >
            <span style={{ color: 'var(--fp-accent)', fontSize: 20 }}>▤</span>
            <span style={{ flex: 1, color: 'var(--fp-text)', fontSize: 15, fontWeight: 500 }}>
              Open the integration guide
            </span>
            <span style={{ color: 'var(--fp-muted)', fontSize: 24 }}>›</span>
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
}

function Tile({
  glyph,
  title,
  subtitle,
  onClick,
}: {
  glyph: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fp-card"
      style={{ flex: 1, padding: 16, textAlign: 'left', borderRadius: 24 }}
    >
      <span className="fp-bubble" style={{ background: 'var(--fp-accent-dim)' }}>
        <span style={{ color: 'var(--fp-accent)', fontSize: 20 }}>{glyph}</span>
      </span>
      <span style={{ display: 'block', color: 'var(--fp-text)', fontSize: 16, fontWeight: 600, marginTop: 10 }}>
        {title}
      </span>
      <span style={{ display: 'block', color: 'var(--fp-muted)', fontSize: 12, marginTop: 4, lineHeight: 1.3 }}>
        {subtitle}
      </span>
    </button>
  );
}
