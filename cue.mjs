export const CUE_SAMPLE_RATE = 44_100;
export const CUE_STEP_SAMPLES = CUE_SAMPLE_RATE / 10;

function frameCount(duration) {
  const frames = Math.round(duration * CUE_SAMPLE_RATE);
  return Number.isFinite(duration) && Number.isSafeInteger(frames) && frames > 0 ? frames : 0;
}

export function cueSample(seconds, duration) {
  const frames = frameCount(duration);
  if (!Number.isFinite(seconds) || frames === 0) return null;
  const bounded = Math.max(0, Math.min(duration, seconds));
  return Math.min(frames - 1, Math.round(bounded * CUE_SAMPLE_RATE));
}

export function cueSeconds(sample) {
  return sample / CUE_SAMPLE_RATE;
}

export function cueManifest({ song, excerpt, duration, sample, suggested }) {
  const frames = frameCount(duration);
  if (!Number.isSafeInteger(sample) || sample < 0 || sample >= frames) throw new RangeError('Cue is outside the excerpt');
  const position = cueSeconds(sample);
  const sourceStart = excerpt.source_start_seconds;
  const start = Number.isFinite(sourceStart) && sourceStart >= 0 ? sourceStart : null;

  return {
    schema_version: '1.0',
    audio: { sample_rate_hz: CUE_SAMPLE_RATE, frames, duration_seconds: cueSeconds(frames) },
    demo: { song_id: song.id, excerpt_id: excerpt.id },
    source: {
      title: song.title,
      artist: song.artist ?? null,
      url: song.credit_url ?? null,
      license_url: song.license_url ?? null,
      excerpt_start_seconds: start,
      selected_seconds_in_source: start === null ? null : start + position,
    },
    climax: {
      status: 'ok',
      selected_by: 'manual',
      selected_sample: sample,
      selected_seconds: position,
      candidates: [],
    },
    previous_marker_seconds: Number.isFinite(suggested) ? suggested : null,
  };
}
