// In-browser Social Campaign Audiogram Video Generator (9:16 Reels/TikTok & 16:9 Landscape)
// Turns any audio-only clip in "Your audio" into a ready-to-share awareness video showing live
// frequency bars, a clear ORIGINAL HEARING -> WITH HEARING LOSS transition, and RNID protection guidance.

import { recordingFormat, withWebmDuration } from './video-export.mjs?v=1e03b2b326';

export const CAMPAIGN_ASPECTS = Object.freeze({
  portrait: {
    id: 'portrait',
    label: '9:16 Vertical (Reels / TikTok / Shorts)',
    width: 720,
    height: 1280,
  },
  landscape: {
    id: 'landscape',
    label: '16:9 Landscape (YouTube / Slides)',
    width: 1280,
    height: 720,
  },
});

export function resolveCampaignTimeline({ duration = 0, section = null, markerSeconds = null } = {}) {
  const cleanDuration = Math.max(0.5, Number(duration) || 0.5);
  if (section && Number.isFinite(section.start) && Number.isFinite(section.end) && section.end - section.start >= 0.5) {
    return {
      mode: 'section',
      start: Math.max(0, Math.min(cleanDuration - 0.5, section.start)),
      end: Math.min(cleanDuration, Math.max(0.5, section.end)),
      duration: cleanDuration,
    };
  }
  // Default campaign split: play Original first, then switch to Hearing Loss at marker (or ~38% into clip)
  const rawMarker = markerSeconds !== null && markerSeconds !== '' && Number.isFinite(Number(markerSeconds))
    ? Number(markerSeconds)
    : null;
  const fallbackSplit = cleanDuration >= 3 ? Math.round(cleanDuration * 0.38 * 10) / 10 : cleanDuration * 0.4;
  const split = rawMarker !== null && rawMarker >= 0.4 && rawMarker <= cleanDuration - 0.5
    ? rawMarker
    : Math.max(0.25, Math.min(cleanDuration - 0.25, fallbackSplit));
  return {
    mode: 'split',
    start: Number(split.toFixed(2)),
    end: cleanDuration,
    duration: cleanDuration,
  };
}

export function isEffectActiveAtTime(seconds, timeline) {
  if (!timeline) return true;
  const t = Number(seconds) || 0;
  return t >= timeline.start && t <= timeline.end;
}

function formatClock(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const tenths = Math.round(s * 10);
  const mins = Math.floor(tenths / 600);
  const secs = String(Math.floor(tenths / 10) % 60).padStart(2, '0');
  return `${mins}:${secs}.${tenths % 10}`;
}

export function drawCampaignCardFrame(ctx, {
  width = 720,
  height = 1280,
  currentTime = 0,
  duration = 12,
  timeline = resolveCampaignTimeline({ duration }),
  trackTitle = 'Audio comparison',
  profileLabel = 'Post-gig muffled',
  tinnitus = 'off',
  spectrumDb = [],
} = {}) {
  const portrait = height > width;
  const active = isEffectActiveAtTime(currentTime, timeline);
  const pad = Math.round(Math.min(width, height) * 0.065);

  // 1. Background stage
  ctx.fillStyle = active ? '#17152b' : '#122026';
  ctx.fillRect(0, 0, width, height);

  // Top accent bar
  ctx.fillStyle = active ? '#ff8e72' : '#8ce0cb';
  ctx.fillRect(0, 0, width, Math.max(8, Math.round(height * 0.009)));

  // 2. Brand header
  const headerY = pad + (portrait ? 28 : 18);
  ctx.fillStyle = '#dce2f7';
  ctx.font = `700 ${portrait ? 24 : 22}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('RNID AUDIO TOOL · DON’T LOSE THE MUSIC', pad, headerY);

  // Track subtitle
  ctx.fillStyle = '#9aa5cb';
  ctx.font = `500 ${portrait ? 22 : 20}px system-ui, -apple-system, sans-serif`;
  const cleanTitle = String(trackTitle || 'Audio clip').slice(0, 44);
  ctx.fillText(`Track: ${cleanTitle}`, pad, headerY + (portrait ? 38 : 32));

  // 3. Hero State Badge ("ORIGINAL HEARING" vs "SIMULATED: ...")
  const badgeTop = portrait ? Math.round(height * 0.17) : Math.round(height * 0.21);
  const badgeH = portrait ? 132 : 96;
  ctx.fillStyle = active ? '#2b2248' : '#19353c';
  ctx.fillRect(pad, badgeTop, width - pad * 2, badgeH);
  ctx.strokeStyle = active ? '#ff8e72' : '#8ce0cb';
  ctx.lineWidth = 3;
  ctx.strokeRect(pad, badgeTop, width - pad * 2, badgeH);

  ctx.fillStyle = active ? '#ffb4a1' : '#9ef0dc';
  ctx.font = `700 ${portrait ? 21 : 18}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillText(active ? 'NOW HEARING · SIMULATED EFFECT' : 'NOW HEARING · UNFILTERED BASELINE', pad + 24, badgeTop + (portrait ? 42 : 34));

  const stateHeadline = active
    ? (tinnitus && tinnitus !== 'off' ? `${profileLabel} + ${tinnitus}` : profileLabel)
    : 'Original clarity (healthy ear)';
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${portrait ? 34 : 30}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(stateHeadline.slice(0, 38), pad + 24, badgeTop + (portrait ? 94 : 74), width - pad * 2 - 48);

  // 4. Live 24-band Spectrum Stage
  const specTop = badgeTop + badgeH + (portrait ? 48 : 28);
  const specHeight = portrait ? Math.round(height * 0.34) : Math.round(height * 0.34);
  ctx.fillStyle = '#0e1120';
  ctx.fillRect(pad, specTop, width - pad * 2, specHeight);

  const barCount = 24;
  const innerPad = 22;
  const usableW = width - pad * 2 - innerPad * 2;
  const slotW = usableW / barCount;
  const barW = Math.max(6, slotW * 0.68);
  const bottomY = specTop + specHeight - 40;
  const maxBarH = specHeight - 66;

  for (let i = 0; i < barCount; i += 1) {
    const db = Number.isFinite(spectrumDb[i]) ? spectrumDb[i] : -82;
    const norm = Math.max(0.04, Math.min(1, (db + 85) / 62));
    const bh = Math.round(maxBarH * norm);
    const x = pad + innerPad + i * slotW + (slotW - barW) / 2;
    const isHighFreq = i >= 13;
    ctx.fillStyle = active
      ? (isHighFreq ? '#ff8e72' : '#cbc4ff')
      : (isHighFreq ? '#8ce0cb' : '#a9d6e5');
    ctx.fillRect(x, bottomY - bh, barW, bh);
  }

  ctx.fillStyle = '#9aa5cb';
  ctx.font = `600 ${portrait ? 18 : 15}px ui-monospace, SFMono-Regular, monospace`;
  ctx.textAlign = 'left';
  ctx.fillText('BASS (60 Hz)', pad + innerPad, specTop + specHeight - 13);
  ctx.textAlign = 'center';
  ctx.fillText('SPEECH & 4 kHz NOTCH', width / 2, specTop + specHeight - 13);
  ctx.textAlign = 'right';
  ctx.fillText('AIR (12 kHz)', width - pad - innerPad, specTop + specHeight - 13);

  // 5. Timeline progress bar + switch cue marker
  const barY = specTop + specHeight + (portrait ? 48 : 26);
  const barH = 14;
  const frac = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
  ctx.fillStyle = '#2a3052';
  ctx.fillRect(pad, barY, width - pad * 2, barH);

  // Highlight effect span on timeline
  const spanX1 = pad + ((timeline.start / Math.max(0.1, duration)) * (width - pad * 2));
  const spanX2 = pad + ((timeline.end / Math.max(0.1, duration)) * (width - pad * 2));
  ctx.fillStyle = '#ff8e7255';
  ctx.fillRect(spanX1, barY, Math.max(2, spanX2 - spanX1), barH);

  ctx.fillStyle = active ? '#ff8e72' : '#8ce0cb';
  ctx.fillRect(pad, barY, (width - pad * 2) * frac, barH);

  // Switch cue tick
  ctx.fillStyle = '#ffd49a';
  ctx.fillRect(Math.max(pad, spanX1 - 2), barY - 6, 4, barH + 12);

  ctx.fillStyle = '#dce2f7';
  ctx.font = `600 ${portrait ? 20 : 17}px ui-monospace, SFMono-Regular, monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(`${formatClock(currentTime)} / ${formatClock(duration)}`, pad, barY + (portrait ? 42 : 34));
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd49a';
  ctx.fillText(`Effect switch: ${formatClock(timeline.start)}`, width - pad, barY + (portrait ? 42 : 34));

  // 6. RNID Harm-Reduction Callout Footer
  const footerY = height - pad - (portrait ? 78 : 34);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${portrait ? 25 : 21}px system-ui, -apple-system, sans-serif`;
  ctx.fillText('Keep the music, skip the hearing hangover.', pad, footerY);
  ctx.fillStyle = '#b9c2e3';
  ctx.font = `500 ${portrait ? 20 : 17}px system-ui, -apple-system, sans-serif`;
  ctx.fillText('Filtered earplugs lower volume evenly without muffling treble · rnid.org.uk', pad, footerY + (portrait ? 34 : 26), width - pad * 2);
}

function extract24Bands(freqBins, sampleRate, fftSize) {
  if (!freqBins?.length) return new Array(24).fill(-82);
  const hzPerBin = sampleRate / fftSize;
  const minHz = 55;
  const maxHz = 12000;
  const ratio = (maxHz / minHz) ** (1 / 24);
  const out = new Array(24);
  for (let i = 0; i < 24; i += 1) {
    const lo = minHz * (ratio ** i);
    const hi = minHz * (ratio ** (i + 1));
    const b0 = Math.max(1, Math.floor(lo / hzPerBin));
    const b1 = Math.min(freqBins.length - 1, Math.max(b0, Math.ceil(hi / hzPerBin)));
    let maxVal = -95;
    for (let b = b0; b <= b1; b += 1) {
      if (Number.isFinite(freqBins[b]) && freqBins[b] > maxVal) maxVal = freqBins[b];
    }
    out[i] = maxVal;
  }
  return out;
}

export async function recordCampaignAudioVideo({
  context,
  duration,
  aspect = 'portrait',
  timeline,
  trackTitle = 'Audio clip',
  profileLabel = 'Hearing loss',
  tinnitus = 'off',
  startAudio,
  cleanupAudio,
  onProgress,
  signal,
}) {
  const format = recordingFormat();
  if (!format) {
    throw new Error('This browser cannot record campaign videos. Try a current version of Chrome, Edge, Firefox, or Safari.');
  }
  const spec = CAMPAIGN_ASPECTS[aspect] ?? CAMPAIGN_ASPECTS.portrait;
  const resolvedTimeline = timeline ?? resolveCampaignTimeline({ duration });

  const canvas = document.createElement('canvas');
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext('2d', { alpha: false });

  const destination = context.createMediaStreamDestination();
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.72;
  const freqBins = new Float32Array(analyser.frequencyBinCount);

  // Bus feeds both MediaStreamDestination (recorded audio) and AnalyserNode (live bars)
  const bus = context.createGain();
  bus.connect(destination);
  bus.connect(analyser);

  drawCampaignCardFrame(ctx, {
    width: spec.width,
    height: spec.height,
    currentTime: 0,
    duration,
    timeline: resolvedTimeline,
    trackTitle,
    profileLabel,
    tinnitus,
  });

  const stream = new MediaStream([
    ...canvas.captureStream(30).getVideoTracks(),
    ...destination.stream.getAudioTracks(),
  ]);
  const pixels = spec.width * spec.height;
  const recorder = new MediaRecorder(stream, {
    mimeType: format.type,
    videoBitsPerSecond: Math.round(Math.min(6e6, Math.max(1.8e6, pixels * 30 * 0.1))),
    audioBitsPerSecond: 192_000,
  });

  const chunks = [];
  recorder.addEventListener('dataavailable', (e) => {
    if (e.data.size) chunks.push(e.data);
  });

  let sources = [];
  let frame = 0;
  const cleanups = [];

  const abortErr = () => new DOMException('Campaign video recording was cancelled.', 'AbortError');

  function cleanup() {
    cancelAnimationFrame(frame);
    cleanupAudio?.();
    for (const s of sources) {
      try { s.stop(); } catch { /* already stopped */ }
      try { s.disconnect(); } catch { /* ignore */ }
    }
    sources = [];
    if (recorder.state !== 'inactive') {
      try { recorder.stop(); } catch { /* ignore */ }
    }
    stream.getTracks().forEach((t) => t.stop());
    bus.disconnect();
    analyser.disconnect();
    destination.disconnect();
    cleanups.forEach((fn) => fn());
  }

  try {
    if (signal?.aborted) throw abortErr();
    if (document.hidden) throw new Error('Keep this tab visible while generating the campaign video.');

    const stopped = new Promise((resolve, reject) => {
      recorder.addEventListener('stop', resolve, { once: true });
      recorder.addEventListener('error', (e) => reject(e.error ?? new Error('Video encoding failed.')), { once: true });
    });

    await new Promise((resolve, reject) => {
      const onCancel = () => reject(abortErr());
      const onHidden = () => {
        if (document.hidden) reject(new Error('Recording stopped because the browser tab was hidden. Keep this tab visible.'));
      };
      signal?.addEventListener('abort', onCancel, { once: true });
      document.addEventListener('visibilitychange', onHidden);
      cleanups.push(() => {
        signal?.removeEventListener('abort', onCancel);
        document.removeEventListener('visibilitychange', onHidden);
      });

      recorder.start(1000);
      const startedAt = context.currentTime;
      sources = startAudio(bus, 0, resolvedTimeline);

      function tick() {
        const elapsed = Math.max(0, Math.min(duration, context.currentTime - startedAt));
        analyser.getFloatFrequencyData(freqBins);
        const bands24 = extract24Bands(freqBins, context.sampleRate, analyser.fftSize);
        drawCampaignCardFrame(ctx, {
          width: spec.width,
          height: spec.height,
          currentTime: elapsed,
          duration,
          timeline: resolvedTimeline,
          trackTitle,
          profileLabel,
          tinnitus,
          spectrumDb: bands24,
        });
        onProgress?.(elapsed);
        if (elapsed >= duration) {
          resolve();
        } else {
          frame = requestAnimationFrame(tick);
        }
      }
      frame = requestAnimationFrame(tick);
    });

    await new Promise((resolve) => setTimeout(resolve, 220));
    for (const s of sources) {
      try { s.stop(); } catch { /* ignore */ }
    }
    recorder.stop();
    await stopped;

    const mimeBase = format.type.split(';', 1)[0];
    const rawBlob = new Blob(chunks, { type: mimeBase });
    const blob = format.extension === 'webm' ? await withWebmDuration(rawBlob, duration) : rawBlob;
    return { blob, extension: format.extension, type: mimeBase, timeline: resolvedTimeline };
  } finally {
    cleanup();
  }
}
