import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactHashRouter } from '@ionic/react-router';
import Home from './pages/Home';
import Settings from './pages/Settings';
import About from './pages/About';

setupIonicReact({ mode: 'ios' });

/**
 * Hash routing is required on Cordova: the page is loaded from a file / app
 * scheme URL, and browser history cannot route that (blank IonRouterOutlet).
 */
export default function App() {
  return (
    <IonApp>
      <IonReactHashRouter>
        <IonRouterOutlet>
          <Route exact path="/home" component={Home} />
          <Route exact path="/settings" component={Settings} />
          <Route exact path="/about" component={About} />
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
        </IonRouterOutlet>
      </IonReactHashRouter>
    </IonApp>
  );
}
