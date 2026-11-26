// Deterministic, 100% copyright-free stereo "Busy pub / gig-bar crowd chatter" synthesiser.
// Models multi-talker babble (LTASS speech-shaped murmur concentrated at 180–1,400 Hz with
// natural 3–6 Hz syllabic modulation and stereo room spread) and crossfades loop seams cleanly.
// Because real pub chatter sits mostly in 180–1,200 Hz while speech consonants sit in 2–6 kHz,
// routing both music/vocals and pub chatter into the simulated ear makes the "cocktail party
// effect" visceral: Original hearing slices above the murmur, whereas a 4 kHz notch blurs words.

export const CROWD_MAX_GAIN = 0.42;

export function crowdPercentToGain(percent) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  if (clamped === 0) return 0;
  // Gentle perceptual curve so 35% gives a realistic conversational bar (~0.13 linear)
  return Number((CROWD_MAX_GAIN * ((clamped / 100) ** 1.15)).toFixed(4));
}

export function generateCrowdAmbienceSamples(sampleRate = 44100, durationSeconds = 8) {
  const rate = Math.max(8000, Math.round(sampleRate));
  const totalFrames = Math.max(Math.round(rate * 1), Math.round(rate * durationSeconds));
  const fadeFrames = Math.min(Math.round(rate * 0.25), Math.floor(totalFrames / 4));
  // Render slightly longer so we can overlap-add the tail into the head for a zero-seam loop
  const rawFrames = totalFrames + fadeFrames;

  const rawLeft = new Float32Array(rawFrames);
  const rawRight = new Float32Array(rawFrames);

  let seed = 0x51f2a9c3;
  const nextWhite = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed / 0xffffffff) * 2 - 1;
  };

  // Six virtual talker clusters panned across the stereo venue with distinct syllabic rates & formants
  const talkers = [
    { pan: -0.68, sylHz: 3.4, phraseHz: 0.43, phase: 0.2, f1: 310, f2: 880 },
    { pan: -0.36, sylHz: 4.3, phraseHz: 0.61, phase: 1.4, f1: 420, f2: 1180 },
    { pan: -0.10, sylHz: 5.1, phraseHz: 0.37, phase: 2.7, f1: 260, f2: 760 },
    { pan: 0.16, sylHz: 3.9, phraseHz: 0.53, phase: 3.8, f1: 480, f2: 1360 },
    { pan: 0.44, sylHz: 4.7, phraseHz: 0.49, phase: 4.9, f1: 350, f2: 980 },
    { pan: 0.72, sylHz: 3.6, phraseHz: 0.67, phase: 5.7, f1: 530, f2: 1520 },
  ];

  for (const voice of talkers) {
    const panAngle = ((voice.pan + 1) * Math.PI) / 4;
    const gainL = Math.cos(panAngle);
    const gainR = Math.sin(panAngle);

    // Two 2nd-order band-pass resonators (chest/vowel F1 + conversational F2)
    const makeResonator = (centerHz, q) => {
      const w0 = (2 * Math.PI * Math.min(centerHz, rate * 0.42)) / rate;
      const alpha = Math.sin(w0) / (2 * q);
      const b0 = alpha;
      const b2 = -alpha;
      const a0 = 1 + alpha;
      const a1 = (-2 * Math.cos(w0)) / a0;
      const a2 = (1 - alpha) / a0;
      return {
        b0: b0 / a0,
        b2: b2 / a0,
        a1,
        a2,
        x1: 0,
        x2: 0,
        y1: 0,
        y2: 0,
      };
    };

    const r1 = makeResonator(voice.f1, 2.2);
    const r2 = makeResonator(voice.f2, 2.8);

    for (let i = 0; i < rawFrames; i += 1) {
      const t = i / rate;
      const x = nextWhite();

      const y1 = r1.b0 * x + r1.b2 * r1.x2 - r1.a1 * r1.y1 - r1.a2 * r1.y2;
      r1.x2 = r1.x1;
      r1.x1 = x;
      r1.y2 = r1.y1;
      r1.y1 = y1;

      const y2 = r2.b0 * x + r2.b2 * r2.x2 - r2.a1 * r2.y1 - r2.a2 * r2.y2;
      r2.x2 = r2.x1;
      r2.x1 = x;
      r2.y2 = r2.y1;
      r2.y1 = y2;

      const sylEnv = 0.52 + 0.48 * Math.sin(2 * Math.PI * voice.sylHz * t + voice.phase);
      const phraseEnv = 0.62 + 0.38 * Math.sin(2 * Math.PI * voice.phraseHz * t + voice.phase * 1.7);
      const env = sylEnv * sylEnv * phraseEnv;
      const sample = (y1 * 0.72 + y2 * 0.46) * env;

      rawLeft[i] += sample * gainL;
      rawRight[i] += sample * gainR;
    }
  }

  // Add subtle diffuse low-mid room air (150–600 Hz) so the venue feels continuous rather than choppy
  let lpL = 0;
  let lpR = 0;
  let hpL = 0;
  let hpR = 0;
  const lpAlpha = Math.min(0.35, (2 * Math.PI * 520) / rate);
  const hpAlpha = Math.min(0.15, (2 * Math.PI * 130) / rate);
  for (let i = 0; i < rawFrames; i += 1) {
    lpL += lpAlpha * (nextWhite() - lpL);
    lpR += lpAlpha * (nextWhite() - lpR);
    hpL += hpAlpha * (lpL - hpL);
    hpR += hpAlpha * (lpR - hpR);
    rawLeft[i] += (lpL - hpL) * 0.16;
    rawRight[i] += (lpR - hpR) * 0.16;
  }

  // Equal-power crossfade tail into head for a seamless loop of exact length `totalFrames`
  const left = new Float32Array(totalFrames);
  const right = new Float32Array(totalFrames);
  left.set(rawLeft.subarray(fadeFrames, fadeFrames + totalFrames));
  right.set(rawRight.subarray(fadeFrames, fadeFrames + totalFrames));

  for (let i = 0; i < fadeFrames; i += 1) {
    const theta = ((i + 0.5) / fadeFrames) * (Math.PI / 2);
    const headGain = Math.sin(theta);
    const tailGain = Math.cos(theta);
    const tailIndex = totalFrames - fadeFrames + i;
    left[tailIndex] = left[tailIndex] * tailGain + rawLeft[i] * headGain;
    right[tailIndex] = right[tailIndex] * tailGain + rawRight[i] * headGain;
  }

  // Peak-normalise to -3.5 dBFS (0.668) so crowdGain controls predictable SNR
  let peak = 1e-6;
  for (let i = 0; i < totalFrames; i += 1) {
    const m = Math.max(Math.abs(left[i]), Math.abs(right[i]));
    if (m > peak) peak = m;
  }
  const norm = 0.668 / peak;
  for (let i = 0; i < totalFrames; i += 1) {
    left[i] *= norm;
    right[i] *= norm;
  }

  return { left, right, sampleRate: rate, length: totalFrames, duration: totalFrames / rate };
}

const cachedBuffers = new WeakMap();
const cachedCheerBuffers = new WeakMap();

export function createCrowdAmbienceBuffer(context, durationSeconds = 8) {
  if (cachedBuffers.has(context)) return cachedBuffers.get(context);
  const { left, right, sampleRate, length } = generateCrowdAmbienceSamples(context.sampleRate, durationSeconds);
  const buffer = context.createBuffer(2, length, sampleRate);
  if (typeof buffer.copyToChannel === 'function') {
    buffer.copyToChannel(left, 0);
    buffer.copyToChannel(right, 1);
  } else if (typeof buffer.getChannelData === 'function') {
    buffer.getChannelData(0).set(left);
    buffer.getChannelData(1).set(right);
  }
  cachedBuffers.set(context, buffer);
  return buffer;
}

// Deterministic, 100% copyright-free stereo live-concert "Crowd Cheering & Applause" synthesiser.
// Panned wide across the left/right audience wings so center lead vocals stay clear, combining:
//   1. Warm arena cheering swells & rising vocal excitement formants (240–1,600 Hz)
//   2. Crisp individual stereo handclaps & celebratory crowd whistles (2.2–9.5 kHz) — which
//      sparkle with Healthy ears/Earplugs and turn into dull static under high-frequency loss!
export function generateCrowdCheeringSamples(sampleRate = 44100, durationSeconds = 8) {
  const rate = Math.max(8000, Math.round(sampleRate));
  const totalFrames = Math.max(Math.round(rate * 1), Math.round(rate * durationSeconds));
  const fadeFrames = Math.min(Math.round(rate * 0.35), Math.floor(totalFrames / 4));
  const rawFrames = totalFrames + fadeFrames;

  const rawLeft = new Float32Array(rawFrames);
  const rawRight = new Float32Array(rawFrames);

  let seed = 0x7c3e91b5;
  const nextRand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const nextWhite = () => nextRand() * 2 - 1;

  const makeResonator = (centerHz, q) => {
    const w0 = (2 * Math.PI * Math.min(centerHz, rate * 0.43)) / rate;
    const alpha = Math.sin(w0) / (2 * q);
    const a0 = 1 + alpha;
    return {
      b0: alpha / a0,
      b2: -alpha / a0,
      a1: (-2 * Math.cos(w0)) / a0,
      a2: (1 - alpha) / a0,
      x1: 0,
      x2: 0,
      y1: 0,
      y2: 0,
    };
  };

  // 1. Wide stereo cheering voice clusters ("wooo!" / "yeah!" stadium swells)
  const cheerClusters = [
    { pan: -0.88, f1: 420, f2: 1150, swellHz: 0.24, phase: 0.3 },
    { pan: -0.64, f1: 540, f2: 1480, swellHz: 0.31, phase: 1.7 },
    { pan: -0.46, f1: 350, f2: 960, swellHz: 0.19, phase: 3.1 },
    { pan: 0.48, f1: 490, f2: 1320, swellHz: 0.27, phase: 0.9 },
    { pan: 0.68, f1: 610, f2: 1620, swellHz: 0.34, phase: 2.4 },
    { pan: 0.9, f1: 390, f2: 1080, swellHz: 0.22, phase: 4.2 },
  ];

  for (const c of cheerClusters) {
    const angle = ((c.pan + 1) * Math.PI) / 4;
    const gL = Math.cos(angle);
    const gR = Math.sin(angle);
    const r1 = makeResonator(c.f1, 2.6);
    const r2 = makeResonator(c.f2, 3.2);

    for (let i = 0; i < rawFrames; i += 1) {
      const t = i / rate;
      const x = nextWhite();
      const y1 = r1.b0 * x + r1.b2 * r1.x2 - r1.a1 * r1.y1 - r1.a2 * r1.y2;
      r1.x2 = r1.x1; r1.x1 = x; r1.y2 = r1.y1; r1.y1 = y1;
      const y2 = r2.b0 * x + r2.b2 * r2.x2 - r2.a1 * r2.y1 - r2.a2 * r2.y2;
      r2.x2 = r2.x1; r2.x1 = x; r2.y2 = r2.y1; r2.y1 = y2;

      const wave = 0.54 + 0.46 * Math.sin(2 * Math.PI * c.swellHz * t + c.phase);
      const flutter = 0.78 + 0.22 * Math.sin(2 * Math.PI * 6.2 * t + c.phase * 2.1);
      const v = (y1 * 0.58 + y2 * 0.52) * wave * wave * flutter * 0.65;
      rawLeft[i] += v * gL;
      rawRight[i] += v * gR;
    }
  }

  // 2. Crisp scattered stereo applause / handclaps (1.8–8.5 kHz transients across the crowd)
  const clapCount = Math.max(28, Math.round(durationSeconds * 26));
  const clapLen = Math.round(rate * 0.042);
  for (let k = 0; k < clapCount; k += 1) {
    const startFrame = Math.floor(nextRand() * Math.max(1, rawFrames - clapLen - 1));
    const sideSign = k % 2 === 0 ? -1 : 1;
    const pan = sideSign * (0.35 + nextRand() * 0.6);
    const angle = ((pan + 1) * Math.PI) / 4;
    const gL = Math.cos(angle);
    const gR = Math.sin(angle);
    const clapFreq = 2100 + nextRand() * 3400;
    const res = makeResonator(clapFreq, 1.5);
    const amp = 0.24 + nextRand() * 0.34;

    for (let j = 0; j < clapLen; j += 1) {
      const env = Math.exp(-j / (rate * 0.0085)) * (j < rate * 0.002 ? j / (rate * 0.002) : 1);
      const x = nextWhite();
      const y = res.b0 * x + res.b2 * res.x2 - res.a1 * res.y1 - res.a2 * res.y2;
      res.x2 = res.x1; res.x1 = x; res.y2 = res.y1; res.y1 = y;
      const sample = (y * 0.78 + x * 0.18) * env * amp;
      rawLeft[startFrame + j] += sample * gL;
      rawRight[startFrame + j] += sample * gR;
    }
  }

  // 3. Subtle celebratory crowd whistles in the distance (2.5–3.2 kHz pitch-arched)
  const whistleCount = Math.max(1, Math.round(durationSeconds * 0.4));
  const whistleLen = Math.round(rate * 0.32);
  for (let w = 0; w < whistleCount; w += 1) {
    const startFrame = Math.floor(((w + 0.35) / whistleCount) * Math.max(1, rawFrames - whistleLen - 1));
    const pan = w % 2 === 0 ? -0.72 : 0.74;
    const angle = ((pan + 1) * Math.PI) / 4;
    const gL = Math.cos(angle);
    const gR = Math.sin(angle);
    const baseHz = 2580 + w * 210;
    let phase = 0;
    for (let j = 0; j < whistleLen; j += 1) {
      const u = j / whistleLen;
      const env = Math.sin(Math.PI * u) ** 1.6;
      const instHz = baseHz + Math.sin(Math.PI * u) * 260;
      phase += (2 * Math.PI * instHz) / rate;
      const sample = Math.sin(phase) * env * 0.055;
      rawLeft[startFrame + j] += sample * gL;
      rawRight[startFrame + j] += sample * gR;
    }
  }

  // Equal-power loop seam crossfade
  const left = new Float32Array(totalFrames);
  const right = new Float32Array(totalFrames);
  left.set(rawLeft.subarray(fadeFrames, fadeFrames + totalFrames));
  right.set(rawRight.subarray(fadeFrames, fadeFrames + totalFrames));

  for (let i = 0; i < fadeFrames; i += 1) {
    const theta = ((i + 0.5) / fadeFrames) * (Math.PI / 2);
    const headGain = Math.sin(theta);
    const tailGain = Math.cos(theta);
    const tailIdx = totalFrames - fadeFrames + i;
    left[tailIdx] = left[tailIdx] * tailGain + rawLeft[i] * headGain;
    right[tailIdx] = right[tailIdx] * tailGain + rawRight[i] * headGain;
  }

  let peak = 1e-6;
  for (let i = 0; i < totalFrames; i += 1) {
    const m = Math.max(Math.abs(left[i]), Math.abs(right[i]));
    if (m > peak) peak = m;
  }
  const norm = 0.65 / peak;
  for (let i = 0; i < totalFrames; i += 1) {
    left[i] *= norm;
    right[i] *= norm;
  }

  return { left, right, sampleRate: rate, length: totalFrames, duration: totalFrames / rate };
}

export function createCrowdCheeringBuffer(context, durationSeconds = 8) {
  if (cachedCheerBuffers.has(context)) return cachedCheerBuffers.get(context);
  const { left, right, sampleRate, length } = generateCrowdCheeringSamples(context.sampleRate, durationSeconds);
  const buffer = context.createBuffer(2, length, sampleRate);
  if (typeof buffer.copyToChannel === 'function') {
    buffer.copyToChannel(left, 0);
    buffer.copyToChannel(right, 1);
  } else if (typeof buffer.getChannelData === 'function') {
    buffer.getChannelData(0).set(left);
    buffer.getChannelData(1).set(right);
  }
  cachedCheerBuffers.set(context, buffer);
  return buffer;
}
