import { getTheme, onThemeChange } from './theme.mjs?v=6c8561a22e';

const frequencyTicks = [125, 250, 500, 1000, 2000, 4000, 8000];
const minimumLevel = -10;
const maximumLevel = 120;
const hearingRanges = [
  { bounds: [0, 20.5], label: 'Normal range', color: '#edf5f0', darkColor: '#132622' },
  { bounds: [20.5, 40.5], label: 'Mild', color: '#f6f5e9', darkColor: '#22231a' },
  { bounds: [40.5, 70.5], label: 'Moderate', color: '#faf1e7', darkColor: '#261e1a' },
  { bounds: [70.5, 90.5], label: 'Severe', color: '#f8edf0', darkColor: '#271923' },
  { bounds: [90.5, maximumLevel], label: 'Profound', color: '#f0eafa', darkColor: '#1e1930' },
];
const earColors = { right: '#a32235', left: '#2254a3' };
const darkEarColors = { right: '#fb7185', left: '#60a5fa' };

// Approximate locations redrawn from the illustrative overlay on slide 2.
const speechRegion = [
  [210, 35], [230, 29], [270, 26], [310, 26], [420, 30], [580, 33],
  [790, 33], [1060, 32], [1600, 28], [2190, 23], [3120, 20], [4200, 20],
  [4500, 23], [4520, 29], [4200, 35], [3550, 43], [2770, 49], [2090, 54],
  [1530, 59], [1040, 62], [710, 64], [470, 63], [320, 60], [250, 55], [215, 48],
];
const soundExamples = [
  { label: 'Birdsong', hz: 6000, db: 13, align: 'right' },
  { label: 'Conversation', hz: 1700, db: 54, align: 'right' },
  { label: 'Vacuum', hz: 2700, db: 65, align: 'left' },
  { label: 'Piano', hz: 970, db: 78, align: 'left' },
];

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function outlinedLabel(ctx, label, x, y, maxWidth, isDark = false) {
  ctx.strokeStyle = isDark ? '#0f1324eb' : '#fffffff2';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeText(label, x, y, maxWidth);
  ctx.fillText(label, x, y, maxWidth);
}

function drawSpeech(ctx, x, y, width, isDark = false) {
  ctx.save();
  ctx.beginPath();
  for (const [index, [hz, db]] of speechRegion.entries()) {
    if (index === 0) ctx.moveTo(x(hz), y(db));
    else ctx.lineTo(x(hz), y(db));
  }
  ctx.closePath();
  ctx.fillStyle = isDark ? '#a78bfa2e' : '#8459bd30';
  ctx.strokeStyle = isDark ? '#a78bfa' : '#735097';
  ctx.lineWidth = 1;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isDark ? '#e9d5ff' : '#482c70';
  ctx.font = `600 ${width >= 480 ? 12 : 10}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  outlinedLabel(ctx, 'Speech banana', x(1030), y(40), width * .38, isDark);
  if (width >= 330) {
    outlinedLabel(ctx, 'a, o, u', x(430), y(47), width * .22, isDark);
    outlinedLabel(ctx, 's, f, th', x(5330), y(24), width * .22, isDark);
  }

  for (const { label, hz, db, align } of soundExamples) {
    ctx.beginPath();
    ctx.arc(x(hz), y(db), 2.6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.textAlign = align;
    outlinedLabel(ctx, label, x(hz) + (align === 'left' ? 6 : -6), y(db), width * .39, isDark);
  }
  ctx.restore();
}

function drawEar(ctx, frequencies, thresholds, x, y, side, isDark = false) {
  ctx.save();
  ctx.strokeStyle = (isDark ? darkEarColors : earColors)[side];
  ctx.lineWidth = 1.7;
  if (side === 'left') ctx.setLineDash([4, 3]);
  ctx.beginPath();
  frequencies.forEach((frequency, index) => {
    const point = [x(frequency), y(thresholds[index])];
    if (index === 0) ctx.moveTo(...point);
    else ctx.lineTo(...point);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.lineWidth = 2;
  const radius = 5.1;
  frequencies.forEach((frequency, index) => {
    const cx = x(frequency);
    const cy = y(thresholds[index]);
    if (side === 'right') {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.stroke();
    } else {
      const corner = 3.5;
      line(ctx, cx - corner, cy - corner, cx + corner, cy + corner);
      line(ctx, cx - corner, cy + corner, cx + corner, cy - corner);
    }
  });
  ctx.restore();
}

function drawChart(ctx, width, height, data, showSpeech) {
  const isDark = getTheme() === 'dark';
  const showRangeNames = width >= 480;
  const left = width < 320 ? 41 : 49;
  const top = 13;
  const right = width - (showRangeNames ? 110 : 15);
  const bottom = height - 40;
  const plotWidth = right - left;
  const plotHeight = bottom - top;
  const x = hz => left + Math.log2(hz / frequencyTicks[0]) / 6 * plotWidth;
  const y = db => top + (db - minimumLevel) / (maximumLevel - minimumLevel) * plotHeight;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = isDark ? '#0f1324' : '#fff';
  ctx.fillRect(0, 0, width, height);
  for (const { bounds: [start, end], color, darkColor } of hearingRanges) {
    ctx.fillStyle = isDark ? darkColor : color;
    ctx.fillRect(left, y(start), plotWidth, y(end) - y(start));
  }

  ctx.strokeStyle = isDark ? '#2a3254' : '#d4d5e1';
  ctx.fillStyle = isDark ? '#a8b0d0' : '#525570';
  ctx.lineWidth = 1;
  ctx.font = `${width < 340 ? 9 : 11}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let db = minimumLevel; db <= maximumLevel; db += 10) {
    line(ctx, left, y(db), right, y(db));
    ctx.fillText(String(db).replace('-', '−'), left - 5, y(db));
  }
  ctx.textAlign = 'center';
  for (const hz of frequencyTicks) {
    line(ctx, x(hz), top, x(hz), bottom);
    ctx.fillText(hz < 1000 ? String(hz) : `${hz / 1000}k`, x(hz), bottom + 12);
  }
  ctx.setLineDash([2, 3]);
  for (const hz of [3000, 6000]) line(ctx, x(hz), top, x(hz), bottom);
  ctx.setLineDash([]);
  ctx.strokeStyle = isDark ? '#4a537d' : '#8e91a8';
  ctx.strokeRect(left, top, plotWidth, plotHeight);

  if (showSpeech) drawSpeech(ctx, x, y, plotWidth, isDark);
  drawEar(ctx, data.frequenciesHz, data.rightDbHl, x, y, 'right', isDark);
  drawEar(ctx, data.frequenciesHz, data.leftDbHl, x, y, 'left', isDark);

  ctx.fillStyle = isDark ? '#e2e8f0' : '#333655';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Frequency (Hz)', (left + right) / 2, bottom + 29);
  ctx.save();
  ctx.translate(10, (top + bottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Hearing level (dB HL)', 0, 0);
  ctx.restore();
  if (showRangeNames) {
    ctx.textAlign = 'left';
    for (const { bounds: [start, end], label, color, darkColor } of hearingRanges) {
      const middle = y((start + end) / 2);
      ctx.fillStyle = isDark ? darkColor : color;
      ctx.fillRect(right + 11, middle - 4, 8, 8);
      if (isDark) {
        ctx.strokeStyle = '#47507a';
        ctx.strokeRect(right + 11, middle - 4, 8, 8);
      }
      ctx.fillStyle = isDark ? '#cbd5e1' : '#525570';
      ctx.fillText(label, right + 24, middle);
    }
  }
}

export function connectNIHLAudiogram(root) {
  const chart = root.querySelector('[data-nihl-chart]');
  const tableBody = root.querySelector('[data-nihl-thresholds]');
  const overlay = root.querySelector('[data-nihl-overlay]');
  if (!chart || !tableBody) return () => {};

  const doc = chart.ownerDocument;
  const view = doc.defaultView;
  const ctx = chart.getContext('2d');
  const rangeNote = doc.createElement('p');
  rangeNote.className = 'nihl-range-note';
  rangeNote.textContent = 'Hearing level ranges shown in the slides, in dB HL. Normal range 0–20, mild 21–40, moderate 41–70, severe 71–90 and profound 91 or higher.';
  tableBody.closest('table')?.after(rangeNote);
  let current;

  function redraw() {
    if (!ctx || !current) return;
    const { width, height } = chart.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = view.devicePixelRatio || 1;
    const pixelsWide = Math.round(width * dpr);
    const pixelsHigh = Math.round(height * dpr);
    if (chart.width !== pixelsWide) chart.width = pixelsWide;
    if (chart.height !== pixelsHigh) chart.height = pixelsHigh;
    ctx.setTransform(pixelsWide / width, 0, 0, pixelsHigh / height, 0, 0);
    drawChart(ctx, width, height, current, Boolean(overlay?.checked));
  }

  function describe() {
    if (!current) return;
    const speech = overlay?.checked
      ? ' The speech banana and everyday sound positions, including birdsong, conversation, a vacuum and a piano, are illustrative.'
      : '';
    chart.setAttribute('aria-label', `Audiogram for ${current.label}. Red circles mark the right ear and blue crosses mark the left ear. Thresholds are listed in the table below.${speech}`);
  }

  overlay?.addEventListener('change', () => {
    describe();
    redraw();
  });
  if (typeof view.ResizeObserver === 'function') new view.ResizeObserver(redraw).observe(chart);
  else view.addEventListener('resize', redraw);
  onThemeChange(redraw);

  return data => {
    current = data;
    if (overlay) overlay.disabled = false;
    const rows = data.frequenciesHz.map((frequency, index) => {
      const row = doc.createElement('tr');
      const heading = doc.createElement('th');
      const left = doc.createElement('td');
      const right = doc.createElement('td');
      heading.scope = 'row';
      heading.textContent = frequency.toLocaleString('en-GB');
      left.textContent = data.leftDbHl[index];
      right.textContent = data.rightDbHl[index];
      row.append(heading, left, right);
      return row;
    });
    tableBody.replaceChildren(...rows);
    describe();
    redraw();
  };
}
