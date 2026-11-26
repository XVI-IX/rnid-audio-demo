const metadataUrl = new URL('./demo/v2/listen-waveforms.json', import.meta.url);

function formatTime(seconds) {
  const tenths = Math.round(seconds * 10);
  const minutes = Math.floor(tenths / 600);
  const wholeSeconds = String(Math.floor(tenths / 10) % 60).padStart(2, '0');
  return `${minutes}:${wholeSeconds}.${tenths % 10}`;
}

function mediaDuration(audio) {
  return Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
}

async function loadMetadata() {
  try {
    const response = await fetch(metadataUrl);
    if (!response.ok) return null;
    const data = await response.json();
    return data?.version === 1 ? data.tracks : null;
  } catch {
    return null;
  }
}

function draw(preview, progress) {
  const { canvas } = preview.view;
  const { width, height } = preview.bounds;
  const context = canvas.getContext('2d');
  if (!context || !width || !height) return;
  context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#c5c8e1';
  context.fillRect(0, Math.floor(height / 2), width, 1);

  const peaks = preview.waveform?.peaks ?? [];
  const step = width / Math.max(1, peaks.length);
  const position = progress * width;
  for (const [index, amplitude] of peaks.entries()) {
    const x = (index + 0.5) * step;
    const thickness = Math.max(1, amplitude * (height - 10));
    context.fillStyle = x <= position ? '#4f4cad' : '#8389b1';
    context.fillRect(x - step * 0.325, (height - thickness) / 2, Math.max(1, step * 0.65), thickness);
  }

  context.fillStyle = '#333363';
  context.fillRect(Math.min(width - 1, position), 0, 1, height);
}

export function connectListenWaveform() {
  const views = new Map();
  let active;
  let metadata;

  function update(preview) {
    const { audio, view: { slider, time } } = preview;
    const actualDuration = mediaDuration(audio);
    const duration = actualDuration || preview.waveform?.duration_seconds || 0;
    const elapsed = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const position = Math.max(0, Math.min(duration, elapsed));
    const positionText = formatTime(position);
    const durationText = formatTime(duration);
    const text = `${positionText} / ${durationText}`;
    if (time.textContent !== text) {
      time.textContent = text;
      slider.setAttribute('aria-valuetext', `${positionText} of ${durationText}`);
    }
    slider.disabled = actualDuration === 0;
    if (Number(slider.max) !== actualDuration) slider.max = String(actualDuration);
    slider.value = String(position);
    draw(preview, duration ? position / duration : 0);
  }

  function resize(preview) {
    const { canvas } = preview.view;
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const scale = window.devicePixelRatio || 1;
    preview.bounds = { width, height };
    const canvasWidth = Math.round(width * scale);
    const canvasHeight = Math.round(height * scale);
    if (canvas.width !== canvasWidth) canvas.width = canvasWidth;
    if (canvas.height !== canvasHeight) canvas.height = canvasHeight;
    update(preview);
  }

  function seek(view, position) {
    if (active?.view !== view || !Number.isFinite(position)) return;
    const duration = mediaDuration(active.audio);
    if (!duration) return;
    try {
      active.audio.currentTime = Math.min(duration, Math.max(0, position));
    } catch {
      // Some browsers temporarily reject seeks while media is still buffering.
      return;
    }
    update(active);
  }

  for (const panel of document.querySelectorAll('[data-listen-waveform]')) {
    const canvas = panel.querySelector('[data-listen-waveform-canvas]');
    const slider = panel.querySelector('[data-listen-waveform-seek]');
    const time = panel.querySelector('[data-listen-waveform-time]');
    if (!canvas || !slider || !time) continue;
    const view = { panel, canvas, slider, time };
    views.set(panel.dataset.listenWaveform, view);
    slider.addEventListener('input', () => seek(view, Number(slider.value)));
    canvas.addEventListener('click', (event) => {
      if (active?.view !== view) return;
      const { left, width } = canvas.getBoundingClientRect();
      if (width > 0) seek(view, (event.clientX - left) / width * mediaDuration(active.audio));
    });
  }

  if (views.size) {
    const resizeActive = () => { if (active) resize(active); };
    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(resizeActive);
      for (const { canvas } of views.values()) observer.observe(canvas);
    } else {
      window.addEventListener('resize', resizeActive);
    }
  }

  function hide() {
    if (!active) return;
    const previous = active;
    active = undefined;
    cancelAnimationFrame(previous.frame);
    previous.view.panel.hidden = true;
  }

  function show(audio, file, group) {
    hide();
    const view = views.get(group);
    if (!view) return;
    const preview = { audio, view, bounds: { width: 0, height: 0 } };
    active = preview;
    view.panel.hidden = false;
    resize(preview);

    function followPlayback() {
      if (active !== preview) return;
      update(preview);
      preview.frame = requestAnimationFrame(followPlayback);
    }
    preview.frame = requestAnimationFrame(followPlayback);

    metadata ??= loadMetadata().then((tracks) => {
      if (!tracks) metadata = undefined;
      return tracks;
    });
    void metadata.then((tracks) => {
      if (active !== preview) return;
      const waveform = tracks?.[file];
      if (Number.isFinite(waveform?.duration_seconds) && waveform.duration_seconds > 0
        && Array.isArray(waveform.peaks) && waveform.peaks.every((peak) => Number.isFinite(peak) && peak >= 0 && peak <= 1)) {
        preview.waveform = waveform;
        update(preview);
      }
    });
  }

  return { show, hide };
}
