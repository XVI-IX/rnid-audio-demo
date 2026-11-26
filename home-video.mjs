import {
  createCalibrationStage,
  getTinnitusCalibrationLinearBoost,
  onCalibrationChange,
} from './output-calibration.mjs?v=37802be8c5';
import { confirmRingingPlayback, isRingingConfirmed } from './tinnitus-warning.mjs?v=37802be8c5';
import { audibleTinnitusGain, tinnitusLoop } from './upload-tinnitus.mjs?v=37802be8c5';

const chapters = [
  { id: 'live', start: 0, end: 4.8, choice: 'original', cue: 'Listen for the bright bells above the bass.' },
  { id: 'after', start: 0, end: 4.8, choice: 'muffled', cue: 'The same bells sound duller straight after the gig.' },
  { id: 'quiet', start: 7.25, end: 9.95, choice: 'ringing', cue: 'As the music fades, listen for the ringing or hiss.' },
  { id: 'plugs', start: 0, end: 4.8, choice: 'filtered', cue: 'Compare how each earplug changes the same music.' },
];
const hearingSuffix = {
  original: '',
  stronger: '-strong',
  muffled: '-muffled',
  left: '-left',
  right: '-right',
  foam: '-foam',
  filtered: '-musician',
};
const earEffectMap = {
  original: 'original',
  muffled: 'post_gig',
  stronger: 'permanent_notch',
  foam: 'foam_plugs',
  filtered: 'musician_plugs',
  left: 'post_gig',
  right: 'post_gig',
};
const tinnitusChoices = new Set(['off', 'ringing', 'hiss']);
const plugChoices = new Set(['foam', 'filtered']);
const comparisonCues = {
  after: {
    original: 'Hear the bells as they sounded at the gig.',
    stronger: 'This enhanced example makes the loss of treble easier to hear.',
  },
  quiet: { off: 'Listen to the same fade with the tinnitus illustration turned off.' },
  plugs: {
    open: 'Listen to the music with no earplugs.',
    foam: 'Listen for how the foam example softens the bells and cymbals.',
    filtered: 'Listen for how the filtered example lowers the music more evenly.',
  },
};
const chapterOffsets = [0];
for (const chapter of chapters) {
  chapterOffsets.push(chapterOffsets.at(-1) + chapter.end - chapter.start);
}

export function connectHomeVideo(stopOtherAudio, updateGuide = () => {}, onVisualState = () => {}) {
  const story = document.querySelector('#home-video-example');
  if (!story) return () => {};
  const video = story.querySelector('#home-video');
  if (!video) return () => {};
  const status = story.querySelector('#home-video-status');
  const playButton = story.querySelector('#home-video-play');
  const progress = story.querySelector('#home-story-progress');
  const volume = story.querySelector('#home-story-volume');
  const clock = story.querySelector('#home-story-time');
  const scene = story.querySelector('#home-story-scene');
  const cue = story.querySelector('#home-story-cue');
  const warningEl = story.querySelector('#home-tinnitus-warning');
  const warningStopBtn = story.querySelector('#home-tinnitus-stop');
  const chapterButtons = [...story.querySelectorAll('[data-story-chapter]')];
  const choices = [...story.querySelectorAll('[data-story-for]')];
  const hearingButtons = story.querySelectorAll('[data-home-video-mode]');
  const tinnitusButtons = story.querySelectorAll('[data-home-video-tinnitus]');
  const storyDuration = chapterOffsets.at(-1);

  let chapterIndex = 0;
  let mode = 'original';
  let sound = 'off';
  let playing = false;
  let finished = false;
  let request = 0;
  let pending;

  let mediaContext = null;
  let calibrationStage = null;
  let analyser = null;
  let freqBins = null;
  let energyRaf = 0;
  let liveTinnitus = null;
  const loopCache = new Map();

  function videoVolumeFraction() {
    return volume ? Math.max(0, Math.min(1, Number(volume.value) / 100)) : 0.75;
  }

  function ensureMediaGraph() {
    if (mediaContext) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      mediaContext = new AudioContextClass();
      const source = mediaContext.createMediaElementSource(video);
      // Only filter external music when hearing loss/earplugs are active — never muffle internal tinnitus!
      calibrationStage = createCalibrationStage(mediaContext, {
        isSimulated: () => mode !== 'original',
      });
      analyser = mediaContext.createAnalyser();
      analyser.fftSize = 512;
      freqBins = new Uint8Array(analyser.frequencyBinCount);
      source.connect(calibrationStage.input);
      calibrationStage.output.connect(analyser);
      analyser.connect(mediaContext.destination);
    } catch {
      mediaContext = null;
    }
  }

  function stopLiveTinnitusLayer() {
    if (!liveTinnitus || !mediaContext) return;
    const old = liveTinnitus;
    liveTinnitus = null;
    try {
      const now = mediaContext.currentTime;
      old.gainNode.gain.cancelScheduledValues(now);
      old.gainNode.gain.setTargetAtTime(0.0001, now, 0.02);
      old.source.stop(now + 0.08);
    } catch {
      try { old.source.disconnect(); old.gainNode.disconnect(); } catch { /* ignore */ }
    }
  }

  function syncLiveTinnitusLayer() {
    if (!mediaContext || !analyser || !playing || video.paused || (sound !== 'ringing' && sound !== 'hiss')) {
      stopLiveTinnitusLayer();
      return;
    }
    const key = `${sound}@${mediaContext.sampleRate}`;
    if (!loopCache.has(key)) {
      loopCache.set(key, tinnitusLoop(sound, mediaContext.sampleRate));
    }
    const samples = loopCache.get(key);
    const targetGain = audibleTinnitusGain(sound, samples, -24, getTinnitusCalibrationLinearBoost()) * videoVolumeFraction();

    if (liveTinnitus && liveTinnitus.sound === sound) {
      liveTinnitus.gainNode.gain.setTargetAtTime(targetGain, mediaContext.currentTime, 0.025);
      return;
    }

    stopLiveTinnitusLayer();
    try {
      const buf = mediaContext.createBuffer(1, samples.length, mediaContext.sampleRate);
      buf.copyToChannel(samples, 0);
      const src = mediaContext.createBufferSource();
      const gainNode = mediaContext.createGain();
      const now = mediaContext.currentTime;
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(targetGain, now + 0.06);
      src.buffer = buf;
      src.loop = true;
      src.connect(gainNode);
      // Connect AFTER calibrationStage so Speakers / Live room modes never low-pass 3.4 kHz ringing!
      gainNode.connect(analyser);
      src.onended = () => {
        try { src.disconnect(); gainNode.disconnect(); } catch { /* ignore */ }
      };
      src.start(now, (video.currentTime || 0) % buf.duration);
      liveTinnitus = { sound, source: src, gainNode };
    } catch {
      liveTinnitus = null;
    }
  }

  onCalibrationChange(() => {
    syncLiveTinnitusLayer();
  });

  function tickVideoEnergy() {
    if (video.paused || !analyser || !freqBins) {
      onVisualState({ playing: false });
      return;
    }
    analyser.getByteFrequencyData(freqBins);
    let bassSum = 0;
    let trebleSum = 0;
    for (let i = 1; i <= 10; i += 1) bassSum += freqBins[i] || 0;
    for (let i = 28; i <= 90; i += 1) trebleSum += freqBins[i] || 0;
    onVisualState({
      playing: true,
      bassEnergy: Math.min(1, bassSum / (10 * 210)),
      trebleEnergy: Math.min(1, trebleSum / (63 * 165)),
    });
    energyRaf = requestAnimationFrame(tickVideoEnergy);
  }

  function setVolume() {
    if (volume) video.volume = videoVolumeFraction();
    syncLiveTinnitusLayer();
  }

  function setPlaying(value) {
    playing = value;
    story.dataset.storyPlaying = String(value);
    if (playButton) {
      playButton.textContent = value ? 'Pause' : (finished ? 'Replay story' : 'Play story');
    }
    if (!value) stopLiveTinnitusLayer();
  }

  function paintPosition(mediaTime) {
    const chapter = chapters[chapterIndex];
    const position = chapterOffsets[chapterIndex] + Math.max(0, Math.min(chapter.end - chapter.start, mediaTime - chapter.start));
    const seconds = Math.floor(position);
    if (progress) {
      progress.value = String(position);
      progress.style.setProperty('--story-progress', `${(position / storyDuration) * 100}%`);
      progress.setAttribute('aria-valuetext', `${seconds} seconds, ${scene?.textContent || ''}`);
    }
    if (clock) {
      clock.textContent = `0:${String(seconds).padStart(2, '0')}`;
    }
  }

  function paintSelection() {
    const chapter = chapters[chapterIndex];
    const active = chapter.id === 'quiet' ? sound : (chapter.id === 'plugs' && mode === 'original' ? 'open' : mode);
    story.dataset.storyScene = chapter.id;
    story.dataset.storyChoice = active;
    if (warningEl) {
      warningEl.hidden = sound !== 'ringing';
    }
    if (scene && chapterButtons[chapterIndex]) {
      scene.textContent = chapterButtons[chapterIndex].textContent.trim();
    }
    if (cue) {
      cue.textContent = comparisonCues[chapter.id]?.[active] ?? chapter.cue;
    }
    for (const button of chapterButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.storyChapter === chapter.id));
    }
    for (const button of choices) {
      button.hidden = !button.dataset.storyFor.split(' ').includes(chapter.id);
      button.setAttribute('aria-pressed', String(button.dataset.storyChoice === active));
    }
    for (const button of hearingButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.homeVideoMode === mode));
    }
    for (const button of tinnitusButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.homeVideoTinnitus === sound));
    }
    calibrationStage?.sync();
    syncLiveTinnitusLayer();
    updateGuide({ hearing: plugChoices.has(mode) ? 'original' : mode, tinnitus: sound });
    onVisualState({
      effectKey: earEffectMap[mode] || 'original',
      tinnitus: sound,
      quieterEar: mode === 'left' ? 'left' : (mode === 'right' ? 'right' : null),
    });
  }

  function showError() {
    pending = undefined;
    video.pause();
    setPlaying(false);
    if (status) {
      status.textContent = 'This clip could not play. Press Play to try again.';
      status.setAttribute('data-error', '');
    }
  }

  function loadSelection(mediaTime, shouldPlay) {
    const suffix = sound === 'off' ? '' : `-${sound}`;
    const url = new URL(`./demo/home-preview${hearingSuffix[mode]}${suffix}.mp4`, import.meta.url).href;
    const token = ++request;
    if (status) {
      status.textContent = '';
      status.removeAttribute('data-error');
    }
    setPlaying(shouldPlay);
    video.preload = 'auto';
    if (video.src !== url || video.error) video.src = url;
    pending = video.readyState === 0 ? { url, mediaTime } : undefined;
    video.currentTime = mediaTime;
    paintPosition(mediaTime);
    if (shouldPlay) {
      stopOtherAudio();
      ensureMediaGraph();
      void mediaContext?.resume?.();
      calibrationStage?.sync();
      void video.play().then(() => {
        if (token === request && playing) syncLiveTinnitusLayer();
      }).catch((error) => {
        if (error.name !== 'AbortError' && token === request && playing) showError();
      });
    } else {
      video.pause();
      stopLiveTinnitusLayer();
    }
  }

  function selectChoice(choice) {
    sound = tinnitusChoices.has(choice) ? choice : 'off';
    mode = tinnitusChoices.has(choice) || choice === 'open' ? 'original' : choice;
  }

  function openChapterWithChoice(index, choiceOverride, mediaTime = chapters[index].start, shouldPlay = true) {
    chapterIndex = index;
    finished = false;
    selectChoice(choiceOverride);
    paintSelection();
    loadSelection(mediaTime, shouldPlay);
  }

  function openChapter(index, mediaTime = chapters[index].start, shouldPlay = true) {
    const defaultChoice = chapters[index].choice;
    if (defaultChoice === 'ringing' && shouldPlay && !isRingingConfirmed()) {
      stop();
      chapterIndex = index;
      selectChoice('off');
      paintSelection();
      paintPosition(mediaTime);
      confirmRingingPlayback({
        onConfirm: () => openChapterWithChoice(index, 'ringing', mediaTime, true),
        onUseHiss: () => openChapterWithChoice(index, 'hiss', mediaTime, true),
        onCancel: () => openChapterWithChoice(index, 'off', mediaTime, false),
      });
      return;
    }
    openChapterWithChoice(index, defaultChoice, mediaTime, shouldPlay);
  }

  function currentMediaTime() {
    const { start, end } = chapters[chapterIndex];
    return Math.max(start, Math.min(end, pending?.mediaTime ?? video.currentTime));
  }

  function stop() {
    request += 1;
    video.pause();
    stopLiveTinnitusLayer();
    paintPosition(currentMediaTime());
    setPlaying(false);
  }

  function advance() {
    if (chapterIndex + 1 < chapters.length) {
      openChapter(chapterIndex + 1);
    } else {
      finished = true;
      paintPosition(chapters[chapterIndex].end);
      stop();
    }
  }

  function applyDirectSelect(nextMode, nextSound) {
    mode = nextMode in hearingSuffix ? nextMode : 'original';
    sound = tinnitusChoices.has(nextSound) ? nextSound : 'off';
    if (sound !== 'off' && plugChoices.has(mode)) mode = 'original';
    if (plugChoices.has(mode)) chapterIndex = 3;
    else if (sound !== 'off') chapterIndex = 2;
    else if (mode === 'original') chapterIndex = 0;
    else chapterIndex = 1;
    finished = false;
    paintSelection();
    loadSelection(chapters[chapterIndex].start, true);
  }

  function select({ mode: nextMode = mode, sound: nextSound = sound } = {}) {
    if (nextSound === 'ringing' && !isRingingConfirmed()) {
      confirmRingingPlayback({
        onConfirm: () => applyDirectSelect(nextMode, 'ringing'),
        onUseHiss: () => applyDirectSelect(nextMode, 'hiss'),
        onCancel: () => {
          sound = 'off';
          paintSelection();
        },
      });
      return;
    }
    applyDirectSelect(nextMode, nextSound);
  }

  warningStopBtn?.addEventListener('click', () => {
    sound = 'off';
    paintSelection();
    if (playing) loadSelection(currentMediaTime(), true);
  });

  playButton?.addEventListener('click', () => {
    if (playing) stop();
    else if (finished) openChapter(0);
    else if (sound === 'ringing' && !isRingingConfirmed()) {
      confirmRingingPlayback({
        onConfirm: () => loadSelection(currentMediaTime(), true),
        onUseHiss: () => {
          sound = 'hiss';
          paintSelection();
          loadSelection(currentMediaTime(), true);
        },
      });
    } else {
      loadSelection(currentMediaTime(), true);
    }
  });
  if (progress) progress.max = String(storyDuration);
  setVolume();
  volume?.addEventListener('input', setVolume);
  progress?.addEventListener('input', () => {
    const next = Number(progress.value);
    let index = chapterOffsets.findIndex((end) => next < end) - 1;
    if (index < 0) index = chapters.length - 1;
    const mediaTime = chapters[index].start + next - chapterOffsets[index];
    finished = false;
    if (index !== chapterIndex) openChapter(index, mediaTime, playing);
    else loadSelection(mediaTime, playing);
  });
  for (const [index, button] of chapterButtons.entries()) {
    button.addEventListener('click', () => openChapter(index));
  }
  for (const button of choices) {
    button.addEventListener('click', () => {
      const targetChoice = button.dataset.storyChoice;
      const runChoice = (chosen) => {
        selectChoice(chosen);
        const chapter = chapters[chapterIndex];
        const time = finished ? chapter.start : currentMediaTime();
        finished = false;
        paintSelection();
        loadSelection(time, true);
      };
      if (targetChoice === 'ringing') {
        confirmRingingPlayback({
          onConfirm: () => runChoice('ringing'),
          onUseHiss: () => runChoice('hiss'),
        });
        return;
      }
      runChoice(targetChoice);
    });
  }
  for (const button of hearingButtons) {
    button.disabled = false;
    button.addEventListener('click', () => {
      mode = button.dataset.homeVideoMode;
      paintSelection();
      loadSelection(currentMediaTime(), true);
    });
  }
  for (const button of tinnitusButtons) {
    button.disabled = false;
    button.addEventListener('click', () => {
      const nextTin = button.dataset.homeVideoTinnitus;
      const applyTin = (chosenTin) => {
        sound = chosenTin;
        if (sound !== 'off' && plugChoices.has(mode)) mode = 'original';
        paintSelection();
        loadSelection(currentMediaTime(), true);
      };
      if (nextTin === 'ringing') {
        confirmRingingPlayback({
          onConfirm: () => applyTin('ringing'),
          onUseHiss: () => applyTin('hiss'),
        });
        return;
      }
      applyTin(nextTin);
    });
  }
  for (const button of story.querySelectorAll('[data-home-video-cue]')) {
    button.disabled = false;
    button.addEventListener('click', () => {
      if (button.dataset.homeVideoCue === 'fade') openChapter(2, 8);
      else openChapter(1, 0.9);
    });
  }
  video.addEventListener('loadedmetadata', () => {
    if (pending?.url !== video.currentSrc) return;
    video.currentTime = pending.mediaTime;
    pending = undefined;
  });
  video.addEventListener('play', () => {
    if (!video.paused) {
      stopOtherAudio();
      syncLiveTinnitusLayer();
      cancelAnimationFrame(energyRaf);
      energyRaf = requestAnimationFrame(tickVideoEnergy);
    }
  });
  video.addEventListener('pause', () => {
    stopLiveTinnitusLayer();
    cancelAnimationFrame(energyRaf);
    onVisualState({ playing: false });
  });
  video.addEventListener('timeupdate', () => {
    if (!playing || pending || video.seeking) return;
    if (video.currentTime >= chapters[chapterIndex].end) advance();
    else paintPosition(video.currentTime);
  });
  video.addEventListener('ended', () => {
    if (playing) advance();
  });
  video.addEventListener('error', () => {
    if (video.error) showError();
  });

  video.controls = false;
  for (const element of story.querySelectorAll('.home-story-visual, .home-story-story-controls, .home-story-panel')) {
    element.hidden = false;
  }
  setPlaying(false);
  paintSelection();
  paintPosition(0);
  stop.select = select;
  return stop;
}
