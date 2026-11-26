// In-browser preview of the RNID hearing-loss filters.
//
// Renders an approximate simulation of a user's clip with the level-indexed impulse
// responses written by `python -m rnid.filters browser-set`. It reproduces only the average
// tonal change of the Cambridge MSBG model at the clip's level; the server render remains
// the reference result. No page code lives here: the studio decides layout and wording.
//
// Typical use:
//   const index = await loadFilterIndex('./filters/browser/index.json');
//   const decoded = await new AudioContext().decodeAudioData(await file.arrayBuffer());
//   const { buffer, levels } = await renderPreview(decoded, index, 'high_frequency_demo_v1');
//   const wav = new Blob([encodeWav(buffer)], { type: 'audio/wav' });

export const SCHEMA_VERSION = '1.0';
// Matches DEFAULT_LEVEL_DBFS in src/rnid/filters.py, used when both channels are silent.
export const DEFAULT_LEVEL_DBFS = -20;

export function validateIndex(index) {
  if (index?.schema_version !== SCHEMA_VERSION) throw new Error('Unsupported filter index version.');
  const levels = index.levels_dbfs;
  if (!Array.isArray(levels) || levels.length < 2 || !levels.every(Number.isFinite)
      || levels.some((level, i) => i > 0 && level <= levels[i - 1])) {
    throw new Error('The filter index levels are invalid.');
  }
  if (!Number.isFinite(index.silent_below_dbfs) || !(index.sample_rate_hz > 0)
      || !Array.isArray(index.profiles) || !index.profiles.length) {
    throw new Error('The filter index is incomplete.');
  }
  for (const profile of index.profiles) {
    if (typeof profile?.id !== 'string' || !levels.every((level) => typeof profile.files?.[String(level)] === 'string')) {
      throw new Error('A filter profile is missing a level.');
    }
  }
  return index;
}

export async function loadFilterIndex(indexUrl, fetchImpl = fetch) {
  const base = typeof location === 'undefined' ? undefined : location.href;
  const url = new URL(indexUrl, base);
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error('The filter index is unavailable.');
  return { ...validateIndex(await response.json()), baseUrl: url.href };
}

function rmsDbfs(samples) {
  let power = 0;
  for (let i = 0; i < samples.length; i += 1) power += samples[i] * samples[i];
  return samples.length && power > 0 ? 10 * Math.log10(power / samples.length) : -Infinity;
}

// RMS of each channel in dBFS. A mono buffer counts as dual mono.
export function channelLevelsDbfs(buffer) {
  const left = rmsDbfs(buffer.getChannelData(0));
  return { left, right: buffer.numberOfChannels > 1 ? rmsDbfs(buffer.getChannelData(1)) : left };
}

// Mirrors filters.bundle_levels: a silent ear borrows the other ear's level.
export function earLevels(levels, silentBelowDbfs) {
  const audible = (level) => Number.isFinite(level) && level >= silentBelowDbfs;
  const fallback = audible(levels.left) ? levels.left : audible(levels.right) ? levels.right : DEFAULT_LEVEL_DBFS;
  return {
    left: audible(levels.left) ? levels.left : fallback,
    right: audible(levels.right) ? levels.right : fallback,
  };
}

// Mirrors filters.blend_weights: the two nearest design levels and the upper weight.
export function blendWeights(levelDbfs, levels) {
  const level = Math.min(Math.max(levelDbfs, levels[0]), levels[levels.length - 1]);
  for (let i = 1; i < levels.length; i += 1) {
    if (level <= levels[i]) {
      return { lower: levels[i - 1], upper: levels[i], weight: (level - levels[i - 1]) / (levels[i] - levels[i - 1]) };
    }
  }
  const last = levels[levels.length - 1];
  return { lower: last, upper: last, weight: 0 };
}

async function decodeFilter(context, url, fetchImpl) {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error('A hearing filter file is unavailable.');
  // decodeAudioData resamples the 44.1 kHz filter to the context's rate.
  const buffer = await context.decodeAudioData(await response.arrayBuffer());
  if (buffer.numberOfChannels !== 2) throw new Error('A hearing filter must have two channels.');
  return buffer;
}

// Stereo impulse response for the context, blended per ear for the given levels.
export async function buildImpulseResponse(context, index, profileId, levels, fetchImpl = fetch) {
  const profile = index.profiles.find(({ id }) => id === profileId);
  if (!profile) throw new Error('That hearing profile has no browser filters.');
  const blends = [levels.left, levels.right].map((level) => blendWeights(level, index.levels_dbfs));
  const needed = [...new Set(blends.flatMap(({ lower, upper }) => [lower, upper]))];
  const decoded = new Map(await Promise.all(needed.map(async (level) => [
    level, await decodeFilter(context, new URL(profile.files[String(level)], index.baseUrl), fetchImpl),
  ])));
  const length = Math.max(...[...decoded.values()].map((buffer) => buffer.length));
  const response = context.createBuffer(2, length, context.sampleRate);
  // Resampling keeps sample amplitudes but changes the sample count, which scales the
  // filter's gain by the rate ratio (+0.74 dB at 48 kHz). Undo that.
  const rateGain = index.sample_rate_hz / context.sampleRate;
  blends.forEach(({ lower, upper, weight }, ear) => {
    const target = response.getChannelData(ear);
    const low = decoded.get(lower).getChannelData(ear);
    const high = decoded.get(upper).getChannelData(ear);
    for (let i = 0; i < low.length; i += 1) target[i] = rateGain * (1 - weight) * low[i];
    for (let i = 0; i < high.length; i += 1) target[i] += rateGain * weight * high[i];
  });
  return response;
}

// Approximate simulation of `source`, same length and sample rate, always stereo.
export async function renderPreview(source, index, profileId, fetchImpl = fetch) {
  const levels = earLevels(channelLevelsDbfs(source), index.silent_below_dbfs);
  const context = new OfflineAudioContext(2, source.length, source.sampleRate);
  const impulse = await buildImpulseResponse(context, index, profileId, levels, fetchImpl);
  // Normalisation would undo the level change that the hearing loss applies.
  const convolver = new ConvolverNode(context, { disableNormalization: true, buffer: impulse });
  const player = new AudioBufferSourceNode(context, { buffer: source });
  player.connect(convolver).connect(context.destination);
  player.start(0);
  const buffer = await context.startRendering();
  return { buffer, levels, profileId, method: index.method, approximate: true };
}

// 24-bit or 16-bit PCM WAV bytes for an AudioBuffer, clipped to full scale.
export function encodeWav(buffer, bitDepth = 24) {
  if (bitDepth !== 16 && bitDepth !== 24) throw new Error('Choose 16 or 24 bits.');
  const channels = buffer.numberOfChannels;
  const bytes = bitDepth / 8;
  const dataSize = buffer.length * channels * bytes;
  const view = new DataView(new ArrayBuffer(44 + dataSize));
  const text = (offset, value) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * bytes, true);
  view.setUint16(32, channels * bytes, true);
  view.setUint16(34, bitDepth, true);
  text(36, 'data');
  view.setUint32(40, dataSize, true);
  const full = 2 ** (bitDepth - 1);
  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < buffer.length; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      const value = Math.max(-full, Math.min(full - 1, Math.round(data[c][i] * full)));
      if (bytes === 2) view.setInt16(offset, value, true);
      else {
        view.setUint8(offset, value & 0xff);
        view.setUint8(offset + 1, (value >> 8) & 0xff);
        view.setUint8(offset + 2, (value >> 16) & 0xff);
      }
      offset += bytes;
    }
  }
  return view.buffer;
}
