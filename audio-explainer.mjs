// Pure-JS acoustic delta analyser + lazy on-device WebLLM explainer for "Your audio".
// Measures per-band dB shifts, left/right ear asymmetry, crest-factor shift, and the
// clearest 2–8 kHz & quietest 1-second moments in <12 ms, then grounds either an instant
// deterministic summary or a local WebGPU LLM (via @mlc-ai/web-llm Web Worker).

export const EXPLAINER_BANDS = Object.freeze([
  {
    id: 'bass',
    label: 'Bass',
    shortLabel: 'Bass',
    friendlyLabel: 'Deep beat & bass',
    rangeLabel: '60–250 Hz',
    minHz: 60,
    maxHz: 250,
  },
  {
    id: 'low_mids',
    label: 'Low-mids / Vowels',
    shortLabel: 'Low-mids',
    friendlyLabel: 'Warmth & chords',
    rangeLabel: '250–1,000 Hz',
    minHz: 250,
    maxHz: 1000,
  },
  {
    id: 'midrange',
    label: 'Midrange',
    shortLabel: 'Midrange',
    friendlyLabel: 'Voice & melody',
    rangeLabel: '1–2 kHz',
    minHz: 1000,
    maxHz: 2000,
  },
  {
    id: 'presence',
    label: 'Presence / Plosives',
    shortLabel: 'Presence',
    friendlyLabel: 'Word edges (p, t, k)',
    rangeLabel: '2–4 kHz',
    minHz: 2000,
    maxHz: 4000,
  },
  {
    id: 'gig_notch',
    label: '4 kHz Gig Notch / Sibilants',
    shortLabel: '4 kHz Notch',
    friendlyLabel: 'Crisp s, f & snare',
    rangeLabel: '3–6 kHz',
    minHz: 3000,
    maxHz: 6000,
  },
  {
    id: 'air',
    label: 'Treble / Air',
    shortLabel: 'Air',
    friendlyLabel: 'Cymbal & air sparkle',
    rangeLabel: '6–12 kHz',
    minHz: 6000,
    maxHz: 12000,
  },
]);

export function friendlyBandStatus(bandId, deltaDb) {
  const drop = Number(deltaDb) || 0;
  const isLow = bandId === 'bass' || bandId === 'low_mids';
  if (drop > -2.0) return isLow ? 'Full & strong' : 'Clear & bright';
  if (drop > -6.5) return isLow ? 'Slightly softer' : 'Slightly softened';
  if (drop > -16.0) return isLow ? 'Noticeably quieter' : 'Muffled';
  if (drop > -26.0) return isLow ? 'Much quieter' : 'Tucked away';
  return 'Nearly gone';
}

export const WEBLLM_MODELS = Object.freeze([
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen 2.5 1.5B — Grounded & fast (~900 MB, default)',
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 3B — Highest accuracy (~1.7 GB)',
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 1B — Lightweight (~650 MB)',
  },
]);

export const STARTER_QUESTIONS = Object.freeze([
  'Why does the bass still sound loud?',
  'How would vocals sound in a noisy pub?',
  'Why is tinnitus louder in quiet parts?',
]);

const BAND_FFT_SIZE = 2048;
const MOMENT_FFT_SIZE = 512;
const MAX_BAND_FRAMES = 48;
const MAX_MOMENT_WINDOWS = 72;
const MOMENT_SUBFRAMES = 4;
const FLOOR_POWER = 1e-8; // -80 dBFS perceptual floor avoids Hann sidelobe ratios in empty bands

function createRealFft(size) {
  const bits = Math.round(Math.log2(size));
  const bitRev = new Uint32Array(size);
  for (let i = 0; i < size; i += 1) {
    let x = i;
    let y = 0;
    for (let b = 0; b < bits; b += 1) {
      y = (y << 1) | (x & 1);
      x >>>= 1;
    }
    bitRev[i] = y;
  }

  const hann = new Float64Array(size);
  let windowPowerSum = 0;
  for (let i = 0; i < size; i += 1) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
    hann[i] = w;
    windowPowerSum += w * w;
  }
  const powerScale = 1 / (size * windowPowerSum);

  const halfSize = size >>> 1;
  const cosTable = new Float64Array(halfSize);
  const sinTable = new Float64Array(halfSize);
  for (let k = 0; k < halfSize; k += 1) {
    const angle = (2 * Math.PI * k) / size;
    cosTable[k] = Math.cos(angle);
    sinTable[k] = -Math.sin(angle);
  }

  const re = new Float64Array(size);
  const im = new Float64Array(size);

  function accumulateSpectrum(samples, startIndex, endLimit, outBins) {
    for (let i = 0; i < size; i += 1) {
      const idx = startIndex + i;
      const sample = idx >= 0 && idx < endLimit ? samples[idx] : 0;
      const rev = bitRev[i];
      re[rev] = sample * hann[i];
      im[rev] = 0;
    }

    for (let len = 2; len <= size; len <<= 1) {
      const half = len >>> 1;
      const step = size / len;
      for (let i = 0; i < size; i += len) {
        for (let j = 0; j < half; j += 1) {
          const twiddle = j * step;
          const wr = cosTable[twiddle];
          const wi = sinTable[twiddle];
          const even = i + j;
          const odd = even + half;
          const tr = wr * re[odd] - wi * im[odd];
          const ti = wr * im[odd] + wi * re[odd];
          re[odd] = re[even] - tr;
          im[odd] = im[even] - ti;
          re[even] += tr;
          im[even] += ti;
        }
      }
    }

    outBins[0] += (re[0] * re[0]) * powerScale;
    for (let k = 1; k < halfSize; k += 1) {
      outBins[k] += 2 * (re[k] * re[k] + im[k] * im[k]) * powerScale;
    }
    outBins[halfSize] += (re[halfSize] * re[halfSize] + im[halfSize] * im[halfSize]) * powerScale;
  }

  return { size, halfSize, accumulateSpectrum };
}

const bandFft = createRealFft(BAND_FFT_SIZE);
const momentFft = createRealFft(MOMENT_FFT_SIZE);

function round1(value) {
  const rounded = Math.round(value * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function round2(value) {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function formatExplainerTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const tenths = Math.round(safe * 10);
  const whole = Math.floor(tenths / 10);
  const frac = tenths % 10;
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}.${frac}`;
}

export function formatSignedDb(db) {
  const val = round1(Number(db) || 0);
  if (val === 0) return '0.0 dB';
  if (val > 0) return `+${val.toFixed(1)} dB`;
  return `−${Math.abs(val).toFixed(1)} dB`;
}

function binRangeForHz(minHz, maxHz, sampleRate, fftSize) {
  const half = fftSize >>> 1;
  const hzPerBin = sampleRate / fftSize;
  const startBin = Math.max(1, Math.min(half, Math.ceil(minHz / hzPerBin)));
  const endBin = Math.max(startBin, Math.min(half, Math.floor(maxHz / hzPerBin)));
  return [startBin, endBin];
}

function sumBins(bins, startBin, endBin) {
  let total = 0;
  for (let k = startBin; k <= endBin; k += 1) total += bins[k];
  return total;
}

function powerToDb(power) {
  return 10 * Math.log10(Math.max(power, 0) + FLOOR_POWER);
}

function computeCrestDb(left, right, startSample, endSample) {
  const total = Math.max(0, endSample - startSample);
  if (total === 0) return 0;
  const stride = Math.max(1, Math.floor(total / 120000));
  let peak = 0;
  let sumSq = 0;
  let count = 0;
  for (let i = startSample; i < endSample; i += stride) {
    const l = left[i];
    const r = right[i];
    const absL = Math.abs(l);
    const absR = Math.abs(r);
    if (absL > peak) peak = absL;
    if (absR > peak) peak = absR;
    sumSq += 0.5 * (l * l + r * r);
    count += 1;
  }
  if (count === 0 || peak <= 1e-9) return 0;
  const rms = Math.sqrt(sumSq / count);
  if (rms <= 1e-9) return 0;
  return 20 * Math.log10(peak / rms);
}

function pickPlateauCenterIndex(values, mode) {
  if (values.length <= 1) return 0;
  let target = values[0];
  for (let i = 1; i < values.length; i += 1) {
    if (mode === 'max' ? values[i] > target : values[i] < target) target = values[i];
  }
  const isMatch = mode === 'max'
    ? (v) => v >= (target > 1e-12 ? target * 0.98 : target - 1e-13)
    : (v) => v <= Math.max(1e-12, target * 1.02);

  let bestStart = 0;
  let bestLen = 0;
  let runStart = -1;
  for (let i = 0; i < values.length; i += 1) {
    if (isMatch(values[i])) {
      if (runStart === -1) runStart = i;
      const len = i - runStart + 1;
      if (len > bestLen) {
        bestLen = len;
        bestStart = runStart;
      }
    } else {
      runStart = -1;
    }
  }
  return bestLen > 0 ? bestStart + Math.floor((bestLen - 1) / 2) : 0;
}

export function analyseClipChanges(
  originalBuffer,
  simulatedBuffer,
  {
    profileId = 'original',
    profileLabel = '',
    tinnitus = 'off',
    section = null,
  } = {},
) {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (!originalBuffer || !(originalBuffer.length > 0) || !(originalBuffer.sampleRate > 0)) {
    throw new Error('originalBuffer must be a valid decoded audio buffer.');
  }
  const simBuffer = simulatedBuffer && simulatedBuffer.length > 0 ? simulatedBuffer : originalBuffer;
  const sampleRate = originalBuffer.sampleRate;
  const totalFrames = Math.min(originalBuffer.length, simBuffer.length);
  const durationSeconds = totalFrames / sampleRate;

  const origLeft = originalBuffer.getChannelData(0);
  const origRight = originalBuffer.numberOfChannels > 1 ? originalBuffer.getChannelData(1) : origLeft;
  const simLeft = simBuffer.getChannelData(0);
  const simRight = simBuffer.numberOfChannels > 1 ? simBuffer.getChannelData(1) : simLeft;

  const rawStart = section && Number.isFinite(section.start) ? section.start : 0;
  const rawEnd = section && Number.isFinite(section.end) ? section.end : durationSeconds;
  const spanStartSeconds = Math.max(0, Math.min(durationSeconds, rawStart));
  const spanEndSeconds = Math.max(spanStartSeconds, Math.min(durationSeconds, rawEnd));

  const startSample = Math.min(totalFrames, Math.max(0, Math.floor(spanStartSeconds * sampleRate)));
  const endSample = Math.min(totalFrames, Math.max(startSample + 1, Math.round(spanEndSeconds * sampleRate)));
  const spanFrames = endSample - startSample;

  // 1. Strided 2048-sample Hann FFTs across the active span (up to 48 frames)
  const numFrames = spanFrames <= BAND_FFT_SIZE
    ? 1
    : Math.min(MAX_BAND_FRAMES, Math.max(1, Math.floor(spanFrames / (BAND_FFT_SIZE >>> 1))));
  const maxOffset = Math.max(0, spanFrames - BAND_FFT_SIZE);

  const halfBins = bandFft.halfSize + 1;
  const origLeftBins = new Float64Array(halfBins);
  const origRightBins = new Float64Array(halfBins);
  const simLeftBins = new Float64Array(halfBins);
  const simRightBins = new Float64Array(halfBins);

  for (let f = 0; f < numFrames; f += 1) {
    const offset = startSample + (numFrames === 1 ? 0 : Math.round((f * maxOffset) / (numFrames - 1)));
    bandFft.accumulateSpectrum(origLeft, offset, endSample, origLeftBins);
    if (origRight !== origLeft) {
      bandFft.accumulateSpectrum(origRight, offset, endSample, origRightBins);
    }
    bandFft.accumulateSpectrum(simLeft, offset, endSample, simLeftBins);
    if (simRight !== simLeft) {
      bandFft.accumulateSpectrum(simRight, offset, endSample, simRightBins);
    }
  }

  const invFrames = 1 / numFrames;
  for (let k = 0; k < halfBins; k += 1) {
    origLeftBins[k] *= invFrames;
    origRightBins[k] = origRight === origLeft ? origLeftBins[k] : origRightBins[k] * invFrames;
    simLeftBins[k] *= invFrames;
    simRightBins[k] = simRight === simLeft ? simLeftBins[k] : simRightBins[k] * invFrames;
  }

  let maxAsymmetry = 0;
  let leftHighSum = 0;
  let rightHighSum = 0;

  const bands = EXPLAINER_BANDS.map((band) => {
    const [bStart, bEnd] = binRangeForHz(band.minHz, band.maxHz, sampleRate, BAND_FFT_SIZE);
    const origL = sumBins(origLeftBins, bStart, bEnd);
    const origR = sumBins(origRightBins, bStart, bEnd);
    const simL = sumBins(simLeftBins, bStart, bEnd);
    const simR = sumBins(simRightBins, bStart, bEnd);

    const origStereo = 0.5 * (origL + origR);
    const simStereo = 0.5 * (simL + simR);

    const leftOrigDb = powerToDb(origL);
    const leftSimDb = powerToDb(simL);
    const rightOrigDb = powerToDb(origR);
    const rightSimDb = powerToDb(simR);
    const origDb = powerToDb(origStereo);
    const simDb = powerToDb(simStereo);

    const clampDelta = (d) => Math.max(-60, Math.min(24, d));
    const rawLeftDelta = clampDelta(leftSimDb - leftOrigDb);
    const rawRightDelta = clampDelta(rightSimDb - rightOrigDb);
    const rawStereoDelta = clampDelta(simDb - origDb);

    const earDiff = Math.abs(rawLeftDelta - rawRightDelta);
    if (earDiff > maxAsymmetry) maxAsymmetry = earDiff;
    if (band.minHz >= 1000) {
      leftHighSum += rawLeftDelta;
      rightHighSum += rawRightDelta;
    }

    return {
      id: band.id,
      label: band.label,
      shortLabel: band.shortLabel,
      friendlyLabel: band.friendlyLabel,
      friendlyStatus: friendlyBandStatus(band.id, rawStereoDelta),
      rangeLabel: band.rangeLabel,
      minHz: band.minHz,
      maxHz: band.maxHz,
      originalDb: round1(origDb),
      simulatedDb: round1(simDb),
      deltaDb: round1(rawStereoDelta),
      leftDeltaDb: round1(rawLeftDelta),
      rightDeltaDb: round1(rawRightDelta),
    };
  });

  // 2. Locate brightest (2–8 kHz) and quietest (audible 60–12,000 Hz) 1-second window centers
  const spanDuration = spanEndSeconds - spanStartSeconds;
  let brightestMomentSeconds = round2((spanStartSeconds + spanEndSeconds) / 2);
  let quietestMomentSeconds = brightestMomentSeconds;

  if (spanDuration > 1.0) {
    const minCenter = spanStartSeconds + 0.5;
    const maxCenter = spanEndSeconds - 0.5;
    const centerSpan = Math.max(0, maxCenter - minCenter);
    const numWindows = centerSpan === 0
      ? 1
      : Math.min(MAX_MOMENT_WINDOWS, Math.max(2, Math.round(centerSpan / 0.25) + 1));

    const [hfStart, hfEnd] = binRangeForHz(2000, 8000, sampleRate, MOMENT_FFT_SIZE);
    const [audStart, audEnd] = binRangeForHz(60, 12000, sampleRate, MOMENT_FFT_SIZE);
    const momentBinsL = new Float64Array(momentFft.halfSize + 1);
    const momentBinsR = new Float64Array(momentFft.halfSize + 1);

    const centers = new Float64Array(numWindows);
    const hfEnergies = new Float64Array(numWindows);
    const audibleEnergies = new Float64Array(numWindows);

    for (let w = 0; w < numWindows; w += 1) {
      const centerSec = numWindows === 1
        ? minCenter
        : minCenter + (w * centerSpan) / (numWindows - 1);
      centers[w] = centerSec;
      momentBinsL.fill(0);
      momentBinsR.fill(0);

      for (let s = 0; s < MOMENT_SUBFRAMES; s += 1) {
        const subOffsetSec = centerSec - 0.5 + ((s + 0.5) / MOMENT_SUBFRAMES);
        const frameStart = Math.max(
          startSample,
          Math.min(endSample - MOMENT_FFT_SIZE, Math.round(subOffsetSec * sampleRate - (MOMENT_FFT_SIZE >>> 1))),
        );
        momentFft.accumulateSpectrum(origLeft, frameStart, endSample, momentBinsL);
        if (origRight !== origLeft) {
          momentFft.accumulateSpectrum(origRight, frameStart, endSample, momentBinsR);
        }
      }

      const hfL = sumBins(momentBinsL, hfStart, hfEnd);
      const hfR = origRight === origLeft ? hfL : sumBins(momentBinsR, hfStart, hfEnd);
      hfEnergies[w] = 0.5 * (hfL + hfR) / MOMENT_SUBFRAMES;

      const audL = sumBins(momentBinsL, audStart, audEnd);
      const audR = origRight === origLeft ? audL : sumBins(momentBinsR, audStart, audEnd);
      audibleEnergies[w] = 0.5 * (audL + audR) / MOMENT_SUBFRAMES;
    }

    const brightestIdx = pickPlateauCenterIndex(hfEnergies, 'max');
    const quietestIdx = pickPlateauCenterIndex(audibleEnergies, 'min');
    brightestMomentSeconds = round2(centers[brightestIdx]);
    quietestMomentSeconds = round2(centers[quietestIdx]);
  }

  // 3. Crest-factor shift & ear asymmetry summary
  const originalCrestDb = computeCrestDb(origLeft, origRight, startSample, endSample);
  const simulatedCrestDb = computeCrestDb(simLeft, simRight, startSample, endSample);
  const crestShiftDb = round1(simulatedCrestDb - originalCrestDb);
  const asymmetryDb = round1(maxAsymmetry);
  let asymmetricEar = null;
  if (asymmetryDb >= 3) {
    asymmetricEar = rightHighSum < leftHighSum ? 'right' : 'left';
  }

  const cleanTinnitus = tinnitus === 'ringing' || tinnitus === 'hiss' ? tinnitus : 'off';
  const cleanProfileId = profileId || 'original';
  const cleanProfileLabel = profileLabel || (cleanProfileId === 'original' ? 'Original (unfiltered)' : cleanProfileId);
  const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return {
    durationSeconds: round2(durationSeconds),
    spanStartSeconds: round2(spanStartSeconds),
    spanEndSeconds: round2(spanEndSeconds),
    analyzedDurationSeconds: round2(spanDuration),
    section: section ? { start: round2(spanStartSeconds), end: round2(spanEndSeconds) } : null,
    sampleRate,
    channels: Math.max(originalBuffer.numberOfChannels, simBuffer.numberOfChannels),
    profileId: cleanProfileId,
    profileLabel: cleanProfileLabel,
    tinnitus: cleanTinnitus,
    bands,
    brightestMomentSeconds,
    quietestMomentSeconds,
    crestShiftDb,
    originalCrestDb: round1(originalCrestDb),
    simulatedCrestDb: round1(simulatedCrestDb),
    asymmetryDb,
    asymmetricEar,
    elapsedMs: round2(Math.max(0, endedAt - startedAt)),
  };
}

export function buildInstantSummary(report) {
  if (!report || !Array.isArray(report.bands) || report.bands.length === 0) {
    return 'Choose an audio or video clip to hear and read in plain English how hearing loss or tinnitus changes your music.';
  }

  const bass = report.bands.find((b) => b.id === 'bass') ?? report.bands[0];
  const lowMids = report.bands.find((b) => b.id === 'low_mids') ?? report.bands[1];
  const highBands = report.bands.filter((b) => b.minHz >= 2000);
  const steepestBand = [...report.bands].reduce((worst, b) => (b.deltaDb < worst.deltaDb ? b : worst), report.bands[0]);
  const steepestHigh = highBands.reduce((worst, b) => (b.deltaDb < worst.deltaDb ? b : worst), highBands[0] ?? steepestBand);

  const brightLabel = formatExplainerTime(report.brightestMomentSeconds);
  const quietLabel = formatExplainerTime(report.quietestMomentSeconds);
  const spanPrefix = report.section
    ? `Between ${formatExplainerTime(report.section.start)} and ${formatExplainerTime(report.section.end)}`
    : 'In this clip';

  const hasHearingShift = report.bands.some((b) => Math.abs(b.deltaDb) >= 1.0) || report.asymmetryDb >= 2.5;
  const tinnitusLabel = report.tinnitus === 'ringing'
    ? 'a steady high-pitched ringing'
    : report.tinnitus === 'hiss'
      ? 'a gentle rushing hiss'
      : '';

  if (!hasHearingShift && !tinnitusLabel) {
    return `${spanPrefix}, no hearing effect is switched on yet, so drums, vocals, and cymbals all sound natural and clear. Tap Jump to clearest difference (${brightLabel}) and pick a hearing effect to hear how crisp details change.`;
  }

  const sentences = [];

  if (hasHearingShift) {
    const lowIntact = Math.max(Math.abs(bass.deltaDb), Math.abs(lowMids.deltaDb)) <= 4.0 && steepestHigh.deltaDb <= -4;
    const heavyDrop = steepestHigh.deltaDb <= -18;
    if (lowIntact) {
      sentences.push(
        `${spanPrefix}, ${report.profileLabel} keeps the deep beat, bassline, and warm body of the voice sounding almost as full as normal, while ${heavyDrop ? 'pushing crisp snare snaps, shimmering cymbals, and sharp word sounds (like s, f, th, and t) way into the background' : 'softening crisp percussion, cymbal sparkle, and sharp word edges (like s, f, and t) as if listening through a curtain'}.`,
      );
    } else if (steepestBand.deltaDb <= -6) {
      sentences.push(
        `${spanPrefix}, ${report.profileLabel} makes the whole mix noticeably quieter and dulls crisp vocals, guitar plucks, and drum attacks.`,
      );
    } else {
      sentences.push(
        `${spanPrefix}, ${report.profileLabel} gently softens the brightest vocal and instrument details while keeping the rhythm steady.`,
      );
    }

    if (report.asymmetryDb >= 3.5) {
      const sideText = report.asymmetricEar
        ? `the ${report.asymmetricEar} ear sounds noticeably duller and quieter than the other`
        : 'one ear sounds noticeably duller and quieter than the other';
      sentences.push(`On headphones, ${sideText}, which pulls the music off-centre.`);
    }
  } else if (tinnitusLabel) {
    sentences.push(
      `${spanPrefix}, the music itself stays clear while ${tinnitusLabel} lingers underneath the track.`,
    );
  }

  if (tinnitusLabel) {
    sentences.push(
      `Tap Jump to clearest difference (${brightLabel}) to compare the music at its liveliest, then tap Jump to quietest moment (${quietLabel}) where the song dips and the ${report.tinnitus} stands out most.`,
    );
  } else {
    sentences.push(
      `Tap Jump to clearest difference (${brightLabel}) and switch between Play original and Play with hearing loss — turning your volume up just makes the bass boom without bringing back that crisp detail.`,
    );
  }

  return sentences.join(' ');
}

export function cleanExplanationText(raw = '') {
  return String(raw || '')
    .replace(/\r\n/g, '\n')
    .replace(/^\s*#{1,6}\s+.*$/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const TECHNICAL_JARGON_REGEX = /\b(?:\d+(?:\.\d+)?\s*(?:k?Hz|hertz|dB|decibels?)|kHz|decibels?|hertz|filterbank|dBFS)\b/i;

export const MEDICAL_CLAIM_REGEX = /\b(?:diagnos(?:e|ed|es|is|tic)|cure(?:s|d)?|curing|heal(?:s|ed|ing)?\s+(?:your|the|inner|damaged|tinnitus|hearing)|revers(?:e|es|ed|ing)\s+(?:hearing|damage|tinnitus)|medicat(?:e|ion|ions)|medicine|prescri(?:be|bed|ption)|steroid(?:s)?|supplement(?:s)?|surgery|surgical|vitamin(?:s)?|herbal|remed(?:y|ies)|clinically\s+proven|medical\s+advice|you\s+(?:have|suffer\s+from|are\s+experiencing)\s+(?:hearing\s+loss|tinnitus|ear\s+damage|permanent\s+damage)|your\s+(?:ears?|hearing|cochlea)\s+(?:is|are|has\s+been)\s+damaged|hearing\s+aid\s+prescription)\b/i;

const MEDICAL_QUERY_REGEX = /\b(?:do\s+i\s+have|have\s+i\s+got|am\s+i\s+(?:going\s+)?deaf|diagnos(?:e|is|tic)|cure(?:s|d)?|curing|heal\b|healing|revers(?:e|ing)|treat(?:ment|ments|ing)?|medicat(?:e|ion|ions)|medicine|drug(?:s)?|pill(?:s)?|supplement(?:s)?|steroid(?:s)?|surgery|prescri(?:be|ption)|hearing\s+aid(?:s)?|doctor|gp\b|ent\b|medical\s+advice|clinical\s+advice|damaged\s+my\s+(?:ears?|hearing)|are\s+my\s+ears|check\s+my\s+hearing|test\s+my\s+hearing)\b/i;

export function isMedicalAdviceQuery(question = '') {
  return MEDICAL_QUERY_REGEX.test(String(question || '').trim());
}

export function buildSafeMedicalResponse(report) {
  const brightText = Number.isFinite(report?.brightestMomentSeconds)
    ? ` You can still use Jump to clearest difference (${formatExplainerTime(report.brightestMomentSeconds)}) to hear how the selected audio example changes music.`
    : '';
  return `This tool only demonstrates how music and speech sound through example audio filters — it cannot test your ears, diagnose hearing loss or tinnitus, or recommend any medical treatment or cure.${brightText}\n\nIf your hearing feels muffled, your ears are ringing, or you want reassurance, try RNID’s free 3-minute online hearing check at rnid.org.uk/check, contact RNID’s support line on 0808 808 0123, or speak to a GP, pharmacist, or NHS audiologist.`;
}

const BANNED_HALLUCINATION_PATTERNS = [
  TECHNICAL_JARGON_REGEX,
  MEDICAL_CLAIM_REGEX,
  /default recording duration/i,
  /shorter than the default/i,
  /background noise remained unchanged/i,
  /interference from other sources/i,
  /timestamps? where the background noise/i,
  /you have hearing loss/i,
  /medical diagnosis/i,
  /WHAT CHANGED IN THIS SONG|VERIFIED ACOUSTIC BRIEF|MEASURED_CLIP_DATA|PLAIN-ENGLISH RULES/i,
];

function parseClockToSeconds(clockText) {
  const parts = String(clockText).trim().split(':');
  if (parts.length !== 2) return NaN;
  const mins = Number(parts[0]);
  const secs = Number(parts[1]);
  if (!Number.isFinite(mins) || !Number.isFinite(secs)) return NaN;
  return mins * 60 + secs;
}

function allowedReportTimestamps(report) {
  const times = [];
  if (Number.isFinite(report?.brightestMomentSeconds)) times.push(report.brightestMomentSeconds);
  if (Number.isFinite(report?.quietestMomentSeconds)) times.push(report.quietestMomentSeconds);
  if (report?.section) {
    if (Number.isFinite(report.section.start)) times.push(report.section.start);
    if (Number.isFinite(report.section.end)) times.push(report.section.end);
  }
  return times;
}

function hasMidStreamHallucination(partialRaw, report) {
  const text = String(partialRaw || '');
  for (const pattern of BANNED_HALLUCINATION_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  const bulletCount = (text.match(/^\s*[-*•]\s+/gm) || []).length;
  if (bulletCount >= 3) return true;

  // Check completed M:SS(.S) timestamps
  const allowedTimes = allowedReportTimestamps(report);
  const timeRegex = /\b(\d{1,2}:\d{2}(?:\.\d)?)\b(?=[\s.,;:!?)]|$)/g;
  let match;
  while ((match = timeRegex.exec(text)) !== null) {
    const secs = parseClockToSeconds(match[1]);
    if (!Number.isFinite(secs)) continue;
    const matchesTime = allowedTimes.some((ref) => Math.abs(secs - ref) <= 0.35);
    if (!matchesTime) return true;
  }

  return false;
}

export function validateAiExplanation(rawText, report, userQuestion = '') {
  const cleaned = cleanExplanationText(rawText);
  if (!cleaned) {
    return { valid: false, reason: 'empty_output', cleaned };
  }

  if (TECHNICAL_JARGON_REGEX.test(rawText) || TECHNICAL_JARGON_REGEX.test(cleaned)) {
    return { valid: false, reason: 'technical_jargon', cleaned };
  }

  if (MEDICAL_CLAIM_REGEX.test(rawText) || MEDICAL_CLAIM_REGEX.test(cleaned)) {
    return { valid: false, reason: 'medical_claim', cleaned };
  }

  for (const pattern of BANNED_HALLUCINATION_PATTERNS) {
    if (pattern.test(rawText) || pattern.test(cleaned)) {
      return { valid: false, reason: 'hallucinated_concept', cleaned };
    }
  }

  const bulletCount = (cleaned.match(/^\s*[-*•]\s+/gm) || []).length;
  if (bulletCount >= 3) {
    return { valid: false, reason: 'bullet_dump', cleaned };
  }

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < 35) {
    return { valid: false, reason: 'too_short', cleaned };
  }
  if (!/[.!?]["')\]]*$/.test(cleaned)) {
    return { valid: false, reason: 'incomplete_sentence', cleaned };
  }

  const allowedTimes = allowedReportTimestamps(report);
  const timeRegex = /\b(\d{1,2}:\d{2}(?:\.\d)?)\b/g;
  let mentionedValidTime = false;
  let match;
  while ((match = timeRegex.exec(cleaned)) !== null) {
    const secs = parseClockToSeconds(match[1]);
    if (!Number.isFinite(secs)) continue;
    const ok = allowedTimes.some((ref) => Math.abs(secs - ref) <= 0.35);
    if (!ok) {
      return { valid: false, reason: `ungrounded_timestamp:${match[1]}`, cleaned };
    }
    mentionedValidTime = true;
  }

  if (!String(userQuestion || '').trim() && !mentionedValidTime) {
    return { valid: false, reason: 'missing_target_timestamp', cleaned };
  }

  return { valid: true, reason: 'ok', cleaned };
}

export function buildGroundedDeepDive(report, userQuestion = '') {
  if (!report || !Array.isArray(report.bands) || report.bands.length === 0) {
    return 'Choose an audio or video clip to hear and read in plain English how hearing loss or tinnitus changes your music.';
  }

  const byId = Object.fromEntries(report.bands.map((b) => [b.id, b]));
  const bass = byId.bass ?? report.bands[0];
  const lowMids = byId.low_mids ?? report.bands[1];
  const presence = byId.presence ?? report.bands[3];
  const notch = byId.gig_notch ?? report.bands[4];
  const air = byId.air ?? report.bands[5];

  const highBands = report.bands.filter((b) => b.minHz >= 2000);
  const steepestHigh = highBands.reduce((w, b) => (b.deltaDb < w.deltaDb ? b : w), notch ?? report.bands[0]);

  const brightLabel = formatExplainerTime(report.brightestMomentSeconds);
  const quietLabel = formatExplainerTime(report.quietestMomentSeconds);
  const spanClause = report.section
    ? `Between ${formatExplainerTime(report.section.start)} and ${formatExplainerTime(report.section.end)} in your clip`
    : 'In your uploaded clip';

  const hasHearingShift = report.bands.some((b) => Math.abs(b.deltaDb) >= 1.0) || report.asymmetryDb >= 2.5;
  const tinnitusDesc = report.tinnitus === 'ringing'
    ? 'a steady high-pitched ringing'
    : report.tinnitus === 'hiss'
      ? 'a gentle rushing hiss'
      : '';

  const q = String(userQuestion || '').trim().toLowerCase();

  if (isMedicalAdviceQuery(q)) {
    return buildSafeMedicalResponse(report);
  }

  if (q) {
    if (/pub|crowd|restaurant|background|speech|vocal|lyric|sing|voice|word|consonant/.test(q)) {
      const p1 = hasHearingShift
        ? `${spanClause}, ${report.profileLabel} leaves the warm hum of the singer’s voice and the main rhythm plenty loud enough to hear that someone is singing, while dulling the crisp consonant sounds — like s, f, th, t, and k — that tell your brain where one word ends and the next begins.`
        : `${spanClause}, no hearing effect is switched on yet, so every word, breath, and instrument edge still comes through cleanly.`;
      const p2 = `In a lively pub, café, or gig bar, background chatter and room noise easily drown out those softened word endings, so voices sound loud enough yet frustratingly blurry — like people are mumbling. Jump to ${brightLabel} and switch between Play original and Play with hearing loss to hear how much sharper the lyrics sound on Original.`;
      return `${p1}\n\n${p2}`;
    }

    if (/tinnitus|ring|hiss|quiet|silence|fade/.test(q)) {
      const activeTin = tinnitusDesc || 'ringing or hiss (which you can switch on under Effects)';
      const p1 = `${spanClause}, full instruments and vocals naturally cover up ${activeTin} during louder, busier moments like ${brightLabel}, so your attention stays on the music.`;
      const p2 = `Around ${quietLabel} — the calmest part of your clip — the music drops away and your brain has much less outside sound to focus on, making that internal ringing or hiss step right into the spotlight, much like lying in a quiet bedroom after a loud gig. Switch on Ringing or Hiss and jump between ${brightLabel} and ${quietLabel} to hear the difference.`;
      return `${p1}\n\n${p2}`;
    }

    if (/bass|loud|volume|turn.*up|headphone|recruit/.test(q)) {
      const p1 = `${spanClause}, ${report.profileLabel} barely touches the deep kick drum, bass guitar, or warm low notes because loud music wears down the delicate parts of the inner ear that pick up crisp, bright details long before it affects deep bass.`
      const p2 = `That is why turning your headphones up feels so unsatisfying: cranking the volume makes the already-strong bass boom uncomfortably in your ears, while the dulled vocals and cymbals still sound blurred together. Jump to ${brightLabel} at a comfortable volume to hear how the beat stays heavy even while the sparkle fades.`;
      return `${p1}\n\n${p2}`;
    }

    if (/left|right|ear|stereo|asymmetr|side/.test(q)) {
      const p1 = report.asymmetryDb >= 2.5
        ? `${spanClause}, ${report.asymmetricEar ? `your ${report.asymmetricEar} headphone side sounds noticeably duller and softer than the other` : 'one headphone side sounds noticeably duller and softer than the other'}, pulling vocals, snare hits, and room space towards the clearer ear.`
        : `${spanClause}, both left and right headphones currently share the same balance. You can drag the Left or Right ear sliders under Effects — or choose Right side quieter — to feel how uneven hearing tilts the stereo mix.`;
      const p2 = `Having crisp detail in both ears is what helps us tell where instruments sit on stage and pick out a friend’s voice beside us in a crowd. Jump to ${brightLabel} on stereo headphones to hear how the space shifts.`;
      return `${p1}\n\n${p2}`;
    }
  }

  if (!hasHearingShift && !tinnitusDesc) {
    return `${spanClause}, no hearing-loss or tinnitus effect is active yet, so the deep beat, warm vocals, and bright cymbal shimmer all play at their natural, everyday clarity.\n\nYour song’s clearest vocal and percussion detail happens around ${brightLabel}, and its calmest moment sits near ${quietLabel}. Pick an effect like Post-gig muffled or Permanent loss under Effects, then jump to ${brightLabel} to hear what changes.`;
  }

  const p1Parts = [];
  if (hasHearingShift) {
    const lowMostlyFull = Math.max(Math.abs(bass.deltaDb), Math.abs(lowMids.deltaDb)) <= 4.5;
    const veryMuffled = steepestHigh.deltaDb <= -18 || presence.deltaDb <= -12;
    if (lowMostlyFull) {
      p1Parts.push(
        `${spanClause}, ${report.profileLabel} leaves the deep drum beat, bassline, and warm body of the voice sounding reassuringly full, while ${veryMuffled ? 'heavily muffling crisp snare snaps, acoustic guitar pick detail, shimmering cymbals, and sharp word sounds like s, f, th, and t' : 'taking the crispness off hi-hats, guitar strings, and sharp word endings like s, f, and t — as if a thick curtain dropped in front of the band'}.`,
      );
    } else {
      p1Parts.push(
        `${spanClause}, ${report.profileLabel} softens the whole track and takes away the bright sparkle on vocals, drums, and cymbals so the mix feels much more distant.`,
      );
    }
    if (notch.deltaDb <= -8 && air.deltaDb <= -8) {
      p1Parts.push(
        `You can easily tell the song is playing, yet lyrics and instruments blend into each other instead of standing apart cleanly.`,
      );
    }
    if (report.asymmetryDb >= 3.5) {
      p1Parts.push(
        `On headphones, ${report.asymmetricEar ? `the ${report.asymmetricEar} ear also sounds noticeably duller` : 'one ear also sounds noticeably duller'}, pulling the music towards the clearer side.`,
      );
    }
  } else {
    p1Parts.push(
      `${spanClause}, the instruments and vocals keep their natural clarity while ${tinnitusDesc} stays present in the background, just like ears ringing after a loud night out.`,
    );
  }

  const p2Parts = [];
  if (hasHearingShift) {
    p2Parts.push(
      `Turning your headphone volume up will not fix that muffled feeling: because the bass and warm notes are still coming through strongly, raising the volume quickly makes the low end uncomfortably booming without sharpening the blurred words.`,
    );
  }
  if (tinnitusDesc) {
    p2Parts.push(
      `Tap Jump to clearest difference (${brightLabel}) to compare the song at its liveliest, then tap Jump to quietest moment (${quietLabel}) where the music fades and the ${report.tinnitus} becomes hardest to ignore.`,
    );
  } else {
    p2Parts.push(
      `Tap Jump to clearest difference (${brightLabel}) and toggle between Play original and Play with hearing loss at the same comfortable volume to hear that contrast straight away.`,
    );
  }

  return `${p1Parts.join(' ')}\n\n${p2Parts.join(' ')}`;
}

export function buildExplainerPrompt(report, userQuestion = '') {
  if (!report || !Array.isArray(report.bands)) {
    throw new Error('A valid acoustic report is required to build the explainer prompt.');
  }

  const measuredData = {
    active_section_seconds: report.section
      ? { start: report.section.start, end: report.section.end }
      : null,
    hearing_profile: {
      id: report.profileId,
      label: report.profileLabel,
    },
    tinnitus: report.tinnitus,
    per_band_db_change: report.bands.map((b) => ({
      band: b.label,
      friendly_part: b.friendlyLabel,
      friendly_status: b.friendlyStatus || friendlyBandStatus(b.id, b.deltaDb),
      range_hz: b.rangeLabel,
      stereo_delta_db: b.deltaDb,
      left_delta_db: b.leftDeltaDb,
      right_delta_db: b.rightDeltaDb,
    })),
    ear_asymmetry_db: report.asymmetryDb,
    quieter_ear: report.asymmetricEar,
    crest_factor_shift_db: report.crestShiftDb,
    brightest_2_to_8khz_timestamp: {
      seconds: report.brightestMomentSeconds,
      formatted: formatExplainerTime(report.brightestMomentSeconds),
    },
    quietest_moment_timestamp: {
      seconds: report.quietestMomentSeconds,
      formatted: formatExplainerTime(report.quietestMomentSeconds),
    },
  };

  const measuredJson = JSON.stringify(measuredData, null, 2);
  const trimmedQuestion = String(userQuestion || '').trim();
  const brightFormatted = formatExplainerTime(report.brightestMomentSeconds);
  const quietFormatted = formatExplainerTime(report.quietestMomentSeconds);

  const byId = Object.fromEntries(report.bands.map((b) => [b.id, b]));
  const bass = byId.bass ?? report.bands[0];
  const lowMids = byId.low_mids ?? report.bands[1];
  const midrange = byId.midrange ?? report.bands[2];
  const presence = byId.presence ?? report.bands[3];
  const notch = byId.gig_notch ?? report.bands[4];
  const air = byId.air ?? report.bands[5];

  const system = [
    'You are a friendly everyday music guide for the charity RNID, speaking in warm, relatable UK English to ordinary listeners.',
    'PLAIN-ENGLISH RULES:',
    '1. Write 2 short, natural plain-text paragraphs (80 to 130 words total). NEVER use Markdown headings (#), bullet lists, or technical audio jargon.',
    '2. STRICTLY FORBIDDEN: Never mention frequencies, Hz, kHz, decibels, dB, or engineering jargon, and NEVER give medical advice, personal diagnoses, cures, treatments, supplements, or claims about the listener’s own ears.',
    '3. Talk about real musical things people recognise: the drum beat, bassline, warm vocals, guitar strums, snare snap, cymbal sparkle, and crisp word sounds like s, f, th, and t — plus why turning headphone volume up just makes the bass uncomfortably boomy without making muffled words clearer, and invite them to jump to the exact M:SS.S timestamp given.',
  ].join('\n');

  const briefLines = [
    'WHAT CHANGED IN THIS SONG:',
    `- Selected listening effect: ${report.profileLabel}${report.tinnitus !== 'off' ? ` with ${report.tinnitus} tinnitus` : ''}${report.section ? ` (between ${formatExplainerTime(report.section.start)} and ${formatExplainerTime(report.section.end)})` : ''}`,
    `- Deep beat & bass guitar: ${friendlyBandStatus('bass', bass.deltaDb)}; Warmth & chords: ${friendlyBandStatus('low_mids', lowMids.deltaDb)}; Main voice & melody: ${friendlyBandStatus('midrange', midrange.deltaDb)}.`,
    `- Sharp word edges (p, t, k): ${friendlyBandStatus('presence', presence.deltaDb)}; Crisp s, f & snare snap: ${friendlyBandStatus('gig_notch', notch.deltaDb)}; Cymbal & hi-hat sparkle: ${friendlyBandStatus('air', air.deltaDb)}.`,
  ];
  if (report.asymmetryDb >= 2.5) {
    briefLines.push(
      `- Headphones balance: ${report.asymmetricEar ? `The ${report.asymmetricEar} ear sounds noticeably duller and quieter than the other side` : 'One ear sounds noticeably duller and quieter than the other side'}.`,
    );
  }
  briefLines.push(
    `- Why turning volume up fails: Because the beat and warm low notes are still strong, turning headphones up makes the bass boom uncomfortably while blurred lyrics and cymbals still blend together.`,
    `- Exact moments in this clip to mention: ${brightFormatted} (best moment to compare crispness)${report.tinnitus !== 'off' ? ` and ${quietFormatted} (quietest moment where ${report.tinnitus} stands out)` : ` (quietest moment: ${quietFormatted})`}.`,
  );

  const taskLine = trimmedQuestion
    ? `Listener question: "${trimmedQuestion}"\nAnswer warmly in 2 short paragraphs (no Hz, no kHz, no dB, no headings, no bullets) using ONLY the plain-English musical facts and ${brightFormatted} / ${quietFormatted} moments above.`
    : `Explain warmly in 2 short plain-English paragraphs (no Hz, no kHz, no dB, no headings, no bullets) how this song sounds different, why turning volume up does not bring back lost clarity, and tell the listener to jump to ${brightFormatted}.`;

  const user = `${briefLines.join('\n')}\n\n${taskLine}`;

  const exampleUser = [
    'WHAT CHANGED IN THIS SONG:',
    '- Selected listening effect: Post-gig muffled',
    '- Deep beat & bass guitar: Full & strong; Warmth & chords: Full & strong; Main voice & melody: Slightly softened.',
    '- Sharp word edges (p, t, k): Muffled; Crisp s, f & snare snap: Tucked away; Cymbal & hi-hat sparkle: Muffled.',
    '- Why turning volume up fails: Because the beat and warm low notes are still strong, turning headphones up makes the bass boom uncomfortably while blurred lyrics and cymbals still blend together.',
    '- Exact moments in this clip to mention: 0:08.5 (best moment to compare crispness) (quietest moment: 0:21.0).',
    '',
    'Explain warmly in 2 short plain-English paragraphs (no Hz, no kHz, no dB, no headings, no bullets) how this song sounds different, why turning volume up does not bring back lost clarity, and tell the listener to jump to 0:08.5.',
  ].join('\n');

  const exampleAssistant = 'In your clip, Post-gig muffled leaves the deep drum beat, bassline, and warm body of the singer’s voice sounding reassuringly full, so at first it still feels plenty loud. What vanishes is the crisp top edge — shimmering hi-hats, bright guitar strums, snare snap, and sharp word sounds like s, f, th, and t all sound tucked behind a thick curtain.\n\nTurning your headphones up will not bring that sparkle back: because the bass and warm notes are already coming through strongly, raising the volume just makes the low end boom uncomfortably while lyrics still blur together. Jump to 0:08.5 and switch between Play original and Play with hearing loss to hear the difference straight away.';

  return {
    system,
    user,
    measuredJson,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: exampleUser },
      { role: 'assistant', content: exampleAssistant },
      { role: 'user', content: user },
    ],
  };
}

export function hasWebGpuSupport(navigatorObj = globalThis.navigator) {
  return Boolean(navigatorObj && typeof navigatorObj === 'object' && 'gpu' in navigatorObj && navigatorObj.gpu);
}

export function createWebLlmExplainerClient({
  loadWebLlm = () => import('https://esm.run/@mlc-ai/web-llm'),
  workerFactory = () => new Worker(new URL('./webllm-worker.mjs', import.meta.url), { type: 'module' }),
  navigatorObj = globalThis.navigator,
} = {}) {
  let engine = null;
  let loadedModelId = null;
  let activeWorker = null;
  let inFlightLoad = null;
  let inFlightModelId = null;
  const progressListeners = new Set();

  function emitProgress(payload) {
    for (const listener of progressListeners) {
      try {
        listener(payload);
      } catch {
        // Ignore UI listener errors
      }
    }
  }

  async function ensureEngine(modelId = WEBLLM_MODELS[0].id, onProgress) {
    if (!hasWebGpuSupport(navigatorObj)) {
      const error = new Error('WebGPU is unavailable in this browser. Try Chrome or Edge 113+ or Safari 18+ for local AI inference.');
      error.code = 'WEBGPU_UNAVAILABLE';
      throw error;
    }

    if (engine && loadedModelId === modelId) return engine;

    if (onProgress) progressListeners.add(onProgress);
    try {
      // Join an already-running background preload for the exact same model instead of restarting!
      if (inFlightLoad && inFlightModelId === modelId) {
        return await inFlightLoad;
      }
      // Wait for any in-flight load of another model to settle cleanly before reloading
      if (inFlightLoad) {
        await inFlightLoad.catch(() => {});
        if (engine && loadedModelId === modelId) return engine;
      }

      const loadTask = (async () => {
        if (engine && typeof engine.reload === 'function') {
          await engine.reload(modelId);
          loadedModelId = modelId;
          return engine;
        }

        if (activeWorker) {
          activeWorker.terminate?.();
          activeWorker = null;
          engine = null;
          loadedModelId = null;
        }

        const { CreateWebWorkerMLCEngine } = await loadWebLlm();
        const worker = workerFactory();
        activeWorker = worker;
        try {
          engine = await CreateWebWorkerMLCEngine(worker, modelId, {
            initProgressCallback: (info) => {
              emitProgress({
                modelId,
                progress: typeof info?.progress === 'number' ? info.progress : 0,
                text: info?.text || 'Caching local AI model in browser storage…',
              });
            },
          });
          loadedModelId = modelId;
          return engine;
        } catch (error) {
          activeWorker?.terminate?.();
          activeWorker = null;
          engine = null;
          loadedModelId = null;
          throw error;
        }
      })();

      inFlightModelId = modelId;
      inFlightLoad = loadTask;
      try {
        return await loadTask;
      } finally {
        if (inFlightLoad === loadTask) {
          inFlightLoad = null;
          inFlightModelId = null;
        }
      }
    } finally {
      if (onProgress) progressListeners.delete(onProgress);
    }
  }

  function preload(modelId = WEBLLM_MODELS[0].id, onProgress) {
    return ensureEngine(modelId, onProgress);
  }

  async function generateExplanation({
    modelId = WEBLLM_MODELS[0].id,
    report,
    userQuestion = '',
    signal,
    onProgress,
    onToken,
  }) {
    if (isMedicalAdviceQuery(userQuestion)) {
      const safeText = buildSafeMedicalResponse(report);
      onToken?.('', safeText);
      return {
        text: safeText,
        aborted: false,
        fallbackUsed: true,
        fallbackReason: 'medical_query_guardrail',
        prompt: null,
      };
    }

    const prompt = buildExplainerPrompt(report, userQuestion);
    const activeEngine = await ensureEngine(modelId, onProgress);
    if (signal?.aborted) {
      return { text: '', aborted: true, prompt };
    }

    const stream = await activeEngine.chat.completions.create({
      messages: prompt.messages,
      stream: true,
      temperature: 0.1,
      top_p: 0.85,
      repetition_penalty: 1.08,
      max_tokens: 360,
    });

    let rawText = '';
    let aborted = false;
    let hallucinationAborted = false;
    const onAbort = () => {
      aborted = true;
      void activeEngine.interruptGenerate?.();
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    try {
      for await (const chunk of stream) {
        if (signal?.aborted || aborted) {
          aborted = true;
          break;
        }
        const delta = chunk?.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          rawText += delta;
          if (hasMidStreamHallucination(rawText, report)) {
            hallucinationAborted = true;
            void activeEngine.interruptGenerate?.();
            break;
          }
          const cleanedPartial = cleanExplanationText(rawText);
          if (cleanedPartial) {
            onToken?.(delta, cleanedPartial);
          }
        }
      }
    } finally {
      signal?.removeEventListener('abort', onAbort);
    }

    if (aborted) {
      return {
        text: cleanExplanationText(rawText),
        aborted: true,
        fallbackUsed: false,
        prompt,
      };
    }

    const check = hallucinationAborted
      ? { valid: false, reason: 'mid_stream_hallucination', cleaned: '' }
      : validateAiExplanation(rawText, report, userQuestion);

    if (!check.valid) {
      const verified = buildGroundedDeepDive(report, userQuestion);
      onToken?.('', verified);
      return {
        text: verified,
        aborted: false,
        fallbackUsed: true,
        fallbackReason: check.reason,
        prompt,
      };
    }

    return {
      text: check.cleaned,
      aborted: false,
      fallbackUsed: false,
      prompt,
    };
  }

  async function generateCustomAnatomy({
    modelId = WEBLLM_MODELS[0].id,
    messages,
    signal,
    onProgress,
    onToken,
  }) {
    const activeEngine = await ensureEngine(modelId, onProgress);
    if (signal?.aborted) return { text: '', aborted: true };

    const stream = await activeEngine.chat.completions.create({
      messages,
      stream: true,
      temperature: 0.12,
      top_p: 0.85,
      repetition_penalty: 1.08,
      max_tokens: 260,
    });

    let rawText = '';
    let aborted = false;
    const onAbort = () => {
      aborted = true;
      void activeEngine.interruptGenerate?.();
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    try {
      for await (const chunk of stream) {
        if (signal?.aborted || aborted) {
          aborted = true;
          break;
        }
        const delta = chunk?.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          rawText += delta;
          if (TECHNICAL_JARGON_REGEX.test(rawText) || MEDICAL_CLAIM_REGEX.test(rawText)) {
            void activeEngine.interruptGenerate?.();
            return { text: '', aborted: false, invalid: true };
          }
          onToken?.(rawText);
        }
      }
    } finally {
      signal?.removeEventListener('abort', onAbort);
    }

    return { text: cleanExplanationText(rawText), aborted };
  }

  function dispose() {
    activeWorker?.terminate?.();
    activeWorker = null;
    engine = null;
    loadedModelId = null;
    inFlightLoad = null;
    inFlightModelId = null;
  }

  return {
    isSupported: () => hasWebGpuSupport(navigatorObj),
    getLoadedModel: () => loadedModelId,
    preload,
    generateExplanation,
    generateCustomAnatomy,
    dispose,
  };
}

function bandSeverity(deltaDb) {
  if (deltaDb <= -16) return 'strong';
  if (deltaDb <= -6) return 'moderate';
  if (deltaDb <= -1.5) return 'mild';
  return 'none';
}

let sharedWebLlmClient = null;

export function getSharedWebLlmClient() {
  sharedWebLlmClient ??= createWebLlmExplainerClient();
  return sharedWebLlmClient;
}

export function connectExplainerChat(container, reply) {
  const question = container.querySelector('[data-chat-question]');
  const history = container.querySelector('[data-chat-history]');
  const context = container.querySelector('[data-chat-context]');
  const transcript = container.querySelector('.explainer-chat-transcript');
  const welcome = reply?.textContent ?? '';

  return {
    begin(prompt) {
      if (!question || !history || !reply) return;
      if (!question.hidden && reply.textContent && !reply.dataset.streaming) {
        const turn = question.parentElement.cloneNode(true);
        const previousReply = turn.lastElementChild;
        previousReply.removeAttribute('id');
        previousReply.removeAttribute('aria-live');
        turn.firstElementChild.removeAttribute('data-chat-question');
        history.append(turn);
        if (history.childElementCount > 3) history.firstElementChild.remove();
      }
      question.textContent = prompt;
      question.hidden = false;
      reply.hidden = false;
      reply.textContent = '';
      delete reply.dataset.error;
      delete reply.dataset.streaming;
      if (transcript) {
        queueMicrotask(() => {
          const transcriptTop = transcript.getBoundingClientRect().top;
          transcript.scrollTop += question.getBoundingClientRect().top - transcriptTop;
        });
      }
    },
    setContext(label) {
      if (context) context.textContent = label;
    },
    reset() {
      history?.replaceChildren();
      if (question) {
        question.hidden = true;
        question.textContent = '';
      }
      if (reply) {
        reply.textContent = welcome;
        delete reply.dataset.error;
        delete reply.dataset.streaming;
      }
      if (transcript) transcript.scrollTop = 0;
    },
  };
}

export function connectAudioExplainer({
  root = document,
  formatTime = formatExplainerTime,
  onSeek = () => {},
  client = getSharedWebLlmClient(),
  autoPreload = false,
} = {}) {
  const container = root.querySelector('#upload-ai-explainer');
  if (!container) return null;

  const badgeEl = container.querySelector('.explainer-badge');
  const pillsEl = container.querySelector('#explainer-band-pills');
  const jumpBrightestBtn = container.querySelector('#explainer-jump-brightest');
  const jumpQuietestBtn = container.querySelector('#explainer-jump-quietest');
  const chatHistoryEl = container.querySelector('#upload-chat-history');
  const instantSummaryEl = container.querySelector('#explainer-instant-summary');
  const modelSelect = container.querySelector('#explainer-model');
  const generateBtn = container.querySelector('#explainer-generate');
  const stopBtn = container.querySelector('#explainer-stop');
  const webgpuNote = container.querySelector('#explainer-webgpu-note');
  const progressWrap = container.querySelector('#explainer-progress-wrap');
  const progressBar = container.querySelector('#explainer-progress');
  const progressText = container.querySelector('#explainer-progress-text');
  const aiOutputEl = container.querySelector('#explainer-ai-output');
  const questionInput = container.querySelector('#explainer-question');
  const askBtn = container.querySelector('#explainer-ask');
  const starterBtns = [...container.querySelectorAll('[data-explainer-question]')];
  const chat = connectExplainerChat(container, aiOutputEl);

  let currentReport = null;
  let lastSettingsKey = '';
  let activeGeneration = null;
  let preloading = false;

  if (modelSelect && modelSelect.options.length === 0) {
    for (const model of WEBLLM_MODELS) {
      modelSelect.append(new Option(model.label, model.id));
    }
    modelSelect.value = WEBLLM_MODELS[0].id;
  }

  const webgpuSupported = client.isSupported();
  if (webgpuNote) {
    webgpuNote.hidden = webgpuSupported;
  }
  const modelOptions = modelSelect?.closest('details');
  if (modelOptions) modelOptions.hidden = !webgpuSupported;

  function updateBadge(text) {
    if (badgeEl) badgeEl.textContent = text;
  }

  function warmModelInBackground(modelId = modelSelect?.value || WEBLLM_MODELS[0].id) {
    if (!webgpuSupported || client.getLoadedModel?.() === modelId) {
      if (webgpuSupported) updateBadge('Local AI ready · Instant & free');
      return;
    }
    preloading = true;
    updateBadge('Warming up local AI…');
    void client.preload(modelId, ({ progress, text }) => {
      const pct = Math.round(Math.max(0, Math.min(1, Number(progress) || 0)) * 100);
      updateBadge(pct > 0 && pct < 100 ? `Warming up local AI (${pct}%)…` : 'Warming up local AI…');
      if (!activeGeneration && progressWrap && !container.hidden) {
        progressWrap.hidden = false;
        if (progressBar) {
          progressBar.value = pct / 100;
          progressBar.setAttribute('aria-valuetext', `${pct}%`);
        }
        if (progressText) progressText.textContent = text;
      }
    }).then(() => {
      preloading = false;
      updateBadge('Local AI ready · Instant & free');
      if (!activeGeneration && progressWrap) progressWrap.hidden = true;
    }).catch(() => {
      preloading = false;
      updateBadge('100% on-device · Free forever');
      if (!activeGeneration && progressWrap) progressWrap.hidden = true;
    });
  }

  if (autoPreload && webgpuSupported && globalThis.navigator?.connection?.saveData !== true) {
    const scheduleIdle = () => {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => warmModelInBackground(), { timeout: 1500 });
      } else {
        setTimeout(() => warmModelInBackground(), 600);
      }
    };
    if (typeof document !== 'undefined' && document.readyState === 'complete') {
      scheduleIdle();
    } else if (typeof window !== 'undefined') {
      window.addEventListener('load', scheduleIdle, { once: true });
    }
  }

  modelSelect?.addEventListener('change', () => {
    if (webgpuSupported && !activeGeneration) {
      warmModelInBackground(modelSelect.value);
    }
  });

  function syncAiControls() {
    const busy = Boolean(activeGeneration);
    const ready = Boolean(currentReport);
    if (modelSelect) modelSelect.disabled = busy || !webgpuSupported;
    if (generateBtn) {
      generateBtn.disabled = busy || !ready || !webgpuSupported;
      generateBtn.hidden = busy || !webgpuSupported;
    }
    if (stopBtn) stopBtn.hidden = !busy;
    if (questionInput) questionInput.disabled = busy || !ready;
    if (askBtn) askBtn.disabled = busy || !ready;
    for (const btn of starterBtns) btn.disabled = busy || !ready;
  }

  function renderBandPills(report) {
    if (!pillsEl) return;
    pillsEl.replaceChildren();
    for (const band of report.bands) {
      const item = document.createElement('span');
      item.className = 'explainer-band-pill';
      item.setAttribute('role', 'listitem');
      item.dataset.severity = bandSeverity(band.deltaDb);
      if (Math.abs(band.leftDeltaDb - band.rightDeltaDb) >= 2.5) {
        const quieterSide = band.rightDeltaDb < band.leftDeltaDb ? 'right ear quieter' : 'left ear quieter';
        item.title = `${band.friendlyLabel || band.label}: ${quieterSide} on headphones`;
      } else {
        item.title = band.friendlyLabel || band.label;
      }

      const name = document.createElement('span');
      name.className = 'explainer-pill-name';
      name.textContent = band.friendlyLabel || band.shortLabel;

      const delta = document.createElement('strong');
      delta.className = 'explainer-pill-db';
      delta.textContent = band.friendlyStatus || friendlyBandStatus(band.id, band.deltaDb);

      item.append(name, ' ', delta);
      pillsEl.append(item);
    }
  }

  function renderReport(report) {
    currentReport = report;
    container.hidden = false;
    renderBandPills(report);

    if (jumpBrightestBtn) {
      jumpBrightestBtn.hidden = false;
      jumpBrightestBtn.disabled = false;
      jumpBrightestBtn.textContent = `Clearest (${formatTime(report.brightestMomentSeconds)})`;
    }
    if (jumpQuietestBtn) {
      const showQuietest = report.tinnitus !== 'off';
      jumpQuietestBtn.hidden = !showQuietest;
      jumpQuietestBtn.disabled = !showQuietest;
      jumpQuietestBtn.textContent = `Quietest (${formatTime(report.quietestMomentSeconds)})`;
    }
    if (instantSummaryEl) {
      instantSummaryEl.textContent = buildInstantSummary(report);
    }
    const scope = report.section
      ? `${formatTime(report.section.start)} to ${formatTime(report.section.end)}`
      : 'Whole clip';
    const tinnitusLabel = report.tinnitus === 'off' ? '' : ` · ${report.tinnitus === 'ringing' ? 'Ringing' : 'Hiss'}`;
    chat.setContext(`${report.profileLabel}${tinnitusLabel} · ${scope}`);
    syncAiControls();
  }

  async function runAiExplanation(userQuestion = '', useModel = false) {
    if (!currentReport || activeGeneration) return;
    const detailsEl = container.querySelector('.chatbot-details');
    if (detailsEl) detailsEl.open = true;
    chat.begin(userQuestion || 'What changed in this clip?');
    if (userQuestion && chatHistoryEl && aiOutputEl) {
      const userBub = document.createElement('div');
      userBub.className = 'chat-bubble user';
      userBub.textContent = userQuestion;
      chatHistoryEl.insertBefore(userBub, aiOutputEl);
    }
    const selectedModel = modelSelect?.value || WEBLLM_MODELS[0].id;
    if (isMedicalAdviceQuery(userQuestion) || !webgpuSupported
      || (!useModel && client.getLoadedModel?.() !== selectedModel)) {
      if (aiOutputEl) {
        aiOutputEl.hidden = false;
        aiOutputEl.textContent = buildGroundedDeepDive(currentReport, userQuestion);
      }
      if (chatHistoryEl) chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
      return;
    }

    const controller = new AbortController();
    activeGeneration = controller;
    syncAiControls();

    // Keep the browser event & WebGPU compositor queue unthrottled while WebLLM streams tokens
    // even after audio playback stops (when upload-preview cancels its playback rAF loop).
    let keepAliveRaf = 0;
    const tickRaf = () => {
      if (activeGeneration !== controller) return;
      keepAliveRaf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(tickRaf) : 0;
    };
    tickRaf();
    const keepAliveTimer = setInterval(() => {
      if (aiOutputEl && activeGeneration === controller) {
        aiOutputEl.dataset.streaming = 'true';
      }
    }, 120);

    if (aiOutputEl) {
      aiOutputEl.hidden = false;
      aiOutputEl.dataset.streaming = 'true';
      aiOutputEl.removeAttribute('data-error');
      const alreadyLoaded = client.getLoadedModel?.() === selectedModel;
      aiOutputEl.textContent = userQuestion
        ? `Thinking about "${userQuestion}"…`
        : alreadyLoaded
          ? 'Generating explanation from your clip’s acoustic measurements…'
          : preloading
            ? 'Finishing background AI warmup, then generating…'
            : 'Loading local AI model on this device…';
    }

    try {
      const { text, aborted } = await client.generateExplanation({
        modelId: selectedModel,
        report: currentReport,
        userQuestion,
        signal: controller.signal,
        onProgress: ({ progress, text: note }) => {
          if (activeGeneration !== controller) return;
          if (progressWrap) progressWrap.hidden = false;
          if (progressBar) {
            const pct = Math.max(0, Math.min(1, Number(progress) || 0));
            progressBar.value = pct;
            progressBar.setAttribute('aria-valuetext', `${Math.round(pct * 100)}%`);
          }
          if (progressText) progressText.textContent = note;
        },
        onToken: (_delta, fullText) => {
          if (activeGeneration !== controller) return;
          if (progressWrap) progressWrap.hidden = true;
          if (aiOutputEl) aiOutputEl.textContent = fullText;
          if (chatHistoryEl) chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
        },
      });

      if (activeGeneration !== controller) return;
      if (progressWrap) progressWrap.hidden = true;
      if (aiOutputEl) {
        if (text.trim()) {
          aiOutputEl.textContent = aborted ? `${text.trim()} [Stopped]` : text.trim();
        } else if (aborted) {
          aiOutputEl.textContent = 'Generation stopped.';
        }
      }
    } catch (error) {
      if (activeGeneration !== controller) return;
      if (progressWrap) progressWrap.hidden = true;
      if (error?.code === 'WEBGPU_UNAVAILABLE' && webgpuNote) {
        webgpuNote.hidden = false;
      }
      if (aiOutputEl) {
        aiOutputEl.hidden = false;
        aiOutputEl.dataset.error = 'true';
        aiOutputEl.textContent = error?.message || 'Local AI explanation could not run in this browser. The instant measured breakdown above remains accurate.';
      }
    } finally {
      clearInterval(keepAliveTimer);
      if (keepAliveRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(keepAliveRaf);
      if (activeGeneration === controller) {
        activeGeneration = null;
        if (aiOutputEl) delete aiOutputEl.dataset.streaming;
        if (client.getLoadedModel?.()) updateBadge('Local AI ready · Instant & free');
        syncAiControls();
      }
    }
  }

  jumpBrightestBtn?.addEventListener('click', () => {
    if (currentReport) onSeek(currentReport.brightestMomentSeconds);
  });
  jumpQuietestBtn?.addEventListener('click', () => {
    if (currentReport) onSeek(currentReport.quietestMomentSeconds);
  });
  generateBtn?.addEventListener('click', () => {
    void runAiExplanation('', true);
  });
  stopBtn?.addEventListener('click', () => {
    activeGeneration?.abort();
  });
  function submitQuestion() {
    const q = questionInput?.value?.trim() || '';
    if (!q) {
      questionInput?.focus();
      return;
    }
    questionInput.value = '';
    void runAiExplanation(q);
  }
  askBtn?.addEventListener('click', submitQuestion);
  questionInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitQuestion();
    }
  });
  for (const btn of starterBtns) {
    btn.addEventListener('click', () => {
      const q = btn.dataset.explainerQuestion || btn.textContent?.trim() || '';
      if (q) void runAiExplanation(q);
    });
  }

  syncAiControls();

  return {
    updateFromBuffers(originalBuffer, simulatedBuffer, options = {}) {
      const settingsKey = JSON.stringify([
        originalBuffer?.length ?? 0,
        options.profileId || 'original',
        options.profileLabel || '',
        options.tinnitus || 'off',
        options.section ? [options.section.start, options.section.end] : null,
      ]);
      const settingsChanged = settingsKey !== lastSettingsKey;
      lastSettingsKey = settingsKey;

      if (settingsChanged) {
        activeGeneration?.abort();
        activeGeneration = null;
        if (!preloading && progressWrap) progressWrap.hidden = true;
        chat.reset();
      }
      const report = analyseClipChanges(originalBuffer, simulatedBuffer, options);
      renderReport(report);
      return report;
    },
    reset() {
      activeGeneration?.abort();
      activeGeneration = null;
      currentReport = null;
      lastSettingsKey = '';
      container.hidden = true;
      if (pillsEl) pillsEl.replaceChildren();
      if (instantSummaryEl) instantSummaryEl.textContent = '';
      if (!preloading && progressWrap) progressWrap.hidden = true;
      chat.reset();
      if (aiOutputEl) {
        aiOutputEl.hidden = true;
        aiOutputEl.textContent = '';
      }
      if (chatHistoryEl) {
        for (const extra of chatHistoryEl.querySelectorAll('.chat-bubble.user')) extra.remove();
      }
      if (questionInput) questionInput.value = '';
      syncAiControls();
    },
    preload: warmModelInBackground,
    getReport: () => currentReport,
    dispose: () => client.dispose(),
  };
}
