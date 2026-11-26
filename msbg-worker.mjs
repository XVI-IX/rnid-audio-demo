// Runs the Cambridge MSBG hearing-loss model in Python inside a Web Worker via Pyodide.
// Audio stays 100% on-device: zero network uploads.

const PYODIDE_VERSION = '314.0.7';
const PYODIDE_CANDIDATES = [
  new URL('./pyodide/pyodide.mjs', import.meta.url),
  new URL('../../../local-app/vendor/pyodide-314.0.7/pyodide.mjs', import.meta.url),
  new URL('../../local-app/vendor/pyodide-314.0.7/pyodide.mjs', import.meta.url),
];
const MODEL_ARCHIVE_CANDIDATES = [
  new URL('./rnid-src.zip', import.meta.url),
];

let ready;

async function loadPyodideRuntime() {
  let lastError;
  for (const moduleUrl of PYODIDE_CANDIDATES) {
    try {
      const mod = await import(moduleUrl.href);
      if (typeof mod?.loadPyodide === 'function') {
        const indexURL = new URL('./', moduleUrl).href;
        return await mod.loadPyodide({ indexURL });
      }
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('Pyodide runtime files could not be loaded on this server.');
}

async function fetchModelArchive() {
  for (const url of MODEL_ARCHIVE_CANDIDATES) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.arrayBuffer();
    } catch {
      // Try next candidate if available.
    }
  }
  throw new Error('The RNID model archive (rnid-src.zip) is missing from this deployment.');
}

function boot(notify) {
  if (!ready) {
    notify?.('loading-model', 'Loading Cambridge MSBG model on this device…');
    ready = (async () => {
      const py = await loadPyodideRuntime();
      await py.loadPackage(['numpy', 'scipy'], { messageCallback: () => {} });
      const archive = await fetchModelArchive();
      py.unpackArchive(archive, 'zip', { extractDir: '/home/pyodide/rnid' });
      py.runPython("import sys; sys.path.insert(0, '/home/pyodide/rnid'); import rnid.browser");
      return py;
    })().catch((error) => {
      ready = undefined;
      throw error;
    });
  }
  return ready;
}

function errorMessage(error) {
  const text = String(error?.message ?? error);
  const match = text.match(/RNIDError: (.+)\s*$/m) || text.match(/(?:\w+Error): (.+)\s*$/m);
  return match ? match[1].trim() : text.split('\n').filter(Boolean).pop();
}

self.onmessage = async ({ data }) => {
  const { id, type } = data;
  const notify = (stage, message) => self.postMessage({ id, progress: true, stage, message });
  try {
    const py = await boot(notify);
    if (type === 'boot') {
      self.postMessage({ id, ok: true });
    } else if (type === 'profiles') {
      const profiles = JSON.parse(py.runPython('import json; from rnid import browser; json.dumps(browser.profiles())'));
      self.postMessage({ id, ok: true, profiles });
    } else if (type === 'render') {
      notify('rendering', 'Rendering left and right ears…');
      const { channels, sampleRate, profileId, markerSeconds, detectClimax, includeFilter } = data;
      const scope = py.toPy({});
      try {
        scope.set('channels', channels);
        scope.set('options', py.toPy({
          sample_rate: sampleRate,
          profile_id: profileId,
          marker: String(markerSeconds ?? ''),
          detect: Boolean(detectClimax),
          include_filter: Boolean(includeFilter),
          runtime: `pyodide ${PYODIDE_VERSION} in ${self.navigator?.userAgent ?? 'browser worker'}`,
        }));
        const result = py.runPython(`
import json
import numpy as np
from rnid import browser
pcm = [np.frombuffer(channel.to_py(), dtype=np.float32).copy() for channel in channels]
r = browser.render(pcm, int(options["sample_rate"]), options["profile_id"],
                   climax_seconds=options["marker"] or None, detect_climax=options["detect"],
                   include_filter=options["include_filter"], runtime=options["runtime"])
out = {"manifest": json.dumps(r["manifest"], indent=2, allow_nan=False) + "\\n"}
for name in ("reference", "simulated", "filter"):
    if name in r:
        out[name] = r[name].tobytes()
out`, { globals: scope });
        const out = result.toJs({ dict_converter: Object.fromEntries });
        result.destroy();
        const message = { id, ok: true, manifest: out.manifest };
        const transfer = [];
        for (const name of ['reference', 'simulated', 'filter']) {
          if (!out[name]) continue;
          const bytes = out[name];
          message[name] = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
          transfer.push(bytes.buffer);
        }
        self.postMessage(message, transfer);
      } finally {
        scope.destroy();
      }
    } else {
      throw new Error(`Unknown request: ${type}`);
    }
  } catch (error) {
    self.postMessage({ id, ok: false, error: errorMessage(error) });
  }
};
