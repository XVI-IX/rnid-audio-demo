// Tinnitus layers for the "Your audio" preview, synthesised on this device.
//
// The sounds follow fixtures/generate_web_demo.py (make_tinnitus): a 3.4 kHz ringing
// tone with slow pitch and level movement, and hiss band-limited to 2.7–9 kHz. The
// demo WAVs fade in and out, so they cannot loop under a long upload. These are
// 12-second loops built to repeat without a seam: the ringing's modulation rates are
// rounded to whole cycles per loop (0.42 → 5/12 Hz, 0.33 → 4/12 Hz), and the hiss is
// filtered circularly.
//
// Level follows the demo mix: in the studio clip the ringing sits 15.1 dB and the hiss
// 9.2 dB below the music's active RMS. Uploads keep those offsets against their own
// active RMS, so tinnitus is equally noticeable in quiet and loud recordings.

export const TINNITUS_SOUNDS = ['ringing', 'hiss'];
export const TINNITUS_LOOP_SECONDS = 12;
export const TINNITUS_OFFSET_DB = { ringing: -15.1, hiss: -9.2 };
export const AUDIBLE_TINNITUS_OFFSET_DB = { ringing: -5.5, hiss: -3.5 };
export const TINNITUS_MIN_RMS_DBFS = { ringing: -22.0, hiss: -19.0 };
export const TINNITUS_MAX_RMS_DBFS = { ringing: -13.5, hiss: -12.0 };
const TAU = 2 * Math.PI;
const PEAK_LIMIT = 10 ** (-1 / 20);  // keep the hearing-effect mix 1 dB below full scale

function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(next) {
  return Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(TAU * next());
}

// RBJ cookbook sections. Two sections with these Q values make a 4th-order Butterworth.
function section(type, frequency, q, sampleRate) {
  const w = TAU * frequency / sampleRate;
  const alpha = Math.sin(w) / (2 * q);
  const cos = Math.cos(w);
  const b = type === 'lowpass' ? [(1 - cos) / 2, 1 - cos, (1 - cos) / 2] : [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
  const a0 = 1 + alpha;
  return { b: b.map((value) => value / a0), a1: -2 * cos / a0, a2: (1 - alpha) / a0 };
}

function bandpassInPlace(samples, sampleRate, low, high, passes) {
  const q = [0.5411961, 1.3065630];
  const sections = [...q.map((value) => section('highpass', low, value, sampleRate)),
    ...q.map((value) => section('lowpass', Math.min(high, 0.45 * sampleRate), value, sampleRate))];
  const state = sections.map(() => [0, 0, 0, 0]);
  const length = samples.length;
  const output = new Float32Array(length);
  // Filtering the periodic noise several times over leaves a steady-state, seamless loop.
  for (let pass = 0; pass < passes; pass += 1) {
    for (let i = 0; i < length; i += 1) {
      let value = samples[i];
      for (let s = 0; s < sections.length; s += 1) {
        const { b, a1, a2 } = sections[s];
        const z = state[s];
        const result = b[0] * value + b[1] * z[0] + b[2] * z[1] - a1 * z[2] - a2 * z[3];
        z[1] = z[0]; z[0] = value; z[3] = z[2]; z[2] = result;
        value = result;
      }
      if (pass === passes - 1) output[i] = value;
    }
  }
  return output;
}

function rms(samples) {
  let sum = 0;
  for (const value of samples) sum += value * value;
  return Math.sqrt(sum / samples.length);
}

export function tinnitusLoop(sound, sampleRate) {
  const length = Math.round(TINNITUS_LOOP_SECONDS * sampleRate);
  if (sound === 'ringing') {
    const samples = new Float32Array(length);
    for (let i = 0; i < length; i += 1) {
      const t = i / sampleRate;
      const phase = TAU * 3400 * t + 6 * Math.sin(TAU * (5 / 12) * t);
      samples[i] = 0.011 * (0.91 + 0.09 * Math.sin(TAU * (4 / 12) * t)) * Math.sin(phase);
    }
    return samples;
  }
  if (sound === 'hiss') {
    const next = random(72131);
    const noise = new Float32Array(length);
    for (let i = 0; i < length; i += 1) noise[i] = gaussian(next);
    const samples = bandpassInPlace(noise, sampleRate, 2700, 9000, 2);
    const scale = 0.014 / rms(samples);
    for (let i = 0; i < length; i += 1) samples[i] *= scale;
    return samples;
  }
  throw new Error(`Unknown tinnitus sound: ${sound}`);
}

// Mean energy of the 400 ms mono blocks above -70 dBFS, in dBFS.
export function activeRmsDb(buffer) {
  const block = Math.max(1, Math.round(0.4 * buffer.sampleRate));
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
  let total = 0;
  let count = 0;
  for (let start = 0; start + block <= buffer.length; start += block) {
    let energy = 0;
    for (let i = start; i < start + block; i += 1) {
      let mono = 0;
      for (const data of channels) mono += data[i];
      mono /= channels.length;
      energy += mono * mono;
    }
    energy /= block;
    if (energy > 1e-7) {
      total += energy;
      count += 1;
    }
  }
  return count ? 10 * Math.log10(total / count) : -Infinity;
}

// Gain for the loop, relative to the original file's active level.
export function tinnitusGain(sound, loop, referenceDb) {
  if (!Number.isFinite(referenceDb)) return 0;
  const target = 10 ** ((referenceDb + TINNITUS_OFFSET_DB[sound]) / 20);
  return target / rms(loop);
}

// Perceptually clear tinnitus gain across quiet and dense music, with safe acoustic floor & ceiling.
export function audibleTinnitusGain(sound, loop, referenceDb, calibrationBoost = 1) {
  if (!(sound in AUDIBLE_TINNITUS_OFFSET_DB)) return 0;
  const loopRms = rms(loop);
  if (!(loopRms > 0)) return 0;
  const minDb = TINNITUS_MIN_RMS_DBFS[sound];
  const maxDb = TINNITUS_MAX_RMS_DBFS[sound];
  const baseDb = Number.isFinite(referenceDb)
    ? Math.max(minDb, referenceDb + AUDIBLE_TINNITUS_OFFSET_DB[sound])
    : minDb;
  const boostDb = 20 * Math.log10(Math.max(0.25, Number(calibrationBoost) || 1));
  const clampedDb = Math.min(maxDb, Math.max(minDb - 6, baseDb + boostDb));
  return (10 ** (clampedDb / 20)) / loopRms;
}

// One scale for the hearing effect and tinnitus together, so their sum never clips.
export function mixScale(buffer, loop, gain) {
  let peak = 0;
  for (let c = 0; c < buffer.numberOfChannels; c += 1) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < buffer.length; i += 1) {
      const value = Math.abs(data[i] + (loop ? gain * loop[i % loop.length] : 0));
      if (value > peak) peak = value;
    }
  }
  return peak > PEAK_LIMIT ? PEAK_LIMIT / peak : 1;
}

// A WAV-ready buffer of the hearing effect with tinnitus, trimmed to `length` frames.
export function mixTinnitus(buffer, loop, gain, scale = 1, length = buffer.length, earGains) {
  const channels = Array.from({ length: earGains ? 2 : buffer.numberOfChannels }, (_, c) => {
    const data = buffer.getChannelData(Math.min(c, buffer.numberOfChannels - 1));
    const earGain = earGains?.[c] ?? 1;
    const mixed = new Float32Array(length);
    for (let i = 0; i < length; i += 1) mixed[i] = scale * (earGain * data[i] + (loop ? gain * loop[i % loop.length] : 0));
    return mixed;
  });
  return {
    length, sampleRate: buffer.sampleRate, numberOfChannels: channels.length,
    getChannelData: (channel) => channels[channel],
  };
}

// Attenuating only the clip puts the mix between its usual level and the tinnitus layer alone.
export function attenuatedMixScale(scale, loop, gain) {
  let peak = 0;
  for (const value of loop) peak = Math.max(peak, Math.abs(gain * value));
  return peak > PEAK_LIMIT ? Math.min(scale, PEAK_LIMIT / peak) : scale;
}
