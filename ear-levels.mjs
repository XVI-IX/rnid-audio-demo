const ears = ['left', 'right'];
const minimumDb = -30;
export const unityEarGains = Object.freeze([1, 1]);

function decibels(input) {
  const value = input.valueAsNumber;
  return Number.isFinite(value) ? Math.max(minimumDb, Math.min(0, value)) : 0;
}

export function connectEarLevels(panel, onChange) {
  if (!panel) return () => unityEarGains;
  const inputs = ears.map(ear => panel.querySelector(`[data-ear-level="${ear}"]`));
  const values = ears.map(ear => panel.querySelector(`[data-ear-value="${ear}"]`));
  const reset = panel.querySelector('[data-ear-reset]');
  const readGains = () => inputs.map(input => 10 ** (decibels(input) / 20));

  function updateLabels() {
    inputs.forEach((input, index) => {
      const level = decibels(input);
      const label = `${String(level).replace('-', '−')} dB`;
      values[index].textContent = label;
      input.setAttribute('aria-valuetext', label);
    });
    reset.disabled = inputs.every(input => decibels(input) === 0);
  }

  function change() {
    updateLabels();
    onChange(readGains());
  }

  for (const input of inputs) input.addEventListener('input', change);
  reset.addEventListener('click', () => {
    for (const input of inputs) input.value = '0';
    change();
  });
  updateLabels();
  return readGains;
}

export function connectStereoEarOutput(context, source, initialGains = unityEarGains, { destination = context.destination, mono = false } = {}) {
  const split = context.createChannelSplitter(2);
  const merge = context.createChannelMerger(2);
  const gains = initialGains.map((value, index) => {
    const node = context.createGain();
    node.gain.value = value;
    split.connect(node, mono ? 0 : index);
    node.connect(merge, 0, index);
    return node;
  });
  source.connect(split);
  merge.connect(destination);

  return {
    setGains(next) {
      const now = context.currentTime;
      gains.forEach(({ gain }, index) => {
        gain.cancelScheduledValues(now);
        gain.setTargetAtTime(next[index], now, 0.012);
      });
    },
    disconnect() {
      source.disconnect(split);
      split.disconnect();
      for (const node of gains) node.disconnect();
      merge.disconnect();
    },
  };
}
