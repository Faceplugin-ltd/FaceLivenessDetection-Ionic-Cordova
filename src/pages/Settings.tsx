import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonRange,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/react';
import { ACTIVE_CHECKS, type ActiveCheckKey } from 'face-liveness-cordova';
import { useState } from 'react';

import {
  loadSettings,
  restoreDefaults,
  saveSettings,
  type LivenessSettings,
} from '../settings';

/**
 * Settings — camera lens, the passive score threshold, and the full active-liveness configuration.
 *
 * Mirrors Android `ui/SettingsActivity` + `xml/root_preferences` and iOS `SettingsViewController`.
 * The page only writes preferences; `toOptions` turns them into what the native screen runs with.
 */
export default function Settings() {
  const [s, setS] = useState<LivenessSettings>(loadSettings);

  const update = (patch: Partial<LivenessSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    saveSettings(next);
  };

  const togglePool = (key: ActiveCheckKey, on: boolean) => {
    const wanted = new Set(s.pool);
    if (on) {
      wanted.add(key);
    } else {
      wanted.delete(key);
    }
    if (wanted.size === 0) return; // the native screen needs at least one challenge
    // Keep the canonical order so the pool is stable when randomize is off.
    update({ pool: ACTIVE_CHECKS.map((c) => c.key).filter((k) => wanted.has(k)) });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList inset>
          <IonItemDivider>Camera</IonItemDivider>
          <IonItem>
            <IonSelect
              label="Camera lens"
              value={s.useFrontCamera ? 'front' : 'back'}
              onIonChange={(e) => update({ useFrontCamera: e.detail.value === 'front' })}
            >
              <IonSelectOption value="front">Front</IonSelectOption>
              <IonSelectOption value="back">Back</IonSelectOption>
            </IonSelect>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonItemDivider>Passive liveness</IonItemDivider>
          <Threshold
            label="Score threshold"
            note="Minimum score to count as live (0.0–1.0). The engine’s own operating point is 0.5, and the active check uses the same gate."
            value={s.livenessThreshold}
            onChange={(v) => update({ livenessThreshold: v })}
          />
        </IonList>

        <IonList inset>
          <IonItemDivider>Active liveness</IonItemDivider>
          <IonItem lines="none">
            <IonNote>Challenges — pool the sequence is drawn from</IonNote>
          </IonItem>
          {ACTIVE_CHECKS.map((check) => (
            <IonItem key={check.key}>
              <IonToggle
                checked={s.pool.includes(check.key)}
                onIonChange={(e) => togglePool(check.key, e.detail.checked)}
              >
                {check.title}
              </IonToggle>
            </IonItem>
          ))}
          <IonItem>
            <IonSelect
              label="Challenges per attempt"
              value={s.count}
              onIonChange={(e) => update({ count: Number(e.detail.value) })}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <IonSelectOption key={n} value={n}>
                  {n}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonToggle
              checked={s.randomize}
              onIonChange={(e) => update({ randomize: e.detail.checked })}
            >
              <IonLabel>
                Random order
                <IonNote class="ion-text-wrap">
                  Shuffle the sequence on every attempt so a recording cannot be replayed
                </IonNote>
              </IonLabel>
            </IonToggle>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonItemDivider>Active liveness tuning</IonItemDivider>
          <Stepped
            label="Frames allowed per stage"
            note="About 15 frames a second. Higher is more forgiving, lower fails faster (30–600)"
            value={s.framesWait}
            min={30}
            max={600}
            step={10}
            onChange={(v) => update({ framesWait: v })}
          />
          <Stepped label="Head turn angle (°)" value={s.yaw} min={5} max={60} step={1}
            onChange={(v) => update({ yaw: v })} />
          <Stepped label="Head tilt angle (°)" value={s.pitch} min={5} max={60} step={1}
            onChange={(v) => update({ pitch: v })} />
          <Threshold label="Smile confidence" value={s.smile}
            onChange={(v) => update({ smile: v })} />
          <Threshold label="Eye-closed confidence" value={s.blink}
            onChange={(v) => update({ blink: v })} />
          <Stepped label="Blinks required" value={s.blinksNumber} min={1} max={6} step={1}
            onChange={(v) => update({ blinksNumber: v })} />
          <Threshold label="Move-closer growth" value={s.perspective}
            onChange={(v) => update({ perspective: v })} />
          <Stepped label="Start alignment tolerance (°)" value={s.alignAngle} min={1} max={45} step={1}
            onChange={(v) => update({ alignAngle: v })} />
          <Threshold
            label="Minimum face size"
            note="How much of the frame the face has to fill before it can be scored"
            value={s.minFace}
            onChange={(v) => update({ minFace: v })}
          />
          <Threshold
            label="Minimum image quality"
            note="Below this the frame is called too dark or blurry to judge"
            value={s.quality}
            onChange={(v) => update({ quality: v })}
          />
          <IonItem>
            <IonToggle
              checked={s.invertTurn}
              onIonChange={(e) => update({ invertTurn: e.detail.checked })}
            >
              <IonLabel>
                Invert left / right
                <IonNote class="ion-text-wrap">
                  Flip this if the turn challenges accept the opposite direction on your device
                </IonNote>
              </IonLabel>
            </IonToggle>
          </IonItem>
          <IonItem>
            <IonToggle
              checked={s.invertTilt}
              onIonChange={(e) => update({ invertTilt: e.detail.checked })}
            >
              <IonLabel>
                Invert up / down
                <IonNote class="ion-text-wrap">
                  Flip this if the look-up and look-down challenges are the wrong way round
                </IonNote>
              </IonLabel>
            </IonToggle>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonItemDivider>Reset</IonItemDivider>
          <IonItem button detail={false} onClick={() => setS(restoreDefaults())}>
            <IonLabel color="primary">Restore default settings</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
}

/** A 0.0–1.0 threshold, the shape most engine settings take. */
function Threshold({
  label,
  note,
  value,
  onChange,
}: {
  label: string;
  note?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <IonItem>
      <IonLabel position="stacked">
        {label} — {value.toFixed(2)}
        {note ? <IonNote class="ion-text-wrap">{note}</IonNote> : null}
      </IonLabel>
      <IonRange
        min={0}
        max={1}
        step={0.05}
        value={value}
        onIonChange={(e) => onChange(Number(e.detail.value))}
      />
    </IonItem>
  );
}

/** An integer setting with its own range. */
function Stepped({
  label,
  note,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  note?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <IonItem>
      <IonLabel position="stacked">
        {label} — {value}
        {note ? <IonNote class="ion-text-wrap">{note}</IonNote> : null}
      </IonLabel>
      <IonRange
        min={min}
        max={max}
        step={step}
        value={value}
        onIonChange={(e) => onChange(Number(e.detail.value))}
      />
    </IonItem>
  );
}
