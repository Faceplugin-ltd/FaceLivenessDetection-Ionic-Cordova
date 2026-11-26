import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import './theme.css';

/**
 * Wait for Cordova plugins without hanging if `deviceready` already fired.
 * Must not treat `platformId` alone as ready — `cordova.exec` is mapped later.
 */
function whenDeviceReady(): Promise<void> {
  return new Promise((resolve) => {
    const w = window as unknown as {
      cordova?: { exec?: unknown; require?: (id: string) => any };
    };
    if (!w.cordova) {
      resolve();
      return;
    }
    const ready = () => typeof w.cordova?.exec === 'function';
    try {
      const channel = w.cordova.require?.('cordova/channel');
      if (channel?.onDeviceReady?.state === 2 && ready()) {
        resolve();
        return;
      }
    } catch {
      /* listen below */
    }
    if (ready()) {
      resolve();
      return;
    }
    document.addEventListener(
      'deviceready',
      () => {
        if (ready()) {
          resolve();
          return;
        }
        let n = 0;
        const id = window.setInterval(() => {
          n += 1;
          if (ready() || n > 50) {
            window.clearInterval(id);
            resolve();
          }
        }, 20);
      },
      { once: true },
    );
  });
}

async function bootstrap() {
  await whenDeviceReady();
  const container = document.getElementById('root');
  if (!container) return;
  createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
