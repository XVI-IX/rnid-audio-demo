const colorStops = [
  [16, 22, 44],
  [35, 55, 87],
  [24, 123, 131],
  [85, 189, 149],
  [242, 189, 98],
];

const palette = Array.from({ length: 256 }, (_, value) => {
  const scale = value / 255 * (colorStops.length - 1);
  const stop = Math.min(Math.floor(scale), colorStops.length - 2);
  const fraction = scale - stop;
  return [...colorStops[stop].map((channel, index) =>
    Math.round(channel + (colorStops[stop + 1][index] - channel) * fraction)), 255];
});

function validateSpectrogram(data) {
  if (data?.version !== 1 || !Number.isSafeInteger(data.columns) || data.columns < 1
    || !Number.isSafeInteger(data.rows) || data.rows < 1 || !Number.isSafeInteger(data.columns * data.rows)
    || data.min_hz !== 100 || data.max_hz !== 12000 || data.floor_db !== -80 || data.ceiling_db !== -24
    || !Number.isFinite(data.duration_seconds) || data.duration_seconds <= 0
    || typeof data.tracks?.reference !== 'string') {
    throw new Error('Invalid spectrogram data.');
  }
  return data;
}

function readTrack(data, key) {
  const encoded = data.tracks[key];
  if (typeof encoded !== 'string') throw new Error('Spectrogram track is missing.');
  const bytes = atob(encoded);
  if (bytes.length !== data.columns * data.rows) throw new Error('Invalid spectrogram track length.');
  return bytes;
}

function paint(canvas, bytes, { columns, rows }) {
  canvas.width = columns;
  canvas.height = rows;
  const context = canvas.getContext('2d');
  const image = context.createImageData(columns, rows);
  for (let row = 0; row < rows; row += 1) {
    const input = row * columns;
    const output = (rows - row - 1) * columns * 4;
    for (let column = 0; column < columns; column += 1) {
      image.data.set(palette[bytes.charCodeAt(input + column)], output + column * 4);
    }
  }
  context.putImageData(image, 0, 0);
}

export function connectSpectrogram({ seekTo }) {
  const controls = document.querySelectorAll('[data-studio-visual]');
  const waveform = document.querySelector('#studio-waveform');
  const panel = document.querySelector('#spectrogram-panel');
  const original = document.querySelector('#spectrogram-original');
  const simulated = document.querySelector('#spectrogram-simulated');
  const effect = document.querySelector('#spectrogram-effect');
  const status = document.querySelector('#spectrogram-status');
  const duration = document.querySelector('#spectrogram-duration');
  const cache = new Map();
  let source;
  let pending;
  let position = 0;

  function clearPlots() {
    for (const canvas of [original, simulated]) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }

  function updateCursor() {
    if (!source || panel.hidden) return;
    const fraction = Math.max(0, Math.min(1, position / source.duration));
    panel.style.setProperty('--spectrogram-position', `${(fraction * 100).toFixed(3)}%`);
  }

  async function refresh() {
    if (panel.hidden || !source) return;
    const { url } = source;
    let data = cache.get(url.href);
    if (!data) {
      if (pending) return;
      const controller = new AbortController();
      pending = controller;
      clearPlots();
      status.textContent = 'Loading spectrogram…';
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Spectrogram is unavailable.');
        data = validateSpectrogram(await response.json());
        if (pending !== controller) return;
        cache.set(url.href, data);
      } catch {
        if (pending === controller) status.textContent = 'Spectrogram unavailable for this excerpt. Select Spectrogram to try again.';
        return;
      } finally {
        if (pending === controller) pending = undefined;
      }
    }
    if (panel.hidden) return;

    try {
      const originalTrack = readTrack(data, 'reference');
      const simulatedTrack = readTrack(data, source.profile);
      paint(original, originalTrack, data);
      paint(simulated, simulatedTrack, data);
      status.textContent = '';
    } catch {
      clearPlots();
      status.textContent = 'Spectrogram unavailable for this hearing effect.';
    }
  }

  function selectVisual(selected) {
    const showSpectrogram = selected === 'spectrogram';
    waveform.hidden = showSpectrogram;
    panel.hidden = !showSpectrogram;
    for (const button of controls) button.setAttribute('aria-pressed', String(button.dataset.studioVisual === selected));
    if (showSpectrogram) {
      updateCursor();
      void refresh();
    }
  }

  for (const control of controls) {
    control.addEventListener('click', () => selectVisual(control.dataset.studioVisual));
  }
  const { hash, search } = window.location;
  if (hash === '#demo' && new URLSearchParams(search).get('plot') === 'spectrogram') selectVisual('spectrogram');

  for (const canvas of [original, simulated]) {
    const image = canvas.closest('.spectrum-image') ?? canvas;
    image.addEventListener('click', (event) => {
      const { left, width } = canvas.getBoundingClientRect();
      if (!source || !width) return;
      const fraction = Math.max(0, Math.min(1, (event.clientX - left) / width));
      seekTo(fraction * source.duration);
    });
  }

  return {
    setSource(next) {
      if (next.url.href !== source?.url.href) {
        pending?.abort();
        pending = undefined;
        clearPlots();
        status.textContent = '';
      }
      source = next;
      effect.textContent = next.label;
      duration.textContent = `${Math.round(next.duration * 10) / 10} s`;
      updateCursor();
      void refresh();
    },
    setPosition(seconds) {
      position = seconds;
      updateCursor();
    },
  };
}
