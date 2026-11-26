import { getSharedWebLlmClient } from './audio-explainer.mjs?v=6c8561a22e';
import { connectAudiologistSandbox } from './audiologist-sandbox.mjs?v=6c8561a22e';
import { assembleComparisonZip } from './bundle.mjs?v=6c8561a22e';
import { connectConcertStage } from './concert-stage.mjs?v=6c8561a22e';
import { CUE_STEP_SAMPLES, cueManifest, cueSample, cueSeconds } from './cue.mjs?v=6c8561a22e';
import { connectEar3DStage } from './ear-3d-stage.mjs?v=6c8561a22e';
import { connectEarLevels, connectStereoEarOutput } from './ear-levels.mjs?v=6c8561a22e';
import { connectFreqBandSim } from './freq-band-sim.mjs?v=6c8561a22e';
import { connectHomeHearingGuide, connectStudioHearingGuide } from './hearing-guide.mjs?v=6c8561a22e';
import { connectHomeVideo } from './home-video.mjs?v=6c8561a22e';
import { connectHomeVideoEffects } from './home-video-effects.mjs?v=6c8561a22e';
import { connectListeningPreviews } from './listening-previews.mjs?v=6c8561a22e';
import { connectLiveMic } from './live-mic.mjs?v=6c8561a22e';
import { attachMarkerDrag } from './marker-scrubber.mjs?v=6c8561a22e';
import { MSBG_MAX_SECONDS, canRenderOnDevice, createMsbgClient } from './msbg-browser.mjs?v=6c8561a22e';
import { connectNIHLExamples } from './nihl-examples.mjs?v=6c8561a22e';
import {
  connectCalibrationControls,
  createCalibrationStage,
  getTinnitusCalibrationLinearBoost,
  onCalibrationChange,
} from './output-calibration.mjs?v=6c8561a22e';
import { connectVolumeGuardrail } from './safe-listening.mjs?v=6c8561a22e';
import { connectListeningShare, readListeningLink } from './share.mjs?v=6c8561a22e';
import { connectSpectrogram } from './spectrogram.mjs?v=6c8561a22e';
import { connectStoryJourney } from './story-journey.mjs?v=6c8561a22e';
import { connectStudioExplainer } from './studio-explainer.mjs?v=6c8561a22e';
import { connectStudioFilterResponse } from './studio-filter-response.mjs?v=6c8561a22e';
import { displayProfileName, updateStudioFilter } from './studio-filters.mjs?v=6c8561a22e';
import { connectThemeToggle, onThemeChange } from './theme.mjs?v=6c8561a22e';
import { confirmRingingPlayback } from './tinnitus-warning.mjs?v=6c8561a22e';
import { connectUploadPreview, isVideoFile } from './upload-preview.mjs?v=6c8561a22e';
import { activeRmsDb, audibleTinnitusGain, tinnitusLoop } from './upload-tinnitus.mjs?v=6c8561a22e';
import { connectViewNavigation } from './views.mjs?v=6c8561a22e';

const demo = new URL('./demo/', import.meta.url);
const collection = new URL('music/collection.json', demo);
const tracks = ['reference', 'simulated'];
const defaultProfile = 'high_frequency_demo_v1';
const listeningNotes = {
  post_gig_muffled_v1: 'Listen for softened hi-hats and dulled vocal edges.',
  nihl_demo_v1: 'Listen for softened snare snap and word consonants.',
  high_frequency_demo_v1: 'Listen for cymbals and high notes.',
  broadband_demo_v1: 'Compare bass, melody, and percussion.',
  asymmetric_demo_v1: 'Compare left and right headphones.',
};
const fallbackExcerpt = { id: 'default', label: 'Demo', catalog: new URL('v2/catalog.json', demo) };
const fallbackSong = { id: 'engineering-demo', title: 'Synthetic comparison demo', excerpts: [fallbackExcerpt] };
const fallbackCatalog = {
  duration_seconds: 12, marker_seconds: 4, quiet_seconds: 10.75,
  reference: 'reference.wav', waveform: 'waveform.json',
  profiles: Object.keys(listeningNotes).map((id) => ({ id, simulated: `${id}.wav`, bundle: `${id}.zip` })),
  tinnitus: { ringing: 'tinnitus-ringing.wav', hiss: 'tinnitus-hiss.wav' },
};

const player = document.querySelector('#player');
const canvas = document.querySelector('#waveform');
const seek = document.querySelector('#seek');
const playButton = document.querySelector('#play');
const loopButton = document.querySelector('#loop');
const volume = document.querySelector('#volume');
const jump = document.querySelector('#jump');
const playerStatus = document.querySelector('#play-status');
const positionLabel = document.querySelector('#position');
const durationLabel = document.querySelector('#duration');
const originalButton = document.querySelector('[data-track="reference"]');
const hearingButtons = document.querySelectorAll('[data-listening-profile]');
const songField = document.querySelector('#song-field');
const demoSong = document.querySelector('#demo-song');
const songCredit = document.querySelector('#song-credit');
const excerptField = document.querySelector('#excerpt-field');
const demoExcerpt = document.querySelector('#demo-excerpt');
const excerptPosition = document.querySelector('#excerpt-position');
const profileOptions = Object.keys(listeningNotes).map((id) => ({ id, label: displayProfileName(id) }));
const listeningNote = document.querySelector('#listening-note');
const demoBundle = document.querySelector('#download-demo');
const demoDownloadStatus = document.querySelector('#studio-download-status');
const shareStatus = document.querySelector('#share-status');
const demoReference = document.querySelector('#reference-wav');
const demoSimulation = document.querySelector('#simulated-wav');
const climaxPanel = document.querySelector('#climax');
const climaxStatus = document.querySelector('#climax-status');
const climaxCandidates = document.querySelector('#climax-candidates');
const cueSet = document.querySelector('#cue-set');
const cueBack = document.querySelector('#cue-back');
const cueForward = document.querySelector('#cue-forward');
const cueReset = document.querySelector('#cue-reset');
const cueDownload = document.querySelector('#cue-download');
const cueStatus = document.querySelector('#cue-status');
const tinnitusMix = document.querySelector('#tinnitus-mix');
const tinnitusSelect = document.querySelector('#tinnitus');
const tinnitusStatus = document.querySelector('#tinnitus-status');
const tinnitusDownload = document.querySelector('#tinnitus-download');
const studioTinnitusWarning = document.querySelector('#studio-tinnitus-warning');
const studioTinnitusStopBtn = document.querySelector('#studio-tinnitus-stop');
const quietJump = document.querySelector('#quiet-jump');

let position = 0;
let duration = Number(seek.max);
let marker;
let originalCue;
let quietMarker;
let selectedTrack = 'reference';
let selectedProfile = defaultProfile;
let song = fallbackSong;
let excerpt = fallbackExcerpt;
let catalog = fallbackCatalog;
let waveform;
let context;
let audioBuffers;
let playback;
let pendingStudioPlay;
let pendingHearingProfile;
let animation;
let looping = false;
let waveformSize;
let waveformColors;
let waveformPreview;
let cancelWaveformDrag;
let activeView = 'listen';
const decodedAudio = new Map();
const loopAudio = new WeakMap();
const songOptions = new Map([[fallbackSong.id, fallbackSong]]);
const manualCues = new Map();
let stopConcertStage = () => {};
let stopFreqBandSim = () => {};
let stopLiveMic = () => {};
let stopNIHLExamples = () => {};
const readStudioEarGains = connectEarLevels(document.querySelector('#studio-ear-levels'), (gains) => {
  playback?.earOutput.setGains(gains);
});
const studioVolumeGuardrail = connectVolumeGuardrail({
  volumeInput: volume,
  bannerEl: document.querySelector('#studio-safe-volume-nudge'),
  messageEl: document.querySelector('#studio-safe-volume-msg'),
  resetBtn: document.querySelector('#studio-safe-volume-reset'),
  dismissBtn: document.querySelector('#studio-safe-volume-dismiss'),
  isSimulatedActive: () => selectedTrack === 'simulated',
  onResetVolume: () => updateVolume(),
});
const stopListeningPreviews = connectListeningPreviews({
  pauseStudio: () => {
    pauseStudio();
    stopConcertStage();
    stopHomeVideo();
    stopFreqBandSim();
    stopLiveMic();
    stopNIHLExamples();
  },
  volume: playbackVolume,
});
connectThemeToggle();
onThemeChange(() => {
  waveformSize = undefined;
  resizeWaveform();
});
connectCalibrationControls();

// Progressive scroll-reveal choreography so sections flow smoothly into view
if (typeof IntersectionObserver === 'function' && !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
  const flowSections = [...document.querySelectorAll('[data-flow-section]')];
  if (flowSections.length > 0) {
    document.documentElement.dataset.scrollFlow = 'ready';
    const vh = window.innerHeight || 800;
    for (const el of flowSections) {
      if (el.getBoundingClientRect().top < vh * 0.92) {
        el.classList.add('is-visible');
      }
    }
    const flowObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          flowObserver.unobserve(entry.target);
        }
      }
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    for (const el of flowSections) {
      if (!el.classList.contains('is-visible')) flowObserver.observe(el);
    }
  }
}

const ear3D = connectEar3DStage({
  getWebLlmClient: () => getSharedWebLlmClient(),
  onSelectPreset: ({ effectKey, tinnitus }) => {
    stopConcertStage.play?.({ effectKey, tinnitus: tinnitus || 'off' });
  },
  onToggleAudio: ({ effectKey, tinnitus }) => {
    stopConcertStage.toggle?.({ effectKey, tinnitus: tinnitus || 'off' });
  },
  onCrowdChange: (pct) => {
    stopConcertStage.setCrowdPercent?.(pct);
  },
});

stopConcertStage = connectConcertStage({
  pauseOthers: () => {
    stopListeningPreviews();
    stopHomeVideo();
    stopFreqBandSim();
    stopLiveMic();
    stopNIHLExamples();
    pauseStudio();
  },
  getVolume: playbackVolume,
  onStateChange: (evt) => {
    if (evt.type === 'select') {
      ear3D.setState({
        effectKey: evt.effectKey,
        tinnitus: evt.tinnitus,
        playing: evt.playing,
      });
    } else if (evt.type === 'energy') {
      ear3D.setAudioEnergy({
        bass: evt.bassEnergy,
        treble: evt.trebleEnergy,
        playing: evt.playing,
      });
    } else if (evt.type === 'focusPart') {
      ear3D.setState({ focusPart: evt.focusPart });
    }
  },
});

for (const nihlBtn of document.querySelectorAll('[data-nihl-case]')) {
  nihlBtn.addEventListener('click', () => {
    const c = nihlBtn.dataset.nihlCase || 'normal';
    const mapped = c === 'normal'
      ? 'original'
      : (c === 'nihl_typical' ? 'permanent_notch' : 'severe_hf');
    ear3D.setState({ effectKey: mapped, focusPart: 'cochlea' });
    stopConcertStage.setState?.({ effectKey: mapped });
  });
}

const stopHomeVideo = connectHomeVideo(
  () => {
    stopConcertStage();
    stopListeningPreviews();
    stopFreqBandSim();
    stopLiveMic();
    stopNIHLExamples();
    pauseStudio();
  },
  connectHomeHearingGuide(),
  (patch) => {
    ear3D.setState(patch);
    if (patch.effectKey || patch.tinnitus) {
      stopConcertStage.setState?.(patch);
    }
  },
);
stopFreqBandSim = connectFreqBandSim({
  pauseOthers: () => {
    stopConcertStage();
    stopListeningPreviews();
    stopHomeVideo();
    stopLiveMic();
    stopNIHLExamples();
    pauseStudio();
  },
  volume: playbackVolume,
  onVisualState: (patch) => {
    ear3D.setState(patch);
    if (patch.effectKey || patch.crowdPercent !== undefined) {
      stopConcertStage.setState?.({
        ...(patch.effectKey ? { effectKey: patch.effectKey } : {}),
        ...(patch.crowdPercent !== undefined ? { crowdPercent: patch.crowdPercent } : {}),
      });
    }
  },
});
stopLiveMic = connectLiveMic({
  pauseOthers: () => {
    stopConcertStage();
    stopListeningPreviews();
    stopHomeVideo();
    stopFreqBandSim();
    stopNIHLExamples();
    pauseStudio();
  },
});
stopNIHLExamples = connectNIHLExamples({
  pauseOthers: () => {
    stopConcertStage();
    stopListeningPreviews();
    stopHomeVideo();
    stopFreqBandSim();
    stopLiveMic();
    pauseStudio();
  },
  volume: playbackVolume,
});
connectHomeVideoEffects();

const storyJourney = connectStoryJourney({
  onNavigateView: (targetView) => {
    const hash = targetView === 'studio'
      ? '#demo'
      : (targetView === 'your-audio'
          ? '#render'
          : (targetView === 'explore' ? '#explore' : '#listen'));
    if (window.location.hash !== hash) window.location.hash = hash;
  },
  onUpdateEar3D: (patch) => ear3D.setState(patch),
  onTriggerBandPreset: (presetId) => stopConcertStage.play?.({ effectKey: presetId, tinnitus: 'off', crowdPercent: 0 }),
  onTriggerPubDemo: () => stopFreqBandSim.triggerPubDemo?.(),
  onConfigureStudio: ({ profileId, tinnitus }) => {
    const applyStudioConfig = (chosenTin) => {
      if (chosenTin && tinnitusSelect) {
        tinnitusSelect.value = chosenTin;
        updateTinnitusDownload();
      }
      if (profileId) void listenWithProfile(profileId);
    };
    if (tinnitus === 'ringing') {
      confirmRingingPlayback({
        onConfirm: () => applyStudioConfig('ringing'),
        onUseHiss: () => applyStudioConfig('hiss'),
        onCancel: () => applyStudioConfig('off'),
      });
      return;
    }
    applyStudioConfig(tinnitus);
  },
});

document.querySelector('#studio-quick-zip')?.addEventListener('click', () => demoBundle?.click());
document.querySelector('#studio-quick-share')?.addEventListener('click', () => document.querySelector('#share-demo')?.click());
const updateStudioGuide = connectStudioHearingGuide();
const studioExplainer = connectStudioExplainer({
  formatTime,
  onSeek: (seconds) => seekTo(seconds),
  getProfileLabel: (id) => displayProfileName(id),
  getWebLlmClient: () => getSharedWebLlmClient(),
});
connectAudiologistSandbox();
const spectrogram = connectSpectrogram({ seekTo });
const updateFilterResponse = connectStudioFilterResponse();

function formatTime(seconds, precision = 1) {
  const scale = 10 ** precision;
  const units = Math.round(seconds * scale);
  const whole = Math.floor(units / scale);
  const fraction = String(units % scale).padStart(precision, '0');
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}.${fraction}`;
}

function showStatus(element, message, isError = false) {
  element.textContent = message;
  element.toggleAttribute('data-error', isError);
}

function resizeWaveform() {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = window.devicePixelRatio || 1;
  const width = Math.round(rect.width * ratio);
  const height = Math.round(rect.height * ratio);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  waveformSize = { width: rect.width, height: rect.height };
  const style = getComputedStyle(canvas);
  const color = (name, fallback) => style.getPropertyValue(`--wave-${name}`).trim() || fallback;
  waveformColors = {
    line: color('line', '#71829b'),
    idle: color('idle', '#98a0be'),
    played: color('played', '#ff936e'),
    simulatedIdle: color('simulated-idle', '#82aca9'),
    simulatedPlayed: color('simulated-played', '#8be0d0'),
    marker: color('marker', '#ffd49a'),
    playhead: color('playhead', '#fff1e9'),
    loop: color('loop', '#9187ea36'),
    loopEdge: color('loop-edge', '#bcb0ff'),
  };
  drawWaveform();
}

function drawWaveform() {
  if (!waveformSize) return;
  const plot = canvas.getContext('2d');
  if (!plot) return;
  const { width, height } = waveformSize;
  const colors = waveformColors;
  const samples = waveform?.[selectedTrack === 'reference' ? 'reference' : selectedProfile];
  const progressX = width * Math.min(displayedPosition() / duration, 1);
  const reference = selectedTrack === 'reference';
  const idleColor = reference ? colors.idle : colors.simulatedIdle;
  const playedColor = reference ? colors.played : colors.simulatedPlayed;

  plot.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
  plot.clearRect(0, 0, width, height);
  if (looping) {
    const { start, end } = loopRange();
    const left = width * start / duration;
    const right = width * end / duration;
    plot.fillStyle = colors.loop;
    plot.fillRect(left, 0, right - left, height);
    plot.fillStyle = colors.loopEdge;
    plot.fillRect(left, 0, 1, height);
    plot.fillRect(Math.min(right, width - 1), 0, 1, height);
  }
  plot.fillStyle = colors.line;
  plot.fillRect(0, Math.floor(height / 2), width, 1);

  if (samples?.length) {
    const spacing = width / samples.length;
    const barWidth = Math.max(1, spacing * 0.66);
    for (const [index, amplitude] of samples.entries()) {
      const x = (index + 0.5) * spacing;
      const barHeight = Math.max(2, (height - 24) * amplitude);
      plot.fillStyle = x <= progressX ? playedColor : idleColor;
      plot.fillRect(x - barWidth / 2, (height - barHeight) / 2, barWidth, barHeight);
    }
  }

  const visibleMarker = waveformPreview?.kind === 'marker' ? waveformPreview.value : marker;
  if (visibleMarker !== undefined) {
    const markerX = width * visibleMarker / duration;
    plot.save();
    plot.strokeStyle = colors.marker;
    plot.lineWidth = 1.5;
    plot.setLineDash(waveformPreview?.kind === 'marker' || activeCueSample() !== null ? [] : [4, 3]);
    plot.beginPath();
    plot.moveTo(markerX, 8);
    plot.lineTo(markerX, height - 5);
    plot.stroke();
    plot.restore();
    plot.fillStyle = colors.marker;
    plot.beginPath();
    plot.moveTo(markerX - 4, 2);
    plot.lineTo(markerX + 4, 2);
    plot.lineTo(markerX, 8);
    plot.fill();
  }

  if (progressX > 0) {
    const head = Math.min(width - 2, progressX);
    plot.fillStyle = colors.playhead;
    plot.fillRect(head, 0, 2, height);
    plot.fillRect(Math.max(0, Math.min(width - 6, head - 2)), 0, 6, 3);
  }
}

function displayedPosition() {
  return waveformPreview?.kind === 'seek' ? waveformPreview.value : position;
}

function updateTimeline() {
  const shown = displayedPosition();
  seek.value = String(shown);
  const shownPosition = formatTime(shown);
  const shownDuration = formatTime(duration);
  if (positionLabel.textContent !== shownPosition) {
    positionLabel.textContent = shownPosition;
    seek.setAttribute('aria-valuetext', shownPosition);
  }
  if (durationLabel.textContent !== shownDuration) durationLabel.textContent = shownDuration;
  spectrogram.setPosition(shown);
  drawWaveform();
}

function asset(file) {
  return new URL(file, excerpt.catalog);
}

function isPosition(seconds) {
  return Number.isFinite(seconds) && seconds >= 0 && seconds < duration;
}

function loopRange() {
  const span = Math.min(4, duration);
  const from = marker === undefined ? duration / 4 : marker - span / 2;
  const start = Math.min(Math.max(0, from), duration - span);
  return { start, end: start + span };
}

function updateLoopButton() {
  loopButton.textContent = marker === undefined ? 'Loop section' : 'Loop cue';
  loopButton.setAttribute('aria-pressed', String(looping));
  const { start, end } = loopRange();
  loopButton.title = `Repeat ${formatTime(start)} to ${formatTime(end)}`;
}

function validCueSample(sample) {
  return Number.isSafeInteger(sample) && cueSample(cueSeconds(sample), catalog.duration_seconds) === sample;
}

function activeCueSample() {
  const sample = manualCues.get(excerpt.catalog.href);
  return validCueSample(sample) ? sample : null;
}

function updateCueControls(sample = activeCueSample()) {
  const loading = playButton.disabled;
  cueSet.disabled = loading;
  cueBack.disabled = loading;
  cueForward.disabled = loading;
  cueReset.disabled = loading || sample === null;
  cueDownload.disabled = loading || sample === null;
}

function setManualCue(sample) {
  if ((sample !== null && !validCueSample(sample)) || activeCueSample() === sample) return;
  const oldLoopStart = looping && playback ? loopRange().start : undefined;
  if (sample === null) manualCues.delete(excerpt.catalog.href);
  else manualCues.set(excerpt.catalog.href, sample);
  updateMarkers();
  if (oldLoopStart !== undefined && oldLoopStart !== loopRange().start) {
    finishPlayback();
    startPlayback();
  } else drawWaveform();
}

function nudgeCue(offset) {
  const base = activeCueSample() ?? cueSample(originalCue ?? playbackPosition(), catalog.duration_seconds);
  const last = cueSample(catalog.duration_seconds, catalog.duration_seconds);
  if (base !== null && last !== null) setManualCue(Math.min(last, Math.max(0, base + offset)));
}

function downloadCue() {
  const sample = activeCueSample();
  if (sample === null) return;
  const manifest = cueManifest({ song, excerpt, duration: catalog.duration_seconds, sample, suggested: originalCue });
  const data = new Blob([JSON.stringify(manifest, null, 2) + '\n'], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(data);
  link.href = url;
  link.download = `${song.id}-${excerpt.id}-cue.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function updateMarkers() {
  const climax = catalog.climax;
  const found = climax?.status === 'ok' && isPosition(climax.selected_seconds);
  const catalogManual = found && climax.selected_by === 'manual';
  originalCue = found ? climax.selected_seconds : isPosition(catalog.marker_seconds) ? catalog.marker_seconds : undefined;
  const edit = activeCueSample();
  marker = edit === null ? originalCue : cueSeconds(edit);
  quietMarker = isPosition(catalog.quiet_seconds) ? catalog.quiet_seconds : undefined;
  jump.hidden = marker === undefined;
  if (!jump.hidden) jump.textContent = `Jump to ${formatTime(marker)}`;
  quietJump.hidden = quietMarker === undefined;
  updateLoopButton();
  updateCueControls(edit);
  const cueMessage = edit === null ? 'No manual cue set.' : `Manual cue at ${formatTime(marker, 3)}.`;
  if (cueStatus.textContent !== cueMessage) cueStatus.textContent = cueMessage;

  let status = '';
  if (found && !catalogManual) status = `Suggested climax at ${formatTime(originalCue)}.`;
  else if (climax?.status === 'no_candidate') status = 'No clear climax was found in this excerpt.';
  else if (climax?.status === 'error') status = 'The climax suggestion is unavailable for this excerpt.';
  else if (originalCue !== undefined) status = `Demo marker at ${formatTime(originalCue)}.`;
  climaxStatus.textContent = status;
  climaxCandidates.replaceChildren();
  const alternatives = found && Array.isArray(climax.candidates)
    ? [...new Set(climax.candidates.map((candidate) => candidate.seconds))]
      .filter((seconds) => isPosition(seconds) && seconds !== originalCue).slice(0, 2)
    : [];
  for (const seconds of alternatives) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'marker';
    button.textContent = `Try ${formatTime(seconds)}`;
    button.addEventListener('click', () => seekTo(seconds));
    climaxCandidates.append(button);
  }
  climaxCandidates.hidden = !alternatives.length;
  climaxPanel.hidden = !status;
}

async function loadWaveform(currentCatalog) {
  if (!currentCatalog.waveform) return;
  try {
    const response = await fetch(asset(currentCatalog.waveform));
    if (!response.ok) return;
    const data = await response.json();
    if (currentCatalog !== catalog) return;
    waveform = data;
    drawWaveform();
  } catch {
    // The native seek control remains available without a waveform.
  }
}

function decodeTrack(url) {
  if (!decodedAudio.has(url.href)) {
    const loading = fetch(url).then(async (response) => {
      if (!response.ok) throw new Error('Demo WAV is unavailable.');
      return context.decodeAudioData(await response.arrayBuffer());
    }).catch((error) => {
      if (decodedAudio.get(url.href) === loading) decodedAudio.delete(url.href);
      throw error;
    });
    decodedAudio.set(url.href, loading);
  }
  return decodedAudio.get(url.href);
}

async function prepareAudio(request) {
  if (!context) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    context = new AudioContext();
  }
  await context.resume();
  if (pendingStudioPlay !== request) return;
  const clip = excerpt.catalog.href;
  const profile = selectedProfile;
  if (audioBuffers?.clip !== clip || audioBuffers.profile !== profile) {
    const simulation = catalog.profiles.find(({ id }) => id === profile).simulated;
    const decoded = await Promise.all([catalog.reference, simulation].map((file) => decodeTrack(asset(file))));
    if (pendingStudioPlay !== request) return;
    if (!decoded[0].length || Math.abs(decoded[0].length - decoded[1].length) > 4096) {
      throw new Error('The demo audio files could not be synchronized.');
    }
    audioBuffers = { clip, profile, pair: decoded };
    duration = Math.min(decoded[0].duration, decoded[1].duration);
    seek.max = String(duration);
    updateMarkers();
    updateTimeline();
  }
}

function playbackPosition() {
  if (!playback) return position;
  return scheduledPosition(playback, context.currentTime);
}

function scheduledPosition(run, time) {
  const elapsed = run.offset + Math.max(0, time - run.started);
  if (!run.loop) return run.duration > 0 ? elapsed % run.duration : 0;
  const { end, resume } = run.loop;
  return elapsed < end ? elapsed : resume + (elapsed - end) % (end - resume);
}

function quantizedLoop(buffer) {
  const { start, end } = loopRange();
  const rate = buffer.sampleRate;
  const startFrame = Math.round(start * rate);
  const endFrame = Math.min(buffer.length, Math.round(end * rate));
  const fadeFrames = Math.min(Math.round(0.02 * rate), Math.floor((endFrame - startFrame) / 4));
  return { startFrame, endFrame, fadeFrames, start: startFrame / rate, end: endFrame / rate,
    resume: (startFrame + fadeFrames) / rate };
}

function bufferForLoop(buffer, loop) {
  const key = `${loop.startFrame}:${loop.endFrame}:${loop.fadeFrames}`;
  const cached = loopAudio.get(buffer);
  if (cached?.key === key) return cached.buffer;
  const frames = loop.endFrame - loop.startFrame;
  const prepared = context.createBuffer(buffer.numberOfChannels, frames, buffer.sampleRate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const original = buffer.getChannelData(channel);
    const samples = prepared.getChannelData(channel);
    if (loop.endFrame <= original.length) samples.set(original.subarray(loop.startFrame, loop.endFrame));
    else {
      for (let index = 0; index < frames; index += 1) {
        samples[index] = original[(loop.startFrame + index) % original.length];
      }
    }
    // Mix the tail into the beginning already heard in the overlap, then skip those head samples.
    // The browser performs the subsequent wraps on its audio clock, including in background tabs.
    for (let index = 0; index < loop.fadeFrames; index += 1) {
      const weight = (index + 1) / loop.fadeFrames;
      const tail = frames - loop.fadeFrames + index;
      samples[tail] += (samples[index] - samples[tail]) * weight;
    }
  }
  loopAudio.set(buffer, { key, buffer: prepared });
  return prepared;
}

function makeSource(buffer, loop, gain) {
  const source = context.createBufferSource();
  source.buffer = loop ? bufferForLoop(buffer, loop) : buffer;
  source.loop = true;
  if (loop) {
    source.loopStart = loop.resume - loop.start;
    source.loopEnd = source.buffer.duration;
  }
  source.connect(gain);
  return source;
}

function rampGain(gain, target, start, seconds) {
  if (typeof gain.cancelAndHoldAtTime === 'function') gain.cancelAndHoldAtTime(start);
  else {
    const level = gain.value;
    gain.cancelScheduledValues(start);
    gain.setValueAtTime(level, start);
  }
  gain.linearRampToValueAtTime(target, start + seconds);
}

function releaseTinnitus(run, now) {
  const current = run.tinnitus;
  if (!current) return;
  run.tinnitus = undefined;
  rampGain(current.gain.gain, 0, now, 0.06);
  current.source.stop(now + 0.06);
}

async function setTinnitus(run) {
  const sound = tinnitusSelect.value;
  const file = catalog.tinnitus?.[sound];
  const selection = {};
  run.tinnitusSelection = selection;
  showStatus(tinnitusStatus, '');
  if (!file) {
    releaseTinnitus(run, context.currentTime);
    return;
  }

  try {
    await decodeTrack(asset(file));
    if (run !== playback || run.tinnitusSelection !== selection) return;
    const loopSamples = tinnitusLoop(sound, context.sampleRate);
    const loopBuffer = context.createBuffer(1, loopSamples.length, context.sampleRate);
    loopBuffer.copyToChannel(loopSamples, 0);
    const refDb = audioBuffers?.pair?.[0] ? activeRmsDb(audioBuffers.pair[0]) : -20;
    const targetGain = audibleTinnitusGain(sound, loopSamples, refDb, getTinnitusCalibrationLinearBoost());

    const gain = context.createGain();
    const source = context.createBufferSource();
    source.buffer = loopBuffer;
    source.loop = true;
    source.connect(gain);

    const now = context.currentTime;
    const started = Math.max(now + 0.004, run.started);
    const offset = scheduledPosition(run, started);
    releaseTinnitus(run, started);

    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, started);
    gain.gain.linearRampToValueAtTime(targetGain, started + 0.06);
    // Connect directly into post-calibration tinnitusBus so Speakers / Live room modes never muffle 3.4 kHz ringing!
    gain.connect(run.tinnitusBus ?? run.output);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      if (run.tinnitus?.source === source) run.tinnitus = undefined;
    };
    run.tinnitus = { source, gain, sound, loopSamples, refDb };
    source.start(started, Math.max(0, offset % loopBuffer.duration));
  } catch {
    if (run !== playback || run.tinnitusSelection !== selection) return;
    releaseTinnitus(run, context.currentTime);
    tinnitusSelect.value = 'off';
    updateTinnitusDownload();
    updateStudioGuide({ track: selectedTrack, profileId: selectedProfile, tinnitus: tinnitusSelect.value });
    showStatus(tinnitusStatus, 'That tinnitus sound could not load.', true);
  }
}

function updateTinnitusDownload() {
  const sound = tinnitusSelect.value;
  const file = catalog.tinnitus?.[sound];
  if (studioTinnitusWarning) {
    studioTinnitusWarning.hidden = sound !== 'ringing';
  }
  tinnitusDownload.hidden = !file;
  if (file) {
    tinnitusDownload.href = asset(file);
    tinnitusDownload.textContent = `Download ${sound} WAV`;
  }
}

function finishPlayback(ended = false) {
  position = ended ? duration : playbackPosition();
  const stopped = playback;
  playback = undefined;
  cancelAnimationFrame(animation);
  if (stopped) {
    const { master, calibrationStage, earOutput, sources, gains } = stopped;
    const now = context.currentTime;
    sources[0].onended = null;
    releaseTinnitus(stopped, now);
    const disconnect = () => {
      for (const source of sources) source.disconnect();
      for (const gain of gains) gain.disconnect();
      master.disconnect();
      stopped.tinnitusBus?.disconnect();
      calibrationStage?.disconnect();
      earOutput.disconnect();
    };
    if (ended) disconnect();
    else {
      rampGain(master.gain, 0, now, 0.015);
      sources[0].onended = disconnect;
      for (const source of sources) source.stop(now + 0.015);
    }
  }
  updateTransport(false, ended);
  updateTimeline();
}

function pauseStudio() {
  if (pendingStudioPlay) {
    pendingStudioPlay = undefined;
    setPlayerLoading(false);
  }
  clearPendingHearingProfile();
  cancelWaveformDrag?.();
  if (playback) finishPlayback();
}

function updateTransport(playing, ended = false) {
  playButton.textContent = playing ? 'Pause' : ended ? 'Replay demo' : 'Play demo';
  playButton.setAttribute('aria-pressed', String(playing));
  player.dataset.playing = String(playing);
}

function playbackVolume() {
  return Math.min(1, Math.max(0, Number(volume.value) || 0));
}

function updateVolume() {
  const level = playbackVolume();
  volume.setAttribute('aria-valuetext', level ? `${Math.round(level * 100)}%` : 'Muted');
  if (playback) rampGain(playback.output.gain, level, context.currentTime, 0.025);
}

function advanceTimeline() {
  if (!playback) return;
  position = playbackPosition();
  updateTimeline();
  animation = requestAnimationFrame(advanceTimeline);
}

function startPlayback() {
  stopConcertStage();
  stopListeningPreviews();
  stopFreqBandSim();
  stopLiveMic();
  stopNIHLExamples();
  if (position >= duration) position = 0;
  const loop = looping ? quantizedLoop(audioBuffers.pair[0]) : undefined;
  if (loop && (position < loop.start || position >= loop.end)) position = loop.start;
  const output = context.createGain();
  output.gain.value = playbackVolume();
  const earOutput = connectStereoEarOutput(context, output, readStudioEarGains());
  const calibrationStage = createCalibrationStage(context, {
    isSimulated: () => selectedTrack === 'simulated',
  });
  calibrationStage.output.connect(output);
  const tinnitusBus = context.createGain();
  tinnitusBus.gain.value = 1;
  tinnitusBus.connect(output);
  const master = context.createGain();
  master.gain.value = 0;
  master.connect(calibrationStage.input);
  const gains = audioBuffers.pair.map((_, index) => {
    const gain = context.createGain();
    gain.gain.value = tracks[index] === selectedTrack ? 1 : 0;
    gain.connect(master);
    return gain;
  });
  const sources = audioBuffers.pair.map((buffer, index) => makeSource(buffer, loop, gains[index]));
  const started = context.currentTime + 0.015;
  master.gain.setValueAtTime(0, started);
  master.gain.linearRampToValueAtTime(1, started + 0.015);
  const run = { sources, gains, master, tinnitusBus, calibrationStage, output, earOutput, started, offset: position, duration, loop };
  playback = run;
  for (const source of sources) {
    const startPos = loop ? position - loop.start : position % Math.max(0.01, source.buffer.duration);
    source.start(started, Math.max(0, startPos));
  }
  updateTransport(true);
  advanceTimeline();
  void setTinnitus(run);
}

function updateListeningButtons() {
  player.dataset.activeTrack = selectedTrack;
  player.dataset.activeProfile = selectedTrack === 'reference' ? 'original' : selectedProfile;
  originalButton.setAttribute('aria-pressed', String(selectedTrack === 'reference'));
  for (const button of hearingButtons) {
    const active = selectedTrack === 'simulated' && button.dataset.listeningProfile === selectedProfile;
    button.setAttribute('aria-pressed', String(active));
  }
  updateFilterResponse(selectedProfile, selectedTrack === 'reference');
  updateStudioGuide({ track: selectedTrack, profileId: selectedProfile, tinnitus: tinnitusSelect.value });
  studioExplainer.update({
    songId: song.id,
    songTitle: song.title,
    track: selectedTrack,
    profileId: selectedProfile,
    tinnitus: tinnitusSelect.value,
  });
  studioVolumeGuardrail.sync();
  playback?.calibrationStage?.sync();
  ear3D.setState({
    effectKey: selectedTrack === 'reference' ? 'original' : selectedProfile,
    tinnitus: tinnitusSelect.value,
  });
}

onCalibrationChange(() => {
  if (playback?.tinnitus && context) {
    const { sound, loopSamples, refDb } = playback.tinnitus;
    const nextGain = audibleTinnitusGain(sound, loopSamples, refDb, getTinnitusCalibrationLinearBoost());
    rampGain(playback.tinnitus.gain.gain, nextGain, context.currentTime, 0.04);
  }
});

function chooseTrack(track, startsAt = context?.currentTime) {
  selectedTrack = track;
  updateListeningButtons();
  if (playback) {
    for (const [index, { gain }] of playback.gains.entries()) {
      rampGain(gain, tracks[index] === track ? 1 : 0, startsAt, 0.015);
    }
  }
  drawWaveform();
}

function clearPendingHearingProfile() {
  pendingHearingProfile = undefined;
  showStatus(playerStatus, '');
}

function selectProfile(id) {
  selectedProfile = id;
  updateDemoLinks();
}

function replaceSimulation(id, buffer) {
  const [reference] = audioBuffers.pair;
  if (Math.abs(reference.length - buffer.length) > 4096) throw new Error('The demo audio files could not be synchronized.');
  audioBuffers = { clip: audioBuffers.clip, profile: id, pair: [reference, buffer] };

  const run = playback;
  const start = Math.max(context.currentTime + 0.004, run.started);
  const offset = scheduledPosition(run, start);

  // Leave the reference and the tinnitus layer on the existing playback clock.
  const retiredSource = run.sources[1];
  const retiredGain = run.gains[1];
  const gain = context.createGain();
  gain.gain.value = 0;
  gain.connect(run.master);
  const source = makeSource(buffer, run.loop, gain);
  const startPos = run.loop ? offset - run.loop.start : offset % Math.max(0.01, buffer.duration);
  source.start(start, Math.max(0, startPos));
  run.sources[1] = source;
  run.gains[1] = gain;
  retiredSource.onended = () => {
    retiredSource.disconnect();
    retiredGain.disconnect();
  };
  rampGain(retiredGain.gain, 0, start, 0.015);
  retiredSource.stop(start + 0.015);
  return start;
}

async function listenWithProfile(id) {
  const target = catalog.profiles.find((entry) => entry.id === id);
  if (!target || pendingHearingProfile?.id === id) return;
  clearPendingHearingProfile();
  let startsAt;

  if (playback && id !== selectedProfile) {
    const request = { id };
    pendingHearingProfile = request;
    showStatus(playerStatus, 'Loading the hearing effect…');
    try {
      const buffer = await decodeTrack(asset(target.simulated));
      if (pendingHearingProfile !== request) return;
      if (playback) startsAt = replaceSimulation(id, buffer);
    } catch {
      if (pendingHearingProfile === request) {
        clearPendingHearingProfile();
        showStatus(playerStatus, 'Could not load that hearing effect. Try again.', true);
      }
      return;
    }
    clearPendingHearingProfile();
  }

  if (id !== selectedProfile) selectProfile(id);
  chooseTrack('simulated', startsAt);
}

function seekTo(seconds) {
  if (!Number.isFinite(seconds)) return;
  const wasPlaying = Boolean(playback);
  if (wasPlaying) finishPlayback();
  position = Math.max(0, Math.min(duration, seconds));
  if (looping) {
    const { start, end } = loopRange();
    if (position < start || position >= end) {
      looping = false;
      updateLoopButton();
    }
  }
  if (wasPlaying && position < duration) startPlayback();
  else {
    updateTransport(false, position >= duration);
    updateTimeline();
  }
}

function toggleLoop() {
  const wasPlaying = Boolean(playback);
  if (wasPlaying) finishPlayback();
  looping = !looping;
  if (looping) {
    const { start, end } = loopRange();
    if (position < start || position >= end) position = start;
  }
  updateLoopButton();
  if (wasPlaying) startPlayback();
  else {
    updateTransport(false);
    updateTimeline();
  }
}

function togglePlayback() {
  if (playButton.disabled) return;
  if (playback) finishPlayback();
  else void playFromPosition();
}

async function playFromPosition() {
  if (activeView !== 'studio') return;
  if (pendingHearingProfile) {
    selectProfile(pendingHearingProfile.id);
    clearPendingHearingProfile();
    chooseTrack('simulated');
  }
  const request = {};
  pendingStudioPlay = request;
  stopListeningPreviews();
  setPlayerLoading(true);
  if (audioBuffers?.clip !== excerpt.catalog.href || audioBuffers.profile !== selectedProfile) showStatus(playerStatus, 'Loading the demo…');
  try {
    await prepareAudio(request);
    if (pendingStudioPlay !== request) return;
    startPlayback();
    showStatus(playerStatus, '');
  } catch {
    if (pendingStudioPlay === request) {
      finishPlayback();
      showStatus(playerStatus, 'The demo player could not start. Open either WAV below to listen.', true);
    }
  } finally {
    if (pendingStudioPlay === request) {
      pendingStudioPlay = undefined;
      setPlayerLoading(false);
    }
  }
}

function setPlayerLoading(loading) {
  if (loading) cancelWaveformDrag?.();
  playButton.disabled = loading;
  loopButton.disabled = loading;
  originalButton.disabled = loading;
  for (const button of hearingButtons) button.disabled = loading;
  demoSong.disabled = loading;
  demoExcerpt.disabled = loading;
  updateCueControls();
}

function updateDemoLinks() {
  const match = catalog.profiles.find(({ id }) => id === selectedProfile);
  listeningNote.textContent = song.id === fallbackSong.id && selectedProfile === defaultProfile
    ? 'Listen for the bright bells in the opening and the hi-hats after 0:04.' : listeningNotes[selectedProfile];
  demoReference.href = asset(catalog.reference);
  demoSimulation.href = asset(match.simulated);
  const formatTag = String(catalog.reference).toLowerCase().endsWith('.m4a') ? 'M4A' : 'WAV';
  demoReference.textContent = `Original ${formatTag}`;
  demoSimulation.textContent = `Simulated ${formatTag}`;
  const zipName = `${song.id}-${excerpt.id}-${selectedProfile}.zip`;
  demoBundle.download = zipName;
  if (typeof match.manifest === 'string' && typeof match.bundle !== 'string') {
    demoBundle.href = asset(match.simulated);
    demoBundle.dataset.clientZip = 'true';
  } else {
    demoBundle.href = asset(match.bundle);
    delete demoBundle.dataset.clientZip;
  }
  updateStudioFilter(selectedProfile);
  spectrogram.setSource({
    url: asset('spectrogram.json'),
    profile: selectedProfile,
    label: displayProfileName(selectedProfile),
    duration,
  });
}

let assemblingDemoZip = false;
async function handleDemoZipClick(event) {
  const match = catalog.profiles.find(({ id }) => id === selectedProfile);
  if (!match || typeof match.manifest !== 'string' || typeof match.bundle === 'string') return;
  event.preventDefault();
  if (assemblingDemoZip) return;
  assemblingDemoZip = true;
  demoBundle.setAttribute('aria-busy', 'true');
  const requestedFilename = `${song.id}-${excerpt.id}-${selectedProfile}.zip`;
  if (demoDownloadStatus) showStatus(demoDownloadStatus, 'Assembling comparison ZIP…');
  try {
    const zipBlob = await assembleComparisonZip({
      referenceUrl: asset(catalog.reference),
      simulatedUrl: asset(match.simulated),
      manifestUrl: asset(match.manifest),
    });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = requestedFilename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    if (demoDownloadStatus) showStatus(demoDownloadStatus, `Downloaded ${requestedFilename}.`);
  } catch {
    if (demoDownloadStatus) showStatus(demoDownloadStatus, 'Could not assemble the comparison ZIP. Try again or download the WAVs separately.', true);
  } finally {
    assemblingDemoZip = false;
    demoBundle.removeAttribute('aria-busy');
  }
}

function updateSongCredit() {
  songCredit.replaceChildren();
  if (song.artist) songCredit.append(`${song.artist}.`);
  if (song.license_url) songCredit.append(' Excerpted for this demo.');
  for (const [label, link] of [['Source', song.credit_url], ['License', song.license_url]]) {
    if (!link || !/^https?:\/\//i.test(link)) continue;
    const anchor = document.createElement('a');
    anchor.textContent = label;
    anchor.href = link;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    songCredit.append(anchor);
  }
  songCredit.hidden = !songCredit.childNodes.length;
}

function updateExcerptChoices() {
  demoExcerpt.replaceChildren(...song.excerpts.map((item) => new Option(item.label, item.id)));
  demoExcerpt.value = excerpt.id;
  excerptField.hidden = song.excerpts.length < 2;
  const sourceStart = excerpt.source_start_seconds;
  excerptPosition.textContent = Number.isFinite(sourceStart) && sourceStart >= 0
    ? `Starts at ${formatTime(sourceStart).replace(/\.0$/, '')} in the original recording.` : '';
  excerptPosition.hidden = !excerptPosition.textContent;
}

function applyCatalog(track, clip, newCatalog) {
  cancelWaveformDrag?.();
  song = track;
  excerpt = clip;
  catalog = newCatalog;
  duration = catalog.duration_seconds;
  seek.max = String(duration);
  if (position > duration) position = duration;

  const available = new Set(catalog.profiles.map(({ id }) => id));
  if (!available.has(selectedProfile)) selectedProfile = catalog.profiles[0].id;
  for (const button of hearingButtons) button.hidden = !available.has(button.dataset.listeningProfile);
  for (const option of tinnitusSelect.options) {
    option.disabled = option.value !== 'off' && !catalog.tinnitus?.[option.value];
  }
  if (tinnitusSelect.selectedOptions[0].disabled) tinnitusSelect.value = 'off';

  waveform = undefined;
  demoSong.value = song.id;
  updateExcerptChoices();
  updateDemoLinks();
  updateTinnitusDownload();
  updateSongCredit();
  updateMarkers();
  updateListeningButtons();
  updateTimeline();
  void loadWaveform(newCatalog);
}

async function readCatalog(clip) {
  const response = await fetch(clip.catalog);
  if (!response.ok) throw new Error('Demo catalog is unavailable.');
  const data = await response.json();
  if (!Number.isFinite(data.duration_seconds) || data.duration_seconds <= 0 || typeof data.reference !== 'string') {
    throw new Error('Demo timeline is unavailable.');
  }
  const available = data.profiles?.filter((entry) => Object.hasOwn(listeningNotes, entry.id)
    && typeof entry.simulated === 'string'
    && (typeof entry.bundle === 'string' || typeof entry.manifest === 'string'));
  if (!available?.length) throw new Error('Demo profiles are unavailable.');
  return { ...data, profiles: available };
}

async function loadInitialCatalog() {
  try {
    const data = await readCatalog(fallbackExcerpt);
    if (song.id === fallbackSong.id && excerpt.catalog.href === fallbackExcerpt.catalog.href) {
      applyCatalog(song, excerpt, data);
    }
  } catch {
    // The built-in song and its timeline can play without optional metadata.
  }
}

function listExcerpts(entry, defaultCatalog) {
  const excerpts = [];
  if (Array.isArray(entry.excerpts)) {
    for (const item of entry.excerpts) {
      if (typeof item.id !== 'string' || typeof item.label !== 'string' || typeof item.catalog !== 'string') continue;
      const url = new URL(item.catalog, collection);
      if (url.origin !== collection.origin) continue;
      excerpts.push({ ...item, catalog: url });
    }
  }
  return excerpts.length ? excerpts : [{ id: 'default', label: 'Excerpt', catalog: defaultCatalog }];
}

async function loadCollection() {
  try {
    const response = await fetch(collection);
    if (!response.ok) return;
    const data = await response.json();
    for (const entry of data.tracks ?? []) {
      if (typeof entry.id !== 'string' || typeof entry.title !== 'string' || typeof entry.catalog !== 'string') continue;
      const url = new URL(entry.catalog, collection);
      if (url.origin !== collection.origin) continue;
      const id = url.href === fallbackExcerpt.catalog.href ? fallbackSong.id : entry.id;
      songOptions.set(id, { ...entry, id, excerpts: listExcerpts(entry, url) });
    }
    song = songOptions.get(song.id);
    excerpt = song.excerpts.find((item) => item.catalog.href === excerpt.catalog.href) ?? song.excerpts[0];
    demoSong.replaceChildren(...[...songOptions.values()].map((entry) => new Option(
      entry.genre ? `${entry.title} · ${entry.genre}` : entry.title, entry.id,
    )));
    demoSong.value = song.id;
    songField.hidden = songOptions.size < 2;
    updateExcerptChoices();
    updateSongCredit();
  } catch {
    // The synthetic comparison remains available if the song list cannot load.
  }
}

async function chooseExcerpt(nextSong, nextExcerpt) {
  if (nextSong.id === song.id && nextExcerpt.id === excerpt.id) return;
  let resumePlayback;
  clearPendingHearingProfile();
  setPlayerLoading(true);
  showStatus(playerStatus, 'Loading the excerpt…');
  try {
    const data = await readCatalog(nextExcerpt);
    resumePlayback = Boolean(playback);
    if (resumePlayback) finishPlayback();
    position = 0;
    looping = false;
    audioBuffers = undefined;
    decodedAudio.clear();
    updateTransport(false);
    showStatus(tinnitusStatus, '');
    applyCatalog(nextSong, nextExcerpt, data);
  } catch {
    demoSong.value = song.id;
    demoExcerpt.value = excerpt.id;
    showStatus(playerStatus, 'That excerpt could not load. Try another excerpt or song.', true);
    setPlayerLoading(false);
    return;
  }
  showStatus(playerStatus, '');
  if (resumePlayback) await playFromPosition();
  else setPlayerLoading(false);
}

async function initializeListening() {
  const shared = readListeningLink(window.location.href);
  if (!shared) {
    void loadInitialCatalog();
    void loadCollection();
    return;
  }

  setPlayerLoading(true);
  try {
    await Promise.all([loadInitialCatalog(), loadCollection()]);
    const nextSong = songOptions.get(shared.song);
    if (!nextSong) return;
    const nextExcerpt = nextSong.excerpts.find(({ id }) => id === shared.excerpt) ?? nextSong.excerpts[0];
    await chooseExcerpt(nextSong, nextExcerpt);
    if (song.id !== nextSong.id || excerpt.id !== nextExcerpt.id) return;
    if (catalog.profiles.some(({ id }) => id === shared.profile)) selectProfile(shared.profile);
    chooseTrack(shared.view ?? selectedTrack);
    tinnitusSelect.value = 'off';
    updateTinnitusDownload();
    if ((shared.excerpt === null || shared.excerpt === excerpt.id) && validCueSample(shared.cue)) {
      setManualCue(shared.cue);
    }
    if (shared.time !== null) seekTo(Math.min(shared.time, duration));
  } finally {
    setPlayerLoading(false);
  }
}

function handleListeningShortcut(event) {
  if (activeView !== 'studio' || playButton.disabled || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey
    || event.shiftKey || event.isComposing) return;
  if (event.target instanceof Element && event.target.closest(
    'input, select, textarea, button, a, summary, [contenteditable], [role="button"], [role="slider"]',
  )) return;

  if (event.key === ' ') {
    event.preventDefault();
    if (!event.repeat) togglePlayback();
  } else if (event.key === '1' || event.key === '2') {
    event.preventDefault();
    if (!event.repeat) {
      clearPendingHearingProfile();
      chooseTrack(tracks[Number(event.key) - 1]);
    }
  }
}

if (window.AudioContext || window.webkitAudioContext) {
  tinnitusSelect.value = 'off';
  player.hidden = false;
  tinnitusMix.hidden = false;
  applyCatalog(fallbackSong, fallbackExcerpt, fallbackCatalog);
  updateTransport(false);
  updateVolume();
  resizeWaveform();
  if (typeof ResizeObserver === 'function') new ResizeObserver(resizeWaveform).observe(canvas);
  window.addEventListener('resize', resizeWaveform);
  void initializeListening();
  connectListeningShare(() => ({
    song: song.id, excerpt: excerpt.id, profile: selectedProfile, view: selectedTrack, time: playbackPosition(),
    cue: activeCueSample(),
  }));

  playButton.addEventListener('click', togglePlayback);
  loopButton.addEventListener('click', toggleLoop);
  cueSet.addEventListener('click', () => {
    const sample = cueSample(playbackPosition(), catalog.duration_seconds);
    if (sample !== null) setManualCue(sample);
  });
  cueBack.addEventListener('click', () => nudgeCue(-CUE_STEP_SAMPLES));
  cueForward.addEventListener('click', () => nudgeCue(CUE_STEP_SAMPLES));
  cueReset.addEventListener('click', () => setManualCue(null));
  cueDownload.addEventListener('click', downloadCue);
  volume.addEventListener('input', updateVolume);
  document.addEventListener('keydown', handleListeningShortcut);
  cancelWaveformDrag = attachMarkerDrag(canvas, {
    duration: () => duration,
    marker: () => marker,
    enabled: () => !playButton.disabled,
    preview: (state) => {
      waveformPreview = state;
      updateTimeline();
    },
    commit: ({ kind, value }) => {
      if (kind === 'seek') seekTo(value);
      else {
        const sample = cueSample(value, catalog.duration_seconds);
        if (sample !== null) setManualCue(sample);
      }
    },
  });
  originalButton.addEventListener('click', () => {
    clearPendingHearingProfile();
    chooseTrack('reference');
  });
  for (const button of hearingButtons) {
    button.addEventListener('click', () => void listenWithProfile(button.dataset.listeningProfile));
  }
  seek.addEventListener('input', () => {
    const target = Number(seek.value);
    cancelWaveformDrag();
    seekTo(target);
  });
  jump.addEventListener('click', () => seekTo(marker));
  quietJump.addEventListener('click', () => seekTo(quietMarker));
  demoSong.addEventListener('change', () => {
    const next = songOptions.get(demoSong.value);
    if (next) void chooseExcerpt(next, next.excerpts[0]);
  });
  demoExcerpt.addEventListener('change', () => {
    const next = song.excerpts.find(({ id }) => id === demoExcerpt.value);
    if (next) void chooseExcerpt(song, next);
  });
  demoBundle.addEventListener('click', (event) => void handleDemoZipClick(event));
  const applyStudioTinnitusChange = (chosenVal) => {
    tinnitusSelect.value = chosenVal;
    updateTinnitusDownload();
    updateStudioGuide({ track: selectedTrack, profileId: selectedProfile, tinnitus: tinnitusSelect.value });
    studioExplainer.update({
      songId: song.id,
      songTitle: song.title,
      track: selectedTrack,
      profileId: selectedProfile,
      tinnitus: tinnitusSelect.value,
    });
    ear3D.setState({
      effectKey: selectedTrack === 'reference' ? 'original' : selectedProfile,
      tinnitus: tinnitusSelect.value,
    });
    if (playback) void setTinnitus(playback);
    else showStatus(tinnitusStatus, '');
  };

  tinnitusSelect.addEventListener('change', () => {
    const nextVal = tinnitusSelect.value;
    if (nextVal === 'ringing') {
      tinnitusSelect.value = 'off';
      confirmRingingPlayback({
        onConfirm: () => applyStudioTinnitusChange('ringing'),
        onUseHiss: () => applyStudioTinnitusChange('hiss'),
        onCancel: () => applyStudioTinnitusChange('off'),
      });
      return;
    }
    applyStudioTinnitusChange(nextVal);
  });
  studioTinnitusStopBtn?.addEventListener('click', () => {
    applyStudioTinnitusChange('off');
  });
}

const form = document.querySelector('#render-form');
const controls = document.querySelector('#render-controls');
const audio = document.querySelector('#audio');
const profile = document.querySelector('#profile');
const manualMarker = document.querySelector('#marker');
const detectClimax = document.querySelector('#detect-climax');
const includeFilter = document.querySelector('#include-filter');
const renderDeviceButton = document.querySelector('#render-device');
const renderSubmitButton = document.querySelector('#render-submit');
const renderStatus = document.querySelector('#render-status');
const result = document.querySelector('#result');
const maximumUploadBytes = 20 * 1024 * 1024;
const maximumUploadSeconds = 30;
// The local waveform and hearing-loss preview run in the browser, so they follow the
// converter's own limits rather than the web upload limits.
const maximumPreviewBytes = 400 * 1024 * 1024;
const maximumPreviewSeconds = 15 * 60;
const msbgClient = createMsbgClient();
let renderDownload;
let serverRenderAvailable = false;
let renderingBusy = false;
let uploadedMedia = { file: undefined, fileName: 'clip', duration: 0, isVideo: false, decoded: false };

function mediaType(response) {
  return response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
}

function syncRenderControls() {
  const onDeviceReady = canRenderOnDevice({
    hasAudio: uploadedMedia.decoded,
    isVideo: uploadedMedia.isVideo,
    durationSeconds: uploadedMedia.duration,
    profileId: profile.value,
  });
  controls.disabled = renderingBusy || !(uploadedMedia.decoded || serverRenderAvailable);
  if (renderDeviceButton) renderDeviceButton.disabled = renderingBusy || !onDeviceReady;
  if (renderSubmitButton) {
    renderSubmitButton.hidden = !serverRenderAvailable;
    renderSubmitButton.disabled = renderingBusy || !serverRenderAvailable;
  }
  if (uploadedMedia.decoded && !uploadedMedia.isVideo) {
    manualMarker.max = String(Math.min(MSBG_MAX_SECONDS, Math.ceil(uploadedMedia.duration * 100) / 100));
  } else {
    manualMarker.max = String(serverRenderAvailable ? maximumUploadSeconds : MSBG_MAX_SECONDS);
  }
}

function showRenderProfiles(entries) {
  const seen = new Set();
  const options = entries.filter((entry) => {
    if (typeof entry?.id !== 'string' || typeof entry.label !== 'string' || seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
  const previous = profile.value;
  profile.replaceChildren(new Option('Select a profile', ''), ...options.map(({ id, label, review_status }) => {
    const pending = review_status === 'pending_review' ? ' (pending review)' : '';
    return new Option(displayProfileName(id, label) + pending, id);
  }));
  if (options.some(({ id }) => id === previous)) profile.value = previous;
  else if (options.some(({ id }) => id === defaultProfile)) profile.value = defaultProfile;
  else if (options.length === 1) profile.value = options[0].id;
  syncRenderControls();
}

async function loadProfiles() {
  showRenderProfiles(profileOptions);
  showStatus(renderStatus, 'Checking reviewer server access…');
  try {
    const response = await fetch('/api/profiles', { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok || mediaType(response) !== 'application/json') throw new Error('Uploads unavailable.');
    const { profiles } = await response.json();
    if (!Array.isArray(profiles) || !profiles.some((entry) => typeof entry?.id === 'string' && typeof entry.label === 'string')) {
      throw new Error('Profiles unavailable.');
    }
    serverRenderAvailable = true;
    showRenderProfiles([...profileOptions, ...profiles]);
    syncRenderControls();
    showStatus(renderStatus, '');
  } catch {
    serverRenderAvailable = false;
    syncRenderControls();
    showStatus(renderStatus, 'Choose an audio file up to 10 minutes to run the full Cambridge MSBG model privately on this device.');
  }
}

async function renderError(response) {
  const generic = response.status === 401 || response.status === 403
    ? 'Sign in through your reviewer link to render a clip.'
    : 'The render service could not complete this request. Try again.';
  if (mediaType(response) !== 'application/json') return generic;
  try {
    const { error } = await response.json();
    return typeof error?.message === 'string' ? error.message : generic;
  } catch {
    return generic;
  }
}

manualMarker.addEventListener('input', () => {
  const manual = manualMarker.value !== '';
  detectClimax.disabled = manual;
  if (manual) detectClimax.checked = false;
});
profile.addEventListener('change', syncRenderControls);

const uploadPreview = connectUploadPreview(audio, manualMarker, {
  maximumBytes: maximumPreviewBytes, maximumSeconds: maximumPreviewSeconds,
  uploadBytes: maximumUploadBytes, uploadSeconds: maximumUploadSeconds,
  msbgSeconds: MSBG_MAX_SECONDS, formatTime, profile,
  onMediaChange: (nextMedia) => {
    uploadedMedia = nextMedia;
    syncRenderControls();
  },
});

const uploadDropSurface = document.querySelector('.upload-source');
if (uploadDropSurface && audio) {
  for (const evName of ['dragenter', 'dragover']) {
    uploadDropSurface.addEventListener(evName, (ev) => {
      ev.preventDefault();
      uploadDropSurface.dataset.dragover = 'true';
    });
  }
  for (const evName of ['dragleave', 'dragend']) {
    uploadDropSurface.addEventListener(evName, () => {
      delete uploadDropSurface.dataset.dragover;
    });
  }
  uploadDropSurface.addEventListener('drop', (ev) => {
    ev.preventDefault();
    delete uploadDropSurface.dataset.dragover;
    if (ev.dataTransfer?.files?.length && !audio.disabled) {
      try {
        audio.files = ev.dataTransfer.files;
        audio.dispatchEvent(new Event('change', { bubbles: true }));
      } catch {
        // Fallback if browser restricts assigning FileList directly
      }
    }
  });
}

connectViewNavigation((next, previous) => {
  activeView = next;
  if (previous === 'listen') {
    stopConcertStage();
  }
  if (previous === 'explore') {
    stopListeningPreviews();
    stopHomeVideo();
    stopFreqBandSim();
    stopLiveMic();
    stopNIHLExamples();
  }
  if (previous === 'studio') pauseStudio();
  if (previous === 'your-audio') uploadPreview?.stop();
  if (next === 'studio') {
    resizeWaveform();
    storyJourney.setActiveChapter('quiet');
  }
  if (next === 'your-audio') {
    uploadPreview?.resize();
    storyJourney.setActiveChapter('remix');
  }
  if (next === 'explore') {
    storyJourney.setActiveChapter('bar');
    requestAnimationFrame(() => {
      const vh = window.innerHeight || 800;
      for (const el of document.querySelectorAll('#explore [data-flow-section]')) {
        if (el.getBoundingClientRect().top < vh * 0.95) {
          el.classList.add('is-visible');
        }
      }
    });
  }
  if (next === 'listen') {
    storyJourney.setActiveChapter('gig');
  }
});

renderDeviceButton?.addEventListener('click', async () => {
  const file = uploadedMedia.file ?? audio.files[0];
  if (!file || uploadedMedia.isVideo || isVideoFile(file)) {
    showStatus(renderStatus, 'Choose an audio file (up to 10 minutes) to render on this device.', true);
    return;
  }
  if (!profile.value) {
    showStatus(renderStatus, 'Select a hearing effect before rendering.', true);
    profile.focus();
    return;
  }
  const markerText = manualMarker.value.trim();
  if (markerText !== '') {
    const markerValue = Number(markerText);
    if (!Number.isFinite(markerValue) || markerValue < 0 || (uploadedMedia.duration > 0 && markerValue >= uploadedMedia.duration)) {
      showStatus(renderStatus, 'Enter a manual marker inside the clip duration, or leave it blank.', true);
      manualMarker.focus();
      return;
    }
  }

  uploadPreview?.stop();
  renderingBusy = true;
  syncRenderControls();
  audio.disabled = true;
  profile.disabled = true;
  result.hidden = true;

  const startedAt = performance.now();
  let currentStageMessage = 'Loading Cambridge MSBG model on this device…';
  showStatus(renderStatus, currentStageMessage);
  const timer = setInterval(() => {
    const elapsed = Math.floor((performance.now() - startedAt) / 1000);
    const clock = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
    showStatus(renderStatus, `${currentStageMessage} (${clock})`);
  }, 1000);

  try {
    const output = await msbgClient.renderAudioFile(file, {
      profileId: profile.value,
      markerSeconds: markerText || null,
      detectClimax: detectClimax.checked,
      includeFilter: Boolean(includeFilter?.checked),
      onProgress: ({ message }) => {
        if (message) {
          currentStageMessage = message;
          showStatus(renderStatus, currentStageMessage);
        }
      },
    });
    const download = URL.createObjectURL(output.blob);
    if (renderDownload) URL.revokeObjectURL(renderDownload);
    renderDownload = download;
    result.href = download;
    result.download = output.filename;
    result.hidden = false;
    const climaxNote = output.manifest?.climax?.status === 'ok'
      ? ` Marker at ${output.manifest.climax.selected_seconds.toFixed(2)} s.`
      : '';
    const gainDb = output.manifest?.level?.common_gain_db ?? 0;
    const gainNote = gainDb < 0
      ? ` Shared headroom trim ${gainDb.toFixed(1)} dB applied to avoid clipping.`
      : '';
    showStatus(renderStatus, `On-device MSBG render ready (${output.filename}).${climaxNote}${gainNote}`);
  } catch (error) {
    showStatus(renderStatus, error?.message || 'Could not complete the on-device MSBG render.', true);
  } finally {
    clearInterval(timer);
    renderingBusy = false;
    audio.disabled = false;
    profile.disabled = false;
    syncRenderControls();
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (controls.disabled || !serverRenderAvailable) return;
  const file = audio.files[0];
  if (isVideoFile(file)) {
    showStatus(renderStatus, 'Choose an audio file to use the full renderer.', true);
    return;
  }
  if (!file || file.size === 0 || file.size > maximumUploadBytes) {
    showStatus(renderStatus, 'Choose a nonempty audio file up to 20 MiB.', true);
    audio.focus();
    return;
  }

  const data = new FormData(form);
  if (data.get('climax_seconds')) data.delete('detect_climax');
  else data.delete('climax_seconds');
  const detecting = data.has('detect_climax');
  renderingBusy = true;
  syncRenderControls();
  audio.disabled = true;
  profile.disabled = true;
  showStatus(renderStatus, 'Uploading and rendering your audio…');
  try {
    const response = await fetch('/api/convert', {
      method: 'POST',
      headers: { Accept: 'application/zip, application/json' },
      body: data,
    });
    if (!response.ok || mediaType(response) !== 'application/zip') throw new Error(await renderError(response));
    const download = URL.createObjectURL(await response.blob());
    if (renderDownload) URL.revokeObjectURL(renderDownload);
    renderDownload = download;
    result.href = download;
    result.download = 'rnid-render.zip';
    result.hidden = false;
    showStatus(renderStatus, detecting
      ? 'Your render is ready. The manifest includes the climax result.'
      : 'Your render is ready to download.');
  } catch (error) {
    showStatus(renderStatus, error instanceof TypeError ? 'Could not reach the render service. Try again.' : error.message, true);
  } finally {
    renderingBusy = false;
    audio.disabled = false;
    profile.disabled = false;
    syncRenderControls();
  }
});

void loadProfiles();
