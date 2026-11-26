// Safe-Listening Calibration Guardrail + RNID Clinical & Tinnitus Support Signposting
// Detects when a listener raises headphone/speaker volume while auditioning a muffled/hearing-loss
// profile (which triggers dangerous loudness recruitment on intact bass without restoring clarity)
// and offers a 1-click return to their comfortable Original baseline level.

export const RNID_SUPPORT_LINKS = Object.freeze({
  hearingCheck: 'https://rnid.org.uk/information-and-support/take-online-hearing-check/',
  tinnitusSupport: 'https://rnid.org.uk/information-and-support/tinnitus/',
  earProtection: 'https://rnid.org.uk/information-and-support/ear-health/protect-your-hearing/',
});

export const VOLUME_BOOST_DELTA_THRESHOLD = 0.12;

export function evaluateVolumeBoostNudge({
  currentVolume = 1,
  baselineOriginalVolume = 1,
  isSimulatedActive = false,
  dismissed = false,
} = {}) {
  const cur = Math.max(0, Math.min(1, Number(currentVolume) || 0));
  const base = Math.max(0, Math.min(1, Number(baselineOriginalVolume) || 0));
  if (!isSimulatedActive || dismissed) {
    return {
      showNudge: false,
      baselineVolume: base,
      boostPercent: 0,
      message: '',
    };
  }
  const delta = cur - base;
  if (delta >= VOLUME_BOOST_DELTA_THRESHOLD) {
    const boostPct = Math.round(delta * 100);
    const basePct = Math.round(base * 100);
    return {
      showNudge: true,
      baselineVolume: base,
      boostPercent: boostPct,
      message: `Safe-listening tip: You raised volume +${boostPct}% above your Original level (${basePct}%). Turning headphones up drives intact bass into uncomfortable loudness (loudness recruitment) without restoring lost 2–8 kHz clarity.`,
    };
  }
  return {
    showNudge: false,
    baselineVolume: base,
    boostPercent: 0,
    message: '',
  };
}

export function connectVolumeGuardrail({
  volumeInput,
  bannerEl,
  messageEl,
  resetBtn,
  dismissBtn,
  isSimulatedActive = () => false,
  onResetVolume = () => {},
} = {}) {
  if (!volumeInput || !bannerEl) return { sync() {} };

  let baselineOriginalVolume = Math.max(0, Math.min(1, Number(volumeInput.value) || 0.75));
  let dismissed = false;

  function render() {
    const cur = Math.max(0, Math.min(1, Number(volumeInput.value) || 0));
    const simulated = Boolean(isSimulatedActive());
    if (!simulated) {
      baselineOriginalVolume = cur;
      dismissed = false;
      bannerEl.hidden = true;
      return;
    }
    const result = evaluateVolumeBoostNudge({
      currentVolume: cur,
      baselineOriginalVolume,
      isSimulatedActive: true,
      dismissed,
    });
    bannerEl.hidden = !result.showNudge;
    if (result.showNudge && messageEl) {
      messageEl.textContent = result.message;
    }
  }

  volumeInput.addEventListener('input', () => {
    const cur = Math.max(0, Math.min(1, Number(volumeInput.value) || 0));
    if (!isSimulatedActive()) {
      baselineOriginalVolume = cur;
      dismissed = false;
    } else if (cur < baselineOriginalVolume) {
      // Lowering volume is always safe — adopt the quieter comfortable level!
      baselineOriginalVolume = cur;
    }
    render();
  });

  resetBtn?.addEventListener('click', () => {
    volumeInput.value = String(baselineOriginalVolume);
    onResetVolume(baselineOriginalVolume);
    volumeInput.dispatchEvent(new Event('input', { bubbles: true }));
    bannerEl.hidden = true;
  });

  dismissBtn?.addEventListener('click', () => {
    dismissed = true;
    bannerEl.hidden = true;
  });

  return {
    sync() {
      render();
    },
    getBaseline: () => baselineOriginalVolume,
  };
}
