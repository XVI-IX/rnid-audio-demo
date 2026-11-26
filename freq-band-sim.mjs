import { createCrowdAmbienceBuffer, crowdPercentToGain } from './crowd-ambience.mjs?v=0f7222afbc';
import { createBandPlayback } from './freq-band-audio.mjs?v=0f7222afbc';
import { createCalibrationStage } from './output-calibration.mjs?v=0f7222afbc';

export const BAND_LOOP_SOURCES = Object.freeze([
  {
    id: 'instrumental',
    label: 'Bells, synth & percussion (demo)',
    path: './demo/v2/reference.wav',
    defaultOffset: 4,
  },
  {
    id: 'happy-birthday',
    label: 'Happy Birthday to You (Traditional — Public Domain)',
    path: './demo/music/happy-birthday/reference.m4a',
    defaultOffset: 0,
  },
  {
    id: 'its-your-birthday',
    label: 'It’s Your Birthday — Kyla (Female vocals, CC BY 3.0)',
    path: './demo/music/its-your-birthday/reference.m4a',
    defaultOffset: 0,
  },
  {
    id: 'in-peace',
    label: 'In Peace — Madam Snowflake (Female vocals, CC BY 3.0)',
    path: './demo/music/in-peace/reference.m4a',
    defaultOffset: 12,
  },
  {
    id: 'gravity',
    label: 'Gravity — Josh Woodward (Vocals & guitar, CC BY 4.0)',
    path: './demo/music/gravity/reference.m4a',
    defaultOffset: 18,
  },
  {
    id: 'i-just-wanna',
    label: 'I Just Wanna — mykleanthony (Soul-pop vocals, CC BY 3.0)',
    path: './demo/music/i-just-wanna/reference.m4a',
    defaultOffset: 14,
  },
  {
    id: 'let-it-in',
    label: 'Let It In — Josh Woodward (Upbeat folk-rock vocals, CC BY 4.0)',
    path: './demo/music/let-it-in/reference.m4a',
    defaultOffset: 14,
  },
  {
    id: 'she-dreams-in-blue',
    label: 'She Dreams In Blue — Josh Woodward (Acoustic pop vocals, CC BY 4.0)',
    path: './demo/music/she-dreams-in-blue/reference.m4a',
    defaultOffset: 16,
  },
  {
    id: 'boogie-party',
    label: 'Boogie Party — Kevin MacLeod (Blues rock, CC BY 4.0)',
    path: './demo/music/boogie-party/reference.m4a',
    defaultOffset: 12,
  },
  {
    id: 'big-mojo',
    label: 'Big Mojo — Kevin MacLeod (Cinematic percussion, CC BY 4.0)',
    path: './demo/music/big-mojo/reference.m4a',
    defaultOffset: 15,
  },
  {
    id: 'evening',
    label: 'Evening — Kevin MacLeod (Acoustic chamber, CC BY 4.0)',
    path: './demo/music/evening/reference.m4a',
    defaultOffset: 8,
  },
  {
    id: 'inspired',
    label: 'Inspired — Kevin MacLeod (Electronica, CC BY 4.0)',
    path: './demo/music/inspired/reference.m4a',
    defaultOffset: 16,
  },
]);

export const FREQUENCY_BANDS = Object.freeze([
  {
    id: 'bass',
    label: 'Bass',
    shortLabel: 'Bass',
    rangeLabel: '20–250 Hz',
    minHz: 20,
    maxHz: 250,
    cues: 'Listen for the kick drum and the weight of the bassline.',
  },
  {
    id: 'low_mids',
    label: 'Low-mids',
    shortLabel: 'Low-mids',
    rangeLabel: '250 Hz–1 kHz',
    minHz: 250,
    maxHz: 1000,
    cues: 'Listen for the body of the chords and lower notes.',
  },
  {
    id: 'midrange',
    label: 'Midrange',
    shortLabel: 'Midrange',
    rangeLabel: '1–2 kHz',
    minHz: 1000,
    maxHz: 2000,
    cues: 'Listen for the outline of the melody and the body of the snare.',
  },
  {
    id: 'presence',
    label: 'Presence',
    shortLabel: 'Presence',
    rangeLabel: '2–3 kHz',
    minHz: 2000,
    maxHz: 3000,
    cues: 'Listen for the first sharp edge of each note or drum hit.',
  },
  {
    id: 'gig_notch',
    label: '4 kHz Gig Notch',
    shortLabel: '4 kHz',
    rangeLabel: '3–6 kHz',
    minHz: 3000,
    maxHz: 6000,
    cues: 'Listen for the bite of the bell and the snap of the percussion.',
  },
  {
    id: 'air',
    label: 'Air & Sparkle',
    shortLabel: 'Air',
    rangeLabel: '6 kHz and up',
    minHz: 6000,
    maxHz: Infinity,
    cues: 'Listen for the thin shimmer of the hi-hats and cymbals.',
  },
]);

export const MIN_BAND_DB = -40;
export const MAX_BAND_DB = 0;

export const BAND_PRESETS = Object.freeze({
  normal: {
    id: 'normal',
    label: 'Normal hearing',
    gainsDb: [0, 0, 0, 0, 0, 0],
    modes: ['active', 'active', 'active', 'active', 'active', 'active'],
    caption: 'All six bands are at 0 dB. Solo a band to hear which details it carries.',
  },
  post_gig: {
    id: 'post_gig',
    label: 'Post-gig hangover',
    gainsDb: [0, 0, -3, -12, -22, -14],
    modes: ['active', 'active', 'active', 'active', 'active', 'active'],
    caption: 'This example reduces the upper bands. Compare Original and Filtered to hear the bass stay clear as the bright percussion softens.',
  },
  permanent_notch: {
    id: 'permanent_notch',
    label: '4 kHz noise notch (permanent)',
    gainsDb: [0, 0, -5, -18, -32, -16],
    modes: ['active', 'active', 'active', 'active', 'active', 'active'],
    caption: 'The largest cut is in the 3–6 kHz band. Listen for the bell and percussion attacks becoming less distinct.',
  },
  severe_hf: {
    id: 'severe_hf',
    label: 'Severe high-frequency loss',
    gainsDb: [0, -4, -14, -30, -40, -40],
    modes: ['active', 'active', 'active', 'active', 'muted', 'muted'],
    caption: 'The upper two bands are muted and the midrange is reduced. Listen for the bass and low notes that remain clear.',
  },
  isolate_speech: {
    id: 'isolate_speech',
    label: 'Isolate speech-clarity band (2–6 kHz)',
    gainsDb: [0, 0, 0, 0, 0, 0],
    modes: ['active', 'active', 'active', 'solo', 'solo', 'active'],
    caption: 'The 2–6 kHz region is isolated. Listen for the crisp consonants (s, f, th, t, k) and percussion snap that carry clarity.',
  },
  musician_plugs: {
    id: 'musician_plugs',
    label: 'Earplugs',
    gainsDb: [-15, -15, -15, -15, -15, -16],
    modes: ['active', 'active', 'active', 'active', 'active', 'active'],
    caption: 'Earplugs lower sound evenly (~−15 dB across all bands) — keeping vocals and cymbals crisp while preventing a hearing hangover.',
  },
});

function clampDb(db) {
  const num = Number(db);
  if (!Number.isFinite(num)) return 0;
  return Math.min(MAX_BAND_DB, Math.max(MIN_BAND_DB, num));
}

function formatDbBadge(db) {
  const rounded = Math.round(db);
  if (rounded === 0) return '0 dB';
  return `${String(rounded).replace('-', '−')} dB`;
}

function formatLoopTime(seconds) {
  const tenths = Math.round(seconds * 10);
  const minutes = Math.floor(tenths / 600);
  const wholeSeconds = String(Math.floor(tenths / 10) % 60).padStart(2, '0');
  return `${minutes}:${wholeSeconds}.${tenths % 10}`;
}

export function createPresetState(presetId = 'normal') {
  const preset = BAND_PRESETS[presetId] ?? BAND_PRESETS.normal;
  return FREQUENCY_BANDS.map((band, index) => ({
    id: band.id,
    db: clampDb(preset.gainsDb[index] ?? 0),
    mode: preset.modes[index] ?? 'active',
  }));
}

export function computeEffectiveBandGains(bandStates) {
  const hasSolo = bandStates.some((entry) => entry.mode === 'solo');
  return bandStates.map((entry) => {
    const db = clampDb(entry.db);
    const mode = entry.mode === 'solo' || entry.mode === 'muted' ? entry.mode : 'active';
    if (hasSolo) {
      if (mode === 'solo') {
        const linearGain = 10 ** (db / 20);
        return {
          id: entry.id,
          db,
          mode,
          audible: true,
          effectiveDb: db,
          linearGain,
          badge: db === 0 ? 'Solo' : `Solo (${formatDbBadge(db)})`,
        };
      }
      return {
        id: entry.id,
        db,
        mode,
        audible: false,
        effectiveDb: -Infinity,
        linearGain: 0,
        badge: 'Silenced',
      };
    }
    if (mode === 'muted') {
      return {
        id: entry.id,
        db,
        mode,
        audible: false,
        effectiveDb: -Infinity,
        linearGain: 0,
        badge: 'Muted',
      };
    }
    const linearGain = 10 ** (db / 20);
    return {
      id: entry.id,
      db,
      mode: 'active',
      audible: true,
      effectiveDb: db,
      linearGain,
      badge: formatDbBadge(db),
    };
  });
}

export function isNeutralBandState(bandStates) {
  return bandStates.every((entry) => entry.mode === 'active' && clampDb(entry.db) === 0);
}

export function aggregateBandLevels(bins, sampleRate, fftSize, bands = FREQUENCY_BANDS) {
  if (!bins?.length || !(sampleRate > 0) || !(fftSize > 0)) {
    return bands.map(() => -Infinity);
  }
  const hzPerBin = sampleRate / fftSize;

  return bands.map(({ minHz, maxHz }) => {
    const startBin = Math.max(1, Math.ceil(minHz / hzPerBin));
    const endBin = Math.min(bins.length, Math.ceil(maxHz / hzPerBin));
    let power = 0;
    for (let bin = startBin; bin < endBin; bin += 1) {
      if (Number.isFinite(bins[bin])) power += 10 ** (bins[bin] / 10);
    }
    return 10 * Math.log10(power);
  });
}

export function describeBandSelection(bandStates, activePresetId = null) {
  if (activePresetId && BAND_PRESETS[activePresetId]) {
    return BAND_PRESETS[activePresetId].caption;
  }
  const effective = computeEffectiveBandGains(bandStates);
  const byId = new Map(FREQUENCY_BANDS.map((band) => [band.id, band]));
  const soloed = effective.filter((item) => item.mode === 'solo').map((item) => byId.get(item.id)?.label ?? item.id);
  if (soloed.length) {
    return `Soloing ${soloed.join(' + ')}. Use Original to compare with the full mix at the same point.`;
  }
  const lost = effective
    .filter((item) => !item.audible || item.effectiveDb <= -15)
    .map((item) => byId.get(item.id)?.label ?? item.id);
  if (!lost.length) {
    if (isNeutralBandState(bandStates)) return BAND_PRESETS.normal.caption;
    return 'Switch between Original and Filtered to hear your changes at the same point in the loop.';
  }
  return `Reduced bands: ${lost.join(', ')}. Compare with Original to hear what changes.`;
}

function buildFallbackLoopBuffer(context) {
  const duration = 6;
  const rate = context.sampleRate;
  const frames = duration * rate;
  const buffer = context.createBuffer(2, frames, rate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Synthesise a rhythmic broadband loop spanning 60 Hz to 11 kHz so all 6 bands animate richly.
  let seed = 0x12345678;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 0xffffffff) * 2 - 1;
  };

  for (let i = 0; i < frames; i += 1) {
    const t = i / rate;
    const beat = (t * 2) % 1;
    const eighth = (t * 4) % 1;
    const kickEnv = Math.exp(-beat * 12);
    const kick = Math.sin(2 * Math.PI * (65 + 45 * Math.exp(-beat * 28)) * t) * kickEnv * 0.36;
    const bass = Math.sin(2 * Math.PI * 110 * t) * 0.16;
    const chord = (
      Math.sin(2 * Math.PI * 330 * t)
      + Math.sin(2 * Math.PI * 440 * t) * 0.8
      + Math.sin(2 * Math.PI * 660 * t) * 0.6
    ) * 0.11;
    const melodyFreq = ((Math.floor(t * 2) % 4) === 0 ? 1320 : 1760);
    const melody = Math.sin(2 * Math.PI * melodyFreq * t) * Math.exp(-beat * 4) * 0.09;
    const snareHit = (Math.floor(t * 2) % 2 === 1) ? Math.exp(-beat * 18) : 0;
    const noise = rand();
    const presenceSnap = Math.sin(2 * Math.PI * 2800 * t) * snareHit * 0.12;
    const notchBite = Math.sin(2 * Math.PI * 4400 * t + noise * 0.6) * (0.06 + snareHit * 0.14);
    const hatEnv = Math.exp(-eighth * 26);
    const airHat = noise * Math.sin(2 * Math.PI * 8200 * t) * hatEnv * 0.16;

    const sampleL = kick + bass + chord + melody + presenceSnap + notchBite * 0.9 + airHat;
    const sampleR = kick + bass + chord * 0.95 + melody * 0.85 + presenceSnap * 0.9 + notchBite + airHat * 0.92;
    left[i] = Math.max(-0.95, Math.min(0.95, sampleL));
    right[i] = Math.max(-0.95, Math.min(0.95, sampleR));
  }
  return buffer;
}

export function connectFreqBandSim({
  pauseOthers = () => {},
  volume = () => 1,
  onVisualState = () => {},
  root = document,
} = {}) {
  const section = root.querySelector('#freq-band-sim');
  if (!section) return () => {};

  const playBtn = section.querySelector('#freq-band-play');
  const resetBtn = section.querySelector('#freq-band-reset');
  const seekBar = section.querySelector('#freq-band-seek');
  const timeLabel = section.querySelector('#freq-band-time');
  const canvas = section.querySelector('#freq-band-canvas');
  const meterLabel = section.querySelector('#freq-band-meter-label');
  const captionEl = section.querySelector('#freq-band-caption');
  const statusEl = section.querySelector('#freq-band-status');
  const presetButtons = [...section.querySelectorAll('[data-band-preset]')];
  const auditionButtons = [...section.querySelectorAll('[data-band-audition]')];
  const controlsGrid = section.querySelector('#freq-band-controls');
  const sourceSelect = section.querySelector('#freq-band-source');
  const crowdSlider = section.querySelector('#freq-band-crowd');
  const crowdValueEl = section.querySelector('#freq-band-crowd-value');
  const pubDemoBtn = section.querySelector('#freq-band-pub-demo');

  let bandStates = createPresetState('normal');
  let activePreset = 'normal';
  let auditionOriginal = false;
  let selectedSourceId = sourceSelect?.value || BAND_LOOP_SOURCES[0].id;
  let crowdPercent = Number(crowdSlider?.value ?? 0) || 0;
  let context;
  let audioBuffer;
  let loopOffset = 0;
  let previewOffset;
  let pendingStart;
  let playback;
  let calibrationStage;
  let animFrame;
  let canvasSize;
  let originalBins;
  let simulatedBins;
  const decodedLoops = new Map();
  const loadingLoops = new Map();

  if (sourceSelect && sourceSelect.options.length === 0) {
    for (const src of BAND_LOOP_SOURCES) {
      sourceSelect.append(new Option(src.label, src.id));
    }
    sourceSelect.value = selectedSourceId;
  }

  const uiControls = new Map();

  // Build the 6 interactive band control cards inside #freq-band-controls
  controlsGrid.replaceChildren();
  for (const [index, band] of FREQUENCY_BANDS.entries()) {
    const card = document.createElement('div');
    card.className = 'freq-band-card';
    card.dataset.bandId = band.id;

    const header = document.createElement('div');
    header.className = 'freq-band-card-head';
    const titleWrap = document.createElement('div');
    const nameEl = document.createElement('h3');
    nameEl.textContent = band.label;
    const rangeEl = document.createElement('span');
    rangeEl.className = 'freq-band-hz';
    rangeEl.textContent = band.rangeLabel;
    titleWrap.append(nameEl, rangeEl);

    const badgeEl = document.createElement('span');
    badgeEl.className = 'freq-band-badge';
    badgeEl.textContent = '0 dB';
    header.append(titleWrap, badgeEl);

    const modeGroup = document.createElement('div');
    modeGroup.className = 'freq-band-modes';
    modeGroup.setAttribute('role', 'group');
    modeGroup.setAttribute('aria-label', `${band.label} (${band.rangeLabel}) mode`);

    const modeButtons = {};
    for (const [modeKey, modeLabel] of [['active', 'On'], ['muted', 'Mute'], ['solo', 'Solo']]) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'button freq-mode-btn';
      btn.dataset.bandMode = modeKey;
      btn.textContent = modeLabel;
      btn.setAttribute('aria-label', `${modeLabel} ${band.label}`);
      btn.setAttribute('aria-pressed', String(modeKey === 'active'));
      btn.addEventListener('click', () => {
        const current = bandStates[index];
        // Clicking Mute or Solo while already active toggles back to Active for effortless A/B!
        const nextMode = modeKey !== 'active' && current.mode === modeKey ? 'active' : modeKey;
        if (nextMode === current.mode) return;
        activePreset = null;
        bandStates[index] = { ...current, mode: nextMode };
        auditionOriginal = false;
        syncState();
        if (nextMode === 'solo') void startPlayback();
      });
      modeButtons[modeKey] = btn;
      modeGroup.append(btn);
    }

    const sliderWrap = document.createElement('div');
    sliderWrap.className = 'freq-band-slider-row';
    const sliderId = `freq-slider-${band.id}`;
    const sliderLabel = document.createElement('label');
    sliderLabel.htmlFor = sliderId;
    sliderLabel.className = 'visually-hidden';
    sliderLabel.textContent = `${band.label} level in decibels`;
    const slider = document.createElement('input');
    slider.id = sliderId;
    slider.type = 'range';
    slider.min = String(MIN_BAND_DB);
    slider.max = String(MAX_BAND_DB);
    slider.step = '1';
    slider.value = '0';
    slider.addEventListener('input', () => {
      activePreset = null;
      const nextDb = clampDb(Number(slider.value));
      const nextMode = bandStates[index].mode === 'muted' ? 'active' : bandStates[index].mode;
      bandStates[index] = { ...bandStates[index], db: nextDb, mode: nextMode };
      auditionOriginal = false;
      syncState();
    });
    sliderWrap.append(sliderLabel, slider);

    const cueEl = document.createElement('p');
    cueEl.className = 'freq-band-cues';
    cueEl.textContent = band.cues;

    card.append(header, modeGroup, sliderWrap, cueEl);
    controlsGrid.append(card);
    uiControls.set(band.id, { card, badgeEl, modeButtons, slider });
  }

  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = window.devicePixelRatio || 1;
    const pw = Math.round(rect.width * dpr);
    const ph = Math.round(rect.height * dpr);
    if (canvas.width !== pw) canvas.width = pw;
    if (canvas.height !== ph) canvas.height = ph;
    canvasSize = { width: rect.width, height: rect.height };
    drawBars();
  }

  function drawBars() {
    if (!canvas || !canvasSize) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvasSize;
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const effective = computeEffectiveBandGains(bandStates);
    const live = Boolean(playback);
    const floor = live ? -85 : MIN_BAND_DB;
    const ceiling = live ? -20 : MAX_BAND_DB;
    let origLevels;
    let simLevels;

    if (live) {
      originalBins ??= new Float32Array(playback.originalAnalyser.frequencyBinCount);
      simulatedBins ??= new Float32Array(playback.simulatedAnalyser.frequencyBinCount);
      playback.originalAnalyser.getFloatFrequencyData(originalBins);
      playback.simulatedAnalyser.getFloatFrequencyData(simulatedBins);
      origLevels = aggregateBandLevels(originalBins, context.sampleRate, playback.originalAnalyser.fftSize);
      simLevels = aggregateBandLevels(simulatedBins, context.sampleRate, playback.simulatedAnalyser.fftSize);
      const normEnergy = (db) => Math.max(0, Math.min(1, (db + 78) / 52));
      onVisualState({
        playing: true,
        bassEnergy: normEnergy((simLevels[0] + simLevels[1]) / 2),
        trebleEnergy: normEnergy((simLevels[4] + simLevels[5]) / 2),
      });
    } else {
      origLevels = effective.map(() => 0);
      simLevels = effective.map(item => item.effectiveDb);
    }

    const padX = width < 440 ? 10 : 18;
    const top = 16;
    const bottom = height - 38;
    const barAreaHeight = Math.max(40, bottom - top);
    const slotWidth = (width - padX * 2) / FREQUENCY_BANDS.length;
    const barWidth = Math.min(60, slotWidth * 0.68);
    const heightFor = db => barAreaHeight * Math.max(0, Math.min(1, (db - floor) / (ceiling - floor)));

    ctx.strokeStyle = '#41466a';
    ctx.lineWidth = 1;
    for (const frac of [0.25, 0.5, 0.75, 1]) {
      const y = bottom - barAreaHeight * frac;
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(width - padX, y);
      ctx.stroke();
    }

    for (let i = 0; i < FREQUENCY_BANDS.length; i += 1) {
      const band = FREQUENCY_BANDS[i];
      const info = effective[i];
      const cx = padX + slotWidth * (i + 0.5);
      const x = cx - barWidth / 2;

      const origH = heightFor(origLevels[i]);
      const simH = heightFor(simLevels[i]);
      const halfWidth = (barWidth - 3) / 2;
      if (origH > 0.5) {
        ctx.fillStyle = '#a7add638';
        ctx.strokeStyle = '#a3a8c9';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 2]);
        ctx.fillRect(x, bottom - origH, halfWidth, origH);
        ctx.strokeRect(x, bottom - origH, halfWidth, origH);
        ctx.setLineDash([]);
      }
      if (simH > 0.5) {
        ctx.fillStyle = '#cbc4ff';
        ctx.fillRect(x + halfWidth + 3, bottom - simH, halfWidth, simH);
      }

      // Labels below bar
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f8f8ff';
      ctx.font = width < 480 ? '600 10px system-ui, sans-serif' : '650 11px system-ui, sans-serif';
      ctx.fillText(band.shortLabel, cx, bottom + 14, slotWidth - 3);

      const stateLabel = info.mode === 'solo' ? 'Solo' : (!info.audible ? 'Off' : formatDbBadge(info.db));
      ctx.fillStyle = info.mode === 'solo' ? '#dfd9ff' : '#bfc4df';
      ctx.font = '600 10px ui-monospace, SFMono-Regular, Consolas, monospace';
      ctx.fillText(stateLabel, cx, bottom + 28, slotWidth - 3);
    }
  }

  function syncAudition() {
    for (const button of auditionButtons) {
      button.setAttribute('aria-pressed', String((button.dataset.bandAudition === 'original') === auditionOriginal));
    }
    playback?.setOriginal(auditionOriginal);
    calibrationStage?.sync();
    onVisualState({
      effectKey: auditionOriginal ? 'original' : (activePreset || 'post_gig'),
      crowdPercent,
    });
  }

  function syncState() {
    const effective = computeEffectiveBandGains(bandStates);
    for (const button of presetButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.bandPreset === activePreset));
    }
    effective.forEach((info, index) => {
      const band = FREQUENCY_BANDS[index];
      const ui = uiControls.get(band.id);
      if (!ui) return;
      ui.card.dataset.state = !info.audible ? 'silenced' : info.mode;
      ui.badgeEl.textContent = info.badge;
      ui.slider.value = String(info.db);
      ui.slider.setAttribute('aria-valuetext', `${info.badge} (${band.label})`);
      for (const [key, btn] of Object.entries(ui.modeButtons)) {
        btn.setAttribute('aria-pressed', String(info.mode === key));
      }
    });
    const caption = describeBandSelection(bandStates, activePreset);
    if (captionEl && captionEl.textContent !== caption) captionEl.textContent = caption;
    playback?.setGains(effective.map(item => item.linearGain));
    syncAudition();
    if (!playback) drawBars();
  }

  function syncCrowdUi() {
    if (crowdValueEl) {
      crowdValueEl.textContent = crowdPercent <= 0 ? 'Off' : `${Math.round(crowdPercent)}%`;
    }
  }

  function activeSourceSpec() {
    return BAND_LOOP_SOURCES.find((s) => s.id === selectedSourceId) ?? BAND_LOOP_SOURCES[0];
  }

  async function loadLoopBuffer(sourceId = selectedSourceId) {
    if (decodedLoops.has(sourceId)) {
      audioBuffer = decodedLoops.get(sourceId);
      syncTimeline();
      return audioBuffer;
    }
    if (!loadingLoops.has(sourceId)) {
      const spec = BAND_LOOP_SOURCES.find((s) => s.id === sourceId) ?? BAND_LOOP_SOURCES[0];
      const promise = (async () => {
        let buf;
        try {
          const response = await fetch(new URL(spec.path, import.meta.url));
          if (!response.ok) throw new Error('Loop reference unavailable');
          buf = await context.decodeAudioData(await response.arrayBuffer());
        } catch {
          buf = buildFallbackLoopBuffer(context);
        }
        decodedLoops.set(sourceId, buf);
        if (selectedSourceId === sourceId) {
          audioBuffer = buf;
          if (loopOffset === 0 && spec.defaultOffset > 0 && buf.duration > spec.defaultOffset) {
            loopOffset = spec.defaultOffset;
          }
          syncTimeline();
        }
        return buf;
      })().finally(() => {
        loadingLoops.delete(sourceId);
      });
      loadingLoops.set(sourceId, promise);
    }
    return loadingLoops.get(sourceId);
  }

  function animate() {
    if (!playback) return;
    playback.setVolume(volume());
    syncTimeline();
    drawBars();
    animFrame = requestAnimationFrame(animate);
  }

  function setTransport(label, playing, meter) {
    if (playBtn) {
      playBtn.textContent = label;
      playBtn.setAttribute('aria-pressed', String(playing));
    }
    if (meterLabel) meterLabel.textContent = meter;
  }

  function syncTimeline() {
    if (!seekBar || !timeLabel) return;
    const duration = audioBuffer?.duration ?? 0;
    const position = previewOffset ?? playback?.position() ?? loopOffset;
    if (Number(seekBar.max) !== duration) seekBar.max = String(duration);
    const disabled = duration === 0;
    if (seekBar.disabled !== disabled) seekBar.disabled = disabled;
    if (previewOffset === undefined) seekBar.value = String(position);

    const elapsed = formatLoopTime(position);
    const total = duration ? formatLoopTime(duration) : '–:––';
    const text = `${elapsed} / ${total}`;
    if (timeLabel.textContent !== text) {
      timeLabel.textContent = text;
      seekBar.setAttribute('aria-valuetext', `${elapsed} of ${total}`);
    }
  }

  function stopPlayback() {
    pendingStart = undefined;
    previewOffset = undefined;
    const stopped = playback;
    playback = undefined;
    cancelAnimationFrame(animFrame);
    if (stopped) {
      loopOffset = stopped.position();
      stopped.stop();
    }
    calibrationStage?.disconnect();
    calibrationStage = undefined;
    onVisualState({ playing: false });
    setTransport('Play loop', false, 'Settings preview');
    if (statusEl) statusEl.textContent = '';
    syncTimeline();
    drawBars();
  }

  async function startPlayback() {
    if (pendingStart || playback) return;
    const request = {};
    pendingStart = request;
    const requestedSourceId = selectedSourceId;
    pauseOthers();
    setTransport('Cancel loading', false, 'Settings preview');
    if (statusEl) {
      statusEl.removeAttribute('data-error');
      statusEl.textContent = 'Loading loop…';
    }
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      context ??= new AudioContextClass();
      await context.resume();
      if (pendingStart !== request) return;
      const buffer = await loadLoopBuffer(requestedSourceId);
      if (pendingStart !== request || selectedSourceId !== requestedSourceId) return;

      const crowdBuffer = createCrowdAmbienceBuffer(context);
      calibrationStage = createCalibrationStage(context, {
        isSimulated: () => !auditionOriginal && activePreset !== 'normal',
      });
      calibrationStage.output.connect(context.destination);
      playback = createBandPlayback(context, buffer, FREQUENCY_BANDS, {
        gains: computeEffectiveBandGains(bandStates).map(item => item.linearGain),
        original: auditionOriginal,
        volume: volume(),
        crowdBuffer,
        crowdGain: crowdPercentToGain(crowdPercent),
        destination: calibrationStage.input,
      });
      playback.start(loopOffset);
      if (statusEl) statusEl.textContent = '';
      setTransport('Pause loop', true, 'Live spectrum');
      animate();
    } catch {
      if (pendingStart !== request) return;
      stopPlayback();
      if (statusEl) {
        statusEl.setAttribute('data-error', '');
        statusEl.textContent = 'Audio playback could not start in this browser.';
      }
    } finally {
      if (pendingStart === request) pendingStart = undefined;
    }
  }

  playBtn?.addEventListener('click', () => {
    if (playback || pendingStart) stopPlayback();
    else void startPlayback();
  });

  sourceSelect?.addEventListener('change', () => {
    const nextId = sourceSelect.value;
    if (nextId === selectedSourceId) return;
    const wasActive = Boolean(playback || pendingStart);
    if (wasActive) stopPlayback();
    selectedSourceId = nextId;
    const spec = activeSourceSpec();
    audioBuffer = decodedLoops.get(nextId);
    loopOffset = audioBuffer
      ? (spec.defaultOffset < audioBuffer.duration ? spec.defaultOffset : 0)
      : 0;
    syncTimeline();
    if (wasActive) void startPlayback();
  });

  crowdSlider?.addEventListener('input', () => {
    crowdPercent = Math.max(0, Math.min(100, Number(crowdSlider.value) || 0));
    syncCrowdUi();
    playback?.setCrowdGain(crowdPercentToGain(crowdPercent));
    onVisualState({ crowdPercent });
  });

  function runPubDemo() {
    const wasDifferentSource = selectedSourceId !== 'gravity';
    if (wasDifferentSource && (playback || pendingStart)) stopPlayback();
    selectedSourceId = 'gravity';
    if (sourceSelect) sourceSelect.value = 'gravity';
    if (wasDifferentSource) {
      audioBuffer = decodedLoops.get('gravity');
      loopOffset = 0;
    }
    crowdPercent = 38;
    if (crowdSlider) crowdSlider.value = '38';
    syncCrowdUi();
    playback?.setCrowdGain(crowdPercentToGain(crowdPercent));

    activePreset = 'permanent_notch';
    auditionOriginal = false;
    bandStates = createPresetState('permanent_notch');
    syncState();
    void startPlayback();
  }

  pubDemoBtn?.addEventListener('click', runPubDemo);

  if (seekBar) {
    seekBar.addEventListener('input', () => {
      previewOffset = seekBar.valueAsNumber;
      syncTimeline();
    });
    seekBar.addEventListener('change', () => {
      const position = seekBar.valueAsNumber;
      previewOffset = undefined;
      if (audioBuffer && Number.isFinite(position)) {
        loopOffset = playback ? playback.seek(position) : position;
      }
      syncTimeline();
    });
    function cancelScrub() {
      previewOffset = undefined;
      syncTimeline();
    }
    seekBar.addEventListener('pointerup', () => requestAnimationFrame(cancelScrub));
    seekBar.addEventListener('pointercancel', cancelScrub);
    seekBar.addEventListener('blur', cancelScrub);
  }

  resetBtn?.addEventListener('click', () => {
    activePreset = 'normal';
    auditionOriginal = false;
    crowdPercent = 0;
    if (crowdSlider) crowdSlider.value = '0';
    syncCrowdUi();
    playback?.setCrowdGain(0);
    bandStates = createPresetState('normal');
    syncState();
  });

  for (const button of auditionButtons) {
    button.addEventListener('click', () => {
      auditionOriginal = button.dataset.bandAudition === 'original';
      syncAudition();
      void startPlayback();
    });
  }

  for (const button of presetButtons) {
    button.addEventListener('click', () => {
      const presetId = button.dataset.bandPreset;
      if (!BAND_PRESETS[presetId]) return;
      activePreset = presetId;
      auditionOriginal = false;
      bandStates = createPresetState(presetId);
      syncState();
      void startPlayback();
    });
  }

  if (typeof ResizeObserver === 'function' && canvas) {
    new ResizeObserver(resizeCanvas).observe(canvas);
  }
  window.addEventListener('resize', resizeCanvas);

  syncCrowdUi();
  syncState();
  requestAnimationFrame(resizeCanvas);
  stopPlayback.applyPreset = (presetId, { autoPlay = false } = {}) => {
    if (!BAND_PRESETS[presetId]) return;
    activePreset = presetId;
    auditionOriginal = false;
    bandStates = createPresetState(presetId);
    syncState();
    if (autoPlay) void startPlayback();
  };
  stopPlayback.triggerPubDemo = runPubDemo;
  return stopPlayback;
}
