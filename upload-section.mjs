// Applying the hearing effects to one section of an upload, with the original elsewhere.
//
// The weight w(t) is 0 outside the section and 1 inside, with linear crossfades of up to
// 0.2 s just inside each edge. The changed version is original × (1 − w) + effects × w.
// The original and the filtered sound are correlated, so linear (equal-gain) fades keep
// the level steady through the crossfade.

export const SECTION_FADE_SECONDS = 0.2;
export const MIN_SECTION_SECONDS = 0.5;

// A valid section inside [0, duration], or undefined for "whole clip".
export function normaliseSection(start, end, duration) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || !(duration > 0)) return undefined;
  const from = Math.min(Math.max(0, start), duration);
  const to = Math.min(Math.max(0, end), duration);
  if (to - from < MIN_SECTION_SECONDS) return undefined;
  return { start: from, end: to };
}

// The weight's corner points, as [seconds, weight] pairs in time order.
export function sectionPoints(section) {
  const fade = Math.min(SECTION_FADE_SECONDS, (section.end - section.start) / 4);
  return [[section.start, 0], [section.start + fade, 1], [section.end - fade, 1], [section.end, 0]];
}

export function sectionWeight(seconds, section) {
  const points = sectionPoints(section);
  if (seconds <= points[0][0] || seconds >= points[3][0]) return 0;
  for (let i = 1; i < points.length; i += 1) {
    const [time, weight] = points[i];
    if (seconds <= time) {
      const [before, previous] = points[i - 1];
      return previous + (weight - previous) * (seconds - before) / (time - before);
    }
  }
  return 0;
}

// Schedules w(t) (or 1 − w(t)) on an AudioParam for playback that starts at context time
// `when` from `offset` seconds into the clip.
export function scheduleSection(param, section, when, offset, invert = false) {
  const value = (weight) => (invert ? 1 - weight : weight);
  param.cancelScheduledValues(0);
  param.setValueAtTime(value(sectionWeight(offset, section)), when);
  for (const [seconds, weight] of sectionPoints(section)) {
    if (seconds > offset) param.linearRampToValueAtTime(value(weight), when + seconds - offset);
  }
}

// A WAV-ready buffer: effects (hearing loss and any tinnitus, scaled) inside the section
// and the original outside it. `original` may have fewer channels than `affected`.
export function mixSection(original, affected, { loop, gain = 0, scale = 1, earGains, section, length = affected.length }) {
  const channels = Array.from({ length: earGains ? 2 : affected.numberOfChannels }, (_, c) => {
    const changed = affected.getChannelData(Math.min(c, affected.numberOfChannels - 1));
    const source = original.getChannelData(Math.min(c, original.numberOfChannels - 1));
    const earGain = earGains?.[c] ?? 1;
    const mixed = new Float32Array(length);
    const rate = affected.sampleRate;
    const first = Math.max(0, Math.floor(section.start * rate));
    const last = Math.min(length, Math.ceil(section.end * rate));
    mixed.set(source.subarray(0, Math.min(first, length)));
    if (last < length) mixed.set(source.subarray(last, length), last);
    for (let i = first; i < last; i += 1) {
      const weight = sectionWeight(i / rate, section);
      const effect = scale * (earGain * changed[i] + (loop ? gain * loop[i % loop.length] : 0));
      mixed[i] = source[i] * (1 - weight) + effect * weight;
    }
    return mixed;
  });
  return {
    length, sampleRate: affected.sampleRate, numberOfChannels: channels.length,
    getChannelData: (channel) => channels[channel],
  };
}

export function sectionLabel(section, digits = 1) {
  return `${section.start.toFixed(digits)}-${section.end.toFixed(digits)}s`;
}
