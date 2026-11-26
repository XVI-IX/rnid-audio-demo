// Records an uploaded video with the changed soundtrack, entirely on this device.
//
// The picture plays in an off-screen video element and is redrawn onto a canvas; the
// canvas stream and a Web Audio stream of the changed sound go to a MediaRecorder.
// Recording runs in real time, so a 3-minute video takes about 3 minutes. Browsers
// pause drawing in hidden tabs, so a hidden tab stops the recording instead of
// producing a video whose picture freezes.

const FORMATS = [
  ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'mp4'],
  ['video/mp4', 'mp4'],
  ['video/webm;codecs=vp9,opus', 'webm'],
  ['video/webm;codecs=vp8,opus', 'webm'],
  ['video/webm', 'webm'],
];
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;

// MediaRecorder WebM files have no duration, so some players show no seek bar. This writes
// Segment > Info > Duration, keeping everything after the Info element byte for byte.
const SEGMENT = 0x18538067;
const INFO = 0x1549a966;
const TIMECODE_SCALE = 0x2ad7b1;
const DURATION = 0x4489;
const UNKNOWN_SIZES = [0x7f, 0x3fff, 0x1fffff, 0xfffffff, 2 ** 35 - 1, 2 ** 42 - 1, 2 ** 49 - 1, 2 ** 56 - 1];

function readVint(bytes, offset, keepMarker) {
  const first = bytes[offset];
  if (first === undefined) return undefined;
  let length = 1;
  while (length <= 8 && !(first & (0x80 >> (length - 1)))) length += 1;
  if (length > 8 || offset + length > bytes.length) return undefined;
  let value = keepMarker ? first : first & (0xff >> length);
  for (let i = 1; i < length; i += 1) value = value * 256 + bytes[offset + i];
  const unknown = !keepMarker && value === UNKNOWN_SIZES[length - 1];
  return { value, length, unknown };
}

function element(bytes, offset) {
  const id = readVint(bytes, offset, true);
  const size = id && readVint(bytes, offset + id.length, false);
  if (!size) return undefined;
  return { id: id.value, start: offset, data: offset + id.length + size.length, size: size.value, unknown: size.unknown };
}

function sizeBytes(value) {
  const bytes = new Uint8Array(8);
  bytes[0] = 0x01;
  for (let i = 7; i >= 1; i -= 1) {
    bytes[i] = value % 256;
    value = Math.floor(value / 256);
  }
  return bytes;
}

export async function withWebmDuration(blob, seconds) {
  const head = new Uint8Array(await blob.slice(0, 65536).arrayBuffer());
  const header = element(head, 0);
  if (!header || header.id !== 0x1a45dfa3) return blob;
  const segment = element(head, header.data + header.size);
  if (!segment || segment.id !== SEGMENT) return blob;
  let info;
  for (let offset = segment.data; offset < head.length;) {
    const child = element(head, offset);
    if (!child || child.unknown) break;
    if (child.id === INFO) {
      info = child;
      break;
    }
    offset = child.data + child.size;
  }
  if (!info || info.data + info.size > head.length) return blob;
  let scale = 1e6;
  for (let offset = info.data; offset < info.data + info.size;) {
    const child = element(head, offset);
    if (!child) return blob;
    if (child.id === DURATION) return blob;  // already present
    if (child.id === TIMECODE_SCALE) {
      scale = 0;
      for (let i = 0; i < child.size; i += 1) scale = scale * 256 + head[child.data + i];
    }
    offset = child.data + child.size;
  }
  const duration = new Uint8Array(11);
  duration.set([0x44, 0x89, 0x88]);
  new DataView(duration.buffer).setFloat64(3, seconds * 1e9 / scale);
  const end = info.data + info.size;
  const infoId = head.subarray(info.start, info.start + (readVint(head, info.start, true).length));
  const infoSize = sizeBytes(info.size + duration.length);
  const parts = [head.subarray(0, info.start), infoId, infoSize, head.subarray(info.data, end), duration];
  if (!segment.unknown) {
    // A known Segment size grows by the bytes this adds; rewrite it at the same position.
    const added = infoId.length + infoSize.length + info.size + duration.length - (end - info.start);
    const segmentId = readVint(head, segment.start, true).length;
    parts[0] = new Uint8Array(head.subarray(0, info.start));
    parts[0].set(sizeBytes(segment.size + added), segment.start + segmentId);
    if (segment.data - segment.start - segmentId !== 8) return blob;
  }
  return new Blob([...parts, blob.slice(end)], { type: blob.type });
}

export function recordingFormat() {
  if (typeof MediaRecorder !== 'function' || typeof MediaRecorder.isTypeSupported !== 'function') return undefined;
  if (typeof HTMLCanvasElement === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') return undefined;
  const found = FORMATS.find(([type]) => MediaRecorder.isTypeSupported(type));
  return found && { type: found[0], extension: found[1] };
}

// Even dimensions no larger than 1080p, keeping the picture's shape.
export function recordingSize(width, height) {
  const scale = Math.min(1, MAX_WIDTH / width, MAX_HEIGHT / height);
  const even = (value) => Math.max(2, 2 * Math.round(value * scale / 2));
  return { width: even(width), height: even(height) };
}

function abortError() {
  return new DOMException('The video download was cancelled.', 'AbortError');
}

function waitFor(video, event, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('This browser could not read the video for recording.')), 15000);
    function finish(error) {
      clearTimeout(timer);
      video.removeEventListener(event, ready);
      video.removeEventListener('error', failed);
      signal.removeEventListener('abort', cancelled);
      if (error) reject(error);
      else resolve();
    }
    function ready() { finish(); }
    function failed() { finish(new Error('This browser could not read the video for recording.')); }
    function cancelled() { finish(abortError()); }
    if (signal.aborted) {
      finish(abortError());
      return;
    }
    video.addEventListener(event, ready, { once: true });
    video.addEventListener('error', failed, { once: true });
    signal.addEventListener('abort', cancelled, { once: true });
  });
}

/**
 * @param {object} options
 * @param {Blob} options.file The original video.
 * @param {AudioContext} options.context A running audio context.
 * @param {number} options.duration Seconds to record (the previewed length).
 * @param {(destination: AudioNode, offset: number) => AudioScheduledSourceNode[]} options.startAudio
 *   Starts the changed sound into `destination` now, from `offset` seconds.
 * @param {() => void} [options.cleanupAudio] Releases extra nodes connected by startAudio.
 * @param {(seconds: number) => void} [options.onProgress]
 * @param {AbortSignal} options.signal
 */
export async function recordVideo({ file, context, duration, startAudio, cleanupAudio, onProgress, signal }) {
  const format = recordingFormat();
  if (!format) throw new Error('This browser cannot record video. Try a recent Chrome, Edge, Firefox or Safari.');
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  let destination;
  let recorder;
  let sources = [];
  let frame;
  const cleanups = [];

  function cleanup() {
    cancelAnimationFrame(frame);
    cleanupAudio?.();
    for (const source of sources) {
      try { source.stop(); } catch { /* already stopped */ }
      source.disconnect();
    }
    sources = [];
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    recorder?.stream.getTracks().forEach((track) => track.stop());
    destination?.disconnect();
    cleanups.forEach((undo) => undo());
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }

  try {
    video.src = url;
    await waitFor(video, 'loadeddata', signal);
    const { width, height } = recordingSize(video.videoWidth, video.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const plot = canvas.getContext('2d', { alpha: false });
    const draw = () => plot.drawImage(video, 0, 0, width, height);
    draw();

    destination = context.createMediaStreamDestination();
    const stream = new MediaStream([...canvas.captureStream().getVideoTracks(), ...destination.stream.getAudioTracks()]);
    const pixels = width * height;
    recorder = new MediaRecorder(stream, {
      mimeType: format.type,
      videoBitsPerSecond: Math.round(Math.min(8e6, Math.max(1.5e6, pixels * 30 * 0.12))),
      audioBitsPerSecond: 192_000,
    });
    const chunks = [];
    recorder.addEventListener('dataavailable', (event) => { if (event.data.size) chunks.push(event.data); });
    const stopped = new Promise((resolve, reject) => {
      recorder.addEventListener('stop', resolve, { once: true });
      recorder.addEventListener('error', (event) => reject(event.error ?? new Error('Recording failed.')), { once: true });
    });

    if (signal.aborted) throw abortError();
    if (document.hidden) throw new Error('Keep this tab visible while the video records.');

    const finished = new Promise((resolve, reject) => {
      const cancelled = () => reject(abortError());
      const hidden = () => {
        if (document.hidden) reject(new Error('Recording stopped because the tab was hidden. Try again and keep this tab visible.'));
      };
      const ended = () => resolve();
      signal.addEventListener('abort', cancelled, { once: true });
      document.addEventListener('visibilitychange', hidden);
      video.addEventListener('ended', ended, { once: true });
      cleanups.push(() => {
        signal.removeEventListener('abort', cancelled);
        document.removeEventListener('visibilitychange', hidden);
        video.removeEventListener('ended', ended);
      });
      // Draw once per decoded video frame where the browser reports them; otherwise on
      // every animation frame. The animation-frame loop also tracks progress and the end.
      const frameCallbacks = typeof video.requestVideoFrameCallback === 'function';
      let lastFrame = 0;
      let callback;
      function drawFrame() {
        lastFrame = performance.now();
        draw();
        callback = video.requestVideoFrameCallback(drawFrame);
      }
      function paint() {
        if (!frameCallbacks || performance.now() - lastFrame > 500) draw();
        onProgress?.(Math.min(duration, video.currentTime));
        if (video.currentTime >= duration) resolve();
        else frame = requestAnimationFrame(paint);
      }
      cleanups.push(() => { if (callback !== undefined) video.cancelVideoFrameCallback?.(callback); });
      cleanups.push(() => cancelAnimationFrame(frame));
      recorder.start(1000);
      video.play().then(() => {
        sources = startAudio(destination, video.currentTime);
        lastFrame = performance.now();
        if (frameCallbacks) callback = video.requestVideoFrameCallback(drawFrame);
        frame = requestAnimationFrame(paint);
      }, () => reject(new Error('This browser could not play the video for recording.')));
    });

    await finished;
    draw();
    video.pause();
    // Let the last audio reach the recorder before it closes the file.
    await new Promise((resolve) => setTimeout(resolve, 250));
    for (const source of sources) {
      try { source.stop(); } catch { /* already stopped */ }
    }
    recorder.stop();
    await stopped;
    const type = format.type.split(';', 1)[0];
    const recorded = new Blob(chunks, { type });
    const blob = format.extension === 'webm' ? await withWebmDuration(recorded, duration) : recorded;
    return { blob, extension: format.extension, type };
  } finally {
    cleanup();
  }
}
