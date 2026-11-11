import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

type AudioCtor = new () => AudioContext;
let audio: AudioContext | null | undefined;

/** The browser's audio engine, created on first use (browsers only allow it after a tap). */
function webAudio(): AudioContext | null {
  if (Platform.OS !== 'web') return null;
  if (audio === undefined) {
    try {
      const w = globalThis as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
      const Ctor = w.AudioContext ?? w.webkitAudioContext;
      audio = Ctor ? new Ctor() : null;
    } catch {
      audio = null;
    }
  }
  return audio;
}

function blip(frequency: number, ms: number, volume: number, type: OscillatorType = 'square') {
  const ctx = webAudio();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + ms / 1000);
  } catch {
    // Sound is a nicety; never let it break an opening.
  }
}

/** One tile passing the marker: a click in the browser, a tap in the hand on a phone. */
export function tick() {
  if (Platform.OS === 'web') blip(1150, 28, 0.05);
  else Haptics.selectionAsync().catch(() => {});
}

/** The reel stopping, or a loot item landing. Rarer items hit harder and ring higher. */
export function reveal(level: 0 | 1 | 2 | 3 | 4) {
  if (Platform.OS === 'web') {
    blip(330 + level * 110, 260 + level * 60, 0.09, 'triangle');
    if (level >= 2) setTimeout(() => blip(660 + level * 110, 380, 0.07, 'triangle'), 110);
    return;
  }
  if (level >= 3) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.impactAsync(level >= 1 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function thud() {
  if (Platform.OS === 'web') blip(90, 180, 0.12, 'sine');
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}
