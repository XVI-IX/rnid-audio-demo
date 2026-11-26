const impulseHalfSeconds = 0.042;
const gainTimeConstant = 0.015;

function lowpass(sampleRate, cutoff, center) {
  const impulse = new Float64Array(center * 2 + 1);
  if (cutoff >= sampleRate / 2) {
    impulse[center] = 1;
    return impulse;
  }

  const slope = 2 * Math.PI * cutoff / sampleRate;
  let sum = 0;
  for (let offset = -center; offset <= center; offset += 1) {
    const angle = Math.PI * offset / center;
    const window = 0.42 + 0.5 * Math.cos(angle) + 0.08 * Math.cos(2 * angle);
    const sinc = offset === 0 ? slope / Math.PI : Math.sin(slope * offset) / (Math.PI * offset);
    const value = sinc * window;
    impulse[center + offset] = value;
    sum += value;
  }
  return impulse.map(value => value / sum);
}

export function createBandKernels(sampleRate, bands) {
  const center = Math.round(sampleRate * impulseHalfSeconds);
  let previous = new Float64Array(center * 2 + 1);
  // The differences telescope, so all bands at unity sum to a delayed unit impulse.
  const kernels = bands.map((band, index) => {
    const cutoff = index < bands.length - 1 ? band.maxHz : sampleRate / 2;
    const next = lowpass(sampleRate, cutoff, center);
    const kernel = Float32Array.from(next, (value, tap) => value - previous[tap]);
    previous = next;
    return kernel;
  });
  return { center, kernels };
}

function unitGain(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric)) : 1;
}

function createFader(context, initial) {
  const node = context.createGain();
  let target = unitGain(initial);
  node.gain.value = target;
  return {
    node,
    set(value) {
      const next = unitGain(value);
      if (next === target) return;
      target = next;
      node.gain.setTargetAtTime(target, context.currentTime, gainTimeConstant);
    },
  };
}

function createAnalyser(context) {
  const analyser = context.createAnalyser();
  analyser.fftSize = 4096;
  analyser.minDecibels = -105;
  analyser.maxDecibels = -12;
  analyser.smoothingTimeConstant = 0.72;
  return analyser;
}

export function createBandPlayback(
  context,
  buffer,
  bands,
  { gains = [], original = false, volume = 1, crowdBuffer = null, crowdGain = 0, destination = context.destination } = {},
) {
  const { center, kernels } = createBandKernels(context.sampleRate, bands);
  const originalAnalyser = createAnalyser(context);
  const simulatedAnalyser = createAnalyser(context);
  const referenceDelay = context.createDelay();
  referenceDelay.delayTime.value = center / context.sampleRate;

  const reference = createFader(context, Number(original));
  const filtered = createFader(context, Number(!original));
  const output = createFader(context, volume);
  const nodes = [referenceDelay, originalAnalyser, simulatedAnalyser, reference.node, filtered.node, output.node];
  const sourceTargets = [referenceDelay];

  referenceDelay.connect(originalAnalyser);
  originalAnalyser.connect(reference.node);
  simulatedAnalyser.connect(filtered.node);
  reference.node.connect(output.node);
  filtered.node.connect(output.node);
  output.node.connect(destination);

  const bandFaders = kernels.map((kernel, index) => {
    const filter = context.createConvolver();
    filter.normalize = false;
    const impulse = context.createBuffer(1, kernel.length, context.sampleRate);
    impulse.copyToChannel(kernel, 0);
    filter.buffer = impulse;
    const fader = createFader(context, gains[index]);
    sourceTargets.push(filter);
    filter.connect(fader.node);
    fader.node.connect(simulatedAnalyser);
    nodes.push(filter, fader.node);
    return fader;
  });

  let crowdFader = null;
  let crowdSource = null;
  if (crowdBuffer) {
    crowdFader = createFader(context, crowdGain);
    for (const target of sourceTargets) crowdFader.node.connect(target);
    nodes.push(crowdFader.node);
  }

  let playing;
  let pausedPosition = 0;
  let stopped = false;
  const lastSampleTime = Math.max(0, buffer.duration - 1 / buffer.sampleRate);

  function position() {
    if (!playing) return pausedPosition;
    const elapsed = Math.max(0, context.currentTime - playing.startedAt);
    return (playing.offset + elapsed) % buffer.duration;
  }

  function releaseSource(source, when) {
    try {
      source.stop(when);
    } finally {
      source.disconnect();
    }
  }

  function ensureCrowdRunning(when) {
    if (!crowdBuffer || !crowdFader || crowdSource) return;
    const cs = context.createBufferSource();
    cs.buffer = crowdBuffer;
    cs.loop = true;
    cs.connect(crowdFader.node);
    cs.start(when, 0);
    crowdSource = cs;
  }

  function replaceSource(requestedOffset) {
    const offset = Math.max(0, Math.min(lastSampleTime, Number.isFinite(requestedOffset) ? requestedOffset : 0));
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    for (const target of sourceTargets) source.connect(target);
    const startedAt = context.currentTime;
    try {
      source.start(startedAt, offset);
    } catch (error) {
      source.disconnect();
      throw error;
    }
    ensureCrowdRunning(startedAt);

    const previous = playing;
    playing = { source, offset, startedAt };
    if (previous) releaseSource(previous.source, startedAt);
    return offset;
  }

  return {
    originalAnalyser,
    simulatedAnalyser,
    start(offset = 0) {
      if (!stopped && !playing) return replaceSource(offset);
      return position();
    },
    position,
    seek(offset) {
      return playing ? replaceSource(offset) : position();
    },
    setGains(nextGains) {
      bandFaders.forEach((fader, index) => fader.set(nextGains[index]));
    },
    setOriginal(showOriginal) {
      reference.set(Number(showOriginal));
      filtered.set(Number(!showOriginal));
    },
    setVolume(level) {
      output.set(level);
    },
    setCrowdGain(level) {
      crowdFader?.set(level);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      pausedPosition = position();
      const previous = playing;
      const activeCrowd = crowdSource;
      playing = undefined;
      crowdSource = null;
      try {
        if (previous) releaseSource(previous.source, context.currentTime);
        if (activeCrowd) releaseSource(activeCrowd, context.currentTime);
      } finally {
        nodes.forEach(node => node.disconnect());
      }
    },
  };
}
