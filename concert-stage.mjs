// Interactive 3D Live Concert Stage + Real Royalty-Free Song 5-Stem Separator
// Decomposes cleared CC BY / Public Domain songs in real time using Mid/Side spatial separation
// + 6 telescoping linear-phase FIR convolution kernels (exact bit-accurate sum at 0 dB!),
// isolating true 340 Hz–7.5 kHz center vocals (body vs sibilant consonants) with smooth musical crossfades.

import { buildConcert3DScene } from './concert-3d-scene.mjs?v=6c8561a22e';
import {
  createCrowdAmbienceBuffer,
  createCrowdCheeringBuffer,
  crowdPercentToGain,
} from './crowd-ambience.mjs?v=6c8561a22e';
import { createBandKernels } from './freq-band-audio.mjs?v=6c8561a22e';
import {
  createCalibrationStage,
  getTinnitusCalibrationLinearBoost,
  onCalibrationChange,
} from './output-calibration.mjs?v=6c8561a22e';
import { getTheme, onThemeChange } from './theme.mjs?v=6c8561a22e';
import { confirmRingingPlayback } from './tinnitus-warning.mjs?v=6c8561a22e';
import { audibleTinnitusGain, tinnitusLoop } from './upload-tinnitus.mjs?v=6c8561a22e';

export const CONCERT_SONGS = Object.freeze([
  {
    id: 'dont-lose-the-music',
    title: 'Don’t Lose the Music',
    artist: 'RNID Campaign Mix',
    genre: 'Funk-Pop Brass, Bass & Vocal Hooks',
    license: 'Campaign Track',
    creditUrl: 'https://rnid.org.uk/information-and-support/ear-health/protect-your-hearing/',
    path: './demo/music/dont-lose-the-music/reference.m4a',
    startOffset: 0,
    isInstrumental: false,
    vocalCheckKicker: 'Don’t Lose the Music · Vocal Hook & Brass Lead',
    vocalFocusNote: 'Compare warm horn & vocal body against crisp claps, brass bite, and word edges.',
  },
  {
    id: 'let-it-in',
    title: 'Let It In',
    artist: 'Josh Woodward',
    genre: 'Upbeat Indie Folk-Rock (Vocals & Full Band)',
    license: 'CC BY 4.0',
    creditUrl: 'https://freemusicarchive.org/music/Josh_Woodward/Ashes/JoshWoodward-Ashes-01-LetItIn/',
    path: './demo/music/let-it-in/reference.m4a',
    startOffset: 72.0,
    isInstrumental: false,
    vocalCheckKicker: 'Josh Woodward · Chorus Lead Vocal Check',
    vocalFocusNote: 'Chorus at 1:12 — compare warm vowels against crisp s, t, and k word edges.',
  },
  {
    id: 'i-just-wanna',
    title: 'I Just Wanna',
    artist: 'mykleanthony',
    genre: 'Soul-Pop Groove (Vocals, Keys & Hi-Hats)',
    license: 'CC BY 3.0',
    creditUrl: 'https://ccmixter.org/files/mykleanthony/71247',
    path: './demo/music/i-just-wanna/reference.m4a',
    startOffset: 12.6,
    isInstrumental: false,
    vocalCheckKicker: 'mykleanthony · Soul-Pop Lead Vocal Check',
    vocalFocusNote: 'Vocal hook at 0:13 — vowel warmth stays loud while s, ch, and t soften.',
  },
  {
    id: 'gravity',
    title: 'Gravity',
    artist: 'Josh Woodward',
    genre: 'Indie Rock Band (Vocals, Guitars & Drums)',
    license: 'CC BY 4.0',
    creditUrl: 'https://freemusicarchive.org/music/Josh_Woodward/Dirty_Wings/JoshWoodward-DW-04-Gravity/',
    path: './demo/music/gravity/reference.m4a',
    startOffset: 86.0,
    isInstrumental: false,
    vocalCheckKicker: 'Josh Woodward · Indie-Rock Vocal Check',
    vocalFocusNote: 'Full band at 1:26 — guitar pick snap and word endings recede into the bass.',
  },
  {
    id: 'in-peace',
    title: 'In Peace',
    artist: 'Madam Snowflake',
    genre: 'Electronic Pop (Female Vocals & Shimmer)',
    license: 'CC BY 3.0',
    creditUrl: 'https://ccmixter.org/files/snowflake/33628',
    path: './demo/music/in-peace/reference.m4a',
    startOffset: 20.2,
    isInstrumental: false,
    vocalCheckKicker: 'Madam Snowflake · Female Lead Vocal Check',
    vocalFocusNote: 'Female vocal at 0:20 — airy breath and f / s consonants fade first.',
  },
  {
    id: 'its-your-birthday',
    title: 'It’s Your Birthday',
    artist: 'Kyla',
    genre: 'Pop Band (Female Vocals)',
    license: 'CC BY 3.0',
    creditUrl: 'https://freemusicarchive.org/music/Kyla/The_New_Birthday_Song_Contest/Its_Your_Birthday/',
    path: './demo/music/its-your-birthday/reference.m4a',
    startOffset: 0.5,
    isInstrumental: false,
    vocalCheckKicker: 'Kyla · Pop Lead Vocal Check',
    vocalFocusNote: 'Chorus at 0:01 — sharp t and th consonants dull while the beat stays full.',
  },
  {
    id: 'boogie-party',
    title: 'Boogie Party',
    artist: 'Kevin MacLeod',
    genre: 'Instrumental Blues-Rock Band (Guitar, Piano & Drums)',
    license: 'CC BY 4.0',
    creditUrl: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN2200002',
    path: './demo/music/boogie-party/reference.m4a',
    startOffset: 53.5,
    isInstrumental: true,
    vocalCheckKicker: 'Instrumental Track · Center Piano & Snare Lead',
    vocalFocusNote: 'Instrumental blues-rock — center stem compares piano body against sharp snare attack.',
  },
]);

export function getSongVocalCheckSpec(songId = 'dont-lose-the-music') {
  return CONCERT_SONGS.find((s) => s.id === songId) ?? CONCERT_SONGS[0];
}

// 6 Telescoping Linear-Phase FIR Bands paired with Mid/Side stereo decomposition:
//   b0: 0–220 Hz        -> Bass & Kick Drum (Stereo L, R)
//   b1: 220–340 Hz      -> Low-Mid Instrument Chest (Stereo L, R -> Keys/Rhythm, keeps muddy snare/bass boom out of Vocals!)
//   b2: 340–2500 Hz     -> Mid = Vocal Vowel Body; Side = Stereo Rhythm Chords & Keys
//   b3: 2500–6200 Hz    -> Mid = Vocal Consonants (t, k, p, ch); Side = Wide Guitar Bite & Snare Crack
//   b4: 6200–7500 Hz    -> Mid = Vocal Sibilant Air (s, sh, f); Side = Upper Cymbal Edge
//   b5: 7500 Hz–Nyquist -> Hi-Hats, Ride/Crash Cymbals & Hall Air (Stereo L, R)
// Exact algebraic identity: Bass + Keys + Vocals + Guitar + Cymbals === Delayed Original Stereo Song!
export const CONCERT_STEM_FIR_BANDS = Object.freeze([
  { id: 'sub_bass', maxHz: 220 },
  { id: 'low_chest', maxHz: 340 },
  { id: 'warm_body', maxHz: 2500 },
  { id: 'presence_bite', maxHz: 6200 },
  { id: 'sibilant_edge', maxHz: 7500 },
  { id: 'cymbal_air', maxHz: Infinity },
]);

export const CONCERT_INSTRUMENTS = Object.freeze([
  {
    id: 'keys',
    title: 'Rhythm Chords & Keys',
    shortLabel: 'Keys',
    bandLabel: 'Warm Stereo Chords',
    accent: '#60a5fa',
    earPart: 'cochlea',
  },
  {
    id: 'bass',
    title: 'Bass & Kick Drum',
    shortLabel: 'Bass',
    bandLabel: 'Deep Stage Pulse',
    accent: '#10b981',
    earPart: 'eardrum',
  },
  {
    id: 'vocals',
    title: 'Center Lead Vocals',
    instrumentalTitle: 'Center Lead & Snare',
    shortLabel: 'Vocals',
    instrumentalShortLabel: 'Center Lead',
    bandLabel: 'Center Voice & Lyrics',
    accent: '#f472b6',
    earPart: 'nerve',
  },
  {
    id: 'guitar',
    title: 'Guitar Bite & Snare',
    shortLabel: 'Guitar',
    bandLabel: 'Sharp Pick & Snare',
    accent: '#f59e0b',
    earPart: 'cochlea',
  },
  {
    id: 'cymbals',
    title: 'Hi-Hats & Cymbals',
    shortLabel: 'Cymbals',
    bandLabel: 'Bright Air & Shimmer',
    accent: '#a78bfa',
    earPart: 'cochlea',
  },
]);

export const CONCERT_CONDITIONS = Object.freeze({
  original: {
    id: 'original',
    label: 'Healthy ears',
    lostHeadline: 'All 5 song stems clear & balanced',
    summary: 'All 5 stage spotlights shine — bass, chords, vocals, guitar bite, and cymbals sit in clear balance.',
    vowelRetention: 100,
    consonantRetention: 100,
    lyricClarity: 100,
    stems: {
      bass: { audibility: 100, gain: 1.0, status: 'Full punch', lost: false },
      keys: { audibility: 100, gain: 1.0, status: 'Warm & wide', lost: false },
      vocals: { audibility: 100, vowelGain: 1.0, consonantGain: 1.0, status: 'Full clarity', lost: false },
      guitar: { audibility: 100, gain: 1.0, status: 'Sharp riff & snare', lost: false },
      cymbals: { audibility: 100, gain: 1.0, status: 'Bright shimmer', lost: false },
    },
  },
  post_gig: {
    id: 'post_gig',
    label: 'Post-gig muffled',
    lostHeadline: '2 stems fading · High consonants softened',
    summary: 'Temporary hangover: bass still pounds while cymbals and crisp s, t, and k word edges soften.',
    vowelRetention: 90,
    consonantRetention: 22,
    lyricClarity: 56,
    stems: {
      bass: { audibility: 98, gain: 0.98, status: 'Still booming', lost: false },
      keys: { audibility: 82, gain: 0.82, status: 'Warmth stays', lost: false },
      vocals: { audibility: 56, vowelGain: 0.9, consonantGain: 0.22, status: 'Consonants dulled', lost: false },
      guitar: { audibility: 34, gain: 0.28, status: 'Bite muffled', lost: true },
      cymbals: { audibility: 18, gain: 0.14, status: 'Sparkle faded', lost: true },
    },
  },
  permanent_notch: {
    id: 'permanent_notch',
    label: '4 kHz noise notch',
    lostHeadline: 'Guitar bite, snare & consonants lost in mix',
    summary: 'Guitar pick attack, snare crack, and crisp word edges drop out while bass booms untouched.',
    vowelRetention: 86,
    consonantRetention: 8,
    lyricClarity: 44,
    stems: {
      bass: { audibility: 98, gain: 0.98, status: 'Untouched bass', lost: false },
      keys: { audibility: 84, gain: 0.84, status: 'Low chords intact', lost: false },
      vocals: { audibility: 44, vowelGain: 0.86, consonantGain: 0.08, status: 'Edges blurred', lost: true },
      guitar: { audibility: 12, gain: 0.06, status: 'Lost in notch', lost: true },
      cymbals: { audibility: 28, gain: 0.24, status: 'Thin distant tick', lost: true },
    },
  },
  severe_hf: {
    id: 'severe_hf',
    label: 'Strong treble loss',
    lostHeadline: 'Right half of the 3D stage vanishes',
    summary: 'Cymbals and guitar bite go dark, and vocals lose crispness while heavy bass dominates.',
    vowelRetention: 56,
    consonantRetention: 2,
    lyricClarity: 24,
    stems: {
      bass: { audibility: 96, gain: 0.96, status: 'Dominates room', lost: false },
      keys: { audibility: 56, gain: 0.52, status: 'Low hum only', lost: false },
      vocals: { audibility: 24, vowelGain: 0.56, consonantGain: 0.015, status: 'Muffled body only', lost: true },
      guitar: { audibility: 5, gain: 0.02, status: 'Vanished', lost: true },
      cymbals: { audibility: 2, gain: 0.006, status: 'Gone completely', lost: true },
    },
  },
  musician_plugs: {
    id: 'musician_plugs',
    label: 'Earplugs',
    lostHeadline: 'Safe −15 dB · All 5 stems stay clear',
    summary: 'Earplugs lower volume evenly — keeping full vocal diction, guitar bite, and cymbal sparkle.',
    vowelRetention: 100,
    consonantRetention: 100,
    lyricClarity: 100,
    stems: {
      bass: { audibility: 100, gain: 0.54, status: 'Safe & tight (−15 dB)', lost: false },
      keys: { audibility: 100, gain: 0.54, status: 'Safe & warm (−15 dB)', lost: false },
      vocals: { audibility: 100, vowelGain: 0.54, consonantGain: 0.54, status: 'Safe & crisp (−15 dB)', lost: false },
      guitar: { audibility: 100, gain: 0.54, status: 'Safe & clear (−15 dB)', lost: false },
      cymbals: { audibility: 100, gain: 0.54, status: 'Safe sparkle (−15 dB)', lost: false },
    },
  },
});

export function normaliseConcertCondition(rawKey = 'original') {
  const k = String(rawKey || 'original').toLowerCase();
  if (k.includes('plug') || k.includes('musician') || k === 'filtered' || k.includes('foam')) return 'musician_plugs';
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
      ? Number(Math.max(0.05, Math.pow(stem.audibility / 100, 1.15)).toFixed(3))
      : 0.04;
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
    vowelRetention: cond.vowelRetention,
    consonantRetention: cond.consonantRetention,
    lyricClarity: cond.lyricClarity,
    lostCount,
    instruments,
  };
}

// Pure mathematical helper used by audio engine & unit tests:
// Returns the 6 telescoping FIR kernels (b0..b5) plus pre-combined vocal consonant kernel (b3 + b4).
export function createConcertStemKernels(sampleRate = 44100) {
  const { center, kernels } = createBandKernels(sampleRate, CONCERT_STEM_FIR_BANDS);
  const [b0, b1, b2, b3, b4, b5] = kernels;
  const b34 = new Float32Array(b3.length);
  for (let i = 0; i < b3.length; i += 1) {
    b34[i] = b3[i] + b4[i];
  }
  return { center, b0, b1, b2, b3, b4, b5, b34 };
}

function formatClock(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

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
    noop.play = () => {};
    noop.toggle = () => {};
    noop.setCrowdPercent = () => {};
    noop.isPlaying = () => false;
    return noop;
  }

  const canvasWrap = sectionEl.querySelector('#concert-3d-canvas-wrap');
  const pinsLayer = sectionEl.querySelector('#concert-3d-pins');
  const hoverTooltip = sectionEl.querySelector('#concert-3d-tooltip');
  const mobileHintEl = sectionEl.querySelector('#concert-3d-hint');
  const camZoomInBtn = sectionEl.querySelector('#concert-cam-in');
  const camZoomOutBtn = sectionEl.querySelector('#concert-cam-out');
  const camResetBtn = sectionEl.querySelector('#concert-cam-reset');

  const songSelectEl = sectionEl.querySelector('#concert-song-select');
  const songCreditEl = sectionEl.querySelector('#concert-song-credit');
  const playBtn = sectionEl.querySelector('#concert-play-btn');
  const fullBandBtn = sectionEl.querySelector('#concert-fullband-btn');
  const seekInput = sectionEl.querySelector('#concert-seek');
  const timeEl = sectionEl.querySelector('#concert-time');
  const statusEl = sectionEl.querySelector('#concert-status');

  const lostBadgeEl = sectionEl.querySelector('#concert-lost-badge');
  const vocalKickerEl = sectionEl.querySelector('#concert-vocal-kicker');
  const lyricClarityEl = sectionEl.querySelector('#concert-lyric-clarity');
  const vocalNoteEl = sectionEl.querySelector('#concert-lyric-text');
  const vowelBarEl = sectionEl.querySelector('#concert-vowel-bar');
  const vowelPctEl = sectionEl.querySelector('#concert-vowel-pct');
  const consBarEl = sectionEl.querySelector('#concert-consonant-bar');
  const consPctEl = sectionEl.querySelector('#concert-consonant-pct');
  const summaryEl = sectionEl.querySelector('#concert-stage-summary');

  const conditionBtns = [...sectionEl.querySelectorAll('[data-concert-condition]')];
  const cheerBtn = sectionEl.querySelector('#concert-cheer-btn');
  const ringingBtn = sectionEl.querySelector('#concert-ringing-btn');
  const warningBannerEl = sectionEl.querySelector('#concert-tinnitus-warning');
  const warningStopBtn = sectionEl.querySelector('#concert-tinnitus-stop');

  const cardEls = new Map();
  for (const inst of CONCERT_INSTRUMENTS) {
    const card = sectionEl.querySelector(`[data-concert-card="${inst.id}"]`);
    if (card) cardEls.set(inst.id, card);
  }

  // Build projected 3D stage callout pins above each performer
  const pinEls = new Map();
  if (pinsLayer) {
    pinsLayer.replaceChildren();
    for (const inst of CONCERT_INSTRUMENTS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'concert-3d-pin';
      btn.dataset.concertPin = inst.id;
      btn.style.setProperty('--pin-color', inst.accent);
      const nameSpan = document.createElement('span');
      nameSpan.className = 'concert-pin-name';
      nameSpan.textContent = inst.shortLabel;
      const pctSpan = document.createElement('span');
      pctSpan.className = 'concert-pin-pct';
      pctSpan.textContent = '100%';
      btn.append(nameSpan, pctSpan);
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        toggleSolo(inst.id);
      });
      pinsLayer.append(btn);
      pinEls.set(inst.id, { btn, nameSpan, pctSpan });
    }
  }

  if (songSelectEl && songSelectEl.options.length === 0) {
    for (const s of CONCERT_SONGS) {
      songSelectEl.append(new Option(`${s.title} — ${s.artist} (${s.license})`, s.id));
    }
  }

  let state = {
    songId: CONCERT_SONGS[0].id,
    playing: false,
    loading: false,
    condition: 'original',
    tinnitus: 'off',
    crowdPercent: 0,
    crowdCheering: true,
    soloInstrument: null,
    mutedIds: new Set(),
    hoveredStem: null,
    duration: 0,
    pausedOffset: CONCERT_SONGS[0].startOffset,
  };

  const stemEnergies = { keys: 0, bass: 0, vocals: 0, guitar: 0, cymbals: 0 };
  let liveVowelRms = 0;
  let liveConsonantRms = 0;

  let audioCtx = null;
  let masterOut = null;
  let calibrationStage = null;
  let tinnitusBus = null;
  let liveTinnitus = null;
  let liveCrowd = null;
  let liveCheer = null;
  let cheerBurstUntil = 0;
  let graphBuiltRate = 0;
  let stemNodes = null;
  let activeRun = null;
  let loadToken = 0;
  let pauseFadeTimer = null;
  const decodedSongs = new Map();
  const loopCache = new Map();

  function currentSongMeta() {
    return getSongVocalCheckSpec(state.songId);
  }

  function makeImpulseBuffer(ctx, kernel) {
    const buf = ctx.createBuffer(1, kernel.length, ctx.sampleRate);
    buf.copyToChannel(kernel, 0);
    return buf;
  }

  function makeAnalyser(ctx) {
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;
    return { analyser, timeDomain: new Float32Array(analyser.fftSize) };
  }

  function ensureConcertAudioGraph() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioCtx ??= new AudioContextClass();
    if (stemNodes && graphBuiltRate === audioCtx.sampleRate) return audioCtx;

    graphBuiltRate = audioCtx.sampleRate;
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

    const { b0, b1, b2, b3, b4, b5, b34 } = createConcertStemKernels(audioCtx.sampleRate);

    // Stereo input bus + exact Mid/Side decomposition:
    const sourceEntry = audioCtx.createGain();
    const splitter = audioCtx.createChannelSplitter(2);
    sourceEntry.connect(splitter);

    const midBus = audioCtx.createGain();
    const lToMid = audioCtx.createGain(); lToMid.gain.value = 0.5;
    const rToMid = audioCtx.createGain(); rToMid.gain.value = 0.5;
    splitter.connect(lToMid, 0);
    splitter.connect(rToMid, 1);
    lToMid.connect(midBus);
    rToMid.connect(midBus);

    const sideBus = audioCtx.createChannelMerger(2);
    const lPos = audioCtx.createGain(); lPos.gain.value = 0.5;
    const rNeg = audioCtx.createGain(); rNeg.gain.value = -0.5;
    const lNeg = audioCtx.createGain(); lNeg.gain.value = -0.5;
    const rPos = audioCtx.createGain(); rPos.gain.value = 0.5;
    splitter.connect(lPos, 0);
    splitter.connect(rNeg, 1);
    lPos.connect(sideBus, 0, 0);
    rNeg.connect(sideBus, 0, 0);
    splitter.connect(lNeg, 0);
    splitter.connect(rPos, 1);
    lNeg.connect(sideBus, 0, 1);
    rPos.connect(sideBus, 0, 1);

    const makeConv = (kernel) => {
      const c = audioCtx.createConvolver();
      c.normalize = false;
      c.buffer = makeImpulseBuffer(audioCtx, kernel);
      return c;
    };

    const makeStemChain = () => {
      const condGain = audioCtx.createGain();
      const soloGain = audioCtx.createGain();
      const { analyser, timeDomain } = makeAnalyser(audioCtx);
      condGain.connect(soloGain);
      soloGain.connect(analyser);
      analyser.connect(calibrationStage.input);
      return { condGain, soloGain, analyser, timeDomain };
    };

    // 1. Bass & Kick (Stereo 20–220 Hz)
    const convBass = makeConv(b0);
    const bassChain = makeStemChain();
    sourceEntry.connect(convBass);
    convBass.connect(bassChain.condGain);

    // 2. Stereo Rhythm Chords & Keys (Stereo 220–340 Hz Chest + Side 340–2500 Hz)
    const convKeysChest = makeConv(b1);
    const convKeysSide = makeConv(b2);
    const keysChain = makeStemChain();
    sourceEntry.connect(convKeysChest);
    convKeysChest.connect(keysChain.condGain);
    sideBus.connect(convKeysSide);
    convKeysSide.connect(keysChain.condGain);

    // 3. Center Lead Vocals (Mid 340–2500 Hz Vowel Body + Mid 2500–7500 Hz Consonants & Sibilants!)
    const convVocalBody = makeConv(b2);
    const convVocalCons = makeConv(b34);
    const vocalVowelGain = audioCtx.createGain();
    const vocalConsonantGain = audioCtx.createGain();
    const vowelMeter = makeAnalyser(audioCtx);
    const consonantMeter = makeAnalyser(audioCtx);
    const vocalsChain = makeStemChain();

    midBus.connect(convVocalBody);
    convVocalBody.connect(vocalVowelGain);
    vocalVowelGain.connect(vowelMeter.analyser);
    vowelMeter.analyser.connect(vocalsChain.condGain);

    midBus.connect(convVocalCons);
    convVocalCons.connect(vocalConsonantGain);
    vocalConsonantGain.connect(consonantMeter.analyser);
    consonantMeter.analyser.connect(vocalsChain.condGain);

    // 4. Guitar Bite & Snare Crack (Side 2500–6200 Hz)
    const convGuitarSide = makeConv(b3);
    const guitarChain = makeStemChain();
    sideBus.connect(convGuitarSide);
    convGuitarSide.connect(guitarChain.condGain);

    // 5. Hi-Hats, Cymbals & Air (Side 6200–7500 Hz + Stereo 7500–20000 Hz)
    const convCymbalSide = makeConv(b4);
    const convCymbalAir = makeConv(b5);
    const cymbalsChain = makeStemChain();
    sideBus.connect(convCymbalSide);
    convCymbalSide.connect(cymbalsChain.condGain);
    sourceEntry.connect(convCymbalAir);
    convCymbalAir.connect(cymbalsChain.condGain);

    stemNodes = {
      sourceEntry,
      vocalVowelGain,
      vocalConsonantGain,
      vowelMeter,
      consonantMeter,
      chains: {
        bass: bassChain,
        keys: keysChain,
        vocals: vocalsChain,
        guitar: guitarChain,
        cymbals: cymbalsChain,
      },
    };

    applyStemGains(true);
    return audioCtx;
  }

  // Smooth musical glide (~380 ms) when switching hearing profiles or soloing so transitions flow naturally
  function applyStemGains(immediate = false) {
    if (!audioCtx || !stemNodes) return;
    const now = audioCtx.currentTime;
    const tau = immediate ? 0.008 : 0.135;
    const snap = getConcertStageSnapshot(state.condition, state.soloInstrument, [...state.mutedIds]);
    const condSpec = CONCERT_CONDITIONS[snap.conditionId] ?? CONCERT_CONDITIONS.original;

    if (masterOut) {
      const vol = Math.max(0.15, Math.min(1, Number(getVolume?.()) || 0.78));
      masterOut.gain.setTargetAtTime(vol, now, tau);
    }

    for (const item of snap.instruments) {
      const chain = stemNodes.chains[item.id];
      if (!chain) continue;
      const raw = condSpec.stems[item.id];
      if (item.id === 'vocals') {
        stemNodes.vocalVowelGain.gain.setTargetAtTime(raw.vowelGain, now, tau);
        stemNodes.vocalConsonantGain.gain.setTargetAtTime(raw.consonantGain, now, tau);
        chain.condGain.gain.setTargetAtTime(1.0, now, tau);
      } else {
        chain.condGain.gain.setTargetAtTime(raw.gain, now, tau);
      }
      chain.soloGain.gain.setTargetAtTime(item.activeInMix ? 1.0 : 0.0, now, tau);
    }

    calibrationStage?.sync();
    syncTinnitusAudio();
    syncCrowdAudio();
    syncCheerAudio();
  }

  function stopCheerAudio() {
    if (!liveCheer || !audioCtx) return;
    const prev = liveCheer;
    liveCheer = null;
    try {
      const now = audioCtx.currentTime;
      prev.gainNode.gain.cancelScheduledValues(now);
      prev.gainNode.gain.setTargetAtTime(0.0001, now, 0.08);
      prev.source.stop(now + 0.28);
    } catch {
      try { prev.source.disconnect(); prev.gainNode.disconnect(); } catch { /* ignore */ }
    }
  }

  function syncCheerAudio({ swell = false } = {}) {
    if (!audioCtx || !stemNodes || !state.playing || !state.crowdCheering) {
      stopCheerAudio();
      return;
    }
    const baseGain = 0.145;
    const peakGain = 0.27;
    const now = audioCtx.currentTime;

    if (liveCheer) {
      liveCheer.gainNode.gain.cancelScheduledValues(now);
      if (swell) {
        liveCheer.gainNode.gain.setValueAtTime(Math.max(0.05, liveCheer.gainNode.gain.value), now);
        liveCheer.gainNode.gain.linearRampToValueAtTime(peakGain, now + 0.32);
        liveCheer.gainNode.gain.setTargetAtTime(baseGain, now + 1.1, 0.65);
      } else {
        liveCheer.gainNode.gain.setTargetAtTime(baseGain, now, 0.14);
      }
      return;
    }

    try {
      const buf = createCrowdCheeringBuffer(audioCtx);
      const src = audioCtx.createBufferSource();
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0.0001, now);
      if (swell) {
        gainNode.gain.linearRampToValueAtTime(peakGain, now + 0.35);
        gainNode.gain.setTargetAtTime(baseGain, now + 1.15, 0.65);
      } else {
        gainNode.gain.linearRampToValueAtTime(baseGain, now + 0.45);
      }
      src.buffer = buf;
      src.loop = true;
      src.connect(gainNode);
      gainNode.connect(stemNodes.sourceEntry);
      src.onended = () => {
        try { src.disconnect(); gainNode.disconnect(); } catch { /* ignore */ }
      };
      src.start(now);
      liveCheer = { source: src, gainNode };
    } catch {
      liveCheer = null;
    }
  }

  function stopCrowdAudio() {
    if (!liveCrowd || !audioCtx) return;
    const prev = liveCrowd;
    liveCrowd = null;
    try {
      const now = audioCtx.currentTime;
      prev.gainNode.gain.cancelScheduledValues(now);
      prev.gainNode.gain.setTargetAtTime(0.0001, now, 0.06);
      prev.source.stop(now + 0.22);
    } catch {
      try { prev.source.disconnect(); prev.gainNode.disconnect(); } catch { /* ignore */ }
    }
  }

  function syncCrowdAudio() {
    const targetGain = crowdPercentToGain(state.crowdPercent);
    if (!audioCtx || !stemNodes || !state.playing || targetGain <= 0.0001) {
      stopCrowdAudio();
      return;
    }
    if (liveCrowd) {
      liveCrowd.gainNode.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.08);
      return;
    }
    try {
      const buf = createCrowdAmbienceBuffer(audioCtx);
      const src = audioCtx.createBufferSource();
      const gainNode = audioCtx.createGain();
      const now = audioCtx.currentTime;
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(targetGain, now + 0.24);
      src.buffer = buf;
      src.loop = true;
      src.connect(gainNode);
      gainNode.connect(stemNodes.sourceEntry);
      src.onended = () => {
        try { src.disconnect(); gainNode.disconnect(); } catch { /* ignore */ }
      };
      src.start(now);
      liveCrowd = { source: src, gainNode };
    } catch {
      liveCrowd = null;
    }
  }

  function stopTinnitusAudio() {
    if (!liveTinnitus || !audioCtx) return;
    const prev = liveTinnitus;
    liveTinnitus = null;
    try {
      const now = audioCtx.currentTime;
      prev.gainNode.gain.cancelScheduledValues(now);
      prev.gainNode.gain.setTargetAtTime(0.0001, now, 0.05);
      prev.source.stop(now + 0.18);
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
    const targetGain = audibleTinnitusGain(state.tinnitus, samples, -20, getTinnitusCalibrationLinearBoost());

    if (liveTinnitus && liveTinnitus.sound === state.tinnitus) {
      liveTinnitus.gainNode.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.08);
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
      gainNode.gain.linearRampToValueAtTime(targetGain, now + 0.22);
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
    if (state.playing) applyStemGains(false);
  });

  function currentPlaybackPosition() {
    if (!activeRun || !audioCtx) return state.pausedOffset;
    const elapsed = Math.max(0, audioCtx.currentTime - activeRun.startedAt);
    return (activeRun.offset + elapsed) % activeRun.buffer.duration;
  }

  // Smooth equal-feel crossfade out of any outgoing song/seek source instead of an abrupt cut!
  function crossfadeOutRun(runToStop, fadeSec = 0.22) {
    if (!runToStop) return;
    if (!audioCtx || fadeSec <= 0.01) {
      try { runToStop.source.stop(); } catch { /* ignore */ }
      try { runToStop.source.disconnect(); runToStop.fadeGain?.disconnect(); } catch { /* ignore */ }
      return;
    }
    try {
      const now = audioCtx.currentTime;
      if (runToStop.fadeGain) {
        runToStop.fadeGain.gain.cancelScheduledValues(now);
        runToStop.fadeGain.gain.setValueAtTime(Math.max(0.0001, runToStop.fadeGain.gain.value), now);
        runToStop.fadeGain.gain.linearRampToValueAtTime(0.0001, now + fadeSec);
      }
      runToStop.source.onended = () => {
        try { runToStop.source.disconnect(); runToStop.fadeGain?.disconnect(); } catch { /* ignore */ }
      };
      runToStop.source.stop(now + fadeSec + 0.02);
    } catch {
      try { runToStop.source.disconnect(); runToStop.fadeGain?.disconnect(); } catch { /* ignore */ }
    }
  }

  async function loadSongBuffer(songMeta, ctx) {
    const cached = decodedSongs.get(songMeta.id);
    if (cached && cached.sampleRate === ctx.sampleRate) return cached;

    if (statusEl) statusEl.textContent = `Loading "${songMeta.title}" stems…`;
    const res = await fetch(songMeta.path);
    if (!res.ok) throw new Error(`Could not load ${songMeta.title}`);
    const arrayBuf = await res.arrayBuffer();
    const rawDecoded = await ctx.decodeAudioData(arrayBuf.slice(0));

    let stereoBuf = rawDecoded;
    if (rawDecoded.numberOfChannels < 2) {
      stereoBuf = ctx.createBuffer(2, rawDecoded.length, rawDecoded.sampleRate);
      const mono = rawDecoded.getChannelData(0);
      stereoBuf.copyToChannel(mono, 0);
      stereoBuf.copyToChannel(mono, 1);
    }
    decodedSongs.set(songMeta.id, stereoBuf);
    if (statusEl) statusEl.textContent = '';
    return stereoBuf;
  }

  function startBufferAt(buffer, requestedOffset, { fadeSec = 0.24 } = {}) {
    if (!audioCtx || !stemNodes) return;
    clearTimeout(pauseFadeTimer);
    const prevRun = activeRun;
    activeRun = null;
    if (prevRun) crossfadeOutRun(prevRun, fadeSec);

    const safeOffset = Math.max(0, Math.min(buffer.duration - 0.05, Number(requestedOffset) || 0));
    const src = audioCtx.createBufferSource();
    const fadeGain = audioCtx.createGain();
    const now = audioCtx.currentTime;
    fadeGain.gain.setValueAtTime(0.0001, now);
    fadeGain.gain.linearRampToValueAtTime(1.0, now + Math.max(0.04, fadeSec));

    src.buffer = buffer;
    src.loop = true;
    src.connect(fadeGain);
    fadeGain.connect(stemNodes.sourceEntry);
    src.start(now, safeOffset);

    activeRun = { source: src, fadeGain, buffer, offset: safeOffset, startedAt: now };
    state.duration = buffer.duration;
    state.pausedOffset = safeOffset;
    if (seekInput) {
      seekInput.disabled = false;
      seekInput.max = String(Math.floor(buffer.duration * 10) / 10);
      seekInput.value = String(safeOffset);
    }
  }

  async function startConcert({ customOffset = null } = {}) {
    pauseOthers();
    const ctx = ensureConcertAudioGraph();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const token = ++loadToken;
    state.loading = true;
    syncUi();
    onStateChange({
      type: 'select',
      effectKey: state.condition,
      tinnitus: state.tinnitus,
      playing: true,
    });

    try {
      const songMeta = currentSongMeta();
      const buffer = await loadSongBuffer(songMeta, ctx);
      if (token !== loadToken) return;
      state.loading = false;
      state.playing = true;
      const startAt = customOffset !== null
        ? customOffset
        : (state.pausedOffset < buffer.duration ? state.pausedOffset : songMeta.startOffset);
      startBufferAt(buffer, startAt, { fadeSec: 0.26 });
      applyStemGains(false);
      syncUi();
      onStateChange({
        type: 'select',
        effectKey: state.condition,
        tinnitus: state.tinnitus,
        playing: true,
      });
    } catch {
      if (token !== loadToken) return;
      state.loading = false;
      state.playing = false;
      if (statusEl) statusEl.textContent = 'Could not decode song audio in this browser.';
      syncUi();
      onStateChange({
        type: 'select',
        effectKey: state.condition,
        tinnitus: state.tinnitus,
        playing: false,
      });
    }
  }

  function stopConcert({ notify = true, immediate = false } = {}) {
    loadToken += 1;
    if (activeRun) {
      state.pausedOffset = currentPlaybackPosition();
      const outgoing = activeRun;
      activeRun = null;
      crossfadeOutRun(outgoing, immediate ? 0 : 0.2);
    }
    stopTinnitusAudio();
    stopCrowdAudio();
    stopCheerAudio();
    const wasPlaying = state.playing || state.loading;
    state.playing = false;
    state.loading = false;
    syncUi();
    if (notify && wasPlaying) {
      onStateChange({
        type: 'select',
        effectKey: state.condition,
        tinnitus: state.tinnitus,
        playing: false,
      });
      onStateChange({ type: 'energy', playing: false, bassEnergy: 0.24, trebleEnergy: 0.26 });
    }
  }

  function focus3DCameraOnStem(stemId) {
    focusCamera3D?.(stemId);
  }

  function toggleSolo(instrumentId) {
    state.soloInstrument = state.soloInstrument === instrumentId ? null : instrumentId;
    if (state.soloInstrument) {
      state.mutedIds.delete(state.soloInstrument);
      focus3DCameraOnStem(state.soloInstrument);
    } else {
      focus3DCameraOnStem('overview');
    }
    applyStemGains(false);
    syncUi();
    const instMeta = CONCERT_INSTRUMENTS.find((i) => i.id === instrumentId);
    if (instMeta) {
      onStateChange({ type: 'focusPart', focusPart: instMeta.earPart });
    }
    if (!state.playing && !state.loading) {
      void startConcert();
    }
  }

  function syncUi() {
    const snap = getConcertStageSnapshot(state.condition, state.soloInstrument, [...state.mutedIds]);
    const songMeta = currentSongMeta();
    const isInst = Boolean(songMeta.isInstrumental);

    sectionEl.dataset.concertCondition = snap.conditionId;
    sectionEl.dataset.concertPlaying = String(state.playing);
    sectionEl.dataset.concertRinging = String(state.tinnitus === 'ringing');

    if (songSelectEl && songSelectEl.value !== state.songId) {
      songSelectEl.value = state.songId;
    }
    if (songCreditEl) {
      songCreditEl.href = songMeta.creditUrl;
      songCreditEl.textContent = `${songMeta.genre} · ${songMeta.license}`;
    }

    if (playBtn) {
      playBtn.setAttribute('aria-pressed', String(state.playing));
      playBtn.textContent = state.loading
        ? 'Loading stems…'
        : (state.playing ? 'Pause 3D concert' : 'Play real song in 3D');
    }
    if (fullBandBtn) {
      fullBandBtn.hidden = !state.soloInstrument && state.mutedIds.size === 0;
    }
    if (lostBadgeEl) {
      lostBadgeEl.textContent = snap.lostHeadline;
      lostBadgeEl.dataset.severity = snap.lostCount >= 3 ? 'high' : (snap.lostCount >= 1 ? 'medium' : 'healthy');
    }

    // Song-accurate, truthful Center Lead Vocal / Presence Check
    if (vocalKickerEl) {
      vocalKickerEl.textContent = songMeta.vocalCheckKicker;
    }
    if (lyricClarityEl) {
      lyricClarityEl.textContent = isInst
        ? `Center attack clarity: ${snap.consonantRetention}%`
        : `Consonant crispness: ${snap.consonantRetention}%`;
    }
    if (vocalNoteEl) {
      vocalNoteEl.textContent = songMeta.vocalFocusNote;
    }
    if (vowelBarEl && !state.playing) {
      vowelBarEl.style.width = `${snap.vowelRetention}%`;
    }
    if (vowelPctEl) {
      vowelPctEl.textContent = `${snap.vowelRetention}%`;
    }
    if (consBarEl && !state.playing) {
      consBarEl.style.width = `${snap.consonantRetention}%`;
    }
    if (consPctEl) {
      consPctEl.textContent = `${snap.consonantRetention}%`;
    }

    if (summaryEl) {
      summaryEl.textContent = snap.summary;
    }

    for (const btn of conditionBtns) {
      btn.setAttribute('aria-pressed', String(btn.dataset.concertCondition === snap.conditionId));
    }
    if (cheerBtn) {
      cheerBtn.setAttribute('aria-pressed', String(Boolean(state.crowdCheering)));
      cheerBtn.textContent = state.crowdCheering ? 'Crowd cheering: On' : '+ Crowd cheering';
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
      const displayTitle = item.id === 'vocals' && isInst ? item.instrumentalTitle : item.title;
      const displayShort = item.id === 'vocals' && isInst ? item.instrumentalShortLabel : item.shortLabel;

      const pinObj = pinEls.get(item.id);
      if (pinObj) {
        pinObj.nameSpan.textContent = displayShort;
        pinObj.btn.dataset.ghosted = String(item.isGhosted);
        pinObj.btn.setAttribute('aria-pressed', String(item.isSoloed));
        const compactPin = typeof window !== 'undefined' && window.innerWidth <= 560;
        pinObj.pctSpan.textContent = !item.activeInMix
          ? 'Off'
          : (!compactPin && item.audibility <= 15 ? `${item.audibility}% · Lost` : `${item.audibility}%`);
      }

      const cardEl = cardEls.get(item.id);
      if (cardEl) {
        const h3 = cardEl.querySelector('h3');
        if (h3) h3.textContent = displayTitle;
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

  // --- Wire UI Controls ---
  playBtn?.addEventListener('click', () => {
    if (state.playing || state.loading) stopConcert();
    else void startConcert();
  });

  songSelectEl?.addEventListener('change', () => {
    const nextSong = getSongVocalCheckSpec(songSelectEl.value);
    state.songId = nextSong.id;
    state.pausedOffset = nextSong.startOffset;
    if (seekInput) seekInput.value = String(nextSong.startOffset);
    if (timeEl) timeEl.textContent = `${formatClock(nextSong.startOffset)} / –:––`;
    syncUi();
    if (state.playing) {
      void startConcert({ customOffset: nextSong.startOffset });
    }
  });

  seekInput?.addEventListener('input', () => {
    const targetSec = Number(seekInput.value) || 0;
    state.pausedOffset = targetSec;
    if (timeEl && state.duration > 0) {
      timeEl.textContent = `${formatClock(targetSec)} / ${formatClock(state.duration)}`;
    }
    if (state.playing && activeRun?.buffer) {
      startBufferAt(activeRun.buffer, targetSec, { fadeSec: 0.08 });
    }
  });

  fullBandBtn?.addEventListener('click', () => {
    state.soloInstrument = null;
    state.mutedIds.clear();
    focus3DCameraOnStem('overview');
    applyStemGains(false);
    syncUi();
  });

  for (const btn of conditionBtns) {
    btn.addEventListener('click', () => {
      const nextCond = normaliseConcertCondition(btn.dataset.concertCondition || 'original');
      state.condition = nextCond;
      if (nextCond === 'original' || nextCond === 'foam_plugs' || nextCond === 'musician_plugs') {
        state.tinnitus = 'off';
      }
      applyStemGains(false);
      syncUi();
      onStateChange({
        type: 'select',
        effectKey: state.condition,
        tinnitus: state.tinnitus,
        playing: state.playing,
      });
      if (!state.playing && !state.loading) {
        void startConcert();
      }
    });
  }

  cheerBtn?.addEventListener('click', () => {
    state.crowdCheering = !state.crowdCheering;
    if (state.crowdCheering) {
      cheerBurstUntil = (typeof performance !== 'undefined' ? performance.now() : 0) + 2400;
      syncCheerAudio({ swell: true });
      if (!state.playing && !state.loading) {
        void startConcert();
      }
    } else {
      stopCheerAudio();
    }
    syncUi();
  });

  ringingBtn?.addEventListener('click', () => {
    if (state.tinnitus === 'ringing' || state.tinnitus === 'hiss') {
      state.tinnitus = 'off';
      applyStemGains(false);
      syncUi();
      onStateChange({ type: 'select', effectKey: state.condition, tinnitus: 'off', playing: state.playing });
      return;
    }
    const activateTin = (chosen) => {
      if (state.condition === 'original') state.condition = 'post_gig';
      state.tinnitus = chosen;
      applyStemGains(false);
      syncUi();
      onStateChange({ type: 'select', effectKey: state.condition, tinnitus: chosen, playing: state.playing });
      if (!state.playing && !state.loading) void startConcert();
    };
    confirmRingingPlayback({
      onConfirm: () => activateTin('ringing'),
      onUseHiss: () => activateTin('hiss'),
    });
  });

  warningStopBtn?.addEventListener('click', () => {
    state.tinnitus = 'off';
    applyStemGains(false);
    syncUi();
    onStateChange({ type: 'select', effectKey: state.condition, tinnitus: 'off', playing: state.playing });
  });

  for (const inst of CONCERT_INSTRUMENTS) {
    const cardEl = cardEls.get(inst.id);
    cardEl?.querySelector('[data-stem-solo]')?.addEventListener('click', () => toggleSolo(inst.id));
    cardEl?.querySelector('[data-stem-mute]')?.addEventListener('click', () => {
      if (state.mutedIds.has(inst.id)) {
        state.mutedIds.delete(inst.id);
      } else {
        state.mutedIds.add(inst.id);
        if (state.soloInstrument === inst.id) state.soloInstrument = null;
      }
      applyStemGains(false);
      syncUi();
    });
  }

  // --- Three.js Interactive 3D Concert Arena ---
  let focusCamera3D = null;
  let disposed = false;

  if (typeof window !== 'undefined' && canvasWrap) {
    void import('./vendor/three.module.min.js')
      .then((THREE) => {
        if (disposed) return;
        let renderer;
        try {
          renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        } catch {
          canvasWrap.dataset.webgl = 'unavailable';
          return;
        }
        const isSmallMobile = window.innerWidth <= 640;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmallMobile ? 1.65 : 2));
        renderer.setClearColor(0x000000, 0);
        if ('toneMapping' in renderer && THREE.ACESFilmicToneMapping !== undefined) {
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.12;
        }
        renderer.domElement.className = 'concert-3d-canvas';
        renderer.domElement.setAttribute('aria-label', 'Interactive 3D live concert stage');
        canvasWrap.prepend(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 80);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x312e81, 0.95);
        const keyLight = new THREE.DirectionalLight(0xf8fafc, 1.25);
        keyLight.position.set(0, 8.5, 6.5);
        const backRimLight = new THREE.DirectionalLight(0x818cf8, 0.92);
        backRimLight.position.set(0, 4.5, -6.5);
        scene.add(hemiLight, keyLight, backRimLight);

        const arena = buildConcert3DScene(THREE);
        scene.add(arena.rootGroup);

        const applyArenaTheme = (mode) => {
          const dark = mode === 'dark';
          renderer.setClearColor(0x000000, 0);
          hemiLight.color.setHex(dark ? 0xc7d2fe : 0xffffff);
          hemiLight.groundColor.setHex(dark ? 0x0f172a : 0xc7d2fe);
          hemiLight.intensity = dark ? 0.88 : 1.12;
          keyLight.intensity = dark ? 1.18 : 1.32;
          if (arena.stageMaterials) {
            arena.stageMaterials.deckMat.color.setHex(dark ? 0x161a2e : 0x1e243d);
            arena.stageMaterials.crowdMat.color.setHex(dark ? 0x26314f : 0x334155);
            arena.stageMaterials.crowdMat.emissiveIntensity = dark ? 0.22 : 0.1;
            arena.stageMaterials.stageFloorGlowMat.opacity = dark ? 0.16 : 0.1;
          }
        };
        applyArenaTheme(getTheme());
        const unsubTheme = onThemeChange(applyArenaTheme);

        const overviewCam = { radius: 9.8, theta: 0, phi: 1.24, targetX: 0, targetY: 0.95, targetZ: -0.25 };
        let desiredRadius = overviewCam.radius;
        let currentRadius = overviewCam.radius;
        let desiredTheta = overviewCam.theta;
        let currentTheta = overviewCam.theta;
        let desiredPhi = overviewCam.phi;
        let currentPhi = overviewCam.phi;
        const desiredTarget = new THREE.Vector3(overviewCam.targetX, overviewCam.targetY, overviewCam.targetZ);
        const currentTarget = desiredTarget.clone();

        focusCamera3D = (stemOrMode) => {
          if (!stemOrMode || stemOrMode === 'overview') {
            desiredTarget.set(overviewCam.targetX, overviewCam.targetY, overviewCam.targetZ);
            desiredRadius = overviewCam.radius;
            desiredTheta = overviewCam.theta;
            desiredPhi = overviewCam.phi;
            return;
          }
          const st = arena.stations[stemOrMode];
          if (!st) return;
          desiredTarget.set(st.stationGroup.position.x, 1.05, st.stationGroup.position.z);
          desiredRadius = 5.4;
          desiredTheta = st.stationGroup.position.x * 0.05;
          desiredPhi = 1.28;
        };

        const dismissHint = () => {
          if (mobileHintEl && !mobileHintEl.dataset.dismissed) {
            mobileHintEl.dataset.dismissed = 'true';
          }
        };

        camZoomInBtn?.addEventListener('click', () => {
          dismissHint();
          desiredRadius = Math.max(4.0, desiredRadius * 0.82);
        });
        camZoomOutBtn?.addEventListener('click', () => {
          dismissHint();
          desiredRadius = Math.min(14.0, desiredRadius * 1.22);
        });
        camResetBtn?.addEventListener('click', () => {
          focusCamera3D('overview');
        });

        const raycaster = new THREE.Raycaster();
        const pointerNdc = new THREE.Vector2();
        const activePointers = new Map();
        let lastPinchDist = 0;
        let movedDist = 0;
        let downButton = 0;

        function hitStemAtClientPos(clientX, clientY) {
          const rect = renderer.domElement.getBoundingClientRect();
          if (!rect.width || !rect.height) return null;
          pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
          pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointerNdc, camera);
          const hits = raycaster.intersectObjects(arena.rootGroup.children, true);
          const match = hits.find((h) => h.object?.userData?.concertStem);
          return match?.object?.userData?.concertStem || null;
        }

        const onPointerDown = (e) => {
          dismissHint();
          activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (activePointers.size === 1) {
            movedDist = 0;
            downButton = e.button;
          } else if (activePointers.size === 2) {
            const pts = [...activePointers.values()];
            lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          }
          renderer.domElement.setPointerCapture?.(e.pointerId);
        };

        const onPointerMove = (e) => {
          if (activePointers.has(e.pointerId)) {
            const prev = activePointers.get(e.pointerId);
            const dx = e.clientX - prev.x;
            const dy = e.clientY - prev.y;
            activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            movedDist += Math.hypot(dx, dy);

            if (activePointers.size === 2) {
              const pts = [...activePointers.values()];
              const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
              if (lastPinchDist > 8 && dist > 8) {
                desiredRadius = Math.max(4.0, Math.min(14.0, desiredRadius * (lastPinchDist / dist)));
              }
              lastPinchDist = dist;
              return;
            }

            desiredTheta = Math.max(-1.05, Math.min(1.05, desiredTheta - dx * 0.0068));
            desiredPhi = Math.max(0.68, Math.min(1.48, desiredPhi - dy * 0.0058));
            if (hoverTooltip) hoverTooltip.hidden = true;
            return;
          }

          const stemId = hitStemAtClientPos(e.clientX, e.clientY);
          state.hoveredStem = stemId;
          renderer.domElement.style.cursor = stemId ? 'pointer' : '';
          if (hoverTooltip) {
            if (stemId) {
              const meta = CONCERT_INSTRUMENTS.find((i) => i.id === stemId);
              const songMeta = currentSongMeta();
              const label = stemId === 'vocals' && songMeta.isInstrumental ? meta.instrumentalTitle : meta?.title;
              const rect = canvasWrap.getBoundingClientRect();
              hoverTooltip.hidden = false;
              hoverTooltip.textContent = `${label || stemId} — Click to solo`;
              hoverTooltip.style.left = `${Math.min(rect.width - 180, Math.max(12, e.clientX - rect.left + 12))}px`;
              hoverTooltip.style.top = `${Math.max(12, e.clientY - rect.top - 30)}px`;
            } else {
              hoverTooltip.hidden = true;
            }
          }
        };

        const onPointerUp = (e) => {
          const isTap = activePointers.size === 1 && movedDist < 7 && downButton === 0;
          activePointers.delete(e.pointerId);
          renderer.domElement.releasePointerCapture?.(e.pointerId);
          if (isTap) {
            const stemId = hitStemAtClientPos(e.clientX, e.clientY);
            if (stemId) toggleSolo(stemId);
          }
        };

        const onWheel = (e) => {
          if (e.ctrlKey || e.metaKey || state.hoveredStem) {
            e.preventDefault();
            dismissHint();
            desiredRadius = Math.max(4.0, Math.min(14.0, desiredRadius * (e.deltaY > 0 ? 1.08 : 0.92)));
          }
        };

        renderer.domElement.addEventListener('pointerdown', onPointerDown);
        renderer.domElement.addEventListener('pointermove', onPointerMove);
        renderer.domElement.addEventListener('pointerup', onPointerUp);
        renderer.domElement.addEventListener('pointercancel', onPointerUp);
        renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

        let viewW = 900;
        let viewH = 420;
        const resize = () => {
          const r = canvasWrap.getBoundingClientRect();
          viewW = Math.max(260, r.width || 900);
          viewH = Math.max(220, r.height || 380);
          renderer.setSize(viewW, viewH, false);
          const aspect = viewW / viewH;
          camera.fov = aspect < 1.35
            ? Math.min(66, Math.round(40 / Math.pow(Math.max(0.55, aspect / 1.35), 0.56)))
            : 40;
          camera.aspect = aspect;
          camera.updateProjectionMatrix();
        };
        resize();
        const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
        ro?.observe(canvasWrap);

        let inViewport = true;
        const io = typeof IntersectionObserver === 'function'
          ? new IntersectionObserver((entries) => {
              inViewport = entries.some((en) => en.isIntersecting);
            }, { rootMargin: '160px' })
          : null;
        io?.observe(sectionEl);

        const readRms = (meterObj, gainScale = 7.2) => {
          meterObj.analyser.getFloatTimeDomainData(meterObj.timeDomain);
          let sum = 0;
          const arr = meterObj.timeDomain;
          for (let i = 0; i < arr.length; i += 2) sum += arr[i] * arr[i];
          return Math.min(1, Math.sqrt(sum / (arr.length / 2)) * gainScale);
        };

        const clock = new THREE.Clock();
        const projVec = new THREE.Vector3();
        let rafId = 0;

        function renderLoop() {
          if (disposed) return;
          rafId = requestAnimationFrame(renderLoop);
          if (!inViewport && !state.playing) return;

          const t = clock.getElapsedTime();
          const snap = getConcertStageSnapshot(state.condition, state.soloInstrument, [...state.mutedIds]);

          if (state.playing && stemNodes) {
            let bassOut = 0;
            let trebleOut = 0;
            for (const inst of CONCERT_INSTRUMENTS) {
              const ch = stemNodes.chains[inst.id];
              if (!ch) continue;
              const normEnergy = readRms(ch, 6.8);
              stemEnergies[inst.id] = stemEnergies[inst.id] * 0.7 + normEnergy * 0.3;
              if (inst.id === 'bass' || inst.id === 'keys') bassOut = Math.max(bassOut, stemEnergies[inst.id]);
              else trebleOut = Math.max(trebleOut, stemEnergies[inst.id]);
            }

            // Live real-audio Vowel Body vs Consonant/Sibilant meters!
            const rawVow = readRms(stemNodes.vowelMeter, 9.5);
            const rawCons = readRms(stemNodes.consonantMeter, 14.0);
            liveVowelRms = liveVowelRms * 0.72 + rawVow * 0.28;
            liveConsonantRms = liveConsonantRms * 0.72 + rawCons * 0.28;

            const vocalActive = snap.instruments.find((i) => i.id === 'vocals')?.activeInMix ?? true;
            if (vowelBarEl) {
              const vWidth = vocalActive
                ? Math.min(100, Math.round(snap.vowelRetention * (0.38 + liveVowelRms * 0.78)))
                : 0;
              vowelBarEl.style.width = `${vWidth}%`;
            }
            if (consBarEl) {
              const cWidth = vocalActive
                ? Math.min(100, Math.round(snap.consonantRetention * (0.35 + liveConsonantRms * 0.85)))
                : 0;
              consBarEl.style.width = `${cWidth}%`;
            }

            const posSec = currentPlaybackPosition();
            if (seekInput && document.activeElement !== seekInput) {
              seekInput.value = posSec.toFixed(1);
            }
            if (timeEl && state.duration > 0) {
              timeEl.textContent = `${formatClock(posSec)} / ${formatClock(state.duration)}`;
            }

            onStateChange({ type: 'energy', playing: true, bassEnergy: bassOut, trebleEnergy: trebleOut });
          } else {
            for (const k of Object.keys(stemEnergies)) stemEnergies[k] *= 0.9;
            liveVowelRms *= 0.88;
            liveConsonantRms *= 0.88;
          }

          if (!inViewport) return;

          currentTarget.lerp(desiredTarget, 0.075);
          currentRadius += (desiredRadius - currentRadius) * 0.075;
          const idleSway = activePointers.size === 0 && !state.soloInstrument ? Math.sin(t * 0.32) * 0.045 : 0;
          currentTheta += ((desiredTheta + idleSway) - currentTheta) * 0.07;
          currentPhi += (desiredPhi - currentPhi) * 0.07;

          const sinPhi = Math.sin(currentPhi);
          camera.position.set(
            currentTarget.x + currentRadius * sinPhi * Math.sin(currentTheta),
            currentTarget.y + currentRadius * Math.cos(currentPhi),
            currentTarget.z + currentRadius * sinPhi * Math.cos(currentTheta),
          );
          camera.lookAt(currentTarget);
          camera.updateMatrixWorld();

          for (const [stemIdx, item] of snap.instruments.entries()) {
            const st = arena.stations[item.id];
            if (!st) continue;
            const e = stemEnergies[item.id] || 0;
            const audFrac = item.effectiveAudibility / 100;
            const hovered = state.hoveredStem === item.id;

            const targetConeOp = item.activeInMix
              ? (0.03 + audFrac * 0.24 + e * 0.16 + (hovered || item.isSoloed ? 0.1 : 0))
              : 0.015;
            st.spotConeMat.opacity += (targetConeOp - st.spotConeMat.opacity) * 0.09;
            st.floorRingMat.opacity += (Math.min(1, 0.12 + audFrac * 0.65 + e * 0.35) - st.floorRingMat.opacity) * 0.12;
            st.floorRing.scale.setScalar(1 + e * 0.16);

            const bodyOpacity = !item.activeInMix ? 0.22 : Math.max(0.18, 0.2 + audFrac * 0.8);
            st.mats.bodyMat.opacity += (bodyOpacity - st.mats.bodyMat.opacity) * 0.09;
            st.mats.instMat.opacity += (bodyOpacity - st.mats.instMat.opacity) * 0.09;
            const targetEmissive = hovered || item.isSoloed ? 0.72 : (0.08 + audFrac * 0.35 + e * 0.55);
            st.mats.instMat.emissiveIntensity += (targetEmissive - st.mats.instMat.emissiveIntensity) * 0.12;

            st.figure.position.y = e * 0.09;
            st.figure.rotation.z = Math.sin(t * 4.5 + st.stationGroup.position.x) * 0.05 * audFrac * (state.playing ? 1 : 0.2);

            if (st.animatedParts.kickHead) {
              st.animatedParts.kickHead.scale.setScalar(1 + e * 0.22);
            }
            if (st.animatedParts.vowelRing && st.animatedParts.consonantRing) {
              st.animatedParts.vowelRing.lookAt(camera.position);
              st.animatedParts.consonantRing.lookAt(camera.position);
              const vScale = 0.9 + (state.playing ? liveVowelRms : e) * 0.48;
              const consFrac = snap.consonantRetention / 100;
              const cScale = 0.94 + (state.playing ? liveConsonantRms : e) * 0.6 * consFrac;
              st.animatedParts.vowelRing.scale.setScalar(vScale);
              st.animatedParts.vowelRing.material.opacity = item.activeInMix ? Math.min(0.92, 0.22 + liveVowelRms * 0.78) : 0.05;
              st.animatedParts.consonantRing.scale.setScalar(cScale);
              st.animatedParts.consonantRing.material.opacity = item.activeInMix ? consFrac * (0.24 + liveConsonantRms * 0.76) : 0.02;
            }
            if (st.animatedParts.snareDrum) {
              st.animatedParts.snareDrum.scale.set(1 + e * 0.12, 1, 1 + e * 0.12);
            }
            if (st.animatedParts.crashDisc) {
              st.animatedParts.crashDisc.rotation.x = 0.26 + Math.sin(t * 16) * e * 0.22;
              st.animatedParts.rideDisc.rotation.x = 0.22 - Math.cos(t * 14) * e * 0.18;
              st.animatedParts.hiHatTop.position.y = 1.06 + e * 0.05;
            }

            const pinObj = pinEls.get(item.id);
            if (pinObj) {
              projVec.copy(st.labelAnchor).project(camera);
              const inFront = projVec.z > -1 && projVec.z < 1;
              const px = Math.max(32, Math.min(viewW - 32, (projVec.x * 0.5 + 0.5) * viewW));
              const mobileStaggerY = viewW < 640 ? (stemIdx % 2 === 1 ? -19 : 5) : 0;
              const minTopY = px > viewW - 155 ? 48 : 22;
              const py = Math.max(minTopY, Math.min(viewH - 34, (-projVec.y * 0.5 + 0.5) * viewH + mobileStaggerY));
              pinObj.btn.style.opacity = inFront ? '1' : '0';
              pinObj.btn.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, -50%)`;
            }
          }

          const bassBeat = stemEnergies.bass || 0;
          const burstActive = typeof performance !== 'undefined' && performance.now() < cheerBurstUntil;
          const cheerDrive = state.crowdCheering
            ? (state.playing ? 0.82 + bassBeat * 0.35 : 0.42) + (burstActive ? 0.38 : 0)
            : 0;

          for (const person of arena.crowdSilhouettes) {
            const ph = person.userData.phase || 0;
            const enth = person.userData.enthusiasm || 1;
            const bounce = state.crowdCheering
              ? Math.abs(Math.sin(t * 4.4 + ph)) * (0.04 + bassBeat * 0.14 + (burstActive ? 0.06 : 0))
              : Math.abs(Math.sin(t * 3.2 + ph)) * bassBeat * 0.07;
            person.position.y = person.userData.baseY + bounce;

            if (person.userData.leftArm && person.userData.rightArm) {
              const targetRaise = cheerDrive > 0
                ? Math.min(1, cheerDrive * enth)
                : 0;
              // Resting arms down (~2.55 rad) vs raised cheering & waving toward stage (~0.35 rad)
              const waveL = Math.sin(t * 6.2 + ph) * 0.28 * targetRaise;
              const waveR = Math.cos(t * 5.8 + ph * 1.3) * 0.28 * targetRaise;
              const goalL = (1 - targetRaise) * 2.55 + targetRaise * (0.34 + waveL);
              const goalR = -((1 - targetRaise) * 2.55 + targetRaise * (0.34 + waveR));
              person.userData.leftArm.rotation.z += (goalL - person.userData.leftArm.rotation.z) * 0.14;
              person.userData.rightArm.rotation.z += (goalR - person.userData.rightArm.rotation.z) * 0.14;
            }
          }

          const showRing = state.tinnitus === 'ringing';
          const targetRingOp = showRing ? 0.65 + 0.2 * Math.sin(t * 8) : 0;
          arena.ringingHaloMat.opacity += (targetRingOp - arena.ringingHaloMat.opacity) * 0.1;
          if (showRing) {
            arena.ringingHalo.scale.setScalar(1 + 0.03 * Math.sin(t * 6));
          }

          renderer.render(scene, camera);
        }
        rafId = requestAnimationFrame(renderLoop);

        sectionEl._disposeConcert3D = () => {
          cancelAnimationFrame(rafId);
          unsubTheme?.();
          ro?.disconnect();
          io?.disconnect();
          renderer.dispose();
        };
      })
      .catch(() => {
        if (canvasWrap) canvasWrap.dataset.webgl = 'unavailable';
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
    if (patch.crowdPercent !== undefined) {
      const nextCrowd = Math.max(0, Math.min(100, Number(patch.crowdPercent) || 0));
      if (nextCrowd !== state.crowdPercent) {
        state.crowdPercent = nextCrowd;
        changed = true;
      }
    }
    if (changed) {
      applyStemGains(false);
      syncUi();
    }
  };
  stopFn.play = (patch = {}) => {
    stopFn.setState(patch);
    if (!state.playing && !state.loading) {
      void startConcert();
    } else {
      onStateChange({
        type: 'select',
        effectKey: state.condition,
        tinnitus: state.tinnitus,
        playing: true,
      });
    }
  };
  stopFn.toggle = (patch = {}) => {
    if (state.playing || state.loading) {
      stopConcert({ notify: true });
    } else {
      stopFn.play(patch);
    }
  };
  stopFn.setCrowdPercent = (pct) => {
    stopFn.setState({ crowdPercent: pct });
  };
  stopFn.isPlaying = () => Boolean(state.playing || state.loading);
  return stopFn;
}
