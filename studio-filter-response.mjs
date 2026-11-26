import { displayProfileName } from './studio-filters.mjs?v=6ae70402b9';
import { getTheme, onThemeChange } from './theme.mjs?v=6ae70402b9';

const bandRows = [125, 500, 1000, 2000, 4000, 8000];
const chartEnd = 16000;
const chartStart = 25;
const channelStyles = [
  { field: 'left_db', color: '--filter-left', width: 3, dash: [] },
  { field: 'right_db', color: '--filter-right', width: 2, dash: [5, 4] },
];

function numberLabel(number) {
  return String(number).replace('-', '−');
}

function frequencyLabel(hz) {
  return hz < 1000 ? String(hz) : `${hz / 1000}k`;
}

function readDesign(data, profileId) {
  const { gain_table: points, probe_level_dbfs: level, file } = data?.filter ?? {};
  if (data?.profile?.id !== profileId || !Number.isFinite(level?.left) || !Number.isFinite(level?.right)
      || file !== `${profileId}-ir.wav` || !Array.isArray(points) || points.length < 2
      || points.some((point, index) => !Number.isFinite(point?.frequency_hz) || point.frequency_hz < chartStart
        || point.frequency_hz > chartEnd || (index > 0 && point.frequency_hz <= points[index - 1].frequency_hz)
        || !Number.isFinite(point.left_db) || !Number.isFinite(point.right_db))) {
    throw new Error('Invalid hearing filter design.');
  }
  return { points, level, file };
}

function drawResponse(canvas, panel, points, isOriginal) {
  const { width, height } = canvas.getBoundingClientRect();
  if (width < 80 || height < 50) return;
  const plot = canvas.getContext('2d');
  if (!plot) return;
  const ratio = window.devicePixelRatio || 1;
  const pixelsWide = Math.round(width * ratio);
  const pixelsHigh = Math.round(height * ratio);
  if (canvas.width !== pixelsWide) canvas.width = pixelsWide;
  if (canvas.height !== pixelsHigh) canvas.height = pixelsHigh;
  plot.setTransform(pixelsWide / width, 0, 0, pixelsHigh / height, 0, 0);
  plot.clearRect(0, 0, width, height);

  const left = 36;
  const right = width - 19;
  const showZoneLabels = width >= 440 && height >= 120;
  const top = showZoneLabels ? 20 : 7;
  const bottom = height - 20;
  const gains = points.flatMap(({ left_db, right_db }) => [left_db, right_db]);
  const floor = 20 * Math.floor(Math.min(-80, ...gains) / 20);
  const ceiling = Math.max(5, ...gains);
  const x = hz => left + (right - left) * Math.log(hz / chartStart) / Math.log(chartEnd / chartStart);
  const y = gain => top + (bottom - top) * (ceiling - gain) / (ceiling - floor);
  const style = getComputedStyle(panel);
  const color = name => style.getPropertyValue(name).trim();

  // Subtle acoustic & speech frequency-zone shading so non-engineers can map Hz to sound.
  const isDark = getTheme() === 'dark';
  const zones = [
    { from: 25, to: 250, fill: isDark ? '#10b9811a' : '#e3ece266', label: 'Bass' },
    { from: 250, to: 2000, fill: '#ffffff00', label: 'Vowels & melody' },
    { from: 2000, to: 6000, fill: isDark ? '#f59e0b1a' : '#efe4cc78', label: 'Consonants · 4k notch' },
    { from: 6000, to: 16000, fill: isDark ? '#38bdf816' : '#dfe9e860', label: 'Air & cymbals' },
  ];
  plot.save();
  plot.font = '600 10px system-ui, sans-serif';
  plot.textAlign = 'center';
  plot.textBaseline = 'middle';
  for (const zone of zones) {
    const x1 = x(zone.from);
    const x2 = x(zone.to);
    plot.fillStyle = zone.fill;
    plot.fillRect(x1, top, x2 - x1, bottom - top);
    if (showZoneLabels) {
      plot.fillStyle = isDark ? '#94a3b8' : '#485b52';
      plot.fillText(zone.label, (x1 + x2) / 2, 10);
    }
  }
  plot.restore();

  function line(x1, y1, x2, y2) {
    plot.beginPath();
    plot.moveTo(x1, y1);
    plot.lineTo(x2, y2);
    plot.stroke();
  }

  plot.font = '11px system-ui, sans-serif';
  plot.fillStyle = color('--filter-label');
  plot.strokeStyle = color('--filter-grid');
  plot.lineWidth = 1;
  const frequencies = width < 420
    ? [25, 100, 500, 2000, 8000, 16000]
    : [25, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  plot.textAlign = 'center';
  plot.textBaseline = 'top';
  for (const hz of frequencies) {
    line(x(hz), top, x(hz), bottom);
    plot.fillText(frequencyLabel(hz), x(hz), bottom + 5);
  }

  plot.textAlign = 'right';
  plot.textBaseline = 'middle';
  for (let gain = 0; gain >= floor; gain -= 20) {
    line(left, y(gain), right, y(gain));
    plot.fillText(numberLabel(gain), left - 7, y(gain));
  }

  if (isOriginal) {
    plot.strokeStyle = color('--filter-reference');
    plot.lineWidth = 2;
    plot.setLineDash([2, 4]);
    line(left, y(0), right, y(0));
  }

  for (const channel of channelStyles) {
    plot.strokeStyle = color(channel.color);
    plot.lineWidth = channel.width;
    plot.setLineDash(channel.dash);
    plot.beginPath();
    for (const point of points) plot.lineTo(x(point.frequency_hz), y(point[channel.field]));
    plot.stroke();
  }
}

function gainRow({ frequency_hz, left_db, right_db }) {
  const row = document.createElement('tr');
  const frequency = document.createElement('th');
  frequency.scope = 'row';
  frequency.textContent = `${frequency_hz.toLocaleString('en-GB')} Hz`;
  row.append(frequency);
  for (const value of [left_db, right_db]) {
    const cell = document.createElement('td');
    cell.textContent = `${numberLabel(value)} dB`;
    row.append(cell);
  }
  return row;
}

export function connectStudioFilterResponse() {
  const panel = document.querySelector('#studio-filter-response');
  if (!panel) return () => {};

  const canvas = panel.querySelector('#filter-response-canvas');
  const profile = panel.querySelector('#filter-response-profile');
  const mode = panel.querySelector('#filter-response-mode');
  const level = panel.querySelector('#filter-response-level');
  const status = panel.querySelector('#filter-response-status');
  const legend = panel.querySelector('#filter-response-reference');
  const download = panel.querySelector('#filter-response-download');
  const values = panel.querySelector('#filter-response-values');
  const rows = panel.querySelector('#filter-response-values-body');
  const cache = new Map();
  let current;

  function paint() {
    if (current) drawResponse(canvas, panel, current.design?.points ?? [], current.isOriginal);
  }

  function updateMode() {
    const original = current.isOriginal;
    legend.hidden = !original;
    mode.textContent = original
      ? 'Original is unfiltered. The dotted 0 dB line shows its response, alongside the selected filter design.'
      : 'The curves show the selected filter’s gain for each ear.';
  }

  async function load(request) {
    const { profileId } = request;
    try {
      let design = cache.get(profileId);
      if (!design) {
        const url = new URL(`./filters/${encodeURIComponent(profileId)}-ir.json`, import.meta.url);
        const response = await fetch(url);
        if (!response.ok) throw new Error('Hearing filter design unavailable.');
        design = readDesign(await response.json(), profileId);
        cache.set(profileId, design);
      }
      if (request !== current) return;

      const { left, right } = design.level;
      const input = left === right ? `${numberLabel(left)} dBFS` : `${numberLabel(left)} dBFS left and ${numberLabel(right)} dBFS right`;
      level.textContent = `Exported filter design at ${input} input. Gain below 0 dB makes that frequency quieter.`;
      rows.replaceChildren(...design.points.filter(point => bandRows.includes(point.frequency_hz)).map(gainRow));
      values.hidden = false;
      download.href = new URL(`./filters/${design.file}`, import.meta.url).href;
      download.download = design.file;
      download.hidden = false;
      request.design = design;
      status.textContent = '';
      paint();
    } catch {
      if (request !== current) return;
      request.failed = true;
      status.textContent = 'The filter response is unavailable for this effect.';
    }
  }

  if (typeof ResizeObserver === 'function') new ResizeObserver(paint).observe(canvas);
  onThemeChange(paint);

  return (profileId, isOriginal) => {
    if (current?.profileId === profileId && !current.failed) {
      if (current.isOriginal !== isOriginal) {
        current.isOriginal = isOriginal;
        updateMode();
        paint();
      }
      return;
    }

    current = { profileId, isOriginal };
    panel.hidden = false;
    profile.textContent = displayProfileName(profileId);
    level.textContent = '';
    values.hidden = true;
    download.hidden = true;
    status.textContent = 'Loading filter response…';
    updateMode();
    paint();
    void load(current);
  };
}
