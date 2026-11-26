// Interactive Live Concert Stage ("What Disappears From a Live Band?")
// Synthesizes a 5-piece polyphonic Web Audio concert band with independent per-instrument
// cochlear filtering, spotlight dimming, lyric consonant clarity, and mobile-first solo pads.

import {
  createCalibrationStage,
  getTinnitusCalibrationLinearBoost,
  onCalibrationChange,
} from './output-calibration.mjs?v=3bfa62ebf4';
import { confirmRingingPlayback } from './tinnitus-warning.mjs?v=3bfa62ebf4';
import { audibleTinnitusGain, tinnitusLoop } from './upload-tinnitus.mjs?v=3bfa62ebf4';

export const CONCERT_INSTRUMENTS = Object.freeze([
  {
    id: 'keys',
    title: 'Warm Keys & Chords',
    shortLabel: 'Keys',
    bandLabel: '250–900 Hz · Warm mids',
    accent: '#60a5fa',
    pan: -0.52,
    earPart: 'cochlea',
  },
  {
    id: 'bass',
    title: 'Bass & Kick Drum',
    shortLabel: 'Bass',
    bandLabel: '50–160 Hz · Deep bass',
    accent: '#10b981',
    pan: -0.22,
    earPart: 'eardrum',
  },
  {
    id: 'vocals',
    title: 'Lead Vocals & Lyrics',
    shortLabel: 'Vocals',
    bandLabel: '300 Hz + 2–5 kHz · Lyrics',
    accent: '#f472b6',
    pan: 0.0,
    earPart: 'nerve',
  },
  {
    id: 'guitar',
    title: 'Lead Guitar & Snare',
    shortLabel: 'Guitar',
    bandLabel: '2–5 kHz · 4 kHz zone',
    accent: '#f59e0b',
    pan: 0.32,
    earPart: 'cochlea',
  },
  {
    id: 'cymbals',
    title: 'Hi-Hats & Cymbals',
    shortLabel: 'Cymbals',
    bandLabel: '6–12 kHz · High shimmer',
    accent: '#a78bfa',
    pan: 0.58,
    earPart: 'cochlea',
  },
]);

export const CONCERT_CONDITIONS = Object.freeze({
  original: {
    id: 'original',
    label: 'Healthy ears',
    lostHeadline: 'All 5 instruments clear & balanced',
    summary: 'Every spotlight shines — punchy bass, warm chords, crisp vocal consonants, biting lead guitar, and sparkling cymbals sit together cleanly.',
    lyricHtml: '“<strong>St</strong>ay <strong>cl</strong>o<strong>s</strong>e <strong>t</strong>ill the hou<strong>s</strong>e ligh<strong>ts</strong> <strong>c</strong>ome up <strong>t</strong>onigh<strong>t</strong>”',
    lyricPlain: '“Stay close till the house lights come up tonight”',
    lyricClarity: 100,
    stems: {
      bass: { audibility: 100, gain: 1.0, lowpassHz: 18000, status: 'Full punch', lost: false },
      keys: { audibility: 100, gain: 1.0, lowpassHz: 18000, status: 'Warm & rich', lost: false },
      vocals: { audibility: 100, vowelGain: 1.0, consonantGain: 1.0, lowpassHz: 18000, status: 'Crisp lyrics', lost: false },
      guitar: { audibility: 100, gain: 1.0, lowpassHz: 18000, status: 'Sharp riff & snare', lost: false },
      cymbals: { audibility: 100, gain: 1.0, lowpassHz: 18000, status: 'Bright shimmer', lost: false },
    },
  },
  post_gig: {
    id: 'post_gig',
    label: 'Post-gig muffled',
    lostHeadline: '2 instruments fading · Lyrics blurring',
    summary: 'Temporary “hearing hangover”: kick & bass still pound at 98%, while hi-hat shimmer and sharp s/t lyric consonants dim behind a smoky veil.',
    lyricHtml: '“<span class="lyric-lost">··</span>ay <span class="lyric-lost">·</span>lo<span class="lyric-lost">··</span> <span class="lyric-lost">·</span>ill the hou<span class="lyric-lost">··</span> ligh<span class="lyric-lost">··</span> come up <span class="lyric-lost">·</span>onigh<span class="lyric-lost">·</span>”',
    lyricPlain: '“··ay ·lo·· ·ill the hou·· ligh·· come up ·onigh·”',
    lyricClarity: 54,
    stems: {
      bass: { audibility: 98, gain: 0.98, lowpassHz: 14000, status: 'Still booming', lost: false },
      keys: { audibility: 82, gain: 0.82, lowpassHz: 1800, status: 'Warmth stays', lost: false },
      vocals: { audibility: 54, vowelGain: 0.88, consonantGain: 0.18, lowpassHz: 1600, status: 'Consonants dulled', lost: false },
      guitar: { audibility: 34, gain: 0.32, lowpassHz: 1380, status: 'Bite muffled', lost: true },
      cymbals: { audibility: 18, gain: 0.13, lowpassHz: 1800, status: 'Sparkle faded', lost: true },
    },
  },
  permanent_notch: {
    id: 'permanent_notch',
    label: '4 kHz noise notch',
    lostHeadline: 'Lead guitar, snare & consonants lost in mix',
    summary: 'Ear-canal resonance concentrates concert wear near 4 kHz — lead guitar riffs, snare snap, and vocal consonants vanish while bass booms untouched.',
    lyricHtml: '“<span class="lyric-lost">··</span>ay <span class="lyric-lost">··</span>o<span class="lyric-lost">··</span> <span class="lyric-lost">·</span>i<span class="lyric-lost">··</span> the hou<span class="lyric-lost">··</span> <span class="lyric-lost">·</span>igh<span class="lyric-lost">··</span> <span class="lyric-lost">·</span>ome up <span class="lyric-lost">·</span>o<span class="lyric-lost">·</span>igh<span class="lyric-lost">·</span>”',
    lyricPlain: '“··ay ··o·· ·i·· the hou·· ·igh·· ·ome up ·o·igh·”',
    lyricClarity: 42,
    stems: {
      bass: { audibility: 98, gain: 0.98, lowpassHz: 16000, status: 'Untouched bass', lost: false },
      keys: { audibility: 84, gain: 0.84, lowpassHz: 2250, status: 'Low chords intact', lost: false },
      vocals: { audibility: 42, vowelGain: 0.84, consonantGain: 0.07, lowpassHz: 1650, status: 'Words blur together', lost: true },
      guitar: { audibility: 12, gain: 0.09, lowpassHz: 1050, status: 'Lost in 4 kHz notch', lost: true },
      cymbals: { audibility: 28, gain: 0.22, lowpassHz: 4600, status: 'Thin distant tick', lost: true },
    },
  },
  severe_hf: {
    id: 'severe_hf',
    label: 'Strong treble loss',
    lostHeadline: 'Right half of the band vanishes completely',
    summary: 'Cymbals (2%) and lead guitar (5%) go dark on stage, and vocals collapse into muffled vowel hum while heavy bass dominates the room.',
    lyricHtml: '“<span class="lyric-lost">··</span>a<span class="lyric-lost">·</span> <span class="lyric-lost">··</span>o<span class="lyric-lost">··</span> <span class="lyric-lost">·</span>i<span class="lyric-lost">··</span> <span class="lyric-lost">··</span>e <span class="lyric-lost">·</span>ou<span class="lyric-lost">··</span> <span class="lyric-lost">·</span>i<span class="lyric-lost">····</span> <span class="lyric-lost">·</span>o<span class="lyric-lost">·</span>e u<span class="lyric-lost">·</span> <span class="lyric-lost">·</span>o<span class="lyric-lost">·</span>i<span class="lyric-lost">···</span>”',
    lyricPlain: '“··a· ··o·· ·i·· ··e ·ou·· ·i···· ·o·e u· ·o·i···”',
    lyricClarity: 24,
    stems: {
      bass: { audibility: 96, gain: 0.96, lowpassHz: 12000, status: 'Dominates room', lost: false },
      keys: { audibility: 56, gain: 0.56, lowpassHz: 880, status: 'Low hum only', lost: false },
      vocals: { audibility: 24, vowelGain: 0.58, consonantGain: 0.012, lowpassHz: 740, status: 'Mumbled vowels', lost: true },
      guitar: { audibility: 5, gain: 0.03, lowpassHz: 600, status: 'Vanished', lost: true },
      cymbals: { audibility: 2, gain: 0.008, lowpassHz: 700, status: 'Gone completely', lost: true },
    },
  },
  foam_plugs: {
    id: 'foam_plugs',
    label: 'Foam earplugs',
    lostHeadline: 'Protected, but treble dumped unevenly',
    summary: 'Dense foam blocks cymbals (14%) and guitar bite (24%) far more than heavy bass (82%), making live bands sound underwater — so people pull them out.',
    lyricHtml: '“<span class="lyric-lost">··</span>ay clo<span class="lyric-lost">··</span> <span class="lyric-lost">·</span>ill the hou<span class="lyric-lost">··</span> ligh<span class="lyric-lost">··</span>…”',
    lyricPlain: '“··ay clo·· ·ill the hou·· ligh··…”',
    lyricClarity: 38,
    stems: {
      bass: { audibility: 82, gain: 0.82, lowpassHz: 3600, status: 'Bass leaks through', lost: false },
      keys: { audibility: 55, gain: 0.55, lowpassHz: 1260, status: 'Boxy & woolly', lost: false },
      vocals: { audibility: 38, vowelGain: 0.58, consonantGain: 0.12, lowpassHz: 1300, status: 'Underwater vocals', lost: true },
      guitar: { audibility: 24, gain: 0.21, lowpassHz: 1180, status: 'Attack dulled', lost: true },
      cymbals: { audibility: 14, gain: 0.09, lowpassHz: 1400, status: 'Cymbals killed', lost: true },
    },
  },
  musician_plugs: {
    id: 'musician_plugs',
    label: 'Musicians’ −15 dB',
    lostHeadline: 'Safe −15 dB · All 5 instruments stay clear',
    summary: 'Tuned acoustic filters turn the whole concert down evenly — keeping 100% of the vocals, guitar solo, and cymbal sparkle with zero post-gig hangover.',
    lyricHtml: '“<strong>St</strong>ay <strong>cl</strong>o<strong>s</strong>e <strong>t</strong>ill the hou<strong>s</strong>e ligh<strong>ts</strong> <strong>c</strong>ome up <strong>t</strong>onigh<strong>t</strong>”',
    lyricPlain: '“Stay close till the house lights come up tonight”',
    lyricClarity: 100,
    stems: {
      bass: { audibility: 100, gain: 0.54, lowpassHz: 18000, status: 'Safe & tight (−15 dB)', lost: false },
      keys: { audibility: 100, gain: 0.54, lowpassHz: 18000, status: 'Safe & warm (−15 dB)', lost: false },
      vocals: { audibility: 100, vowelGain: 0.54, consonantGain: 0.54, lowpassHz: 18000, status: 'Safe & crisp (−15 dB)', lost: false },
      guitar: { audibility: 100, gain: 0.54, lowpassHz: 18000, status: 'Safe & clear (−15 dB)', lost: false },
      cymbals: { audibility: 100, gain: 0.54, lowpassHz: 18000, status: 'Safe sparkle (−15 dB)', lost: false },
    },
  },
});

export function normaliseConcertCondition(rawKey = 'original') {
  const k = String(rawKey || 'original').toLowerCase();
  if (k.includes('foam')) return 'foam_plugs';
  if (k.includes('musician') || k === 'filtered') return 'musician_plugs';
  if (k.includes('post_gig') || k === 'muffled') return 'post_gig';
  if (k.includes('nihl_moderate') || k.includes('nihl_mild') || k.includes('high_frequency') || k.includes('severe') || k === 'stronger' || k.includes('broadband') || k.includes('age_related')) {
    return 'severe_hf';
  }
  if (k.includes('nihl') || k.includes('notch') || k === 'permanent') return 'permanent_notch';
  return 'original';
}

export function getConcertStageSnapshot(conditionKey = 'original', soloInstrument = null, mutedIds = []) {
  const normKey = normaliseConcertCondition(conditionKey);
  const cond = CONCERT_CONDITIONS[normKey] ?? CONCERT_CONDITIONS.original;
  const mutedSet = new Set(mutedIds);
  let lostCount = 0;

  const instruments = CONCERT_INSTRUMENTS.map((meta) => {
    const stem = cond.stems[meta.id];
    if (stem.lost) lostCount += 1;
    const isSoloed = soloInstrument === meta.id;
    const silencedBySolo = Boolean(soloInstrument && soloInstrument !== meta.id);
    const isMuted = mutedSet.has(meta.id);
    const activeInMix = !silencedBySolo && !isMuted;
    const effectiveAudibility = activeInMix ? stem.audibility : 0;
    const spotlightOpacity = activeInMix
      ? Number(Math.max(0.06, Math.pow(stem.audibility / 100, 1.15)).toFixed(3))
      : 0.05;
    return {
      ...meta,
      ...stem,
      isSoloed,
      isMuted,
      activeInMix,
      effectiveAudibility,
      spotlightOpacity,
      isGhosted: stem.audibility <= 35,
    };
  });

  return {
    conditionId: normKey,
    label: cond.label,
    lostHeadline: cond.lostHeadline,
    summary: cond.summary,
    lyricHtml: cond.lyricHtml,
    lyricPlain: cond.lyricPlain,
    lyricClarity: cond.lyricClarity,
    lostCount,
    instruments,
  };
}

// 4-Bar 108 BPM Soul-Rock Live Concert Pattern (64 sixteenth-note steps)
// Bar 0: Am9 | Bar 1: Fmaj9 | Bar 2: Cmaj7 | Bar 3: G6 -> E7sus4
const MIDI_TO_HZ = (m) => 440 * Math.pow(2, (m - 69) / 12);

const BAR_CHORDS = [
  [57, 60, 64, 67, 71], // Am9
  [53, 57, 60, 64, 67], // Fmaj9
  [48, 55, 59, 64, 67], // Cmaj7
  [55, 59, 62, 64, 67], // G6
];

const BASS_NOTES_BY_BAR = [
  { 0: 45, 3: 45, 6: 48, 8: 45, 10: 52, 12: 45, 14: 43 },
  { 0: 41, 3: 41, 6: 45, 8: 41, 10: 48, 12: 41, 14: 43 },
  { 0: 36, 3: 36, 6: 43, 8: 48, 10: 47, 12: 43, 14: 45 },
  { 0: 43, 3: 43, 6: 47, 8: 40, 10: 47, 12: 52, 14: 40 },
];

// Expressive vocal melody + crisp syllable consonant flags
const VOCAL_EVENTS = [
  // Bar 0 ("Stay close till the...")
  { step: 0, midi: 76, dur: 0.42, cons: true },
  { step: 3, midi: 74, dur: 0.36, cons: true },
  { step: 6, midi: 72, dur: 0.48, cons: true },
  { step: 10, midi: 71, dur: 0.26, cons: false },
  { step: 12, midi: 69, dur: 0.44, cons: true },
  // Bar 1 ("...house lights come up...")
  { step: 16, midi: 72, dur: 0.42, cons: true },
  { step: 19, midi: 76, dur: 0.38, cons: true },
  { step: 22, midi: 74, dur: 0.44, cons: true },
  { step: 26, midi: 72, dur: 0.28, cons: false },
  { step: 28, midi: 69, dur: 0.46, cons: true },
  // Bar 2 ("...tonight, hold the...")
  { step: 32, midi: 76, dur: 0.44, cons: true },
  { step: 36, midi: 79, dur: 0.42, cons: true },
  { step: 40, midi: 76, dur: 0.48, cons: true },
  { step: 44, midi: 74, dur: 0.36, cons: true },
  // Bar 3 ("...music in the room")
  { step: 48, midi: 74, dur: 0.42, cons: true },
  { step: 51, midi: 72, dur: 0.32, cons: true },
  { step: 54, midi: 71, dur: 0.45, cons: true },
  { step: 58, midi: 69, dur: 0.58, cons: true },
];

// Catchy 2–5 kHz Lead Guitar melodic counter-riffs
const GUITAR_RIFF_BY_BAR = [
  { 2: 69, 4: 72, 7: 76, 9: 79, 11: 76, 14: 72 },
  { 2: 65, 4: 69, 7: 72, 9: 76, 11: 74, 14: 72 },
  { 2: 67, 4: 72, 7: 76, 9: 79, 11: 76, 14: 74 },
  { 2: 67, 4: 71, 7: 74, 9: 76, 11: 74, 13: 71, 15: 68 },
];

export function connectConcertStage({
  root = document,
  pauseOthers = () => {},
  getVolume = () => 0.78,
  onStateChange = () => {},
} = {}) {
  const sectionEl = root.querySelector('#concert-stage');
  if (!sectionEl) {
    const noop = () => {};
    noop.setState = () => {};
    return noop;
  }

  const playBtn = sectionEl.querySelector('#concert-play-btn');
  const fullBandBtn = sectionEl.querySelector('#concert-fullband-btn');
  const lostBadgeEl = sectionEl.querySelector('#concert-lost-badge');
  const lyricTextEl = sectionEl.querySelector('#concert-lyric-text');
  const lyricClarityEl = sectionEl.querySelector('#concert-lyric-clarity');
  const summaryEl = sectionEl.querySelector('#concert-stage-summary');
  const conditionBtns = [...sectionEl.querySelectorAll('[data-concert-condition]')];
  const ringingBtn = sectionEl.querySelector('#concert-ringing-btn');
  const warningBannerEl = sectionEl.querySelector('#concert-tinnitus-warning');
  const warningStopBtn = sectionEl.querySelector('#concert-tinnitus-stop');

  const performerBtns = new Map();
  const spotEls = new Map();
  const cardEls = new Map();

  for (const inst of CONCERT_INSTRUMENTS) {
    const perf = sectionEl.querySelector(`[data-concert-performer="${inst.id}"]`);
    if (perf) performerBtns.set(inst.id, perf);
    const spot = sectionEl.querySelector(`[data-concert-spot="${inst.id}"]`);
    if (spot) spotEls.set(inst.id, spot);
    const card = sectionEl.querySelector(`[data-concert-card="${inst.id}"]`);
    if (card) cardEls.set(inst.id, card);
  }

  let state = {
    playing: false,
    condition: 'original',
    tinnitus: 'off',
    soloInstrument: null,
    mutedIds: new Set(),
  };

  // Real-time pulse trackers per instrument for smooth 60fps stage beat animation
  const pulseLevels = { keys: 0, bass: 0, vocals: 0, guitar: 0, cymbals: 0 };

  let audioCtx = null;
  let masterOut = null;
  let calibrationStage = null;
  let tinnitusBus = null;
  let liveTinnitus = null;
  let noiseBuffer = null;
  const loopCache = new Map();
  const stemGraph = new Map();

  let schedulerTimer = null;
  let visualRaf = 0;
  let currentStep = 0;
  let nextStepTime = 0;

  function ensureAudioEngine() {
    if (audioCtx) return audioCtx;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioCtx = new AudioContextClass();

    // Shared 1.5s white-noise buffer for crisp snare wires, hi-hats, crash shimmer & vocal sibilants
    const noiseLen = Math.round(audioCtx.sampleRate * 1.5);
    noiseBuffer = audioCtx.createBuffer(1, noiseLen, audioCtx.sampleRate);
    const nData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseLen; i += 1) {
      nData[i] = Math.random() * 2 - 1;
    }

    masterOut = audioCtx.createGain();
    masterOut.gain.value = Math.max(0.15, Math.min(1, Number(getVolume?.()) || 0.78));
    masterOut.connect(audioCtx.destination);

    calibrationStage = createCalibrationStage(audioCtx, {
      isSimulated: () => state.condition !== 'original' && state.condition !== 'musician_plugs',
    });
    calibrationStage.output.connect(masterOut);

    tinnitusBus = audioCtx.createGain();
    tinnitusBus.gain.value = 1;
    tinnitusBus.connect(masterOut);

    for (const inst of CONCERT_INSTRUMENTS) {
      const input = audioCtx.createGain();
      const consonantIn = inst.id === 'vocals' ? audioCtx.createGain() : null;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 18000;
      filter.Q.value = 0.65;

      const condGain = audioCtx.createGain();
      condGain.gain.value = 1;

      const soloMuteGain = audioCtx.createGain();
      soloMuteGain.gain.value = 1;

      const panner = typeof audioCtx.createStereoPanner === 'function'
        ? audioCtx.createStereoPanner()
        : null;
      if (panner) panner.pan.value = inst.pan;

      input.connect(filter);
      if (consonantIn) {
        consonantIn.connect(filter);
      }
      filter.connect(condGain);
      condGain.connect(soloMuteGain);
      if (panner) {
        soloMuteGain.connect(panner);
        panner.connect(calibrationStage.input);
      } else {
        soloMuteGain.connect(calibrationStage.input);
      }

      stemGraph.set(inst.id, { input, consonantIn, filter, condGain, soloMuteGain });
    }

    applyAudioMixParameters(true);
    return audioCtx;
  }

  function applyAudioMixParameters(immediate = false) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const tau = immediate ? 0.004 : 0.035;
    const snap = getConcertStageSnapshot(state.condition, state.soloInstrument, [...state.mutedIds]);
    const condSpec = CONCERT_CONDITIONS[snap.conditionId] ?? CONCERT_CONDITIONS.original;

    if (masterOut) {
      const targetVol = Math.max(0.15, Math.min(1, Number(getVolume?.()) || 0.78));
      masterOut.gain.setTargetAtTime(targetVol, now, tau);
    }

    for (const item of snap.instruments) {
      const nodes = stemGraph.get(item.id);
      if (!nodes) continue;
      const rawStem = condSpec.stems[item.id];
      nodes.filter.frequency.setTargetAtTime(rawStem.lowpassHz, now, tau);
      if (item.id === 'vocals') {
        nodes.input.gain.setTargetAtTime(rawStem.vowelGain, now, tau);
        if (nodes.consonantIn) {
          nodes.consonantIn.gain.setTargetAtTime(rawStem.consonantGain, now, tau);
        }
        nodes.condGain.gain.setTargetAtTime(1.0, now, tau);
      } else {
        nodes.condGain.gain.setTargetAtTime(rawStem.gain, now, tau);
      }
      nodes.soloMuteGain.gain.setTargetAtTime(item.activeInMix ? 1 : 0.0001, now, tau);
    }

    calibrationStage?.sync();
    syncTinnitusAudio();
  }

  function stopTinnitusAudio() {
    if (!liveTinnitus || !audioCtx) return;
    const prev = liveTinnitus;
    liveTinnitus = null;
    try {
      const now = audioCtx.currentTime;
      prev.gainNode.gain.cancelScheduledValues(now);
      prev.gainNode.gain.setTargetAtTime(0.0001, now, 0.02);
      prev.source.stop(now + 0.07);
    } catch {
      try { prev.source.disconnect(); prev.gainNode.disconnect(); } catch { /* ignore */ }
    }
  }

  function syncTinnitusAudio() {
    if (!audioCtx || !tinnitusBus || !state.playing || (state.tinnitus !== 'ringing' && state.tinnitus !== 'hiss')) {
      stopTinnitusAudio();
      return;
    }
    const key = `${state.tinnitus}@${audioCtx.sampleRate}`;
    if (!loopCache.has(key)) {
      loopCache.set(key, tinnitusLoop(state.tinnitus, audioCtx.sampleRate));
    }
    const samples = loopCache.get(key);
    const targetGain = audibleTinnitusGain(state.tinnitus, samples, -21, getTinnitusCalibrationLinearBoost());

    if (liveTinnitus && liveTinnitus.sound === state.tinnitus) {
      liveTinnitus.gainNode.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.03);
      return;
    }

    stopTinnitusAudio();
    try {
      const buf = audioCtx.createBuffer(1, samples.length, audioCtx.sampleRate);
      buf.copyToChannel(samples, 0);
      const src = audioCtx.createBufferSource();
      const gainNode = audioCtx.createGain();
      const now = audioCtx.currentTime;
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(targetGain, now + 0.06);
      src.buffer = buf;
      src.loop = true;
      src.connect(gainNode);
      gainNode.connect(tinnitusBus);
      src.onended = () => {
        try { src.disconnect(); gainNode.disconnect(); } catch { /* ignore */ }
      };
      src.start(now);
      liveTinnitus = { sound: state.tinnitus, source: src, gainNode };
    } catch {
      liveTinnitus = null;
    }
  }

  onCalibrationChange(() => {
    if (state.playing) applyAudioMixParameters(false);
  });

  // --- Individual Instrument Note Synthesizers ---
  function triggerKickAndBass(time, bassMidi, isKickStep) {
    const bus = stemGraph.get('bass')?.input;
    if (!bus || !audioCtx) return;

    if (isKickStep) {
      const kickOsc = audioCtx.createOscillator();
      const kickGain = audioCtx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(148, time);
      kickOsc.frequency.exponentialRampToValueAtTime(48, time + 0.09);
      kickGain.gain.setValueAtTime(0.0001, time);
      kickGain.gain.linearRampToValueAtTime(0.42, time + 0.005);
      kickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);
      kickOsc.connect(kickGain);
      kickGain.connect(bus);
      kickOsc.start(time);
      kickOsc.stop(time + 0.26);
      pulseLevels.bass = 1.0;
    }

    if (typeof bassMidi === 'number') {
      const freq = MIDI_TO_HZ(bassMidi);
      const subOsc = audioCtx.createOscillator();
      const bodyOsc = audioCtx.createOscillator();
      const lp = audioCtx.createBiquadFilter();
      const env = audioCtx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(freq, time);
      bodyOsc.type = 'triangle';
      bodyOsc.frequency.setValueAtTime(freq * 2, time);

      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(340, time);
      env.gain.setValueAtTime(0.0001, time);
      env.gain.linearRampToValueAtTime(0.24, time + 0.014);
      env.gain.exponentialRampToValueAtTime(0.0001, time + 0.29);

      subOsc.connect(lp);
      bodyOsc.connect(lp);
      lp.connect(env);
      env.connect(bus);
      subOsc.start(time);
      bodyOsc.start(time);
      subOsc.stop(time + 0.31);
      bodyOsc.stop(time + 0.31);
      pulseLevels.bass = Math.max(pulseLevels.bass, 0.82);
    }
  }

  function triggerWarmKeys(time, chordMidis, durationSec = 0.45) {
    const bus = stemGraph.get('keys')?.input;
    if (!bus || !audioCtx) return;
    for (const [idx, m] of chordMidis.entries()) {
      const freq = MIDI_TO_HZ(m);
      const osc = audioCtx.createOscillator();
      const tine = audioCtx.createOscillator();
      const env = audioCtx.createGain();
      const tineEnv = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      osc.detune.setValueAtTime((idx - 2) * 3.5, time);

      tine.type = 'triangle';
      tine.frequency.setValueAtTime(freq * 2, time);

      env.gain.setValueAtTime(0.0001, time);
      env.gain.linearRampToValueAtTime(0.055, time + 0.018);
      env.gain.exponentialRampToValueAtTime(0.0001, time + durationSec);

      tineEnv.gain.setValueAtTime(0.0001, time);
      tineEnv.gain.linearRampToValueAtTime(0.018, time + 0.008);
      tineEnv.gain.exponentialRampToValueAtTime(0.0001, time + durationSec * 0.45);

      osc.connect(env);
      tine.connect(tineEnv);
      env.connect(bus);
      tineEnv.connect(bus);
      osc.start(time);
      tine.start(time);
      osc.stop(time + durationSec + 0.02);
      tine.stop(time + durationSec + 0.02);
    }
    pulseLevels.keys = 0.92;
  }

  function triggerLeadVocal(time, midi, dur, hasConsonant) {
    const nodes = stemGraph.get('vocals');
    if (!nodes?.input || !audioCtx) return;
    const freq = MIDI_TO_HZ(midi);

    // Warm formant-shaped vowel voice
    const vOsc = audioCtx.createOscillator();
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    const f1 = audioCtx.createBiquadFilter();
    const f2 = audioCtx.createBiquadFilter();
    const vEnv = audioCtx.createGain();

    vOsc.type = 'sawtooth';
    vOsc.frequency.setValueAtTime(freq, time);
    lfo.frequency.setValueAtTime(5.4, time);
    lfoGain.gain.setValueAtTime(4.2, time);
    lfo.connect(lfoGain);
    lfoGain.connect(vOsc.frequency);

    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(640, time);
    f1.Q.setValueAtTime(3.2, time);

    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(1420, time);
    f2.Q.setValueAtTime(3.8, time);

    vEnv.gain.setValueAtTime(0.0001, time);
    vEnv.gain.linearRampToValueAtTime(0.18, time + 0.035);
    vEnv.gain.setValueAtTime(0.15, time + Math.max(0.05, dur - 0.09));
    vEnv.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    vOsc.connect(f1);
    vOsc.connect(f2);
    f1.connect(vEnv);
    f2.connect(vEnv);
    vEnv.connect(nodes.input);

    lfo.start(time);
    vOsc.start(time);
    lfo.stop(time + dur + 0.03);
    vOsc.stop(time + dur + 0.03);

    // Crisp 2.8–5.5 kHz syllable consonant transient (s/t/k articulation)
    if (hasConsonant && nodes.consonantIn && noiseBuffer) {
      const cNoise = audioCtx.createBufferSource();
      cNoise.buffer = noiseBuffer;
      const cBp = audioCtx.createBiquadFilter();
      cBp.type = 'bandpass';
      cBp.frequency.setValueAtTime(3850, time);
      cBp.Q.setValueAtTime(2.1, time);

      const cAir = audioCtx.createOscillator();
      cAir.type = 'triangle';
      cAir.frequency.setValueAtTime(freq * 4, time);

      const cEnv = audioCtx.createGain();
      cEnv.gain.setValueAtTime(0.0001, time);
      cEnv.gain.linearRampToValueAtTime(0.14, time + 0.008);
      cEnv.gain.exponentialRampToValueAtTime(0.0001, time + 0.075);

      cNoise.connect(cBp);
      cBp.connect(cEnv);
      cAir.connect(cEnv);
      cEnv.connect(nodes.consonantIn);
      cNoise.start(time, (midi % 7) * 0.12, 0.09);
      cAir.start(time);
      cAir.stop(time + 0.08);
    }

    pulseLevels.vocals = 1.0;
  }

  function triggerGuitarAndSnare(time, guitarMidi, isSnare) {
    const bus = stemGraph.get('guitar')?.input;
    if (!bus || !audioCtx) return;

    if (typeof guitarMidi === 'number') {
      const freq = MIDI_TO_HZ(guitarMidi);
      const g1 = audioCtx.createOscillator();
      const g2 = audioCtx.createOscillator();
      const biteFilter = audioCtx.createBiquadFilter();
      const gEnv = audioCtx.createGain();

      g1.type = 'sawtooth';
      g1.frequency.setValueAtTime(freq, time);
      g2.type = 'square';
      g2.frequency.setValueAtTime(freq * 2, time);

      // Focus guitar pick bite right into the 2.4–4.2 kHz presence band!
      biteFilter.type = 'bandpass';
      biteFilter.frequency.setValueAtTime(3150, time);
      biteFilter.Q.setValueAtTime(1.45, time);

      gEnv.gain.setValueAtTime(0.0001, time);
      gEnv.gain.linearRampToValueAtTime(0.17, time + 0.007);
      gEnv.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);

      g1.connect(biteFilter);
      g2.connect(biteFilter);
      biteFilter.connect(gEnv);
      gEnv.connect(bus);
      g1.start(time);
      g2.start(time);
      g1.stop(time + 0.26);
      g2.stop(time + 0.26);
      pulseLevels.guitar = Math.max(pulseLevels.guitar, 0.88);
    }

    if (isSnare && noiseBuffer) {
      const snapSrc = audioCtx.createBufferSource();
      snapSrc.buffer = noiseBuffer;
      const snapBp = audioCtx.createBiquadFilter();
      snapBp.type = 'bandpass';
      snapBp.frequency.setValueAtTime(3400, time);
      snapBp.Q.setValueAtTime(1.2, time);
      const snapEnv = audioCtx.createGain();
      snapEnv.gain.setValueAtTime(0.0001, time);
      snapEnv.gain.linearRampToValueAtTime(0.22, time + 0.004);
      snapEnv.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);

      snapSrc.connect(snapBp);
      snapBp.connect(snapEnv);
      snapEnv.connect(bus);
      snapSrc.start(time, 0.2, 0.16);
      pulseLevels.guitar = 1.0;
    }
  }

  function triggerCymbals(time, { isCrash = false, isOpenHat = false } = {}) {
    const bus = stemGraph.get('cymbals')?.input;
    if (!bus || !audioCtx || !noiseBuffer) return;

    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer;
    const hp = audioCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(isCrash ? 5600 : 6800, time);

    const dur = isCrash ? 0.62 : (isOpenHat ? 0.22 : 0.065);
    const peak = isCrash ? 0.22 : (isOpenHat ? 0.15 : 0.11);
    const env = audioCtx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(peak, time + 0.003);
    env.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    // Metallic shimmer partial for authentic ride/crash bell ring
    const bell = audioCtx.createOscillator();
    const bellEnv = audioCtx.createGain();
    bell.type = 'square';
    bell.frequency.setValueAtTime(isCrash ? 7450 : 8620, time);
    bellEnv.gain.setValueAtTime(0.0001, time);
    bellEnv.gain.linearRampToValueAtTime(isCrash ? 0.035 : 0.018, time + 0.002);
    bellEnv.gain.exponentialRampToValueAtTime(0.0001, time + dur * 0.55);

    src.connect(hp);
    hp.connect(env);
    bell.connect(bellEnv);
    env.connect(bus);
    bellEnv.connect(bus);

    src.start(time, (currentStep % 9) * 0.08, dur + 0.02);
    bell.start(time);
    bell.stop(time + dur * 0.6);

    pulseLevels.cymbals = isCrash ? 1.0 : (isOpenHat ? 0.9 : 0.68);
  }

  function scheduleConcertStep(stepIndex, time) {
    const stepInBar = stepIndex % 16;
    const barIdx = Math.floor(stepIndex / 16) % 4;

    // 1. Kick & Sub-Bass
    const isKick = stepInBar === 0 || stepInBar === 6 || stepInBar === 8 || (barIdx === 3 && stepInBar === 14);
    const bassMidi = BASS_NOTES_BY_BAR[barIdx][stepInBar];
    if (isKick || typeof bassMidi === 'number') {
      triggerKickAndBass(time, bassMidi, isKick);
    }

    // 2. Warm Electric Piano / Rhythm Chords
    if (stepInBar === 0 || stepInBar === 6 || stepInBar === 12) {
      const dur = stepInBar === 0 ? 0.52 : 0.34;
      triggerWarmKeys(time, BAR_CHORDS[barIdx], dur);
    }

    // 3. Lead Singer Phrase (Vowels + Crisp Consonants)
    for (const vEv of VOCAL_EVENTS) {
      if (vEv.step === stepIndex) {
        triggerLeadVocal(time, vEv.midi, vEv.dur, vEv.cons);
      }
    }

    // 4. Lead Guitar Riff + Live Snare Crack (2–5 kHz Danger Zone)
    const guitarMidi = GUITAR_RIFF_BY_BAR[barIdx][stepInBar];
    const isSnare = stepInBar === 4 || stepInBar === 12 || (barIdx === 3 && stepInBar === 15);
    if (typeof guitarMidi === 'number' || isSnare) {
      triggerGuitarAndSnare(time, guitarMidi, isSnare);
    }

    // 5. Sparkling Hi-Hats & Crash/Ride Cymbals (6–12 kHz)
    if (stepInBar % 2 === 0 || stepInBar === 15) {
      triggerCymbals(time, {
        isCrash: stepIndex === 0 || stepIndex === 32,
        isOpenHat: stepInBar === 14,
      });
    }
  }

  const STEP_DURATION_SEC = (60 / 108) / 4; // 16th note at 108 BPM (~0.1389s)

  function runLookaheadScheduler() {
    if (!state.playing || !audioCtx) return;
    while (nextStepTime < audioCtx.currentTime + 0.11) {
      scheduleConcertStep(currentStep, nextStepTime);
      nextStepTime += STEP_DURATION_SEC;
      currentStep = (currentStep + 1) % 64;
    }
  }

  function tickVisualMeters() {
    if (!state.playing) return;
    const snap = getConcertStageSnapshot(state.condition, state.soloInstrument, [...state.mutedIds]);
    let bassEnergy = 0;
    let trebleEnergy = 0;

    for (const item of snap.instruments) {
      pulseLevels[item.id] *= 0.86;
      const audibleScale = item.effectiveAudibility / 100;
      const visualPulse = pulseLevels[item.id] * audibleScale;

      const perfEl = performerBtns.get(item.id);
      if (perfEl) {
        perfEl.style.setProperty('--beat-pulse', visualPulse.toFixed(3));
      }
      const spotEl = spotEls.get(item.id);
      if (spotEl) {
        const dynamicSpot = Math.min(1, item.spotlightOpacity + visualPulse * 0.24);
        spotEl.style.opacity = dynamicSpot.toFixed(3);
      }
      if (item.id === 'bass' || item.id === 'keys') {
        bassEnergy = Math.max(bassEnergy, visualPulse);
      } else {
        trebleEnergy = Math.max(trebleEnergy, visualPulse);
      }
    }

    onStateChange({
      type: 'energy',
      playing: true,
      bassEnergy,
      trebleEnergy,
    });

    visualRaf = requestAnimationFrame(tickVisualMeters);
  }

  function syncUi() {
    const snap = getConcertStageSnapshot(state.condition, state.soloInstrument, [...state.mutedIds]);
    sectionEl.dataset.concertCondition = snap.conditionId;
    sectionEl.dataset.concertPlaying = String(state.playing);
    sectionEl.dataset.concertRinging = String(state.tinnitus === 'ringing');

    if (playBtn) {
      playBtn.setAttribute('aria-pressed', String(state.playing));
      playBtn.textContent = state.playing ? 'Pause live concert' : 'Play live concert';
    }
    if (fullBandBtn) {
      fullBandBtn.hidden = !state.soloInstrument && state.mutedIds.size === 0;
    }
    if (lostBadgeEl) {
      lostBadgeEl.textContent = snap.lostHeadline;
      lostBadgeEl.dataset.severity = snap.lostCount >= 3 ? 'high' : (snap.lostCount >= 1 ? 'medium' : 'healthy');
    }
    if (lyricTextEl) {
      lyricTextEl.innerHTML = snap.lyricHtml;
    }
    if (lyricClarityEl) {
      lyricClarityEl.textContent = `Lyric clarity: ${snap.lyricClarity}%`;
    }
    if (summaryEl) {
      summaryEl.textContent = snap.summary;
    }

    for (const btn of conditionBtns) {
      btn.setAttribute('aria-pressed', String(btn.dataset.concertCondition === snap.conditionId));
    }
    if (ringingBtn) {
      const hasTin = state.tinnitus === 'ringing' || state.tinnitus === 'hiss';
      ringingBtn.setAttribute('aria-pressed', String(hasTin));
      ringingBtn.textContent = state.tinnitus === 'hiss' ? '+ Hiss active' : '+ Ringing';
    }
    if (warningBannerEl) {
      warningBannerEl.hidden = state.tinnitus !== 'ringing';
    }

    for (const item of snap.instruments) {
      const perfEl = performerBtns.get(item.id);
      if (perfEl) {
        perfEl.dataset.ghosted = String(item.isGhosted);
        perfEl.dataset.activeMix = String(item.activeInMix);
        perfEl.setAttribute('aria-pressed', String(item.isSoloed));
        const pctTag = perfEl.querySelector('[data-performer-pct]');
        if (pctTag) {
          pctTag.textContent = !item.activeInMix
            ? 'Muted'
            : (item.audibility <= 15 ? `${item.audibility}% · Lost` : `${item.audibility}%`);
        }
      }

      const spotEl = spotEls.get(item.id);
      if (spotEl) {
        spotEl.style.opacity = String(item.spotlightOpacity);
        spotEl.dataset.ghosted = String(item.isGhosted || !item.activeInMix);
      }

      const cardEl = cardEls.get(item.id);
      if (cardEl) {
        cardEl.dataset.ghosted = String(item.isGhosted);
        cardEl.dataset.soloed = String(item.isSoloed);
        cardEl.dataset.muted = String(!item.activeInMix);
        const fillEl = cardEl.querySelector('[data-stem-meter-fill]');
        if (fillEl) fillEl.style.width = `${item.effectiveAudibility}%`;
        const pctEl = cardEl.querySelector('[data-stem-pct]');
        if (pctEl) pctEl.textContent = `${item.effectiveAudibility}%`;
        const statusEl = cardEl.querySelector('[data-stem-status]');
        if (statusEl) {
          statusEl.textContent = item.isMuted ? 'Muted manually' : (item.activeInMix ? item.status : 'Silenced (other soloed)');
        }
        const soloBtn = cardEl.querySelector('[data-stem-solo]');
        if (soloBtn) {
          soloBtn.setAttribute('aria-pressed', String(item.isSoloed));
          soloBtn.textContent = item.isSoloed ? 'Soloing' : 'Solo';
        }
        const muteBtn = cardEl.querySelector('[data-stem-mute]');
        if (muteBtn) {
          muteBtn.setAttribute('aria-pressed', String(item.isMuted));
          muteBtn.textContent = item.isMuted ? 'Unmute' : 'Mute';
        }
      }
    }
  }

  function startConcert() {
    pauseOthers();
    const ctx = ensureAudioEngine();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    // Unlock iOS Safari Web Audio reliably on first tap
    try {
      const unlock = ctx.createBufferSource();
      unlock.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      unlock.connect(ctx.destination);
      unlock.start(0);
    } catch { /* ignore */ }

    state.playing = true;
    nextStepTime = ctx.currentTime + 0.03;
    applyAudioMixParameters(true);
    clearInterval(schedulerTimer);
    schedulerTimer = setInterval(runLookaheadScheduler, 35);
    cancelAnimationFrame(visualRaf);
    visualRaf = requestAnimationFrame(tickVisualMeters);
    syncUi();
    onStateChange({
      type: 'select',
      effectKey: state.condition,
      tinnitus: state.tinnitus,
      playing: true,
    });
  }

  function stopConcert({ notify = true } = {}) {
    if (!state.playing && !liveTinnitus) return;
    state.playing = false;
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    cancelAnimationFrame(visualRaf);
    stopTinnitusAudio();
    for (const inst of CONCERT_INSTRUMENTS) {
      pulseLevels[inst.id] = 0;
      const perfEl = performerBtns.get(inst.id);
      if (perfEl) perfEl.style.setProperty('--beat-pulse', '0');
    }
    syncUi();
    if (notify) {
      onStateChange({ type: 'energy', playing: false, bassEnergy: 0.24, trebleEnergy: 0.26 });
    }
  }

  function toggleSolo(instrumentId) {
    state.soloInstrument = state.soloInstrument === instrumentId ? null : instrumentId;
    if (state.soloInstrument) {
      state.mutedIds.delete(state.soloInstrument);
    }
    applyAudioMixParameters(false);
    syncUi();
    const instMeta = CONCERT_INSTRUMENTS.find((i) => i.id === instrumentId);
    if (instMeta) {
      onStateChange({ type: 'focusPart', focusPart: instMeta.earPart });
    }
    if (!state.playing) {
      startConcert();
    }
  }

  playBtn?.addEventListener('click', () => {
    if (state.playing) stopConcert();
    else startConcert();
  });

  fullBandBtn?.addEventListener('click', () => {
    state.soloInstrument = null;
    state.mutedIds.clear();
    applyAudioMixParameters(false);
    syncUi();
  });

  for (const btn of conditionBtns) {
    btn.addEventListener('click', () => {
      const nextCond = normaliseConcertCondition(btn.dataset.concertCondition || 'original');
      state.condition = nextCond;
      if (nextCond === 'original' || nextCond === 'foam_plugs' || nextCond === 'musician_plugs') {
        state.tinnitus = 'off';
      }
      applyAudioMixParameters(false);
      syncUi();
      onStateChange({
        type: 'select',
        effectKey: state.condition,
        tinnitus: state.tinnitus,
        playing: state.playing,
      });
      if (!state.playing) {
        startConcert();
      }
    });
  }

  ringingBtn?.addEventListener('click', () => {
    if (state.tinnitus === 'ringing' || state.tinnitus === 'hiss') {
      state.tinnitus = 'off';
      applyAudioMixParameters(false);
      syncUi();
      onStateChange({ type: 'select', effectKey: state.condition, tinnitus: 'off', playing: state.playing });
      return;
    }
    const activateTin = (chosen) => {
      if (state.condition === 'original') state.condition = 'post_gig';
      state.tinnitus = chosen;
      applyAudioMixParameters(false);
      syncUi();
      onStateChange({ type: 'select', effectKey: state.condition, tinnitus: chosen, playing: state.playing });
      if (!state.playing) startConcert();
    };
    confirmRingingPlayback({
      onConfirm: () => activateTin('ringing'),
      onUseHiss: () => activateTin('hiss'),
    });
  });

  warningStopBtn?.addEventListener('click', () => {
    state.tinnitus = 'off';
    applyAudioMixParameters(false);
    syncUi();
    onStateChange({ type: 'select', effectKey: state.condition, tinnitus: 'off', playing: state.playing });
  });

  for (const inst of CONCERT_INSTRUMENTS) {
    const perfEl = performerBtns.get(inst.id);
    perfEl?.addEventListener('click', () => toggleSolo(inst.id));

    const cardEl = cardEls.get(inst.id);
    cardEl?.querySelector('[data-stem-solo]')?.addEventListener('click', () => toggleSolo(inst.id));
    cardEl?.querySelector('[data-stem-mute]')?.addEventListener('click', () => {
      if (state.mutedIds.has(inst.id)) {
        state.mutedIds.delete(inst.id);
      } else {
        state.mutedIds.add(inst.id);
        if (state.soloInstrument === inst.id) state.soloInstrument = null;
      }
      applyAudioMixParameters(false);
      syncUi();
    });
  }

  syncUi();

  const stopFn = () => stopConcert({ notify: true });
  stopFn.setState = (patch = {}) => {
    let changed = false;
    if (patch.effectKey !== undefined) {
      const mapped = normaliseConcertCondition(patch.effectKey);
      if (mapped !== state.condition) {
        state.condition = mapped;
        changed = true;
      }
    }
    if (patch.tinnitus !== undefined && patch.tinnitus !== state.tinnitus) {
      state.tinnitus = patch.tinnitus;
      changed = true;
    }
    if (changed) {
      applyAudioMixParameters(false);
      syncUi();
    }
  };
  return stopFn;
}
