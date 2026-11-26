// Audiologist Calibration & Custom Profile Sandbox.
// Seeds from the 5 RNID demo profiles, calculates live MSBG 2-8 kHz severity classes and nominal SPL,
// validates thresholds [0, 80] dB HL & calibration, and exports schema-valid RNID profile JSON.

export const AUDIOGRAM_FREQUENCIES_HZ = Object.freeze([250, 500, 1000, 2000, 3000, 4000, 6000, 8000]);
export const MIN_THRESHOLD_DB_HL = 0;
export const MAX_THRESHOLD_DB_HL = 80;
export const DEFAULT_EQUIV_0DB_SPL = 100;
export const MIN_AHR_DB = -20;
export const MAX_AHR_DB = 30;
export const VALID_SRC_POS = Object.freeze(['ff', 'df', 'ITU']);
export const PROFILE_ID_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;

export const PROFILE_SEEDS = Object.freeze({
  post_gig_muffled_v1: {
    id: 'post_gig_muffled_candidate_v1',
    seedLabel: 'Post-gig muffled (temporary)',
    label: 'Post-gig muffled candidate (audiology review)',
    provenance: 'Seeded from post_gig_muffled_v1 (temporary 3-6 kHz threshold shift after loud music). Adjusted in the RNID Audiologist Sandbox for clinical review.',
    left: [0, 0, 5, 10, 20, 25, 20, 15],
    right: [0, 0, 5, 10, 20, 25, 20, 15],
    linked: true,
    src_pos: 'ff',
    equiv_0db_spl: 100,
    ahr: 0,
  },
  nihl_demo_v1: {
    id: 'nihl_candidate_v1',
    seedLabel: 'Permanent loss (4 kHz notch)',
    label: 'Mild noise-induced hearing loss candidate',
    provenance: 'Seeded from nihl_demo_v1 (permanent bilateral 3-6 kHz noise notch). Adjusted in the RNID Audiologist Sandbox for clinical review.',
    left: [0, 0, 5, 15, 30, 35, 30, 15],
    right: [0, 0, 5, 15, 30, 35, 30, 15],
    linked: true,
    src_pos: 'ff',
    equiv_0db_spl: 100,
    ahr: 0,
  },
  high_frequency_demo_v1: {
    id: 'high_frequency_candidate_v1',
    seedLabel: 'Less treble (high-frequency loss)',
    label: 'Sloping high-frequency hearing loss candidate',
    provenance: 'Seeded from high_frequency_demo_v1 (sloping bilateral high-frequency thresholds). Adjusted in the RNID Audiologist Sandbox for clinical review.',
    left: [0, 0, 5, 20, 55, 70, 75, 75],
    right: [0, 0, 5, 20, 55, 70, 75, 75],
    linked: true,
    src_pos: 'ff',
    equiv_0db_spl: 100,
    ahr: 0,
  },
  broadband_demo_v1: {
    id: 'broadband_candidate_v1',
    seedLabel: 'Quieter (broadband loss)',
    label: 'Broadband hearing loss candidate',
    provenance: 'Seeded from broadband_demo_v1 (bilateral broadband thresholds across 250-8000 Hz). Adjusted in the RNID Audiologist Sandbox for clinical review.',
    left: [27, 30, 32, 38, 40, 45, 45, 47],
    right: [27, 30, 32, 38, 40, 45, 45, 47],
    linked: true,
    src_pos: 'ff',
    equiv_0db_spl: 100,
    ahr: 0,
  },
  asymmetric_demo_v1: {
    id: 'asymmetric_candidate_v1',
    seedLabel: 'Right side quieter (asymmetric)',
    label: 'Asymmetric hearing loss candidate (right stronger)',
    provenance: 'Seeded from asymmetric_demo_v1 (near-normal left ear, moderate-severe right ear). Adjusted in the RNID Audiologist Sandbox for clinical review.',
    left: [0, 0, 0, 5, 5, 10, 10, 10],
    right: [30, 35, 40, 42, 47, 51, 55, 60],
    linked: false,
    src_pos: 'ff',
    equiv_0db_spl: 100,
    ahr: 0,
  },
});

const SEVERITY_DESCRIPTIONS = {
  NOTHING: '19-channel gammatone bank · no cochlear smearing',
  MILD: '28-channel gammatone bank · mild cochlear filter broadening',
  MODERATE: '32-channel gammatone bank · moderate cochlear smearing',
  SEVERE: '36-channel gammatone bank · severe cochlear smearing',
};

// Matches clarity.utils.audiogram.Audiogram.severity:
// mean threshold across frequencies in [2000, 8000] Hz -> NOTHING (<=15), MILD (>15), MODERATE (>35), SEVERE (>56).
export function msbgSeverity(thresholdsDbHl, frequenciesHz = AUDIOGRAM_FREQUENCIES_HZ) {
  if (!Array.isArray(thresholdsDbHl) || thresholdsDbHl.length !== frequenciesHz.length) {
    throw new Error('Thresholds must match the audiogram frequency list.');
  }
  const critical = [];
  for (let i = 0; i < frequenciesHz.length; i += 1) {
    const freq = frequenciesHz[i];
    if (freq >= 2000 && freq <= 8000) critical.push(Number(thresholdsDbHl[i]));
  }
  const meanDbHl = critical.length
    ? critical.reduce((sum, value) => sum + value, 0) / critical.length
    : 0;
  let severity = 'NOTHING';
  if (meanDbHl > 56) severity = 'SEVERE';
  else if (meanDbHl > 35) severity = 'MODERATE';
  else if (meanDbHl > 15) severity = 'MILD';
  return {
    severity,
    meanDbHl,
    description: SEVERITY_DESCRIPTIONS[severity],
  };
}

export function nominalSimulatedSpl(equiv0dbSpl = DEFAULT_EQUIV_0DB_SPL, ahr = 0, inputDbfs = -20) {
  return Number(equiv0dbSpl) + Number(ahr) + Number(inputDbfs);
}

export function validateAudiogramThresholds(values, earLabel = 'Audiogram') {
  if (!Array.isArray(values) || values.length !== AUDIOGRAM_FREQUENCIES_HZ.length) {
    throw new Error(`${earLabel} requires ${AUDIOGRAM_FREQUENCIES_HZ.length} thresholds from 250 to 8000 Hz.`);
  }
  return values.map((raw, index) => {
    const num = typeof raw === 'number' ? raw : (typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN);
    if (!Number.isFinite(num) || num < MIN_THRESHOLD_DB_HL || num > MAX_THRESHOLD_DB_HL) {
      throw new Error(
        `${earLabel} threshold at ${AUDIOGRAM_FREQUENCIES_HZ[index]} Hz must be between ${MIN_THRESHOLD_DB_HL} and ${MAX_THRESHOLD_DB_HL} dB HL.`,
      );
    }
    return Math.round(num * 100) / 100;
  });
}

export function buildCandidateProfile({
  id,
  version = 1,
  label,
  provenance,
  leftThresholds,
  rightThresholds,
  srcPos = 'ff',
  equiv0dbSpl = DEFAULT_EQUIV_0DB_SPL,
  ahr = 0,
}) {
  const cleanId = typeof id === 'string' ? id.trim() : '';
  if (!PROFILE_ID_PATTERN.test(cleanId)) {
    throw new Error('Profile ID must start with a lowercase letter and use only a–z, 0–9 and underscores (max 64 characters).');
  }
  if (!Number.isInteger(version) || version < 1) {
    throw new Error('Profile version must be a positive integer.');
  }
  const cleanLabel = typeof label === 'string' ? label.trim() : '';
  if (!cleanLabel) throw new Error('Enter a non-empty profile label.');
  const cleanProvenance = typeof provenance === 'string' ? provenance.trim() : '';
  if (!cleanProvenance) throw new Error('Enter non-empty provenance notes for audiology review.');
  if (!VALID_SRC_POS.includes(srcPos)) {
    throw new Error('Source position (src_pos) must be ff, df or ITU.');
  }
  const cleanEquiv = Number(equiv0dbSpl);
  if (!Number.isFinite(cleanEquiv)) throw new Error('equiv_0db_spl must be a finite number.');
  const cleanAhr = Number(ahr);
  if (!Number.isFinite(cleanAhr) || cleanAhr < MIN_AHR_DB || cleanAhr > MAX_AHR_DB) {
    throw new Error(`Headroom adjustment (ahr) must lie between ${MIN_AHR_DB} and +${MAX_AHR_DB} dB.`);
  }
  const left = validateAudiogramThresholds(leftThresholds, 'Left ear');
  const right = validateAudiogramThresholds(rightThresholds, 'Right ear');

  return {
    id: cleanId,
    version,
    label: cleanLabel,
    provenance: cleanProvenance,
    review_status: 'pending_review',
    left: {
      frequencies_hz: [...AUDIOGRAM_FREQUENCIES_HZ],
      thresholds_db_hl: left,
    },
    right: {
      frequencies_hz: [...AUDIOGRAM_FREQUENCIES_HZ],
      thresholds_db_hl: right,
    },
    model: {
      src_pos: srcPos,
      equiv_0db_spl: cleanEquiv,
      ahr: Math.round(cleanAhr * 100) / 100,
    },
  };
}

export function connectAudiologistSandbox(root = document) {
  const panel = root.querySelector('#audiologist-sandbox');
  if (!panel) return () => {};

  const seedSelect = panel.querySelector('#sandbox-seed');
  const linkCheckbox = panel.querySelector('#sandbox-link-ears');
  const idInput = panel.querySelector('#sandbox-id');
  const labelInput = panel.querySelector('#sandbox-label');
  const provenanceInput = panel.querySelector('#sandbox-provenance');
  const ahrInput = panel.querySelector('#sandbox-ahr');
  const ahrOutput = panel.querySelector('#sandbox-ahr-value');
  const srcPosSelect = panel.querySelector('#sandbox-src-pos');
  const equivInput = panel.querySelector('#sandbox-equiv-spl');
  const tableBody = panel.querySelector('#sandbox-thresholds-body');
  const leftSummary = panel.querySelector('#sandbox-left-severity');
  const rightSummary = panel.querySelector('#sandbox-right-severity');
  const splSummary = panel.querySelector('#sandbox-nominal-spl');
  const statusEl = panel.querySelector('#sandbox-status');
  const downloadBtn = panel.querySelector('#sandbox-download');

  const leftInputs = [];
  const rightInputs = [];

  for (const [index, hz] of AUDIOGRAM_FREQUENCIES_HZ.entries()) {
    const row = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = hz >= 1000 ? `${hz / 1000} kHz` : `${hz} Hz`;
    if (hz >= 2000 && hz <= 8000) th.dataset.criticalBand = 'true';
    row.append(th);

    for (const [side, list] of [['left', leftInputs], ['right', rightInputs]]) {
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'number';
      input.min = String(MIN_THRESHOLD_DB_HL);
      input.max = String(MAX_THRESHOLD_DB_HL);
      input.step = '1';
      input.inputMode = 'decimal';
      input.dataset.ear = side;
      input.dataset.hz = String(hz);
      input.setAttribute('aria-label', `${side === 'left' ? 'Left' : 'Right'} ear threshold at ${hz} Hz in dB HL`);
      input.addEventListener('input', () => {
        if (linkCheckbox?.checked) {
          const mirror = side === 'left' ? rightInputs[index] : leftInputs[index];
          if (mirror && mirror.value !== input.value) mirror.value = input.value;
        }
        refreshReadout();
      });
      list.push(input);
      td.append(input);
      row.append(td);
    }
    tableBody.append(row);
  }

  function readThresholds(inputs) {
    return inputs.map((input) => (input.value.trim() === '' ? NaN : Number(input.value)));
  }

  function showStatus(message, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.toggleAttribute('data-error', isError);
  }

  function refreshReadout() {
    const ahr = Number(ahrInput?.value ?? 0);
    const equiv = Number(equivInput?.value ?? DEFAULT_EQUIV_0DB_SPL);
    if (ahrOutput) ahrOutput.textContent = `${ahr >= 0 ? `+${ahr}` : String(ahr).replace('-', '−')} dB`;
    const spl = nominalSimulatedSpl(equiv, ahr, -20);
    if (splSummary) {
      splSummary.textContent = `${spl.toFixed(0)} dB SPL (at −20 dBFS RMS with equiv_0db_spl = ${equiv} dB)`;
    }

    try {
      const leftVals = validateAudiogramThresholds(readThresholds(leftInputs), 'Left ear');
      const rightVals = validateAudiogramThresholds(readThresholds(rightInputs), 'Right ear');
      const leftInfo = msbgSeverity(leftVals);
      const rightInfo = msbgSeverity(rightVals);
      if (leftSummary) {
        leftSummary.textContent = `${leftInfo.severity} (${leftInfo.meanDbHl.toFixed(1)} dB HL mean 2–8 kHz · ${leftInfo.description})`;
      }
      if (rightSummary) {
        rightSummary.textContent = `${rightInfo.severity} (${rightInfo.meanDbHl.toFixed(1)} dB HL mean 2–8 kHz · ${rightInfo.description})`;
      }
      showStatus('');
    } catch (error) {
      showStatus(error.message, true);
    }
  }

  function applySeed(seedKey) {
    const seed = PROFILE_SEEDS[seedKey] ?? PROFILE_SEEDS.post_gig_muffled_v1;
    if (seedSelect && seedSelect.value !== seedKey && PROFILE_SEEDS[seedKey]) seedSelect.value = seedKey;
    if (linkCheckbox) linkCheckbox.checked = seed.linked;
    if (idInput) idInput.value = seed.id;
    if (labelInput) labelInput.value = seed.label;
    if (provenanceInput) provenanceInput.value = seed.provenance;
    if (srcPosSelect) srcPosSelect.value = seed.src_pos;
    if (equivInput) equivInput.value = String(seed.equiv_0db_spl);
    if (ahrInput) ahrInput.value = String(seed.ahr);
    seed.left.forEach((value, idx) => { leftInputs[idx].value = String(value); });
    seed.right.forEach((value, idx) => { rightInputs[idx].value = String(value); });
    refreshReadout();
  }

  seedSelect?.addEventListener('change', () => applySeed(seedSelect.value));
  linkCheckbox?.addEventListener('change', () => {
    if (linkCheckbox.checked) {
      leftInputs.forEach((input, idx) => { rightInputs[idx].value = input.value; });
      refreshReadout();
    }
  });
  ahrInput?.addEventListener('input', refreshReadout);
  srcPosSelect?.addEventListener('change', refreshReadout);
  equivInput?.addEventListener('input', refreshReadout);

  downloadBtn?.addEventListener('click', () => {
    try {
      const candidate = buildCandidateProfile({
        id: idInput?.value,
        version: 1,
        label: labelInput?.value,
        provenance: provenanceInput?.value,
        leftThresholds: readThresholds(leftInputs),
        rightThresholds: readThresholds(rightInputs),
        srcPos: srcPosSelect?.value,
        equiv0dbSpl: Number(equivInput?.value ?? DEFAULT_EQUIV_0DB_SPL),
        ahr: Number(ahrInput?.value ?? 0),
      });
      const json = JSON.stringify(candidate, null, 2) + '\n';
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${candidate.id}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      showStatus(`Exported ${candidate.id}.json (review_status: "pending_review"). Validate with: rnid profiles validate ${candidate.id}.json`);
    } catch (error) {
      showStatus(error.message, true);
    }
  });

  applySeed(seedSelect?.value || 'post_gig_muffled_v1');
  return applySeed;
}
