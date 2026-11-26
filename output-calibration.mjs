// Global Speaker / Headphone / Live Presentation (Exaggerated) Calibration
// + Semantic Colour-Coding & Icon Registry for all Hearing & Earplug Effects.

export const EFFECT_PALETTE = Object.freeze({
  original: {
    id: 'original',
    color: '#10b981',
    softBg: '#ecfdf5',
    border: '#34d399',
    darkBg: '#064e3b',
    icon: '✦',
    shortTag: 'Clear',
    label: 'Original (clear hearing)',
  },
  reference: {
    id: 'reference',
    color: '#10b981',
    softBg: '#ecfdf5',
    border: '#34d399',
    darkBg: '#064e3b',
    icon: '✦',
    shortTag: 'Clear',
    label: 'Original',
  },
  normal: {
    id: 'normal',
    color: '#10b981',
    softBg: '#ecfdf5',
    border: '#34d399',
    darkBg: '#064e3b',
    icon: '✦',
    shortTag: 'Clear',
    label: 'Normal hearing',
  },
  post_gig_muffled_v1: {
    id: 'post_gig_muffled_v1',
    color: '#f59e0b',
    softBg: '#fffbeb',
    border: '#fbbf24',
    darkBg: '#78350f',
    icon: '☁',
    shortTag: 'Hangover',
    label: 'Post-gig muffled',
  },
  muffled: {
    id: 'muffled',
    color: '#f59e0b',
    softBg: '#fffbeb',
    border: '#fbbf24',
    darkBg: '#78350f',
    icon: '☁',
    shortTag: 'Hangover',
    label: 'Post-gig muffled',
  },
  post_gig: {
    id: 'post_gig',
    color: '#f59e0b',
    softBg: '#fffbeb',
    border: '#fbbf24',
    darkBg: '#78350f',
    icon: '☁',
    shortTag: 'Hangover',
    label: 'Post-gig hangover',
  },
  nihl_demo_v1: {
    id: 'nihl_demo_v1',
    color: '#ef4444',
    softBg: '#fef2f2',
    border: '#f87171',
    darkBg: '#7f1d1d',
    icon: '⚡',
    shortTag: '4 kHz Notch',
    label: 'Permanent loss',
  },
  permanent_notch: {
    id: 'permanent_notch',
    color: '#ef4444',
    softBg: '#fef2f2',
    border: '#f87171',
    darkBg: '#7f1d1d',
    icon: '⚡',
    shortTag: '4 kHz Notch',
    label: '4 kHz noise notch',
  },
  notch_4k: {
    id: 'notch_4k',
    color: '#ef4444',
    softBg: '#fef2f2',
    border: '#f87171',
    darkBg: '#7f1d1d',
    icon: '⚡',
    shortTag: '4 kHz Notch',
    label: 'Permanent 4 kHz notch',
  },
  high_frequency_demo_v1: {
    id: 'high_frequency_demo_v1',
    color: '#8b5cf6',
    softBg: '#f5f3ff',
    border: '#a78bfa',
    darkBg: '#4c1d95',
    icon: '↘',
    shortTag: 'Treble Loss',
    label: 'Strong treble loss',
  },
  stronger: {
    id: 'stronger',
    color: '#8b5cf6',
    softBg: '#f5f3ff',
    border: '#a78bfa',
    darkBg: '#4c1d95',
    icon: '↘',
    shortTag: 'Treble Loss',
    label: 'Strong treble loss',
  },
  severe_hf: {
    id: 'severe_hf',
    color: '#8b5cf6',
    softBg: '#f5f3ff',
    border: '#a78bfa',
    darkBg: '#4c1d95',
    icon: '↘',
    shortTag: 'Treble Loss',
    label: 'Severe HF loss',
  },
  broadband_demo_v1: {
    id: 'broadband_demo_v1',
    color: '#3b82f6',
    softBg: '#eff6ff',
    border: '#60a5fa',
    darkBg: '#1e3a8a',
    icon: '🔉',
    shortTag: 'Quieter',
    label: 'Quieter overall',
  },
  asymmetric_demo_v1: {
    id: 'asymmetric_demo_v1',
    color: '#06b6d4',
    softBg: '#ecfeff',
    border: '#22d3ee',
    darkBg: '#164e63',
    icon: '🎧',
    shortTag: 'One-Ear',
    label: 'Right ear quieter',
  },
  left: {
    id: 'left',
    color: '#06b6d4',
    softBg: '#ecfeff',
    border: '#22d3ee',
    darkBg: '#164e63',
    icon: '◐',
    shortTag: 'Left Quieter',
    label: 'Left ear quieter',
  },
  right: {
    id: 'right',
    color: '#06b6d4',
    softBg: '#ecfeff',
    border: '#22d3ee',
    darkBg: '#164e63',
    icon: '◑',
    shortTag: 'Right Quieter',
    label: 'Right ear quieter',
  },
  foam_plugs: {
    id: 'foam_plugs',
    color: '#d97706',
    softBg: '#fffbeb',
    border: '#f59e0b',
    darkBg: '#78350f',
    icon: '🧱',
    shortTag: 'Foam Plug',
    label: 'Cheap foam earplugs',
  },
  musician_plugs: {
    id: 'musician_plugs',
    color: '#14b8a6',
    softBg: '#f0fdfa',
    border: '#2dd4bf',
    darkBg: '#115e59',
    icon: '🛡',
    shortTag: '−15 dB Clear Plug',
    label: 'Musicians’ earplugs (−15 dB)',
  },
  isolate_speech: {
    id: 'isolate_speech',
    color: '#ec4899',
    softBg: '#fdf2f8',
    border: '#f472b6',
    darkBg: '#831843',
    icon: '💬',
    shortTag: 'Speech Band',
    label: 'Speech clarity (2–6 kHz)',
  },
  ringing: {
    id: 'ringing',
    color: '#eab308',
    softBg: '#fefce8',
    border: '#facc15',
    darkBg: '#713f12',
    icon: '🔔',
    shortTag: 'Ringing',
    label: 'Ringing tinnitus',
  },
  hiss: {
    id: 'hiss',
    color: '#a855f7',
    softBg: '#faf5ff',
    border: '#c084fc',
    darkBg: '#581c87',
    icon: '🌫',
    shortTag: 'Hiss',
    label: 'Hiss tinnitus',
  },
});

export function getEffectTheme(effectKey = 'original') {
  return EFFECT_PALETTE[effectKey] ?? EFFECT_PALETTE.original;
}

export const CALIBRATION_MODES = Object.freeze({
  headphones: {
    id: 'headphones',
    label: 'Headphones (Accurate)',
    shortLabel: 'Headphones',
    exaggerated: false,
    lowShelfDb: 0,
    highShelfDb: 0,
    lowpassHz: 20000,
    tinnitusBoostDb: 0,
    note: 'True Cambridge MSBG calibration for stereo headphones. Best for accurate solo listening and left/right ear checks.',
  },
  speakers: {
    id: 'speakers',
    label: 'Laptop / Room Speakers',
    shortLabel: 'Speakers',
    exaggerated: false,
    lowShelfDb: 1.5,
    highShelfDb: -4.5,
    lowpassHz: 9500,
    tinnitusBoostDb: 3.5,
    note: 'Compensates for room acoustics so high-frequency loss and subtle tinnitus stay clear on open speakers.',
  },
  presentation: {
    id: 'presentation',
    label: 'Live Presentation (Exaggerated)',
    shortLabel: 'Live Presentation',
    exaggerated: true,
    lowShelfDb: 4.5,
    highShelfDb: -22,
    lowpassHz: 1150,
    tinnitusBoostDb: 7.5,
    note: 'Intentionally exaggerates muffling, bass-vs-treble contrast, and tinnitus so a whole room or auditorium hears the difference clearly over PA or laptop speakers.',
  },
});

let currentCalibrationMode = 'headphones';
const calibrationListeners = new Set();

export function getCalibrationMode() {
  return currentCalibrationMode;
}

export function getCalibrationSpec(mode = currentCalibrationMode) {
  return CALIBRATION_MODES[mode] ?? CALIBRATION_MODES.headphones;
}

export function setCalibrationMode(nextMode) {
  if (!CALIBRATION_MODES[nextMode] || nextMode === currentCalibrationMode) {
    return getCalibrationSpec();
  }
  currentCalibrationMode = nextMode;
  const spec = getCalibrationSpec();
  for (const fn of calibrationListeners) {
    try { fn(spec); } catch { /* ignore listener errors */ }
  }
  return spec;
}

export function onCalibrationChange(listener) {
  calibrationListeners.add(listener);
  return () => calibrationListeners.delete(listener);
}

export function getTinnitusCalibrationLinearBoost(mode = currentCalibrationMode) {
  const spec = getCalibrationSpec(mode);
  return 10 ** (spec.tinnitusBoostDb / 20);
}

// Inserts a live-updatable Web Audio filter stage that passes Original untouched
// and applies Speaker / Live Presentation exaggeration whenever a simulated effect is active!
export function createCalibrationStage(context, { isSimulated = () => true } = {}) {
  const input = context.createGain();
  const output = context.createGain();
  if (typeof context.createBiquadFilter !== 'function') {
    input.connect(output);
    return {
      input,
      output,
      sync() {},
      disconnect() {
        try { input.disconnect(); output.disconnect(); } catch { /* ignore */ }
      },
    };
  }

  const lowShelf = context.createBiquadFilter();
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 260;

  const highShelf = context.createBiquadFilter();
  highShelf.type = 'highshelf';
  highShelf.frequency.value = 1650;

  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.Q.value = 0.7;

  input.connect(lowShelf);
  lowShelf.connect(highShelf);
  highShelf.connect(lowpass);
  lowpass.connect(output);

  function applySpec(spec = getCalibrationSpec()) {
    const active = Boolean(isSimulated());
    const targetLow = active ? spec.lowShelfDb : 0;
    const targetHigh = active ? spec.highShelfDb : 0;
    const targetCutoff = active ? spec.lowpassHz : 20000;
    const now = context.currentTime ?? 0;
    if (typeof lowShelf.gain.setTargetAtTime === 'function') {
      lowShelf.gain.setTargetAtTime(targetLow, now, 0.02);
      highShelf.gain.setTargetAtTime(targetHigh, now, 0.02);
      lowpass.frequency.setTargetAtTime(targetCutoff, now, 0.02);
    } else {
      lowShelf.gain.value = targetLow;
      highShelf.gain.value = targetHigh;
      lowpass.frequency.value = targetCutoff;
    }
  }

  applySpec();
  const unsubscribe = onCalibrationChange((spec) => applySpec(spec));

  return {
    input,
    output,
    sync: () => applySpec(),
    disconnect() {
      unsubscribe();
      for (const n of [input, lowShelf, highShelf, lowpass, output]) {
        try { n.disconnect(); } catch { /* ignore */ }
      }
    },
  };
}

// Plays a short, gentle -22 dBFS stereo / speaker check chime so presenters & headphone listeners can verify L/R & volume
export async function playCalibrationTone(channelMode = 'stereo', AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext) {
  if (!AudioContextClass) return;
  const ctx = new AudioContextClass();
  await ctx.resume();
  const duration = 0.55;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  const merger = ctx.createChannelMerger(2);
  const leftGain = ctx.createGain();
  const rightGain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.value = channelMode === 'left' ? 523.25 : channelMode === 'right' ? 659.25 : 587.33;
  leftGain.gain.value = channelMode === 'right' ? 0 : 1;
  rightGain.gain.value = channelMode === 'left' ? 0 : 1;

  const now = ctx.currentTime;
  env.gain.setValueAtTime(0.0001, now);
  env.gain.linearRampToValueAtTime(0.08, now + 0.04);
  env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(env);
  env.connect(leftGain);
  env.connect(rightGain);
  leftGain.connect(merger, 0, 0);
  rightGain.connect(merger, 0, 1);
  merger.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
  setTimeout(() => { void ctx.close?.(); }, (duration + 0.15) * 1000);
}

export function connectCalibrationControls({ root = document } = {}) {
  const modeButtons = [...root.querySelectorAll('[data-calibration-mode]')];
  const banner = root.querySelector('#presentation-exaggeration-banner');
  const noteEl = root.querySelector('#calibration-mode-note');
  const testBtns = [...root.querySelectorAll('[data-calibration-test]')];
  const disableBannerBtn = root.querySelector('#presentation-banner-reset');

  function render(spec = getCalibrationSpec()) {
    for (const btn of modeButtons) {
      btn.setAttribute('aria-pressed', String(btn.dataset.calibrationMode === spec.id));
    }
    if (banner) {
      banner.hidden = !spec.exaggerated;
    }
    if (noteEl) {
      noteEl.textContent = spec.note;
    }
    if (root.documentElement) {
      root.documentElement.dataset.calibrationMode = spec.id;
    }
  }

  for (const btn of modeButtons) {
    btn.addEventListener('click', () => {
      setCalibrationMode(btn.dataset.calibrationMode);
    });
  }

  disableBannerBtn?.addEventListener('click', () => {
    setCalibrationMode('headphones');
  });

  for (const btn of testBtns) {
    btn.addEventListener('click', () => {
      void playCalibrationTone(btn.dataset.calibrationTest);
    });
  }

  onCalibrationChange(render);
  render();
}
