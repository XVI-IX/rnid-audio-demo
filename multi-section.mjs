// Multi-Section Timeline Effects ("Different effects for different sections of a video or song")
// Allows assigning distinct hearing-loss & tinnitus presets to multiple chapters across a clip,
// with smooth 0.15s equal-gain crossfades for live playback, WAV export, and MP4/WebM video export.

import { getEffectTheme } from './output-calibration.mjs';
import { activeRmsDb, audibleTinnitusGain, tinnitusLoop } from './upload-tinnitus.mjs';

export const CHAPTER_FADE_SECONDS = 0.15;
const PEAK_LIMIT = 10 ** (-1 / 20);

export function createDefaultStorySegments(durationSeconds = 12) {
  const d = Math.max(1.5, Number(durationSeconds) || 12);
  const t1 = Math.round((d / 3) * 10) / 10;
  const t2 = Math.round(((2 * d) / 3) * 10) / 10;
  return [
    {
      id: 'seg-1',
      start: 0,
      end: t1,
      profileId: 'original',
      tinnitus: 'off',
      label: 'Original clarity',
    },
    {
      id: 'seg-2',
      start: t1,
      end: t2,
      profileId: 'post_gig_muffled_v1',
      tinnitus: 'off',
      label: 'Post-gig muffled',
    },
    {
      id: 'seg-3',
      start: t2,
      end: Math.round(d * 10) / 10,
      profileId: 'nihl_demo_v1',
      tinnitus: 'ringing',
      label: 'Permanent loss + ringing',
    },
  ];
}

export function normaliseMultiSegments(segments = [], durationSeconds = 12) {
  const dur = Math.max(0.5, Number(durationSeconds) || 0.5);
  if (!Array.isArray(segments) || segments.length === 0) return [];
  const cleaned = segments
    .map((seg, idx) => {
      const start = Math.max(0, Math.min(dur, Number(seg.start) || 0));
      const end = Math.max(0, Math.min(dur, Number(seg.end) || dur));
      if (end - start < 0.25) return null;
      const profileId = seg.profileId || 'original';
      const tinnitus = seg.tinnitus === 'ringing' || seg.tinnitus === 'hiss' ? seg.tinnitus : 'off';
      const theme = getEffectTheme(profileId === 'original' && tinnitus !== 'off' ? tinnitus : profileId);
      return {
        id: seg.id || `seg-${idx + 1}`,
        start: Math.round(start * 100) / 100,
        end: Math.round(end * 100) / 100,
        profileId,
        tinnitus,
        color: theme.color,
        icon: theme.icon,
        label: seg.label || theme.label,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);
  return cleaned;
}

export function findSegmentAtTime(segments, seconds) {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const seg = segments[i];
    if (seconds >= seg.start && seconds <= seg.end) return seg;
  }
  return null;
}

// Smooth raised-trapezoid weight inside [seg.start, seg.end]
export function segmentEnvelopeWeight(seconds, seg, isFirst = false, isLast = false) {
  if (seconds < seg.start - CHAPTER_FADE_SECONDS || seconds > seg.end + CHAPTER_FADE_SECONDS) return 0;
  const span = Math.max(0.25, seg.end - seg.start);
  const fade = Math.min(CHAPTER_FADE_SECONDS, span / 4);
  if (seconds < seg.start) return 0;
  if (seconds > seg.end) return 0;
  let w = 1;
  if (!isFirst && seconds < seg.start + fade) {
    w = Math.min(w, (seconds - seg.start) / fade);
  }
  if (!isLast && seconds > seg.end - fade) {
    w = Math.min(w, (seg.end - seconds) / fade);
  }
  return Math.max(0, Math.min(1, w));
}

// Offline sample-accurate render of a multi-section buffer (used cleanly by live playback, WAV export, and Video export!)
export function mixMultiSectionBuffer(
  originalBuffer,
  rawSegments,
  renderedByProfile,
  {
    earGains = [1, 1],
    tinnitusBoostLinear = 1,
    length = originalBuffer.length,
  } = {},
) {
  const sampleRate = originalBuffer.sampleRate;
  const duration = length / sampleRate;
  const segments = normaliseMultiSegments(rawSegments, duration);
  const outChannels = 2;
  const leftOut = new Float32Array(length);
  const rightOut = new Float32Array(length);

  const origL = originalBuffer.getChannelData(0);
  const origR = originalBuffer.numberOfChannels > 1 ? originalBuffer.getChannelData(1) : origL;

  // Initialize with original audio everywhere (gaps outside segments stay original!)
  for (let i = 0; i < length; i += 1) {
    leftOut[i] = origL[i];
    rightOut[i] = origR[i];
  }
  if (segments.length === 0) {
    return {
      length,
      sampleRate,
      numberOfChannels: outChannels,
      getChannelData: (c) => (c === 0 ? leftOut : rightOut),
    };
  }

  const refDb = activeRmsDb(originalBuffer);
  const loops = new Map();
  const getLoopAndGain = (sound) => {
    if (!sound || sound === 'off') return null;
    if (!loops.has(sound)) {
      const loop = tinnitusLoop(sound, sampleRate);
      const gain = audibleTinnitusGain(sound, loop, refDb, tinnitusBoostLinear);
      loops.set(sound, { loop, gain });
    }
    return loops.get(sound);
  };

  // Blend segments seamlessly over original baseline
  for (let i = 0; i < length; i += 1) {
    const sec = i / sampleRate;
    let totalSegWeight = 0;
    let accumL = 0;
    let accumR = 0;

    for (let s = 0; s < segments.length; s += 1) {
      const seg = segments[s];
      if (sec < seg.start || sec > seg.end) continue;
      const touchingPrev = s > 0 && Math.abs(segments[s - 1].end - seg.start) < 0.05;
      const touchingNext = s + 1 < segments.length && Math.abs(segments[s + 1].start - seg.end) < 0.05;
      const w = segmentEnvelopeWeight(
        sec,
        seg,
        seg.start <= 0.02 && !touchingPrev,
        seg.end >= duration - 0.02 && !touchingNext,
      );
      if (w <= 0) continue;

      const profBuf = seg.profileId === 'original'
        ? originalBuffer
        : (renderedByProfile.get(seg.profileId) ?? originalBuffer);
      const pL = profBuf.getChannelData(0)[i] ?? 0;
      const pR = (profBuf.numberOfChannels > 1 ? profBuf.getChannelData(1)[i] : pL) ?? 0;
      const isOrigOnly = seg.profileId === 'original' && seg.tinnitus === 'off';
      const gL = isOrigOnly ? 1 : (earGains[0] ?? 1);
      const gR = isOrigOnly ? 1 : (earGains[1] ?? 1);

      const tin = getLoopAndGain(seg.tinnitus);
      const tinSample = tin ? tin.gain * tin.loop[i % tin.loop.length] : 0;

      accumL += w * (gL * pL + tinSample);
      accumR += w * (gR * pR + tinSample);
      totalSegWeight += w;
    }

    if (totalSegWeight > 0) {
      const dryWeight = Math.max(0, 1 - totalSegWeight);
      const norm = totalSegWeight > 1 ? 1 / totalSegWeight : 1;
      leftOut[i] = origL[i] * dryWeight + accumL * norm;
      rightOut[i] = origR[i] * dryWeight + accumR * norm;
    }
  }

  // Guard true peak ceiling at -1 dBFS across the full timeline
  let peak = 0;
  for (let i = 0; i < length; i += 1) {
    const aL = Math.abs(leftOut[i]);
    const aR = Math.abs(rightOut[i]);
    if (aL > peak) peak = aL;
    if (aR > peak) peak = aR;
  }
  if (peak > PEAK_LIMIT) {
    const scale = PEAK_LIMIT / peak;
    for (let i = 0; i < length; i += 1) {
      leftOut[i] *= scale;
      rightOut[i] *= scale;
    }
  }

  return {
    length,
    sampleRate,
    numberOfChannels: outChannels,
    getChannelData: (c) => (c === 0 ? leftOut : rightOut),
  };
}
