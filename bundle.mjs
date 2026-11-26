// Self-contained WAV and stored-ZIP builders for in-browser comparison and MSBG render bundles.
// Produces 24-bit (or 16-bit) stereo PCM WAVs plus manifest.json in a standard stored ZIP archive.

export function encodeWav(channels, sampleRate, bitDepth = 24) {
  if (bitDepth !== 16 && bitDepth !== 24) throw new Error('Choose 16 or 24 bits.');
  if (!Array.isArray(channels) || !channels.length) throw new Error('Expected at least one channel.');
  const bytes = bitDepth / 8;
  const frames = channels[0].length;
  const dataSize = frames * channels.length * bytes;
  const view = new DataView(new ArrayBuffer(44 + dataSize));
  const text = (offset, value) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels.length, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels.length * bytes, true);
  view.setUint16(32, channels.length * bytes, true);
  view.setUint16(34, bitDepth, true);
  text(36, 'data');
  view.setUint32(40, dataSize, true);
  const full = 2 ** (bitDepth - 1);
  let offset = 44;
  for (let i = 0; i < frames; i += 1) {
    for (const channel of channels) {
      const value = Math.max(-full, Math.min(full - 1, Math.round(channel[i] * full)));
      if (bytes === 2) view.setInt16(offset, value, true);
      else {
        view.setUint8(offset, value & 0xff);
        view.setUint8(offset + 1, (value >> 8) & 0xff);
        view.setUint8(offset + 2, (value >> 16) & 0xff);
      }
      offset += bytes;
    }
  }
  return new Uint8Array(view.buffer);
}

// Split an interleaved stereo Float32Array into [left, right] Float32Arrays.
export function deinterleave(interleaved) {
  const frames = interleaved.length / 2;
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  for (let i = 0; i < frames; i += 1) {
    left[i] = interleaved[2 * i];
    right[i] = interleaved[2 * i + 1];
  }
  return [left, right];
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// Stored ZIP (no compression) of [{ name, data: Uint8Array }]. Files must be under 4 GiB.
export function zipStore(files) {
  const encoder = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;
  // 1980-01-01 00:00, matching the converter's fixed archive timestamps.
  const dosTime = 0;
  const dosDate = (0 << 9) | (1 << 5) | 1;
  for (const { name, data } of files) {
    const nameBytes = encoder.encode(name);
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const crc = crc32(bytes);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true);
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, bytes.length, true);
    local.setUint32(22, bytes.length, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);
    parts.push(new Uint8Array(local.buffer), nameBytes, bytes);
    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint16(10, 0, true);
    entry.setUint16(12, dosTime, true);
    entry.setUint16(14, dosDate, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, bytes.length, true);
    entry.setUint32(24, bytes.length, true);
    entry.setUint16(28, nameBytes.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), nameBytes);
    offset += 30 + nameBytes.length + bytes.length;
  }
  const centralSize = central.reduce((total, part) => total + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

function audioExtension(url) {
  const pathname = String(url instanceof URL ? url.pathname : url).split('?', 1)[0];
  const match = pathname.match(/\.(m4a|mp3|flac|wav)$/i);
  return match ? match[1].toLowerCase() : 'wav';
}

export async function assembleComparisonZip({ referenceUrl, simulatedUrl, manifestUrl }, fetchImpl = fetch) {
  const refExt = audioExtension(referenceUrl);
  const simExt = audioExtension(simulatedUrl);
  const urls = [
    [`reference.${refExt}`, referenceUrl],
    [`simulated.${simExt}`, simulatedUrl],
    ['manifest.json', manifestUrl],
  ];
  const files = await Promise.all(urls.map(async ([name, url]) => {
    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`Could not download ${name} for the comparison ZIP.`);
    return { name, data: new Uint8Array(await response.arrayBuffer()) };
  }));
  return zipStore(files);
}
