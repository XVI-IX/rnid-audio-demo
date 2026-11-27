import { connectListenWaveform } from './listen-waveform.mjs?v=06bba40fbe';
import { getTinnitusCalibrationLinearBoost, onCalibrationChange } from './output-calibration.mjs?v=06bba40fbe';
import { tinnitusSamples } from './tinnitus-preview.mjs?v=06bba40fbe';
import { confirmRingingPlayback } from './tinnitus-warning.mjs?v=06bba40fbe';
import { audibleTinnitusGain, tinnitusLoop } from './upload-tinnitus.mjs?v=06bba40fbe';

const previewAudio = new URL('./demo/v2/', import.meta.url);
const hangoverSamples = [
  ['#hangover-original', 'reference.wav', 'the original', 'signal-original.wav'],
  ['#hangover-muffled', 'post_gig_muffled_v1.wav', 'the muffled example', 'signal-muffled.wav'],
  ['#hangover-stronger', 'high_frequency_demo_v1.wav', 'the stronger example', 'signal-stronger.wav'],
  ['#hangover-permanent', 'nihl_demo_v1.wav', 'the permanent loss example', 'signal-permanent.wav'],
];
const toneNote = 'Same tones from 500 Hz to 6 kHz, with pauses in between. Listen for tones that get quieter or fall silent.';

const RINGING_FILES = new Set(['tinnitus-ringing.wav', 'tinnitus-music-ringing.wav']);
const HISS_PAIR_FOR_RINGING = {
  'tinnitus-ringing.wav': '#tinnitus-hiss',
  'tinnitus-music-ringing.wav': '#tinnitus-music-hiss',
};

function detectTinnitusKind(file) {
  if (file === 'tinnitus-ringing.wav') return { sound: 'ringing', mode: 'solo' };
  if (file === 'tinnitus-hiss.wav') return { sound: 'hiss', mode: 'solo' };
  if (file === 'tinnitus-music-ringing.wav') return { sound: 'ringing', mode: 'music' };
  if (file === 'tinnitus-music-hiss.wav') return { sound: 'hiss', mode: 'music' };
  return null;
}

function connectPreviewButtons(samples, statusSelector, toggle) {
  const status = document.querySelector(statusSelector);
  if (!status) return;

  for (const [selector, file, label, alternative] of samples) {
    const button = document.querySelector(selector);
    if (!button) continue;
    const messages = {
      loading: `Loading ${label}…`,
      playing: `Playing ${label}. Select it again to stop.`,
      stopped: '',
      ended: 'Example ended.',
      failed: 'This example could not play. Try again.',
    };
    button.disabled = false;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      const invoke = () => toggle(file, (state) => {
        button.setAttribute('aria-pressed', String(state === 'loading' || state === 'playing'));
        status.textContent = messages[state];
      }, alternative);

      if (RINGING_FILES.has(file)) {
        const hissSelector = HISS_PAIR_FOR_RINGING[file];
        const hissButton = hissSelector ? document.querySelector(hissSelector) : null;
        confirmRingingPlayback({
          onConfirm: invoke,
          onUseHiss: hissButton ? () => hissButton.dispatchEvent(new Event('click')) : null,
        });
        return;
      }
      invoke();
    });
  }
}

export function connectListeningPreviews({ pauseStudio, volume }) {
  const moreExamples = document.querySelector('#more-listening-examples');
  const sourceButtons = document.querySelectorAll('[data-listen-source]');
  const listeningNote = document.querySelector('#hangover-listening-note');
  const activeWarningEl = document.querySelector('#listen-tinnitus-active-warning');
  const stopWarningBtn = document.querySelector('#listen-tinnitus-stop');
  const musicNote = listeningNote?.textContent;
  const waveform = connectListenWaveform();
  let comparisonSource = 'music';
  let current;
  let webAudioCtx = null;
  const loopCache = new Map();

  function syncActiveRingingBanner() {
    if (!activeWarningEl) return;
    activeWarningEl.hidden = !(current && RINGING_FILES.has(current.file));
  }

  function stopWebAudioRig(rig) {
    if (!rig) return;
    try { rig.overlaySource?.stop(); } catch { /* ignore */ }
    for (const node of rig.nodes) {
      try { node.disconnect(); } catch { /* ignore */ }
    }
  }

  function stop(state = 'stopped') {
    if (!current) {
      syncActiveRingingBanner();
      return;
    }
    const { audio, update, rig } = current;
    current = undefined;
    syncActiveRingingBanner();
    waveform.hide();
    stopWebAudioRig(rig);
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    update(state);
  }

  function currentLevel() {
    return Math.min(1, Math.max(0, Number(volume()) || 0));
  }

  function computeLayerGain(sound, sampleRate) {
    const key = `${sound}@${sampleRate}`;
    if (!loopCache.has(key)) {
      loopCache.set(key, tinnitusLoop(sound, sampleRate));
    }
    const samples = loopCache.get(key);
    // Use -22 dBFS / -19 dBFS perceptual target so isolated & contextual tinnitus are clearly audible
    const gain = audibleTinnitusGain(sound, samples, -26, getTinnitusCalibrationLinearBoost());
    return { samples, gain };
  }

  function updateVolume() {
    if (!current) return;
    const level = currentLevel();
    if (current.rig) {
      current.audio.volume = 1;
      current.audio.muted = level === 0;
      current.rig.masterGain.gain.value = level;
      if (current.rig.layerGainNode && current.rig.tinnitusMeta) {
        const { sound, mode } = current.rig.tinnitusMeta;
        if (mode === 'solo') {
          const { gain } = computeLayerGain(sound, current.rig.ctx.sampleRate);
          current.rig.layerGainNode.gain.value = gain;
        } else {
          const { gain } = computeLayerGain(sound, current.rig.ctx.sampleRate);
          current.rig.layerGainNode.gain.value = gain;
        }
      }
      return;
    }
    current.audio.volume = level;
    current.audio.muted = level === 0;
  }

  function attachAudibleTinnitusRig(audio, file) {
    const tinnitusMeta = detectTinnitusKind(file);
    if (!tinnitusMeta) return null;
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (typeof AudioContextClass !== 'function') return null;
    try {
      webAudioCtx ??= new AudioContextClass();
      void webAudioCtx.resume?.();
      const mediaSource = webAudioCtx.createMediaElementSource(audio);
      if (!mediaSource) return null;

      const limiter = webAudioCtx.createDynamicsCompressor();
      limiter.threshold.value = -3;
      limiter.knee.value = 3;
      limiter.ratio.value = 16;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.08;

      const masterGain = webAudioCtx.createGain();
      masterGain.gain.value = currentLevel();

      const layerGainNode = webAudioCtx.createGain();
      const { samples, gain } = computeLayerGain(tinnitusMeta.sound, webAudioCtx.sampleRate);
      layerGainNode.gain.value = gain;

      const nodes = [mediaSource, layerGainNode, limiter, masterGain];
      let overlaySource = null;

      if (tinnitusMeta.mode === 'solo') {
        // Boost the very quiet (-43 dBFS / -37 dBFS) solo WAV directly to a clear -22 / -19 dBFS level
        mediaSource.connect(layerGainNode);
        layerGainNode.connect(limiter);
      } else {
        // Keep music at unity and overlay a clearly audible tinnitus layer across music + quiet tail
        mediaSource.connect(limiter);
        const buf = webAudioCtx.createBuffer(1, samples.length, webAudioCtx.sampleRate);
        buf.copyToChannel(samples, 0);
        overlaySource = webAudioCtx.createBufferSource();
        overlaySource.buffer = buf;
        overlaySource.loop = true;
        overlaySource.connect(layerGainNode);
        layerGainNode.connect(limiter);
        overlaySource.start(webAudioCtx.currentTime, 0);
        nodes.push(overlaySource);
      }

      limiter.connect(masterGain);
      masterGain.connect(webAudioCtx.destination);
      return { ctx: webAudioCtx, masterGain, layerGainNode, overlaySource, nodes, tinnitusMeta };
    } catch {
      return null;
    }
  }

  async function toggle(file, update, group) {
    const wasPlaying = current?.file === file;
    stop();
    if (wasPlaying) return;

    pauseStudio();
    const audio = new Audio(new URL(file, previewAudio).href);
    const rig = attachAudibleTinnitusRig(audio, file);
    const request = { audio, file, update, group, rig };
    current = request;
    syncActiveRingingBanner();
    updateVolume();
    update('loading');
    const finish = (state) => {
      if (current === request) stop(state);
    };
    const loadError = () => finish('failed');
    audio.addEventListener('ended', () => finish('ended'), { once: true });
    audio.addEventListener('error', loadError, { once: true });
    try {
      await audio.play();
    } catch {
      loadError();
      return;
    }
    if (current === request) {
      update('playing');
      waveform.show(audio, file, group);
    }
  }

  for (const button of sourceButtons) {
    button.addEventListener('click', () => {
      const next = button.dataset.listenSource;
      if (next === comparisonSource) return;
      if (current?.group === 'hangover') stop();
      comparisonSource = next;
      for (const control of sourceButtons) {
        control.setAttribute('aria-pressed', String(control.dataset.listenSource === comparisonSource));
      }
      if (listeningNote) listeningNote.textContent = comparisonSource === 'tones' ? toneNote : musicNote;
    });
  }

  onCalibrationChange(() => updateVolume());
  stopWarningBtn?.addEventListener('click', () => stop('stopped'));
  document.querySelector('#volume')?.addEventListener('input', updateVolume);
  moreExamples?.addEventListener('toggle', () => { if (!moreExamples.open) stop(); });
  connectPreviewButtons(tinnitusSamples, '#tinnitus-preview-status', (file, update) => toggle(file, update, 'tinnitus'));
  connectPreviewButtons(hangoverSamples, '#hangover-status', (music, update, tones) =>
    toggle(comparisonSource === 'tones' ? tones : music, update, 'hangover'));
  return stop;
}
