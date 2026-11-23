// Synthesized Mechanical Safe-Lock & Studio Mixer Detent Audio Engine (Web Audio API)

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Generates a realistic heavy safe-lock mechanical tumbler click with metallic snap
 * and subtle low-end spring resistance thud when crossing a detent notch.
 */
export function playSafeLockDetentClick(
  stepIndex: number,
  totalSteps = 24,
  enabled = true,
  isMajorNotch = false
): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Primary metallic tumbler snap (high-precision safe click)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const baseFreq = isMajorNotch ? 1420 : 1080 + (stepIndex % totalSteps) * 18;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.028);

    gain.gain.setValueAtTime(isMajorNotch ? 0.24 : 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.034);

    // 2. Secondary mechanical spring detent body thud ("wrażenie oporu i przeskoku")
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(isMajorNotch ? 165 : 135, now + 0.004);
    bodyOsc.frequency.exponentialRampToValueAtTime(48, now + 0.045);

    bodyGain.gain.setValueAtTime(isMajorNotch ? 0.28 : 0.18, now + 0.004);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.048);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    bodyOsc.start(now + 0.004);
    bodyOsc.stop(now + 0.05);
  } catch {
    // Ignore audio context restriction errors
  }
}

/**
 * Generates a tactile vinyl / optical jog-wheel scratch pulse when scrubbing the right platter.
 */
export function playScratchJogPulse(velocity: number, enabled = true): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const clampedVel = Math.min(Math.abs(velocity), 25);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320 + clampedVel * 28, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.018);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.022);
  } catch {
    // Ignore
  }
}
