import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { FaceLivenessEngine } from 'face-liveness-cordova';

import logo from '../assets/fp_logo.png';

/**
 * About — company, product, what the licence unlocks, and contact.
 *
 * Mirrors Android `ui/AboutActivity` and iOS `AboutViewController`.
 */
export default function About() {
  const license = FaceLivenessEngine.license;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>About</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div style={{ padding: 16, paddingTop: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <img src={logo} alt="FacePlugin" style={{ height: 44 }} />
          </div>
          <h2
            style={{
              color: 'var(--fp-text)',
              fontSize: 22,
              fontWeight: 700,
              textAlign: 'center',
              margin: '20px 0 0',
            }}
          >
            FacePlugin
          </h2>
          <p style={{ color: 'var(--fp-accent)', fontSize: 15, textAlign: 'center', margin: '4px 0 16px' }}>
            Face Liveness SDK
          </p>

          <div className="fp-card" style={{ padding: 16, marginBottom: 16 }}>
            <p style={{ color: 'var(--fp-text)', fontSize: 13, textAlign: 'center', margin: 0 }}>
              License: {license.label}
            </p>
          </div>

          <div className="fp-card" style={{ padding: 16, marginBottom: 16 }}>
            <p style={{ color: 'var(--fp-text)', fontSize: 14, lineHeight: 1.35, margin: 0 }}>
              FacePlugin builds on-device identity technology — face recognition, liveness, and
              document reading — so biometric data never has to leave the phone.
            </p>
          </div>

          <div className="fp-card" style={{ padding: 16 }}>
            <p style={{ color: 'var(--fp-text)', fontSize: 14, lineHeight: 1.35, margin: 0 }}>
              This app demos face liveness on Apache Cordova: passive anti-spoofing from a single
              frame, and active liveness as an anti-spoofing gate followed by a guided challenge
              sequence. Both screens are the native FacePlugin implementations, and everything runs
              fully on-device.
            </p>
          </div>

          <p style={{ textAlign: 'center', marginTop: 20 }}>
            <a
              href="https://faceplugin.com"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--fp-accent)', fontSize: 14, textDecoration: 'none' }}
            >
              faceplugin.com
            </a>
          </p>
          <p style={{ color: 'var(--fp-muted)', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
            © 2026 FacePlugin. All rights reserved.
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
