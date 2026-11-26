// Zero-Recording Live Microphone "Hear Through Hearing Loss" Workshop & Stall Mode
// Routes live headset mic audio strictly on-device through switchable cochlear/earplug filter
// approximations + optional virtual pub chatter + a brickwall feedback safety limiter.
// Audio is NEVER recorded, buffered to disk, or transmitted over the network.

import { createCrowdAmbienceBuffer, crowdPercentToGain } from './crowd-ambience.mjs?v=8660164ccc';

export const LIVE_MIC_PRESETS = Object.freeze([
  {
    id: 'original',
    label: 'Normal hearing (unfiltered)',
    note: 'Full voice clarity across vowels (250 Hz–1 kHz) and crisp consonants (2–8 kHz).',
    stages: [],
    trimDb: 0,
  },
  {
    id: 'post_gig',
    label: 'Post-gig muffled',
    note: 'Temporary high-frequency threshold shift: s, f, and th lose their crisp edge while vowel chest stays loud.',
    stages: [
      { type: 'peaking', frequency: 4000, Q: 1.3, gain: -16 },
      { type: 'highshelf', frequency: 3200, Q: 0.7, gain: -11 },
    ],
    trimDb: 0,
  },
  {
    id: 'notch_4k',
    label: 'Permanent 4 kHz notch',
    note: 'Classic noise-induced 3–6 kHz notch: speech sounds loud enough, yet rhyming words blur together in chatter.',
    stages: [
      { type: 'peaking', frequency: 4100, Q: 1.5, gain: -28 },
      { type: 'highshelf', frequency: 5500, Q: 0.7, gain: -14 },
    ],
    trimDb: 0,
  },
  {
    id: 'severe_hf',
    label: 'Strong high-frequency loss',
    note: 'Steep drop above 1.8 kHz: consonants vanish almost completely, leaving mostly low vowel hum.',
    stages: [
      { type: 'lowpass', frequency: 1850, Q: 0.7, gain: 0 },
      { type: 'highshelf', frequency: 1400, Q: 0.7, gain: -18 },
    ],
    trimDb: 0,
  },
  {
    id: 'foam_plugs',
    label: 'Cheap foam earplugs',
    note: 'Uneven treble dump: lowers high frequencies far more than bass, making voices and bands sound muddy.',
    stages: [
      { type: 'lowshelf', frequency: 350, Q: 0.7, gain: -8 },
      { type: 'highshelf', frequency: 1800, Q: 0.7, gain: -24 },
    ],
    trimDb: 0,
  },
  {
    id: 'musician_plugs',
    label: 'Musicians’ earplugs (−15 dB flat)',
    note: 'Even −15 dB attenuation across bass, mids, and treble: safer volume while keeping natural speech & music clarity.',
    stages: [
      { type: 'highshelf', frequency: 6500, Q: 0.7, gain: -1 },
    ],
    trimDb: -15,
  },
]);

export function findLiveMicPreset(presetId) {
  return LIVE_MIC_PRESETS.find((p) => p.id === presetId) ?? LIVE_MIC_PRESETS[0];
}

export function buildLiveMicFilterBranch(context, presetId) {
  const preset = findLiveMicPreset(presetId);
  const input = context.createGain();
  const output = context.createGain();
  output.gain.value = 10 ** ((preset.trimDb || 0) / 20);
  const nodes = [input, output];

  let tail = input;
  for (const spec of preset.stages) {
    const filter = context.createBiquadFilter();
    filter.type = spec.type;
    filter.frequency.value = spec.frequency;
    if (Number.isFinite(spec.Q)) filter.Q.value = spec.Q;
    if (Number.isFinite(spec.gain)) filter.gain.value = spec.gain;
    tail.connect(filter);
    tail = filter;
    nodes.push(filter);
  }
  tail.connect(output);

  return {
    preset,
    input,
    output,
    disconnect() {
      for (const node of nodes) {
        try { node.disconnect(); } catch { /* ignore */ }
      }
    },
  };
}

export function connectLiveMic({
  root = document,
  pauseOthers = () => {},
  mediaDevices = globalThis.navigator?.mediaDevices,
} = {}) {
  const panel = root.querySelector('#live-mic-panel');
  if (!panel) return () => {};

  const headphonesCheck = panel.querySelector('#live-mic-headphones');
  const toggleBtn = panel.querySelector('#live-mic-toggle');
  const presetButtons = [...panel.querySelectorAll('[data-live-mic-preset]')];
  const crowdSlider = panel.querySelector('#live-mic-crowd');
  const crowdValue = panel.querySelector('#live-mic-crowd-value');
  const meterFill = panel.querySelector('#live-mic-meter-fill');
  const noteEl = panel.querySelector('#live-mic-note');
  const statusEl = panel.querySelector('#live-mic-status');

  let activePresetId = 'post_gig';
  let context = null;
  let session = null;
  let starting = false;

  const micSupported = Boolean(mediaDevices && typeof mediaDevices.getUserMedia === 'function');
  if (!micSupported && statusEl) {
    statusEl.textContent = 'Live microphone pass-through requires a browser with microphone support over HTTPS or localhost.';
  }

  function syncUi() {
    const running = Boolean(session);
    const confirmed = Boolean(headphonesCheck?.checked);
    if (toggleBtn) {
      toggleBtn.disabled = starting || (!running && (!confirmed || !micSupported));
      toggleBtn.textContent = starting ? 'Starting mic…' : (running ? 'Stop live microphone' : 'Start live microphone');
      toggleBtn.setAttribute('aria-pressed', String(running));
    }
    for (const btn of presetButtons) {
      btn.setAttribute('aria-pressed', String(btn.dataset.liveMicPreset === activePresetId));
    }
    const preset = findLiveMicPreset(activePresetId);
    if (noteEl) noteEl.textContent = preset.note;
    if (crowdValue && crowdSlider) {
      const pct = Math.round(Number(crowdSlider.value) || 0);
      crowdValue.textContent = pct === 0 ? 'Off' : `${pct}%`;
    }
  }

  function stopMic() {
    starting = false;
    if (!session) {
      syncUi();
      return;
    }
    const active = session;
    session = null;
    cancelAnimationFrame(active.raf);
    try { active.crowdSource?.stop(); } catch { /* ignore */ }
    active.branch?.disconnect();
    for (const node of active.nodes) {
      try { node.disconnect(); } catch { /* ignore */ }
    }
    for (const track of active.stream.getTracks()) {
      try { track.stop(); } catch { /* ignore */ }
    }
    if (meterFill) meterFill.style.width = '0%';
    if (statusEl) statusEl.textContent = 'Microphone stopped. Zero audio was recorded or stored.';
    syncUi();
  }

  function swapPresetBranch(nextPresetId) {
    activePresetId = nextPresetId;
    syncUi();
    if (!session || !context) return;
    const oldBranch = session.branch;
    const nextBranch = buildLiveMicFilterBranch(context, nextPresetId);
    session.sceneBus.connect(nextBranch.input);
    nextBranch.output.connect(session.limiter);
    session.branch = nextBranch;
    oldBranch?.disconnect();
  }

  async function startMic() {
    if (session || starting || !micSupported || !headphonesCheck?.checked) return;
    starting = true;
    pauseOthers();
    syncUi();
    if (statusEl) {
      statusEl.removeAttribute('data-error');
      statusEl.textContent = 'Requesting microphone permission (audio stays 100% on this device)…';
    }

    let stream;
    try {
      stream = await mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      context ??= new AudioContextClass();
      await context.resume();

      const micSource = context.createMediaStreamSource(stream);
      const rumbleCut = context.createBiquadFilter();
      rumbleCut.type = 'highpass';
      rumbleCut.frequency.value = 75;

      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      const timeDomain = new Float32Array(analyser.fftSize);

      const sceneBus = context.createGain();
      sceneBus.gain.value = 1;

      const crowdGain = context.createGain();
      crowdGain.gain.value = crowdPercentToGain(crowdSlider?.value ?? 0);
      const crowdSource = context.createBufferSource();
      crowdSource.buffer = createCrowdAmbienceBuffer(context);
      crowdSource.loop = true;
      crowdSource.connect(crowdGain);
      crowdGain.connect(sceneBus);

      // Brickwall safety limiter prevents painful spikes or accidental headphone bleed squeal
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -8;
      limiter.knee.value = 3;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.08;

      const safetyMaster = context.createGain();
      safetyMaster.gain.value = 0.72; // ~ -2.8 dB comfortable monitoring trim

      const branch = buildLiveMicFilterBranch(context, activePresetId);

      micSource.connect(rumbleCut);
      rumbleCut.connect(analyser);
      rumbleCut.connect(sceneBus);
      sceneBus.connect(branch.input);
      branch.output.connect(limiter);
      limiter.connect(safetyMaster);
      safetyMaster.connect(context.destination);
      crowdSource.start();

      const active = {
        stream,
        sceneBus,
        crowdGain,
        crowdSource,
        limiter,
        branch,
        raf: 0,
        nodes: [micSource, rumbleCut, analyser, sceneBus, crowdGain, crowdSource, limiter, safetyMaster],
      };
      session = active;

      const tickMeter = () => {
        if (session !== active) return;
        analyser.getFloatTimeDomainData(timeDomain);
        let sumSq = 0;
        for (let i = 0; i < timeDomain.length; i += 1) sumSq += timeDomain[i] * timeDomain[i];
        const rmsDb = 10 * Math.log10(Math.max(1e-8, sumSq / timeDomain.length));
        const pct = Math.max(0, Math.min(100, Math.round(((rmsDb + 60) / 52) * 100)));
        if (meterFill) meterFill.style.width = `${pct}%`;
        active.raf = requestAnimationFrame(tickMeter);
      };
      active.raf = requestAnimationFrame(tickMeter);

      if (statusEl) {
        statusEl.textContent = 'Live microphone active — speak naturally and switch presets above. Nothing is recorded.';
      }
    } catch (error) {
      stream?.getTracks().forEach((t) => t.stop());
      if (statusEl) {
        statusEl.setAttribute('data-error', '');
        statusEl.textContent = error?.name === 'NotAllowedError'
          ? 'Microphone permission was declined. Allow microphone access in your browser bar to try live voice mode.'
          : (error?.message || 'Could not start live microphone monitoring in this browser.');
      }
    } finally {
      starting = false;
      syncUi();
    }
  }

  headphonesCheck?.addEventListener('change', () => {
    if (!headphonesCheck.checked && session) stopMic();
    else syncUi();
  });

  toggleBtn?.addEventListener('click', () => {
    if (session) stopMic();
    else void startMic();
  });

  for (const btn of presetButtons) {
    btn.addEventListener('click', () => {
      swapPresetBranch(btn.dataset.liveMicPreset);
    });
  }

  crowdSlider?.addEventListener('input', () => {
    syncUi();
    if (session && context) {
      session.crowdGain.gain.setTargetAtTime(
        crowdPercentToGain(crowdSlider.value),
        context.currentTime,
        0.02,
      );
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && session) stopMic();
  });

  syncUi();
  return stopMic;
}
