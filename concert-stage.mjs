// Interactive 3D Live Concert Stage + Real Royalty-Free Song 5-Stem Separator
// Decomposes cleared CC BY / Public Domain songs in real time using Mid/Side spatial separation
// + complementary linear-phase FIR convolution kernels (exact bit-accurate sum at 0 dB!),
// driving a Three.js 3D concert stage with raycast soloing and mobile-first controls.

import { buildConcert3DScene } from './concert-3d-scene.mjs?v=8660164ccc';
import { createBandKernels } from './freq-band-audio.mjs?v=8660164ccc';
import {
  createCalibrationStage,
  getTinnitusCalibrationLinearBoost,
  onCalibrationChange,
} from './output-calibration.mjs?v=8660164ccc';
import { getTheme, onThemeChange } from './theme.mjs?v=8660164ccc';
import { confirmRingingPlayback } from './tinnitus-warning.mjs?v=8660164ccc';
import { audibleTinnitusGain, tinnitusLoop } from './upload-tinnitus.mjs?v=8660164ccc';

export const CONCERT_SONGS = Object.freeze([
  {
    id: 'let-it-in',
    title: 'Let It In',
    artist: 'Josh Woodward',
    genre: 'Upbeat Indie Folk-Rock (Vocals & Full Band)',
    license: 'CC BY 4.0',
    creditUrl: 'https://freemusicarchive.org/music/Josh_Woodward/Ashes/JoshWoodward-Ashes-01-LetItIn/',
    path: './demo/music/let-it-in/reference.m4a',
    startOffset: 14,
  },
  {
    id: 'i-just-wanna',
    title: 'I Just Wanna',
    artist: 'mykleanthony',
    genre: 'Soul-Pop Groove (Vocals, Keys & Hi-Hats)',
    license: 'CC BY 3.0',
    creditUrl: 'https://ccmixter.org/files/mykleanthony/71247',
    path: './demo/music/i-just-wanna/reference.m4a',
    startOffset: 14,
  },
  {
    id: 'gravity',
    title: 'Gravity',
    artist: 'Josh Woodward',
    genre: 'Indie Rock Band (Vocals, Guitars & Drums)',
    license: 'CC BY 4.0',
    creditUrl: 'https://freemusicarchive.org/music/Josh_Woodward/Dirty_Wings/JoshWoodward-DW-04-Gravity/',
    path: './demo/music/gravity/reference.m4a',
    startOffset: 18,
  },
  {
    id: 'in-peace',
    title: 'In Peace',
    artist: 'Madam Snowflake',
    genre: 'Electronic Pop (Female Vocals & Shimmer)',
    license: 'CC BY 3.0',
    creditUrl: 'https://ccmixter.org/files/snowflake/33628',
    path: './demo/music/in-peace/reference.m4a',
    startOffset: 12,
  },
  {
    id: 'boogie-party',
    title: 'Boogie Party',
    artist: 'Kevin MacLeod',
    genre: 'Live Blues-Rock Band (Guitar, Piano & Drums)',
    license: 'CC BY 4.0',
    creditUrl: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN2200002',
    path: './demo/music/boogie-party/reference.m4a',
    startOffset: 12,
  },
  {
    id: 'its-your-birthday',
    title: 'It’s Your Birthday',
    artist: 'Kyla',
    genre: 'Pop Band (Female Vocals)',
    license: 'CC BY 3.0',
    creditUrl: 'https://freemusicarchive.org/music/Kyla/The_New_Birthday_Song_Contest/Its_Your_Birthday/',
    path: './demo/music/its-your-birthday/reference.m4a',
    startOffset: 0,
  },
]);

// 5 Telescoping Linear-Phase FIR Bands used with Mid/Side stereo decomposition:
//   k0: 0–220 Hz        -> Bass & Kick Drum (L, R)
//   k1: 220–2400 Hz     -> Side = Stereo Rhythm/Keys; Mid = Lead Vocal Body
//   k2: 2400–4200 Hz    -> Mid = Lead Vocal Consonants; Side = Lead Guitar Presence
//   k3: 4200–6200 Hz    -> Lead Guitar Bite & Snare Wire Crack (L, R)
//   k4: 6200 Hz–Nyquist -> Hi-Hats, Cymbals & Air (L, R)
// Exact identity: Bass + Keys + Vocals + Guitar + Cymbals === Delayed Original Stereo Song!
export const CONCERT_STEM_FIR_BANDS = Object.freeze([
  { id: 'sub_bass', maxHz: 220 },
  { id: 'warm_body', maxHz: 2400 },
  { id: 'vocal_cons', maxHz: 4200 },
  { id: 'guitar_bite', maxHz: 6200 },
  { id: 'cymbal_air', maxHz: Infinity },
]);

export const CONCERT_INSTRUMENTS = Object.freeze([
  {
    id: 'keys',
    title: 'Rhythm Chords & Keys',
    shortLabel: 'Keys',
    bandLabel: 'Stereo Side · 220 Hz–2.4 kHz',
    accent: '#60a5fa',
    earPart: 'cochlea',
  },
  {
    id: 'bass',
    title: 'Bass & Kick Drum',
    shortLabel: 'Bass',
    bandLabel: 'Low Foundation · 20–220 Hz',
    accent: '#10b981',
    earPart: 'eardrum',
  },
  {
    id: 'vocals',
    title: 'Center Lead Vocals',
    shortLabel: 'Vocals',
    bandLabel: 'Center Mid · 220 Hz–4.2 kHz',
    accent: '#f472b6',
    earPart: 'nerve',
  },
  {
    id: 'guitar',
    title: 'Guitar Bite & Snare',
    shortLabel: 'Guitar',
    bandLabel: '4 kHz Zone · 2.4–6.2 kHz',
    accent: '#f59e0b',
    earPart: 'cochlea',
  },
  {
    id: 'cymbals',
    title: 'Hi-Hats & Cymbals',
    shortLabel: 'Cymbals',
    bandLabel: 'High Shimmer · 6.2–20 kHz',
    accent: '#a78bfa',
    earPart: 'cochlea',
  },
]);

export const CONCERT_CONDITIONS = Object.freeze({
  original: {
    id: 'original',
    label: 'Healthy ears',
    lostHeadline: 'All 5 song stems clear & balanced',
    summary: 'Every 3D spotlight shines — the real song’s kick drum, stereo rhythm chords, center lead vocals, guitar bite, and hi-hat shimmer sum together intact.',
    lyricHtml: '“<strong>St</strong>ay <strong>cl</strong>o<strong>s</strong>e <strong>t</strong>ill the hou<strong>s</strong>e ligh<strong>ts</strong> <strong>c</strong>ome up <strong>t</strong>onigh<strong>t</strong>”',
    lyricClarity: 100,
    stems: {
      bass: { audibility: 100, gain: 1.0, status: 'Full punch', lost: false },
      keys: { audibility: 100, gain: 1.0, status: 'Warm & wide', lost: false },
      vocals: { audibility: 100, vowelGain: 1.0, consonantGain: 1.0, status: 'Crisp vocals', lost: false },
      guitar: { audibility: 100, gain: 1.0, status: 'Sharp riff & snare', lost: false },
      cymbals: { audibility: 100, gain: 1.0, status: 'Bright shimmer', lost: false },
    },
  },
  post_gig: {
    id: 'post_gig',
    label: 'Post-gig muffled',
    lostHeadline: '2 stems fading · Vocal diction blurring',
    summary: 'Temporary “hearing hangover”: kick & bass still pound at 98%, while hi-hat shimmer and sharp 2.4–4.2 kHz vocal consonants dim into stage haze.',
    lyricHtml: '“<span class="lyric-lost">··</span>ay <span class="lyric-lost">·</span>lo<span class="lyric-lost">··</span> <span class="lyric-lost">·</span>ill the hou<span class="lyric-lost">··</span> ligh<span class="lyric-lost">··</span> come up <span class="lyric-lost">·</span>onigh<span class="lyric-lost">·</span>”',
    lyricClarity: 54,
    stems: {
      bass: { audibility: 98, gain: 0.98, status: 'Still booming', lost: false },
      keys: { audibility: 82, gain: 0.82, status: 'Warmth stays', lost: false },
      vocals: { audibility: 54, vowelGain: 0.9, consonantGain: 0.2, status: 'Consonants dulled', lost: false },
      guitar: { audibility: 34, gain: 0.28, status: 'Bite muffled', lost: true },
      cymbals: { audibility: 18, gain: 0.14, status: 'Sparkle faded', lost: true },
    },
  },
  permanent_notch: {
    id: 'permanent_notch',
    label: '4 kHz noise notch',
    lostHeadline: 'Guitar bite, snare & consonants lost in mix',
    summary: 'Ear-canal resonance concentrates concert wear near 4 kHz — guitar pick attack, snare crack, and vocal s/t consonants drop out of the song while bass booms untouched.',
    lyricHtml: '“<span class="lyric-lost">··</span>ay <span class="lyric-lost">··</span>o<span class="lyric-lost">··</span> <span class="lyric-lost">·</span>i<span class="lyric-lost">··</span> the hou<span class="lyric-lost">··</span> <span class="lyric-lost">·</span>igh<span class="lyric-lost">··</span> <span class="lyric-lost">·</span>ome up <span class="lyric-lost">·</span>o<span class="lyric-lost">·</span>igh<span class="lyric-lost">·</span>”',
    lyricClarity: 42,
    stems: {
      bass: { audibility: 98, gain: 0.98, status: 'Untouched bass', lost: false },
      keys: { audibility: 84, gain: 0.84, status: 'Low chords intact', lost: false },
      vocals: { audibility: 42, vowelGain: 0.86, consonantGain: 0.06, status: 'Words blur together', lost: true },
      guitar: { audibility: 12, gain: 0.06, status: 'Lost in 4 kHz notch', lost: true },
      cymbals: { audibility: 28, gain: 0.24, status: 'Thin distant tick', lost: true },
    },
  },
  severe_hf: {
    id: 'severe_hf',
    label: 'Strong treble loss',
    lostHeadline: 'Right half of the 3D stage vanishes',
    summary: 'Cymbals (2%) and guitar bite (5%) go dark in 3D space, and vocals collapse into muffled vowel hum while heavy bass dominates the room.',
    lyricHtml: '“<span class="lyric-lost">··</span>a<span class="lyric-lost">·</span> <span class="lyric-lost">··</span>o<span class="lyric-lost">··</span> <span class="lyric-lost">·</span>i<span class="lyric-lost">··</span> <span class="lyric-lost">··</span>e <span class="lyric-lost">·</span>ou<span class="lyric-lost">··</span> <span class="lyric-lost">·</span>i<span class="lyric-lost">····</span> <span class="lyric-lost">·</span>o<span class="lyric-lost">·</span>e u<span class="lyric-lost">·</span> <span class="lyric-lost">·</span>o<span class="lyric-lost">·</span>i<span class="lyric-lost">···</span>”',
    lyricClarity: 24,
    stems: {
      bass: { audibility: 96, gain: 0.96, status: 'Dominates room', lost: false },
      keys: { audibility: 56, gain: 0.52, status: 'Low hum only', lost: false },
      vocals: { audibility: 24, vowelGain: 0.56, consonantGain: 0.01, status: 'Mumbled vowels', lost: true },
      guitar: { audibility: 5, gain: 0.02, status: 'Vanished', lost: true },
      cymbals: { audibility: 2, gain: 0.006, status: 'Gone completely', lost: true },
    },
  },
  foam_plugs: {
    id: 'foam_plugs',
    label: 'Foam earplugs',
    lostHeadline: 'Protected, but treble dumped unevenly',
    summary: 'Dense foam blocks cymbals (14%) and guitar bite (24%) far more than heavy bass (82%), making live songs sound underwater — so gig-goers pull them out.',
    lyricHtml: '“<span class="lyric-lost">··</span>ay clo<span class="lyric-lost">··</span> <span class="lyric-lost">·</span>ill the hou<span class="lyric-lost">··</span> ligh<span class="lyric-lost">··</span>…”',
    lyricClarity: 38,
    stems: {
      bass: { audibility: 82, gain: 0.78, status: 'Bass leaks through', lost: false },
      keys: { audibility: 55, gain: 0.46, status: 'Boxy & woolly', lost: false },
      vocals: { audibility: 38, vowelGain: 0.48, consonantGain: 0.1, status: 'Underwater vocals', lost: true },
      guitar: { audibility: 24, gain: 0.14, status: 'Attack dulled', lost: true },
      cymbals: { audibility: 14, gain: 0.06, status: 'Cymbals killed', lost: true },
    },
  },
  musician_plugs: {
    id: 'musician_plugs',
    label: 'Musicians’ −15 dB',
    lostHeadline: 'Safe −15 dB · All 5 stems stay clear',
    summary: 'Tuned acoustic filters lower all 5 stems evenly to a comfortable level — keeping 100% of the singer, guitar solo, and cymbal sparkle with zero hangover.',
    lyricHtml: '“<strong>St</strong>ay <strong>cl</strong>o<strong>s</strong>e <strong>t</strong>ill the hou<strong>s</strong>e ligh<strong>ts</strong> <strong>c</strong>ome up <strong>t</strong>onigh<strong>t</strong>”',
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
    lyricHtml: cond.lyricHtml,
    lyricClarity: cond.lyricClarity,
    lostCount,
    instruments,
  };
}

// Pure mathematical helper used by tests & audio verification:
// Proves that Mid/Side + telescoping FIR kernels (k0..k4) sum identically to the delayed stereo input!
export function createConcertStemKernels(sampleRate = 44100) {
  const { center, kernels } = createBandKernels(sampleRate, CONCERT_STEM_FIR_BANDS);
  const [k0, k1, k2, k3, k4] = kernels;
  return { center, k0, k1, k2, k3, k4 };
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
  const lyricTextEl = sectionEl.querySelector('#concert-lyric-text');
  const lyricClarityEl = sectionEl.querySelector('#concert-lyric-clarity');
  const summaryEl = sectionEl.querySelector('#concert-stage-summary');
  const conditionBtns = [...sectionEl.querySelectorAll('[data-concert-condition]')];
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
      pinEls.set(inst.id, { btn, pctSpan });
    }
  }

  // Populate Song Select if present
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
    soloInstrument: null,
    mutedIds: new Set(),
    hoveredStem: null,
    duration: 0,
    pausedOffset: CONCERT_SONGS[0].startOffset,
  };

  const stemEnergies = { keys: 0, bass: 0, vocals: 0, guitar: 0, cymbals: 0 };

  let audioCtx = null;
  let masterOut = null;
  let calibrationStage = null;
  let tinnitusBus = null;
  let liveTinnitus = null;
  let graphBuiltRate = 0;
  let stemNodes = null;
  let activeRun = null;
  let loadToken = 0;
  const decodedSongs = new Map();
  const loopCache = new Map();

  function currentSongMeta() {
    return CONCERT_SONGS.find((s) => s.id === state.songId) ?? CONCERT_SONGS[0];
  }

  function makeImpulseBuffer(ctx, kernel) {
    const buf = ctx.createBuffer(1, kernel.length, ctx.sampleRate);
    buf.copyToChannel(kernel, 0);
    return buf;
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

    const { k0, k1, k2, k3, k4 } = createConcertStemKernels(audioCtx.sampleRate);

    // Stereo input bus + exact Mid/Side decomposition:
    //   Mid   = 0.5*(L + R)
    //   SideL = 0.5*(L - R), SideR = 0.5*(R - L)
    const sourceEntry = audioCtx.createGain();
    const splitter = audioCtx.createChannelSplitter(2);
    sourceEntry.connect(splitter);

    const midBus = audioCtx.createGain();
    const lToMid = audioCtx.createGain();
    lToMid.gain.value = 0.5;
    const rToMid = audioCtx.createGain();
    rToMid.gain.value = 0.5;
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
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.68;
      const timeDomain = new Float32Array(analyser.fftSize);
      condGain.connect(soloGain);
      soloGain.connect(analyser);
      analyser.connect(calibrationStage.input);
      return { condGain, soloGain, analyser, timeDomain };
    };

    // 1. Bass & Kick (Stereo 20–220 Hz)
    const convBass = makeConv(k0);
    const bassChain = makeStemChain();
    sourceEntry.connect(convBass);
    convBass.connect(bassChain.condGain);

    // 2. Stereo Rhythm Chords & Keys (Side 220–2400 Hz)
    const convKeys = makeConv(k1);
    const keysChain = makeStemChain();
    sideBus.connect(convKeys);
    convKeys.connect(keysChain.condGain);

    // 3. Center Lead Vocals (Mid 220–2400 Hz Vowel Body + Mid 2400–4200 Hz Lyric Consonants)
    const convVocalBody = makeConv(k1);
    const convVocalCons = makeConv(k2);
    const vocalVowelGain = audioCtx.createGain();
    const vocalConsonantGain = audioCtx.createGain();
    const vocalsChain = makeStemChain();
    midBus.connect(convVocalBody);
    convVocalBody.connect(vocalVowelGain);
    vocalVowelGain.connect(vocalsChain.condGain);
    midBus.connect(convVocalCons);
    convVocalCons.connect(vocalConsonantGain);
    vocalConsonantGain.connect(vocalsChain.condGain);

    // 4. Guitar Bite & Snare Crack (Side 2400–4200 Hz + Stereo 4200–6200 Hz)
    const convGuitarSide = makeConv(k2);
    const convGuitarUpper = makeConv(k3);
    const guitarChain = makeStemChain();
    sideBus.connect(convGuitarSide);
    convGuitarSide.connect(guitarChain.condGain);
    sourceEntry.connect(convGuitarUpper);
    convGuitarUpper.connect(guitarChain.condGain);

    // 5. Hi-Hats, Cymbals & Air (Stereo 6200–20000 Hz)
    const convCymbals = makeConv(k4);
    const cymbalsChain = makeStemChain();
    sourceEntry.connect(convCymbals);
    convCymbals.connect(cymbalsChain.condGain);

    stemNodes = {
      sourceEntry,
      vocalVowelGain,
      vocalConsonantGain,
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

  function applyStemGains(immediate = false) {
    if (!audioCtx || !stemNodes) return;
    const now = audioCtx.currentTime;
    const tau = immediate ? 0.004 : 0.025;
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
    const targetGain = audibleTinnitusGain(state.tinnitus, samples, -20, getTinnitusCalibrationLinearBoost());

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
    if (state.playing) applyStemGains(false);
  });

  function currentPlaybackPosition() {
    if (!activeRun || !audioCtx) return state.pausedOffset;
    const elapsed = Math.max(0, audioCtx.currentTime - activeRun.startedAt);
    return (activeRun.offset + elapsed) % activeRun.buffer.duration;
  }

  function releaseActiveSource() {
    if (!activeRun) return;
    const prev = activeRun;
    activeRun = null;
    try {
      prev.source.stop();
    } catch { /* ignore */ }
    try {
      prev.source.disconnect();
    } catch { /* ignore */ }
  }

  async function loadSongBuffer(songMeta, ctx) {
    const cached = decodedSongs.get(songMeta.id);
    if (cached && cached.sampleRate === ctx.sampleRate) return cached;

    if (statusEl) statusEl.textContent = `Loading "${songMeta.title}" stems…`;
    const res = await fetch(songMeta.path);
    if (!res.ok) throw new Error(`Could not load ${songMeta.title}`);
    const arrayBuf = await res.arrayBuffer();
    const rawDecoded = await ctx.decodeAudioData(arrayBuf.slice(0));

    // Ensure 2-channel stereo buffer so Mid/Side stem decomposition is always balanced
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

  function startBufferAt(buffer, requestedOffset) {
    if (!audioCtx || !stemNodes) return;
    releaseActiveSource();
    const safeOffset = Math.max(0, Math.min(buffer.duration - 0.05, Number(requestedOffset) || 0));
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(stemNodes.sourceEntry);
    const startedAt = audioCtx.currentTime;
    src.start(startedAt, safeOffset);
    activeRun = { source: src, buffer, offset: safeOffset, startedAt };
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

    try {
      const songMeta = currentSongMeta();
      const buffer = await loadSongBuffer(songMeta, ctx);
      if (token !== loadToken) return;
      state.loading = false;
      state.playing = true;
      const startAt = customOffset !== null
        ? customOffset
        : (state.pausedOffset < buffer.duration ? state.pausedOffset : songMeta.startOffset);
      startBufferAt(buffer, startAt);
      applyStemGains(true);
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
    }
  }

  function stopConcert({ notify = true } = {}) {
    loadToken += 1;
    if (activeRun) {
      state.pausedOffset = currentPlaybackPosition();
    }
    releaseActiveSource();
    stopTinnitusAudio();
    const wasPlaying = state.playing || state.loading;
    state.playing = false;
    state.loading = false;
    for (const k of Object.keys(stemEnergies)) stemEnergies[k] = 0;
    syncUi();
    if (notify && wasPlaying) {
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
    if (lyricTextEl) {
      lyricTextEl.innerHTML = snap.lyricHtml;
    }
    if (lyricClarityEl) {
      lyricClarityEl.textContent = `Vocal diction: ${snap.lyricClarity}%`;
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
      const pinObj = pinEls.get(item.id);
      if (pinObj) {
        pinObj.btn.dataset.ghosted = String(item.isGhosted);
        pinObj.btn.setAttribute('aria-pressed', String(item.isSoloed));
        pinObj.pctSpan.textContent = !item.activeInMix
          ? 'Muted'
          : (item.audibility <= 15 ? `${item.audibility}% · Lost` : `${item.audibility}%`);
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

  // --- Wire UI Controls ---
  playBtn?.addEventListener('click', () => {
    if (state.playing || state.loading) stopConcert();
    else void startConcert();
  });

  songSelectEl?.addEventListener('change', () => {
    const nextSong = CONCERT_SONGS.find((s) => s.id === songSelectEl.value) ?? CONCERT_SONGS[0];
    state.songId = nextSong.id;
    state.pausedOffset = nextSong.startOffset;
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
      startBufferAt(activeRun.buffer, targetSec);
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
          renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        } catch {
          canvasWrap.dataset.webgl = 'unavailable';
          return;
        }
        const isSmallMobile = window.innerWidth <= 640;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmallMobile ? 1.65 : 2));
        renderer.setClearColor(0x090c1a, 1);
        if ('toneMapping' in renderer && THREE.ACESFilmicToneMapping !== undefined) {
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.12;
        }
        renderer.domElement.className = 'concert-3d-canvas';
        renderer.domElement.setAttribute('aria-label', 'Interactive 3D live concert stage');
        canvasWrap.prepend(renderer.domElement);

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x090c1a, 0.036);
        const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 80);

        const hemiLight = new THREE.HemisphereLight(0xc7d2fe, 0x0f172a, 0.85);
        const keyLight = new THREE.DirectionalLight(0xf8fafc, 1.15);
        keyLight.position.set(0, 8.5, 6.5);
        const backRimLight = new THREE.DirectionalLight(0x818cf8, 0.85);
        backRimLight.position.set(0, 4.5, -6.5);
        scene.add(hemiLight, keyLight, backRimLight);

        const applyArenaTheme = (mode) => {
          const dark = mode === 'dark';
          const bgHex = dark ? 0x070a15 : 0x0b1022;
          renderer.setClearColor(bgHex, 1);
          scene.fog.color.setHex(bgHex);
        };
        applyArenaTheme(getTheme());
        const unsubTheme = onThemeChange(applyArenaTheme);

        const arena = buildConcert3DScene(THREE);
        scene.add(arena.rootGroup);

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

        // 3D Touch Orbit, Pinch Zoom & Raycast Tap-to-Solo!
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
              const rect = canvasWrap.getBoundingClientRect();
              hoverTooltip.hidden = false;
              hoverTooltip.textContent = `${meta?.title || stemId} — Click to solo`;
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
          // Widen vertical FOV on narrow mobile portrait screens so all 5 3D musicians fit comfortably!
          camera.fov = aspect < 1.35
            ? Math.min(66, Math.round(40 / Math.pow(Math.max(0.55, aspect / 1.35), 0.56)))
            : 40;
          camera.aspect = aspect;
          camera.updateProjectionMatrix();
        };
        resize();
        const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
        ro?.observe(canvasWrap);

        // Pause WebGL rendering when scrolled completely out of the viewport for battery/mobile smoothness
        let inViewport = true;
        const io = typeof IntersectionObserver === 'function'
          ? new IntersectionObserver((entries) => {
              inViewport = entries.some((en) => en.isIntersecting);
            }, { rootMargin: '160px' })
          : null;
        io?.observe(sectionEl);

        const clock = new THREE.Clock();
        const projVec = new THREE.Vector3();
        let rafId = 0;

        function renderLoop() {
          if (disposed) return;
          rafId = requestAnimationFrame(renderLoop);
          if (!inViewport && !state.playing) return;

          const t = clock.getElapsedTime();
          const snap = getConcertStageSnapshot(state.condition, state.soloInstrument, [...state.mutedIds]);

          // Measure real-time RMS energy per separated stem of the playing royalty-free song!
          if (state.playing && stemNodes) {
            let bassOut = 0;
            let trebleOut = 0;
            for (const inst of CONCERT_INSTRUMENTS) {
              const ch = stemNodes.chains[inst.id];
              if (!ch) continue;
              ch.analyser.getFloatTimeDomainData(ch.timeDomain);
              let sumSq = 0;
              for (let i = 0; i < ch.timeDomain.length; i += 2) {
                const v = ch.timeDomain[i];
                sumSq += v * v;
              }
              const rms = Math.sqrt(sumSq / (ch.timeDomain.length / 2));
              const normEnergy = Math.min(1, rms * 6.8);
              stemEnergies[inst.id] = stemEnergies[inst.id] * 0.62 + normEnergy * 0.38;
              if (inst.id === 'bass' || inst.id === 'keys') bassOut = Math.max(bassOut, stemEnergies[inst.id]);
              else trebleOut = Math.max(trebleOut, stemEnergies[inst.id]);
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
            for (const k of Object.keys(stemEnergies)) stemEnergies[k] *= 0.88;
          }

          // Camera smooth orbit & gentle concert-hall sway
          currentTarget.lerp(desiredTarget, 0.09);
          currentRadius += (desiredRadius - currentRadius) * 0.09;
          const idleSway = activePointers.size === 0 && !state.soloInstrument ? Math.sin(t * 0.35) * 0.045 : 0;
          currentTheta += ((desiredTheta + idleSway) - currentTheta) * 0.08;
          currentPhi += (desiredPhi - currentPhi) * 0.08;

          const sinPhi = Math.sin(currentPhi);
          camera.position.set(
            currentTarget.x + currentRadius * sinPhi * Math.sin(currentTheta),
            currentTarget.y + currentRadius * Math.cos(currentPhi),
            currentTarget.z + currentRadius * sinPhi * Math.cos(currentTheta),
          );
          camera.lookAt(currentTarget);
          camera.updateMatrixWorld();

          // Update 3D Performers, Volumetric Spotlights, Instruments & Ghosting!
          for (const item of snap.instruments) {
            const st = arena.stations[item.id];
            if (!st) continue;
            const e = stemEnergies[item.id] || 0;
            const audFrac = item.effectiveAudibility / 100;
            const hovered = state.hoveredStem === item.id;

            // Dim volumetric 3D spotlight cone & turn vanished musicians translucent/ghosted!
            const targetConeOp = item.activeInMix
              ? (0.03 + audFrac * 0.24 + e * 0.16 + (hovered || item.isSoloed ? 0.1 : 0))
              : 0.015;
            st.spotConeMat.opacity += (targetConeOp - st.spotConeMat.opacity) * 0.14;
            st.floorRingMat.opacity = Math.min(1, 0.12 + audFrac * 0.65 + e * 0.35);
            st.floorRing.scale.setScalar(1 + e * 0.16);

            const bodyOpacity = !item.activeInMix ? 0.22 : Math.max(0.18, 0.2 + audFrac * 0.8);
            st.mats.bodyMat.opacity += (bodyOpacity - st.mats.bodyMat.opacity) * 0.14;
            st.mats.instMat.opacity += (bodyOpacity - st.mats.instMat.opacity) * 0.14;
            st.mats.instMat.emissiveIntensity = hovered || item.isSoloed
              ? 0.72
              : (0.08 + audFrac * 0.35 + e * 0.55);

            // Live 3D musical groove animation scaled by actual audibility!
            st.figure.position.y = e * 0.09;
            st.figure.rotation.z = Math.sin(t * 4.5 + st.stationGroup.position.x) * 0.05 * audFrac * (state.playing ? 1 : 0.2);

            if (st.animatedParts.kickHead) {
              st.animatedParts.kickHead.scale.setScalar(1 + e * 0.22);
            }
            if (st.animatedParts.vowelRing && st.animatedParts.consonantRing) {
              st.animatedParts.vowelRing.lookAt(camera.position);
              st.animatedParts.consonantRing.lookAt(camera.position);
              st.animatedParts.vowelRing.scale.setScalar(0.9 + e * 0.45);
              st.animatedParts.vowelRing.material.opacity = item.activeInMix ? Math.min(0.9, 0.2 + e * 0.8) : 0.05;
              const consClarity = snap.lyricClarity / 100;
              st.animatedParts.consonantRing.scale.setScalar(0.95 + e * 0.55 * consClarity);
              st.animatedParts.consonantRing.material.opacity = item.activeInMix ? consClarity * (0.25 + e * 0.75) : 0.02;
            }
            if (st.animatedParts.snareDrum) {
              st.animatedParts.snareDrum.scale.set(1 + e * 0.12, 1, 1 + e * 0.12);
            }
            if (st.animatedParts.crashDisc) {
              st.animatedParts.crashDisc.rotation.x = 0.26 + Math.sin(t * 16) * e * 0.22;
              st.animatedParts.rideDisc.rotation.x = 0.22 - Math.cos(t * 14) * e * 0.18;
              st.animatedParts.hiHatTop.position.y = 1.06 + e * 0.05;
            }

            // Project 3D Floating Label Pin cleanly above each 3D musician
            const pinObj = pinEls.get(item.id);
            if (pinObj) {
              projVec.copy(st.labelAnchor).project(camera);
              const inFront = projVec.z > -1 && projVec.z < 1;
              const px = Math.max(36, Math.min(viewW - 36, (projVec.x * 0.5 + 0.5) * viewW));
              const py = Math.max(24, Math.min(viewH - 28, (-projVec.y * 0.5 + 0.5) * viewH));
              pinObj.btn.style.opacity = inFront ? '1' : '0';
              pinObj.btn.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, -50%)`;
            }
          }

          // Crowd front-row bounce driven by live bass energy
          const bassBeat = stemEnergies.bass || 0;
          for (const person of arena.crowdSilhouettes) {
            person.position.y = person.userData.baseY + Math.abs(Math.sin(t * 3.6 + person.userData.phase)) * bassBeat * 0.12;
          }

          // 3.4 kHz Tinnitus Halo Ring
          const showRing = state.tinnitus === 'ringing';
          const targetRingOp = showRing ? 0.65 + 0.2 * Math.sin(t * 8) : 0;
          arena.ringingHaloMat.opacity += (targetRingOp - arena.ringingHaloMat.opacity) * 0.15;
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
    if (changed) {
      applyStemGains(false);
      syncUi();
    }
  };
  return stopFn;
}
