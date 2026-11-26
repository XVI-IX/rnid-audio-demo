import { connectAudioExplainer } from './audio-explainer.mjs?v=6c8561a22e';
import { CAMPAIGN_ASPECTS, recordCampaignAudioVideo, resolveCampaignTimeline } from './campaign-video.mjs?v=6c8561a22e';
import { CUE_SAMPLE_RATE, cueSample, cueSeconds } from './cue.mjs?v=6c8561a22e';
import { connectEarLevels, connectStereoEarOutput, unityEarGains } from './ear-levels.mjs?v=6c8561a22e';
import { encodeWav, loadFilterIndex, renderPreview } from './filter-preview.mjs?v=6c8561a22e';
import { attachSectionDrag, computePeaks } from './marker-scrubber.mjs?v=6c8561a22e';
import { createDefaultStorySegments, mixMultiSectionBuffer, normaliseMultiSegments } from './multi-section.mjs?v=6c8561a22e';
import { createCalibrationStage, getEffectTheme, getTinnitusCalibrationLinearBoost, onCalibrationChange } from './output-calibration.mjs?v=6c8561a22e';
import { connectVolumeGuardrail } from './safe-listening.mjs?v=6c8561a22e';
import { displayProfileName } from './studio-filters.mjs?v=6c8561a22e';
import { confirmRingingPlayback } from './tinnitus-warning.mjs?v=6c8561a22e';
import { mixSection, normaliseSection, scheduleSection, sectionLabel } from './upload-section.mjs?v=6c8561a22e';
import { activeRmsDb, attenuatedMixScale, audibleTinnitusGain, mixScale, mixTinnitus, tinnitusLoop } from './upload-tinnitus.mjs?v=6c8561a22e';
import { recordVideo, recordingFormat } from './video-export.mjs?v=6c8561a22e';
import { connectVideoPreview, isVideoFile } from './video-preview.mjs?v=6c8561a22e';

export { isVideoFile };

const filterIndexUrl = new URL('./filters/browser/index.json', import.meta.url);
const hasEarAttenuation = (gains) => gains.some((gain) => gain !== 1);

function mediaDuration(file, signal) {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    const url = URL.createObjectURL(file);
    audio.preload = 'metadata';
    const timer = setTimeout(() => finish(new Error('Preview timed out.')), 8000);
    function finish(error, result) {
      clearTimeout(timer);
      audio.onloadedmetadata = null;
      audio.onerror = null;
      signal.removeEventListener('abort', cancel);
      audio.removeAttribute('src');
      audio.load();
      URL.revokeObjectURL(url);
      if (error) reject(error);
      else resolve(result);
    }
    function cancel() { finish(new Error('File selection changed.')); }
    audio.onloadedmetadata = () => finish(null, audio.duration);
    audio.onerror = () => finish(new Error('Audio metadata is unavailable.'));
    signal.addEventListener('abort', cancel, { once: true });
    audio.src = url;
  });
}

export function connectUploadPreview(audio, marker, {
  maximumBytes, maximumSeconds, uploadBytes = maximumBytes, uploadSeconds = maximumSeconds,
  msbgSeconds = 10 * 60, formatTime, profile, onMediaChange,
}) {
  const section = document.querySelector('#upload-preview');
  const canvas = document.querySelector('#upload-waveform');
  const range = document.querySelector('#upload-position');
  const time = document.querySelector('#upload-time');
  const status = document.querySelector('#upload-preview-status');
  const useMarker = document.querySelector('#upload-use-marker');
  const renderOptions = document.querySelector('#render-options');
  const videoPreview = connectVideoPreview(document.querySelector('#upload-video'));
  const listenButtons = [...document.querySelectorAll('[data-upload-listen]')];
  const downloadPreview = document.querySelector('#upload-download-preview');
  const tinnitus = document.querySelector('#upload-tinnitus');
  const uploadTinnitusWarning = document.querySelector('#upload-tinnitus-warning');
  const uploadTinnitusStopBtn = document.querySelector('#upload-tinnitus-stop');
  const earPanel = document.querySelector('#upload-ear-levels');
  const affectedButton = listenButtons.find((button) => button.dataset.uploadListen === 'simulated');
  const downloadVideo = document.querySelector('#upload-download-video');
  const campaignRow = document.querySelector('#upload-campaign-row');
  const campaignAspect = document.querySelector('#upload-campaign-aspect');
  const downloadCampaign = document.querySelector('#upload-download-campaign');
  const player = document.querySelector('#upload-player');
  const playButton = document.querySelector('#upload-play');
  const backButton = document.querySelector('#upload-back');
  const forwardButton = document.querySelector('#upload-forward');
  const volumeInput = document.querySelector('#upload-volume');
  const fullscreenButton = document.querySelector('#upload-fullscreen');
  const recordingPanel = document.querySelector('#upload-recording');
  const recordingTitle = document.querySelector('#upload-recording-title');
  const recordingTime = document.querySelector('#upload-recording-time');
  const recordingProgress = document.querySelector('#upload-recording-progress');
  const recordingNote = document.querySelector('#upload-recording-note');
  const recordingCancel = document.querySelector('#upload-recording-cancel');
  const sectionControls = document.querySelector('#upload-section');
  const sectionModes = [...document.querySelectorAll('[name="upload-section-mode"]')];
  const sectionRange = document.querySelector('#upload-section-range');
  const sectionStart = document.querySelector('#upload-section-start');
  const sectionEnd = document.querySelector('#upload-section-end');
  const chaptersPanel = document.querySelector('#upload-chapters-panel');
  const chaptersList = document.querySelector('#upload-chapters-list');
  const chaptersAutofill = document.querySelector('#upload-chapters-autofill');
  const chaptersAdd = document.querySelector('#upload-chapters-add');
  const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!section || !OfflineContext) return;
  const canFullscreen = typeof player?.requestFullscreen === 'function' && document.fullscreenEnabled !== false;

  let selection;
  let peaks = [];
  let duration = 0;
  let position = 0;
  let previewPosition;
  let previewSection;
  let dimensions;
  let transferredMarker;
  let selectedVideo = false;
  // In-browser hearing-loss preview: the decoded file, filtered versions per profile, playback.
  let decoded;
  let stereoOriginal;
  let fileName = 'clip';
  const simulated = new Map();
  let filterIndex;
  let context;
  let run;
  let pendingPlayback;
  let frame;
  let downloadUrl;
  // Tinnitus: the original's active level, one seamless loop per sound, and the no-clip
  // scale for each hearing effect and tinnitus pairing.
  let referenceDb;
  const loops = new Map();
  const scales = new Map();
  // Transport: the version Play resumes, the listening level, and any video recording.
  let selectedFile;
  let chosenVersion = 'simulated';
  let volumeLevel = Number(volumeInput?.value ?? 1);
  let recording;
  let videoUrl;
  // Optional section: effects apply only between its start and end, or multi-chapter timeline.
  let effectSection;
  let multiSegments = [];
  let explainerRequestId = 0;

  const readEarGains = connectEarLevels(earPanel, (gains) => {
    if (run?.earOutput) {
      run.earOutput.setGains(gains);
      updateAffectedLabel();
      void refreshExplainer();
    } else effectChanged();
  });

  const uploadVolumeGuardrail = connectVolumeGuardrail({
    volumeInput,
    bannerEl: document.querySelector('#upload-safe-volume-nudge'),
    messageEl: document.querySelector('#upload-safe-volume-msg'),
    resetBtn: document.querySelector('#upload-safe-volume-reset'),
    dismissBtn: document.querySelector('#upload-safe-volume-dismiss'),
    isSimulatedActive: () => run?.version === 'simulated' && (Boolean(profile?.value) || hasEarAttenuation(readEarGains())),
    onResetVolume: (nextVol) => {
      volumeLevel = nextVol;
      if (run) run.master.gain.setTargetAtTime(volumeLevel, context.currentTime, 0.01);
    },
  });

  const explainer = connectAudioExplainer({
    root: section,
    formatTime,
    onSeek: (seconds) => {
      if (!decoded) return;
      seekListening(Math.min(duration, Math.max(0, seconds)));
    },
  });

  function applyEarGainsBuffer(buffer, gains) {
    if (!hasEarAttenuation(gains)) return buffer;
    const leftSrc = buffer.getChannelData(0);
    const rightSrc = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : leftSrc;
    const scaled = [
      Float32Array.from(leftSrc, (v) => v * gains[0]),
      Float32Array.from(rightSrc, (v) => v * gains[1]),
    ];
    return {
      length: buffer.length,
      sampleRate: buffer.sampleRate,
      numberOfChannels: 2,
      getChannelData: (channel) => scaled[channel] ?? scaled[0],
    };
  }

  function currentProfileLabel(profileId, gains) {
    const base = !profileId
      ? 'Original (unfiltered)'
      : (profile?.selectedOptions?.[0]?.textContent?.trim() || displayProfileName(profileId));
    if (!hasEarAttenuation(gains)) return base;
    const fmtDb = (g) => (g <= 1e-4 ? 'muted' : `${Math.round(20 * Math.log10(g))} dB`);
    return `${base} · Ear levels L ${fmtDb(gains[0])} / R ${fmtDb(gains[1])}`;
  }

  async function refreshExplainer() {
    if (!explainer) return;
    if (!decoded) {
      explainer.reset();
      return;
    }
    const requestId = ++explainerRequestId;
    const source = decoded;
    const gains = readEarGains();
    const requestedProfile = profile?.value || '';
    const requestedLabel = currentProfileLabel(requestedProfile, gains);
    const requestedTinnitus = tinnitus?.value || 'off';
    const requestedSection = effectSection ? { ...effectSection } : null;
    const origClip = previewBuffer(source);

    if (!requestedProfile) {
      explainer.updateFromBuffers(origClip, applyEarGainsBuffer(origClip, gains), {
        profileId: hasEarAttenuation(gains) ? 'ear_levels_custom' : 'original',
        profileLabel: requestedLabel,
        tinnitus: requestedTinnitus,
        section: requestedSection,
      });
      return;
    }

    if (simulated.has(requestedProfile)) {
      explainer.updateFromBuffers(
        origClip,
        applyEarGainsBuffer(previewBuffer(simulated.get(requestedProfile)), gains),
        {
          profileId: requestedProfile,
          profileLabel: requestedLabel,
          tinnitus: requestedTinnitus,
          section: requestedSection,
        },
      );
      return;
    }

    try {
      const filtered = await simulatedBuffer(source, requestedProfile);
      if (requestId !== explainerRequestId || decoded !== source) return;
      explainer.updateFromBuffers(
        origClip,
        applyEarGainsBuffer(previewBuffer(filtered), gains),
        {
          profileId: requestedProfile,
          profileLabel: requestedLabel,
          tinnitus: requestedTinnitus,
          section: requestedSection,
        },
      );
    } catch {
      if (requestId !== explainerRequestId || decoded !== source) return;
      explainer.updateFromBuffers(origClip, applyEarGainsBuffer(origClip, gains), {
        profileId: requestedProfile,
        profileLabel: requestedLabel,
        tinnitus: requestedTinnitus,
        section: requestedSection,
      });
    }
  }

  function tinnitusSound() {
    return tinnitus && tinnitus.value !== 'off' ? tinnitus.value : '';
  }

  function syncUploadRingingWarning() {
    if (!uploadTinnitusWarning) return;
    const wholeOrSectionRinging = sectionMode() !== 'chapters' && tinnitus?.value === 'ringing';
    const chapterRinging = sectionMode() === 'chapters' && multiSegments.some((seg) => seg.tinnitus === 'ringing');
    uploadTinnitusWarning.hidden = !(wholeOrSectionRinging || chapterRinging);
  }

  function updateAffectedLabel() {
    if (!affectedButton) return;
    const hearing = Boolean(profile?.value);
    const sound = tinnitusSound();
    if (hasEarAttenuation(readEarGains())) {
      affectedButton.textContent = hearing || sound ? 'Play with effects' : 'Play with ear levels';
      return;
    }
    affectedButton.textContent = hearing && sound ? 'Play with hearing loss and tinnitus'
      : sound ? 'Play with tinnitus' : 'Play with hearing loss';
  }

  function draw() {
    if (!dimensions) return;
    const plot = canvas.getContext('2d');
    if (!plot) return;
    const { width, height } = dimensions;
    plot.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    plot.clearRect(0, 0, width, height);
    plot.fillStyle = '#6f7aa8';
    plot.fillRect(0, height / 2, width, 1);
    if (!peaks.length) return;
    const progress = width * (previewPosition ?? position) / duration;
    const shownSection = previewSection ?? effectSection;
    if (sectionMode() === 'chapters' && multiSegments.length && duration > 0) {
      for (const seg of normaliseMultiSegments(multiSegments, duration)) {
        const left = width * seg.start / duration;
        const right = width * seg.end / duration;
        plot.fillStyle = `${seg.color}36`;
        plot.fillRect(left, 0, Math.max(2, right - left), height);
        plot.fillStyle = seg.color;
        plot.fillRect(left, 0, Math.max(2, right - left), 4);
        plot.fillRect(left, 0, 2, height);
        if (right - left > 44) {
          plot.font = '650 10px system-ui, sans-serif';
          plot.fillText(`${seg.icon} ${seg.label}`, left + 5, 15, right - left - 8);
        }
      }
    } else if (shownSection) {
      const left = width * shownSection.start / duration;
      const right = width * shownSection.end / duration;
      plot.fillStyle = '#9ed8ff38';
      plot.fillRect(left, 0, right - left, height);
      plot.fillStyle = '#9ed8ff';
      plot.fillRect(left, 0, 2, height);
      plot.fillRect(Math.max(left, right - 2), 0, 2, height);
      plot.fillRect(left, 0, 6, 4);
      plot.fillRect(Math.max(0, right - 6), 0, 6, 4);
    }
    const step = width / peaks.length;
    for (const [index, peak] of peaks.entries()) {
      const bar = Math.max(1, (height - 14) * peak);
      const x = (index + 0.5) * step;
      plot.fillStyle = x <= progress ? '#cbc4ff' : '#aab1d4';
      plot.fillRect(x - step / 3, (height - bar) / 2, Math.max(1, 2 * step / 3), bar);
    }
    plot.fillStyle = '#f5f6ff';
    plot.fillRect(Math.min(width - 2, progress), 0, 2, height);
  }

  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    dimensions = { width, height };
    draw();
  }

  function update() {
    const shown = previewPosition ?? position;
    range.value = String(shown);
    const current = formatTime(shown);
    range.setAttribute('aria-valuetext', current);
    time.textContent = `${current} / ${formatTime(duration)}`;
    draw();
  }

  function setListenState(busy = false) {
    const locked = busy || Boolean(recording) || !decoded;
    for (const button of listenButtons) {
      button.disabled = locked;
      button.setAttribute('aria-pressed', String(run?.version === button.dataset.uploadListen));
    }
    downloadPreview.disabled = locked;
    if (playButton) {
      playButton.disabled = Boolean(recording) || !decoded;
      playButton.textContent = run || pendingPlayback ? 'Pause' : 'Play';
    }
    if (backButton) backButton.disabled = Boolean(recording) || !decoded;
    if (forwardButton) forwardButton.disabled = Boolean(recording) || !decoded;
    if (downloadVideo) {
      downloadVideo.hidden = !selectedVideo || !recordingFormat();
      downloadVideo.disabled = locked;
    }
    if (campaignRow) {
      campaignRow.hidden = selectedVideo || !recordingFormat();
    }
    if (downloadCampaign) {
      downloadCampaign.disabled = locked;
    }
    if (sectionControls) sectionControls.disabled = Boolean(recording) || !decoded;
    if (earPanel) earPanel.inert = Boolean(recording);
    if (fullscreenButton) fullscreenButton.hidden = !selectedVideo || !canFullscreen;
    uploadVolumeGuardrail.sync();
  }

  function playbackPosition() {
    if (!run) return position;
    const elapsed = run.offset + Math.max(0, context.currentTime - run.started);
    return run.loopWhole && duration > 0 ? elapsed % duration : Math.min(duration, elapsed);
  }

  function previewBuffer(buffer) {
    if (!selectedVideo) return buffer;
    const length = Math.min(buffer.length, Math.round(duration * buffer.sampleRate));
    if (length === buffer.length) return buffer;
    return {
      length, sampleRate: buffer.sampleRate, numberOfChannels: buffer.numberOfChannels,
      getChannelData: (channel) => buffer.getChannelData(channel).subarray(0, length),
    };
  }

  function stopListening() {
    if (pendingPlayback) {
      pendingPlayback = undefined;
      status.textContent = '';
      setListenState();
    }
    if (!run) return;
    position = playbackPosition();
    const stopped = run;
    run = undefined;
    cancelAnimationFrame(frame);
    if (selectedVideo) videoPreview.stop(position);
    for (const source of stopped.sources) {
      source.onended = null;
      try { source.stop(); } catch { /* already stopped */ }
    }
    stopped.earOutput?.disconnect();
    stopped.calibrationStage?.disconnect();
    stopped.master.disconnect();
    setListenState();
    update();
  }

  function followPlayback() {
    if (!run) return;
    position = playbackPosition();
    if (selectedVideo) videoPreview.follow(position);
    update();
    frame = requestAnimationFrame(followPlayback);
  }

  async function simulatedBuffer(source, id) {
    if (simulated.has(id)) return simulated.get(id);
    filterIndex ??= await loadFilterIndex(filterIndexUrl);
    if (!filterIndex.profiles.some((entry) => entry.id === id)) {
      throw new Error('This profile has no in-browser preview. Choose another profile.');
    }
    const { buffer } = await renderPreview(source, filterIndex, id);
    if (decoded === source) simulated.set(id, buffer);
    return buffer;
  }

  async function stereoSource(source) {
    if (source.numberOfChannels <= 2) return source;
    if (!stereoOriginal) {
      const offline = new OfflineContext(2, source.length, source.sampleRate);
      const player = offline.createBufferSource();
      player.buffer = source;
      player.connect(offline.destination);
      player.start();
      stereoOriginal = offline.startRendering();
    }
    return stereoOriginal;
  }

  // Apply ear levels to the clip before adding tinnitus at its independent level.
  async function affectedVersion() {
    const source = decoded;
    const gains = readEarGains();
    const earGains = hasEarAttenuation(gains) ? gains : undefined;

    if (sectionMode() === 'chapters' && multiSegments.length > 0) {
      const neededProfiles = [...new Set(
        multiSegments.map((s) => s.profileId).filter((pid) => pid && pid !== 'original'),
      )];
      for (const pid of neededProfiles) {
        await simulatedBuffer(source, pid);
      }
      const mixed = mixMultiSectionBuffer(previewBuffer(source), multiSegments, simulated, {
        earGains: gains,
        tinnitusBoostLinear: getTinnitusCalibrationLinearBoost(),
      });
      const offline = new OfflineContext(mixed.numberOfChannels, mixed.length, mixed.sampleRate);
      const webBuf = offline.createBuffer(mixed.numberOfChannels, mixed.length, mixed.sampleRate);
      for (let c = 0; c < mixed.numberOfChannels; c += 1) {
        webBuf.copyToChannel(mixed.getChannelData(c), c);
      }
      return {
        original: source,
        buffer: webBuf,
        earGains: undefined,
        scale: 1,
        earScale: 1,
        isMultiChapter: true,
      };
    }

    const id = profile?.value;
    const sound = tinnitusSound();
    const sourceDb = referenceDb;
    if (!id && !sound && !earGains) throw new Error('Choose a hearing effect, tinnitus or an ear level to hear the changed version.');
    const original = earGains ? await stereoSource(source) : source;
    const buffer = id ? await simulatedBuffer(source, id) : original;
    if (!sound) return { original, buffer, earGains, scale: 1, earScale: 1 };
    const loopKey = `${sound}@${buffer.sampleRate}`;
    if (!loops.has(loopKey)) loops.set(loopKey, tinnitusLoop(sound, buffer.sampleRate));
    const loop = loops.get(loopKey);
    const gain = audibleTinnitusGain(sound, loop, sourceDb, getTinnitusCalibrationLinearBoost());
    const key = `${id || 'original'}|${buffer.numberOfChannels}|${sound}|${getTinnitusCalibrationLinearBoost().toFixed(2)}`;
    let headroom = scales.get(key);
    if (!headroom) {
      const scale = mixScale(previewBuffer(buffer), loop, gain);
      headroom = { scale, earScale: attenuatedMixScale(scale, loop, gain) };
      if (decoded === source) scales.set(key, headroom);
    }
    return { original, buffer, earGains, ...headroom, sound, loop, gain };
  }

  // Starts the changed version (and its tinnitus loop) into `output` at `when`, from `offset`.
  function startAffected(affected, output, when, offset, { loopWhole = false, tinnitusOutput = null } = {}) {
    const sources = [];
    const continuous = loopWhole && !effectSection;
    let tinnitusTarget = tinnitusOutput ?? output;
    if (effectSection) {
      // Effects inside the section, the original outside it, crossfaded at the edges.
      const wet = context.createGain();
      scheduleSection(wet.gain, effectSection, when, offset);
      wet.connect(output);
      if (tinnitusOutput) {
        const tinWet = context.createGain();
        scheduleSection(tinWet.gain, effectSection, when, offset);
        tinWet.connect(tinnitusOutput);
        tinnitusTarget = tinWet;
      } else {
        tinnitusTarget = wet;
      }
      const dry = context.createGain();
      scheduleSection(dry.gain, effectSection, when, offset, true);
      dry.connect(output);
      const original = context.createBufferSource();
      original.buffer = affected.original;
      original.connect(dry);
      original.start(when, offset, duration - offset);
      sources.push(original);
      output = wet;
    }
    const source = context.createBufferSource();
    source.buffer = affected.buffer;
    let earOutput;
    if (affected.earGains) {
      const trim = context.createGain();
      trim.gain.value = affected.earScale;
      trim.connect(output);
      if (!tinnitusOutput) tinnitusTarget = trim;
      const controls = connectStereoEarOutput(context, source, affected.earGains, {
        destination: trim, mono: affected.buffer.numberOfChannels === 1,
      });
      earOutput = {
        setGains(gains = unityEarGains) {
          controls.setGains(gains);
          const now = context.currentTime;
          trim.gain.cancelScheduledValues(now);
          trim.gain.setTargetAtTime(hasEarAttenuation(gains) ? affected.earScale : affected.scale, now, 0.012);
        },
        disconnect() {
          controls.disconnect();
          trim.disconnect();
        },
      };
      output = trim;
    } else if (affected.scale === 1) source.connect(output);
    else {
      // Headroom for the tinnitus layer, so the mix never clips.
      const trim = context.createGain();
      trim.gain.value = affected.scale;
      trim.connect(output);
      source.connect(trim);
    }
    if (continuous) {
      source.loop = true;
      source.start(when, offset % Math.max(0.01, affected.buffer.duration));
    } else {
      source.start(when, offset, duration - offset);
    }
    sources.unshift(source);
    if (affected.sound) {
      const loopBuffer = context.createBuffer(1, affected.loop.length, affected.buffer.sampleRate);
      loopBuffer.copyToChannel(affected.loop, 0);
      const layer = context.createBufferSource();
      const level = context.createGain();
      level.gain.value = affected.gain * (earOutput && !tinnitusOutput ? 1 : affected.scale);
      level.connect(tinnitusTarget);
      layer.buffer = loopBuffer;
      layer.loop = true;
      layer.connect(level);
      layer.start(when, offset % loopBuffer.duration);
      if (!continuous) layer.stop(when + duration - offset);
      sources.push(layer);
    }
    return { sources, earOutput };
  }

  function effectsName(requestedProfile, { sound, earGains, isMultiChapter }, part = effectSection) {
    if (isMultiChapter) return 'story-chapters';
    const db = (gain) => Math.round(20 * Math.log10(gain));
    const ears = earGains ? `ears-L${db(earGains[0])}dB-R${db(earGains[1])}dB` : '';
    const name = [requestedProfile, sound, ears].filter(Boolean).join('-') || 'original';
    return part ? `${name}-section-${sectionLabel(part)}` : name;
  }

  function showRecording(state, { title, note, seconds = 0 } = {}) {
    if (!recordingPanel) return;
    recordingPanel.hidden = state === 'hidden';
    recordingPanel.dataset.state = state;
    if (title) recordingTitle.textContent = title;
    if (note) recordingNote.textContent = note;
    const fraction = duration ? Math.min(1, Math.max(0, seconds / duration)) : 0;
    recordingProgress.value = fraction;
    recordingProgress.setAttribute('aria-valuetext', `${Math.round(fraction * 100)}%`);
    recordingTime.textContent = `${formatTime(seconds)} / ${formatTime(duration)} · ${Math.round(fraction * 100)}%`;
    recordingCancel.hidden = state !== 'recording';
  }

  // Section controls: read the inputs into `effectSection`, or clear it for the whole clip.
  function sectionMode() {
    return sectionModes.find((input) => input.checked)?.value ?? 'whole';
  }

  function renderChaptersUi() {
    if (!chaptersList) return;
    chaptersList.replaceChildren();
    const profileChoices = [
      { value: 'original', label: '✦ Original (clear)' },
      ...[...(profile?.options ?? [])]
        .filter((opt) => opt.value)
        .map((opt) => ({ value: opt.value, label: `${getEffectTheme(opt.value).icon} ${opt.textContent.trim()}` })),
    ];
    multiSegments.forEach((seg, idx) => {
      const theme = getEffectTheme(seg.profileId === 'original' && seg.tinnitus !== 'off' ? seg.tinnitus : seg.profileId);
      const item = document.createElement('div');
      item.className = 'multi-section-item';
      item.style.setProperty('--seg-color', theme.color);

      const swatch = document.createElement('div');
      swatch.className = 'multi-section-swatch';

      const fields = document.createElement('div');
      fields.className = 'multi-section-fields';

      const timesRow = document.createElement('div');
      timesRow.className = 'multi-section-times';
      const startIn = document.createElement('input');
      startIn.type = 'number';
      startIn.min = '0';
      startIn.max = String(Math.round(duration * 10) / 10 || 600);
      startIn.step = '0.1';
      startIn.value = String(seg.start);
      startIn.setAttribute('aria-label', `Chapter ${idx + 1} start seconds`);

      const endIn = document.createElement('input');
      endIn.type = 'number';
      endIn.min = '0';
      endIn.max = String(Math.round(duration * 10) / 10 || 600);
      endIn.step = '0.1';
      endIn.value = String(seg.end);
      endIn.setAttribute('aria-label', `Chapter ${idx + 1} end seconds`);

      startIn.addEventListener('change', () => {
        seg.start = Math.max(0, Number(startIn.value) || 0);
        draw();
        effectChanged();
      });
      endIn.addEventListener('change', () => {
        seg.end = Math.min(duration || 600, Math.max(seg.start + 0.3, Number(endIn.value) || 0));
        draw();
        effectChanged();
      });
      timesRow.append(`#${idx + 1}`, startIn, 'to', endIn, 's');

      const selectsRow = document.createElement('div');
      selectsRow.className = 'multi-section-selects';
      const profSel = document.createElement('select');
      profSel.setAttribute('aria-label', `Chapter ${idx + 1} hearing effect`);
      for (const ch of profileChoices) {
        profSel.append(new Option(ch.label, ch.value, false, ch.value === seg.profileId));
      }
      profSel.addEventListener('change', () => {
        seg.profileId = profSel.value;
        seg.label = getEffectTheme(seg.profileId).shortTag;
        renderChaptersUi();
        draw();
        effectChanged();
      });

      const tinSel = document.createElement('select');
      tinSel.setAttribute('aria-label', `Chapter ${idx + 1} tinnitus`);
      for (const [val, txt] of [['off', 'No tinnitus'], ['ringing', '🔔 Ringing'], ['hiss', '🌫 Hiss']]) {
        tinSel.append(new Option(txt, val, false, val === seg.tinnitus));
      }
      tinSel.addEventListener('change', () => {
        const nextVal = tinSel.value;
        const applyChapTin = (chosen) => {
          seg.tinnitus = chosen;
          syncUploadRingingWarning();
          renderChaptersUi();
          draw();
          effectChanged();
        };
        if (nextVal === 'ringing') {
          tinSel.value = seg.tinnitus;
          confirmRingingPlayback({
            onConfirm: () => applyChapTin('ringing'),
            onUseHiss: () => applyChapTin('hiss'),
            onCancel: () => renderChaptersUi(),
          });
          return;
        }
        applyChapTin(nextVal);
      });

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'multi-section-remove';
      removeBtn.textContent = '×';
      removeBtn.title = 'Remove chapter';
      removeBtn.disabled = multiSegments.length <= 1;
      removeBtn.addEventListener('click', () => {
        multiSegments.splice(idx, 1);
        renderChaptersUi();
        draw();
        effectChanged();
      });

      selectsRow.append(profSel, tinSel, removeBtn);
      fields.append(timesRow, selectsRow);
      item.append(swatch, fields);
      chaptersList.append(item);
    });
  }

  function readSection({ announce = true } = {}) {
    const mode = sectionMode();
    const previous = effectSection;
    if (mode !== 'section') effectSection = undefined;
    else {
      const next = normaliseSection(Number(sectionStart.value), Number(sectionEnd.value), duration);
      if (!next) {
        if (announce) status.textContent = 'Choose a section at least 0.5 seconds long inside the clip.';
        return;
      }
      effectSection = next;
      if (announce) status.textContent = `Effects apply from ${formatTime(next.start)} to ${formatTime(next.end)}.`;
    }
    if (mode === 'chapters' && multiSegments.length === 0) {
      multiSegments = createDefaultStorySegments(duration || 12);
    }
    if (sectionRange) sectionRange.hidden = mode !== 'section';
    if (chaptersPanel) {
      chaptersPanel.hidden = mode !== 'chapters';
      if (mode === 'chapters') renderChaptersUi();
    }
    draw();
    if (previous?.start !== effectSection?.start || previous?.end !== effectSection?.end || mode === 'chapters') effectChanged();
  }

  function resetSection() {
    effectSection = undefined;
    multiSegments = [];
    for (const input of sectionModes) input.checked = input.value === 'whole';
    if (sectionRange) sectionRange.hidden = true;
    if (chaptersPanel) chaptersPanel.hidden = true;
    if (sectionStart) sectionStart.value = '';
    if (sectionEnd) sectionEnd.value = '';
  }

  async function listen(version) {
    chosenVersion = version;
    if (run?.version === version) {
      stopListening();
      return;
    }
    if (run && run.gains.length > 1) {
      // Switch versions at the same moment, like the studio's A/B buttons.
      const now = context.currentTime;
      run.gains.forEach((gain, index) => gain.gain.setTargetAtTime(index === (version === 'original' ? 0 : 1) ? 1 : 0, now, 0.006));
      run.version = version;
      run.calibrationStage?.sync();
      setListenState();
      return;
    }
    if (run) stopListening();
    const request = { version };
    pendingPlayback = request;
    setListenState(true);
    status.textContent = version === 'original' ? 'Preparing playback…' : 'Preparing the changed version on this device…';
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      context ??= new AudioContextClass();
      await context.resume();
      if (pendingPlayback !== request) return;
      // The original plays even before any effect is chosen.
      const affected = await affectedVersion().catch((error) => {
        if (version !== 'original') throw error;
        return undefined;
      });
      if (pendingPlayback !== request) return;
      if (position >= duration - 0.05) position = 0;
      const started = context.currentTime + 0.03;
      const loopWhole = !selectedVideo && !effectSection && sectionMode() !== 'chapters';
      const master = context.createGain();
      master.gain.value = volumeLevel;
      master.connect(context.destination);
      const gains = (affected ? [0, 1] : [0]).map((index) => {
        const gain = context.createGain();
        gain.gain.value = index === (version === 'original' ? 0 : 1) ? 1 : 0;
        gain.connect(master);
        return gain;
      });
      // Route ONLY the simulated music through calibrationStage so Speakers / Live room modes never muffle 3.4 kHz tinnitus!
      const calibrationStage = createCalibrationStage(context, {
        isSimulated: () => (run ? run.version === 'simulated' : version === 'simulated'),
      });
      if (gains[1]) calibrationStage.output.connect(gains[1]);
      const original = context.createBufferSource();
      original.buffer = decoded;
      original.connect(gains[0]);
      if (loopWhole) {
        original.loop = true;
        original.start(started, position % Math.max(0.01, decoded.duration));
      } else {
        original.start(started, position, duration - position);
      }
      const changed = affected
        ? startAffected(affected, calibrationStage.input, started, position, { loopWhole, tinnitusOutput: gains[1] })
        : undefined;
      const sources = [original, ...(changed?.sources ?? [])];
      run = { version, sources, gains, master, calibrationStage, started, offset: position, earOutput: changed?.earOutput, loopWhole };
      if (!loopWhole) {
        original.onended = () => {
          if (run?.sources !== sources) return;
          stopListening();
          position = 0;
          if (selectedVideo) videoPreview.seek(position);
          update();
        };
      }
      if (selectedVideo) void videoPreview.start(position).catch(() => {
        if (run?.sources !== sources) return;
        stopListening();
        status.textContent = 'This browser could not play the video picture. Try another MP4 or WebM file.';
      });
      status.textContent = '';
      followPlayback();
    } catch (error) {
      if (pendingPlayback === request) status.textContent = error?.message || 'This browser could not play the preview.';
    } finally {
      if (pendingPlayback === request) {
        pendingPlayback = undefined;
        setListenState();
      }
    }
  }

  function seekListening(seconds) {
    const playing = run?.version;
    if (playing) stopListening();
    position = seconds;
    if (selectedVideo) videoPreview?.seek(position);
    update();
    if (playing) void listen(playing);
  }

  const cancelScrub = attachSectionDrag(canvas, {
    duration: () => duration,
    section: () => (sectionMode() === 'section' ? effectSection : undefined),
    enabled: () => !recording && Boolean(decoded),
    preview: (state) => {
      if (state?.kind === 'section') {
        previewSection = { start: state.start, end: state.end };
        previewPosition = undefined;
      } else {
        previewSection = undefined;
        previewPosition = state?.value;
      }
      update();
    },
    commit: (result) => {
      if (result.kind === 'section') {
        let startVal = Math.round(result.start * 100) / 100;
        let endVal = Math.round(result.end * 100) / 100;
        if (endVal - startVal < 0.5) {
          if (result.edge === 'start') startVal = Math.max(0, Math.round((endVal - 0.5) * 100) / 100);
          else endVal = Math.min(duration, Math.round((startVal + 0.5) * 100) / 100);
        }
        if (sectionStart) sectionStart.value = String(startVal);
        if (sectionEnd) sectionEnd.value = String(endVal);
        readSection();
      } else {
        seekListening(result.value);
      }
    },
  });
  if (typeof ResizeObserver === 'function') new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);

  range.addEventListener('input', () => seekListening(Number(range.value)));
  for (const button of listenButtons) button.addEventListener('click', () => listen(button.dataset.uploadListen));
  function effectChanged() {
    syncUploadRingingWarning();
    updateAffectedLabel();
    void refreshExplainer();
    // Rebuild playback so the changed version follows the new hearing effect or tinnitus.
    const playing = run?.version ?? pendingPlayback?.version;
    if (!playing) return;
    stopListening();
    void listen(playing);
  }
  profile?.addEventListener('change', effectChanged);
  tinnitus?.addEventListener('change', () => {
    if (tinnitus.value === 'ringing') {
      tinnitus.value = 'off';
      confirmRingingPlayback({
        onConfirm: () => {
          tinnitus.value = 'ringing';
          effectChanged();
        },
        onUseHiss: () => {
          tinnitus.value = 'hiss';
          effectChanged();
        },
        onCancel: () => {
          tinnitus.value = 'off';
          syncUploadRingingWarning();
        },
      });
      return;
    }
    effectChanged();
  });
  uploadTinnitusStopBtn?.addEventListener('click', () => {
    if (tinnitus && tinnitus.value === 'ringing') tinnitus.value = 'off';
    for (const seg of multiSegments) {
      if (seg.tinnitus === 'ringing') seg.tinnitus = 'off';
    }
    syncUploadRingingWarning();
    if (sectionMode() === 'chapters') renderChaptersUi();
    effectChanged();
  });
  onCalibrationChange(() => {
    if (tinnitusSound() || (sectionMode() === 'chapters' && multiSegments.some((s) => s.tinnitus !== 'off'))) {
      effectChanged();
    }
  });
  syncUploadRingingWarning();
  updateAffectedLabel();

  const tenths = (seconds) => String(Math.round(seconds * 10) / 10);
  for (const input of sectionModes) {
    input.addEventListener('change', () => {
      if (sectionMode() === 'section' && !sectionStart.value && !sectionEnd.value) {
        // Start with ten seconds from the playhead (or the clip's start near its end).
        const from = position < duration - 1 ? position : 0;
        sectionStart.value = tenths(from);
        sectionEnd.value = tenths(Math.min(duration, from + 10));
      }
      readSection();
    });
  }
  sectionStart?.addEventListener('change', () => readSection());
  sectionEnd?.addEventListener('change', () => readSection());
  document.querySelector('#upload-section-start-here')?.addEventListener('click', () => {
    const here = playbackPosition();
    sectionStart.value = tenths(here);
    if (!(Number(sectionEnd.value) > here + 0.5)) sectionEnd.value = tenths(Math.min(duration, here + 10));
    readSection();
  });
  document.querySelector('#upload-section-end-here')?.addEventListener('click', () => {
    const here = playbackPosition();
    sectionEnd.value = tenths(here);
    if (!(Number(sectionStart.value) < here - 0.5)) sectionStart.value = tenths(Math.max(0, here - 10));
    readSection();
  });
  chaptersAutofill?.addEventListener('click', () => {
    const applyPreset = (finalTinnitus) => {
      multiSegments = createDefaultStorySegments(duration || 12);
      if (finalTinnitus !== 'ringing' && multiSegments[2]) {
        multiSegments[2].tinnitus = finalTinnitus;
        multiSegments[2].label = finalTinnitus === 'hiss' ? 'Permanent loss + hiss' : 'Permanent loss';
      }
      syncUploadRingingWarning();
      renderChaptersUi();
      draw();
      effectChanged();
    };
    confirmRingingPlayback({
      onConfirm: () => applyPreset('ringing'),
      onUseHiss: () => applyPreset('hiss'),
      onCancel: () => applyPreset('off'),
    });
  });
  chaptersAdd?.addEventListener('click', () => {
    const lastEnd = multiSegments.at(-1)?.end ?? 0;
    const start = lastEnd < duration - 0.6 ? Math.round(lastEnd * 10) / 10 : 0;
    const end = Math.round(Math.min(duration || 12, start + Math.max(2, (duration || 12) / 4)) * 10) / 10;
    multiSegments.push({
      id: `seg-${Date.now()}`,
      start,
      end,
      profileId: profile?.value || 'post_gig_muffled_v1',
      tinnitus: tinnitus?.value || 'off',
      label: getEffectTheme(profile?.value || 'post_gig_muffled_v1').shortTag,
    });
    renderChaptersUi();
    draw();
    effectChanged();
  });

  playButton?.addEventListener('click', () => {
    if (run || pendingPlayback) stopListening();
    else void listen(chosenVersion);
  });
  const skip = (seconds) => seekListening(Math.min(duration, Math.max(0, playbackPosition() + seconds)));
  backButton?.addEventListener('click', () => skip(-5));
  forwardButton?.addEventListener('click', () => skip(5));
  volumeInput?.addEventListener('input', () => {
    volumeLevel = Math.min(1, Math.max(0, Number(volumeInput.value) || 0));
    volumeInput.setAttribute('aria-valuetext', `${Math.round(volumeLevel * 100)}%`);
    if (run) run.master.gain.setTargetAtTime(volumeLevel, context.currentTime, 0.01);
  });
  fullscreenButton?.addEventListener('click', () => {
    if (document.fullscreenElement === player) void document.exitFullscreen();
    else void player.requestFullscreen().catch(() => { status.textContent = 'This browser could not open full screen.'; });
  });
  document.addEventListener('fullscreenchange', () => {
    const active = document.fullscreenElement === player;
    if (fullscreenButton) {
      fullscreenButton.setAttribute('aria-pressed', String(active));
      fullscreenButton.textContent = active ? 'Exit full screen' : 'Full screen';
    }
    requestAnimationFrame(resize);
  });

  recordingCancel?.addEventListener('click', () => recording?.abort());
  downloadVideo?.addEventListener('click', async () => {
    if (recording) return;
    stopListening();
    const requestedFile = selection;
    const requestedProfile = profile?.value ?? '';
    const job = new AbortController();
    const cancelForNewFile = () => job.abort();
    requestedFile?.signal.addEventListener('abort', cancelForNewFile, { once: true });
    recording = job;
    setListenState();
    status.textContent = '';
    const part = effectSection;
    const what = part ? `effects from ${formatTime(part.start)} to ${formatTime(part.end)}` : 'hearing effects';
    showRecording('recording', { title: 'Preparing the video…', note: 'This takes as long as the video. Keep this tab visible.' });
    recordingPanel?.scrollIntoView({ block: 'center' });
    try {
      const affected = await affectedVersion();
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      context ??= new AudioContextClass();
      await context.resume();
      if (job.signal.aborted) throw new DOMException('Cancelled.', 'AbortError');
      let recordingEarOutput;
      const result = await recordVideo({
        file: selectedFile,
        context,
        duration,
        signal: job.signal,
        startAudio: (destination, offset) => {
          const output = startAffected(affected, destination, context.currentTime, Math.min(offset, duration));
          recordingEarOutput = output.earOutput;
          return output.sources;
        },
        cleanupAudio: () => recordingEarOutput?.disconnect(),
        onProgress: (seconds) => showRecording('recording', { title: `Recording video with ${what}`, seconds }),
      });
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      videoUrl = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `${fileName}-${effectsName(requestedProfile, affected, part)}.${result.extension}`;
      document.body.append(link);
      link.click();
      link.remove();
      showRecording('done', { title: 'Video downloaded', note: `Saved as ${link.download}.`, seconds: duration });
      status.textContent = `Downloaded the video with the changed sound as ${result.extension.toUpperCase()}.`;
    } catch (error) {
      if (selection !== requestedFile) return;
      const cancelled = error?.name === 'AbortError';
      showRecording('stopped', {
        title: cancelled ? 'Video download cancelled' : 'Video download stopped',
        note: cancelled ? 'Nothing was saved. Select Download video to start again.' : error?.message || 'The video could not be recorded.',
      });
    } finally {
      requestedFile?.signal.removeEventListener('abort', cancelForNewFile);
      if (recording === job) recording = undefined;
      setListenState();
    }
  });
  downloadCampaign?.addEventListener('click', async () => {
    if (recording || selectedVideo) return;
    stopListening();
    const requestedFile = selection;
    const requestedProfile = profile?.value ?? '';
    const aspectKey = campaignAspect?.value || 'portrait';
    const aspectSpec = CAMPAIGN_ASPECTS[aspectKey] ?? CAMPAIGN_ASPECTS.portrait;
    const job = new AbortController();
    const cancelForNewFile = () => job.abort();
    requestedFile?.signal.addEventListener('abort', cancelForNewFile, { once: true });
    recording = job;
    setListenState();
    status.textContent = '';
    const timeline = resolveCampaignTimeline({
      duration,
      section: effectSection,
      markerSeconds: marker?.value,
    });
    showRecording('recording', {
      title: `Generating ${aspectKey === 'portrait' ? '9:16 social' : '16:9'} campaign video…`,
      note: 'Plays in real time to capture live spectrum bars. Keep this tab visible.',
    });
    recordingPanel?.scrollIntoView({ block: 'center' });
    try {
      const affected = await affectedVersion();
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      context ??= new AudioContextClass();
      await context.resume();
      if (job.signal.aborted) throw new DOMException('Cancelled.', 'AbortError');
      const profileText = currentProfileLabel(requestedProfile, readEarGains());
      let campaignEarOutput;
      const result = await recordCampaignAudioVideo({
        context,
        duration,
        aspect: aspectSpec.id,
        timeline,
        trackTitle: fileName,
        profileLabel: profileText,
        tinnitus: tinnitus?.value || 'off',
        signal: job.signal,
        startAudio: (destination, offset, resolvedTimeline) => {
          const when = context.currentTime;
          if (effectSection || affected.isMultiChapter) {
            const output = startAffected(affected, destination, when, Math.min(offset, duration));
            campaignEarOutput = output.earOutput;
            return output.sources;
          }
          // Split mode: Original up to resolvedTimeline.start, then crossfade into Hearing Loss
          const splitSection = { start: resolvedTimeline.start, end: resolvedTimeline.end };
          const wet = context.createGain();
          scheduleSection(wet.gain, splitSection, when, offset);
          wet.connect(destination);
          const dry = context.createGain();
          scheduleSection(dry.gain, splitSection, when, offset, true);
          dry.connect(destination);
          const origNode = context.createBufferSource();
          origNode.buffer = affected.original;
          origNode.connect(dry);
          origNode.start(when, offset, duration - offset);
          const changed = startAffected(affected, wet, when, offset);
          campaignEarOutput = changed.earOutput;
          return [origNode, ...changed.sources];
        },
        cleanupAudio: () => campaignEarOutput?.disconnect(),
        onProgress: (seconds) => showRecording('recording', {
          title: `Recording ${aspectKey === 'portrait' ? '9:16 Reels/TikTok' : '16:9'} campaign video`,
          seconds,
        }),
      });
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      videoUrl = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `${fileName}-campaign-${aspectSpec.id}-${effectsName(requestedProfile, affected, effectSection)}.${result.extension}`;
      document.body.append(link);
      link.click();
      link.remove();
      showRecording('done', {
        title: 'Campaign video downloaded',
        note: `Saved as ${link.download}.`,
        seconds: duration,
      });
      status.textContent = `Downloaded ${aspectKey === 'portrait' ? '9:16 vertical' : '16:9 landscape'} campaign video (${result.extension.toUpperCase()}).`;
    } catch (error) {
      if (selection !== requestedFile) return;
      const cancelled = error?.name === 'AbortError';
      showRecording('stopped', {
        title: cancelled ? 'Campaign video cancelled' : 'Campaign video stopped',
        note: cancelled ? 'Nothing was saved. Select Export campaign video to start again.' : error?.message || 'The campaign video could not be recorded.',
      });
    } finally {
      requestedFile?.signal.removeEventListener('abort', cancelForNewFile);
      if (recording === job) recording = undefined;
      setListenState();
    }
  });
  downloadPreview.addEventListener('click', async () => {
    const requestedFile = selection;
    const requestedProfile = profile.value;
    setListenState(true);
    try {
      const affected = await affectedVersion();
      if (selection !== requestedFile) return;
      const trimmed = previewBuffer(affected.buffer);
      const part = effectSection;
      const scale = affected.earGains ? affected.earScale : affected.scale;
      const output = part
        ? mixSection(affected.original, affected.buffer, { ...affected, scale, section: part, length: trimmed.length })
        : affected.sound || affected.earGains
          ? mixTinnitus(affected.buffer, affected.loop, affected.gain, scale, trimmed.length, affected.earGains) : trimmed;
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      downloadUrl = URL.createObjectURL(new Blob([encodeWav(output, 16)], { type: 'audio/wav' }));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${fileName}-${effectsName(requestedProfile, affected, part)}-preview.wav`;
      document.body.append(link);
      link.click();
      link.remove();
      status.textContent = selectedVideo ? 'Downloaded the approximate audio preview as a WAV.'
        : 'Downloaded the approximate preview. Render the clip for the full simulation.';
    } catch (error) {
      if (selection === requestedFile) status.textContent = error?.message || 'The preview could not be prepared.';
    } finally {
      if (selection === requestedFile) setListenState();
    }
  });
  useMarker.addEventListener('click', () => {
    const sample = cueSample(position, duration);
    if (sample === null) return;
    marker.value = String(Number(cueSeconds(sample).toFixed(6)));
    transferredMarker = marker.value;
    marker.dispatchEvent(new Event('input', { bubbles: true }));
    if (renderOptions) renderOptions.open = true;
    status.textContent = `Manual marker set to ${formatTime(cueSeconds(sample), 3)}.`;
  });

  audio.addEventListener('change', async () => {
    cancelScrub();
    selection?.abort();
    if (marker.value === transferredMarker) {
      marker.value = '';
      marker.dispatchEvent(new Event('input', { bubbles: true }));
    }
    transferredMarker = undefined;
    const request = new AbortController();
    selection = request;
    const file = audio.files[0];
    selectedFile = file;
    stopListening();
    resetSection();
    showRecording('hidden');
    if (document.fullscreenElement === player) void document.exitFullscreen();
    videoPreview?.reset();
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = undefined;
    selectedVideo = isVideoFile(file);
    useMarker.hidden = selectedVideo;
    if (renderOptions) renderOptions.hidden = selectedVideo;
    decoded = undefined;
    stereoOriginal = undefined;
    referenceDb = undefined;
    simulated.clear();
    scales.clear();
    peaks = [];
    duration = 0;
    position = 0;
    range.max = '0';
    range.disabled = true;
    useMarker.disabled = true;
    onMediaChange?.({ file: undefined, fileName: 'clip', duration: 0, isVideo: selectedVideo, decoded: false });
    explainer?.reset();
    setListenState();
    section.hidden = !file;
    status.textContent = '';
    if (!file) return;
    fileName = file.name.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-').slice(0, 60) || 'clip';
    resize();
    update();
    const previewLimit = maximumSeconds >= 120 ? `${maximumSeconds / 60} minutes` : `${maximumSeconds} seconds`;
    if (!file.size || file.size > maximumBytes) {
      status.textContent = `Choose a nonempty media file up to ${Math.round(maximumBytes / 1024 ** 2)} MiB for the local preview.`;
      return;
    }
    if (selectedVideo && !videoPreview) {
      status.textContent = 'Video preview is unavailable in this browser.';
      return;
    }

    status.textContent = selectedVideo ? 'Reading the video on this device…' : 'Reading the audio on this device…';
    try {
      const metadataSeconds = await (selectedVideo ? videoPreview.load(file, request.signal) : mediaDuration(file, request.signal));
      if (request.signal.aborted) return;
      // Container padding can make the metadata estimate slightly longer than the decoded audio.
      if (!Number.isFinite(metadataSeconds) || metadataSeconds <= 0 || metadataSeconds > maximumSeconds + 0.35) {
        if (selectedVideo) videoPreview.reset();
        status.textContent = `Choose a clip from 1 second to ${previewLimit} for the local preview.`;
        return;
      }
      const bytes = await file.arrayBuffer();
      if (request.signal.aborted) return;
      const analysis = new OfflineContext(1, 1, CUE_SAMPLE_RATE);
      const buffer = await analysis.decodeAudioData(bytes).catch((error) => {
        if (selectedVideo) throw new Error('This video has no supported audio track. Choose a video with audio.');
        throw error;
      });
      if (request.signal.aborted) return;
      const previewFrames = selectedVideo ? Math.min(buffer.length, Math.floor(metadataSeconds * buffer.sampleRate)) : buffer.length;
      const previewDuration = previewFrames / buffer.sampleRate;
      if (previewDuration < 1 || previewDuration > maximumSeconds) {
        if (selectedVideo) videoPreview.reset();
        status.textContent = `Choose a clip from 1 second to ${previewLimit} for the local preview.`;
        return;
      }
      duration = previewDuration;
      decoded = buffer;
      referenceDb = activeRmsDb(previewBuffer(buffer));
      peaks = computePeaks(previewBuffer(buffer));
      range.max = String(duration);
      if (sectionStart) sectionStart.max = String(duration);
      if (sectionEnd) sectionEnd.max = String(duration);
      range.disabled = false;
      useMarker.disabled = selectedVideo;
      onMediaChange?.({ file, fileName, duration, isVideo: selectedVideo, decoded: true });
      setListenState();
      if (selectedVideo) videoPreview.show();
      status.textContent = !selectedVideo && duration > msbgSeconds
        ? `On-device full MSBG rendering accepts audio up to ${Math.round(msbgSeconds / 60)} minutes. You can still preview up to ${previewLimit} below.`
        : '';
      update();
      void refreshExplainer();
    } catch (error) {
      if (request.signal.aborted) return;
      if (!selectedVideo) {
        status.textContent = 'This browser could not preview the selected audio.';
        return;
      }
      videoPreview.reset();
      status.textContent = error?.message || 'This browser could not preview the selected video.';
    }
  });

  return {
    stop() {
      cancelScrub();
      stopListening();
    },
    resize,
  };
}
