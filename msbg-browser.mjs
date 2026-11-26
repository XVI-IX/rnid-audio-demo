// On-device Cambridge MSBG renderer coordinator for "Your audio".
// Decodes audio at 44,100 Hz via OfflineAudioContext, runs msbg-worker.mjs, and packs a 24-bit ZIP.

import { deinterleave, encodeWav, zipStore } from './bundle.mjs?v=d3071d3d38';

export const MSBG_SAMPLE_RATE = 44100;
export const MSBG_MIN_SECONDS = 1;
export const MSBG_MAX_SECONDS = 10 * 60;

export function canRenderOnDevice({ hasAudio, isVideo, durationSeconds, profileId }) {
  return Boolean(
    hasAudio
    && !isVideo
    && Number.isFinite(durationSeconds)
    && durationSeconds >= MSBG_MIN_SECONDS
    && durationSeconds <= MSBG_MAX_SECONDS
    && typeof profileId === 'string'
    && profileId.length > 0,
  );
}

export function packMsbgBundle(response, sampleRate = MSBG_SAMPLE_RATE) {
  const reference = Array.isArray(response.reference) ? response.reference : deinterleave(response.reference);
  const simulated = Array.isArray(response.simulated) ? response.simulated : deinterleave(response.simulated);
  const files = [
    { name: 'reference.wav', data: encodeWav(reference, sampleRate, 24) },
    { name: 'simulated.wav', data: encodeWav(simulated, sampleRate, 24) },
    { name: 'manifest.json', data: new TextEncoder().encode(response.manifest) },
  ];
  if (response.filter) {
    const filter = Array.isArray(response.filter) ? response.filter : deinterleave(response.filter);
    files.push({ name: 'filter-ir.wav', data: encodeWav(filter, sampleRate, 24) });
  }
  return {
    blob: zipStore(files),
    manifest: JSON.parse(response.manifest),
  };
}

export function createMsbgClient({
  workerFactory = () => new Worker(new URL('./msbg-worker.mjs', import.meta.url), { type: 'module' }),
} = {}) {
  let worker;
  let nextId = 0;
  const pending = new Map();

  function ensureWorker() {
    if (worker) return worker;
    worker = workerFactory();
    worker.onmessage = ({ data }) => {
      const request = pending.get(data.id);
      if (!request) return;
      if (data.progress) {
        request.onProgress?.(data);
        return;
      }
      pending.delete(data.id);
      if (data.ok) request.resolve(data);
      else request.reject(new Error(data.error || 'The on-device MSBG model reported an error.'));
    };
    worker.onerror = () => {
      const failed = [...pending.values()];
      pending.clear();
      worker = undefined;
      for (const request of failed) {
        request.reject(new Error('The on-device MSBG worker could not start in this browser.'));
      }
    };
    return worker;
  }

  function call(type, payload = {}, transfer = [], onProgress) {
    const instance = ensureWorker();
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject, onProgress });
      instance.postMessage({ id, type, ...payload }, transfer);
    });
  }

  async function decodeAtCanonicalRate(file) {
    const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineContext) throw new Error('This browser does not support OfflineAudioContext decoding.');
    const buffer = await new OfflineContext(2, 1, MSBG_SAMPLE_RATE).decodeAudioData(await file.arrayBuffer());
    if (buffer.duration < MSBG_MIN_SECONDS || buffer.duration > MSBG_MAX_SECONDS) {
      throw new Error(`Choose an audio clip from 1 second to ${MSBG_MAX_SECONDS / 60} minutes for on-device MSBG rendering.`);
    }
    if (buffer.numberOfChannels < 1 || buffer.numberOfChannels > 2) {
      throw new Error('Choose a mono or stereo audio file for on-device MSBG rendering.');
    }
    return buffer;
  }

  async function renderAudioFile(file, {
    profileId,
    markerSeconds = null,
    detectClimax = false,
    includeFilter = false,
    onProgress,
  }) {
    onProgress?.({ stage: 'decoding', message: 'Decoding audio at 44.1 kHz on this device…' });
    const decoded = await decodeAtCanonicalRate(file);
    const channels = Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index).slice());
    const marker = markerSeconds === null || markerSeconds === '' ? null : String(markerSeconds).trim();
    const response = await call(
      'render',
      {
        channels,
        sampleRate: MSBG_SAMPLE_RATE,
        profileId,
        markerSeconds: marker || null,
        detectClimax: !marker && Boolean(detectClimax),
        includeFilter: Boolean(includeFilter),
      },
      channels.map((channel) => channel.buffer),
      onProgress,
    );
    onProgress?.({ stage: 'packaging', message: 'Packing 24-bit WAV comparison ZIP…' });
    const { blob, manifest } = packMsbgBundle(response, MSBG_SAMPLE_RATE);
    const stem = (file.name || 'audio').replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-').slice(0, 60) || 'audio';
    return {
      blob,
      manifest,
      filename: `${stem}-${profileId}.zip`,
    };
  }

  return { call, renderAudioFile };
}
