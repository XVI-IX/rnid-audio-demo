// Un-Caged Full-Bleed 3D Human Ear Sculpture, Tactile Cochlear Strum & Field-Note Guide
// Bundled with local `./vendor/three.module.min.js` (CSP-safe, zero external requests).

import {
  answerEarPartQuestionInstant,
  generateEarPartAiResponse,
  getInstantEarPartExplanation,
  getPartStarterQuestions,
} from './ear-anatomy-ai.mjs?v=c84af3279a';
import {
  ANATOMY_PARTS,
  ANATOMY_PART_BY_ID,
  buildHumanEarAnatomy,
  buildSpatialHumanHeadScene,
  buildSpatialLabFloor,
  createStudioEnvironmentTexture,
  normalisePartId,
} from './ear-anatomy-geometry.mjs?v=c84af3279a';
import { getEffectTheme } from './output-calibration.mjs?v=c84af3279a';
import { getTheme, onThemeChange } from './theme.mjs?v=c84af3279a';
import { confirmRingingPlayback } from './tinnitus-warning.mjs?v=c84af3279a';

export const ANATOMY_IMPACT_GUIDES = Object.freeze({
  original: {
    badge: 'Healthy ear · All hair cells active',
    pinna: 'Outer ear folds catch full room sparkle and directional cues before funnelling sound inward.',
    canal: 'Sound waves travel cleanly down the S-curved ear canal with natural speech-band clarity.',
    earplug: 'No earplug inserted — safe at everyday volume, risky above 85 dB at gigs.',
    eardrum: 'The pearly cone-shaped eardrum flexes cleanly across deep bass and delicate treble.',
    middle: 'The eardrum and 3 tiny ossicle bones pass crisp vibrations into the fluid-filled cochlea.',
    ossicles: 'Malleus, incus, and stirrup-shaped stapes rock smoothly at the oval window.',
    vestibular: 'Three semicircular balance loops stay steady right beside the cochlear spiral.',
    cochlea: 'All 48 outer hair-cell stereocilia bundles stand tall — front base catches crisp s/t & cymbals; deep apex catches bass.',
    nerve: 'Steady, accurate timing signals travel along the auditory nerve to your brain.',
    damageRatio: 0,
    droopRatio: 0,
    plugMode: 'none',
    asymmetry: null,
  },
  post_gig: {
    badge: 'Post-gig hangover · High-pitch hair cells fatigued',
    pinna: 'Outer ear cartilage still gathers sound normally — the fatigue sits deeper inside the cochlea.',
    canal: 'Loud gig waves resonated in the open ear canal and overloaded the 4 kHz inner-ear turn.',
    earplug: 'No earplug was worn — intense sound pressure fatigued the delicate inner ear.',
    eardrum: 'Your eardrum still flexes strongly on kick drums and bass, which is why bass still booms.',
    middle: 'The eardrum and ossicles still pump full bass vibrations into the inner ear.',
    ossicles: 'Tiny middle-ear protective muscles tired out during non-stop concert volume.',
    vestibular: 'Balance loops sit next door in the same fluid labyrinth while cochlear hair cells recover.',
    cochlea: 'High-frequency outer hair cells near the 4 kHz cochlear base bend & droop in amber while bass cells stay tall.',
    nerve: 'Overworked nerve synapses struggle to separate voices in a noisy bar.',
    damageRatio: 0.15,
    droopRatio: 0.78,
    plugMode: 'none',
    asymmetry: null,
  },
  permanent_notch: {
    badge: 'Permanent 4 kHz notch · Hair cells lost',
    pinna: 'Outer ear still collects directional cues, yet inner-ear wear makes busy crowds confusing.',
    canal: 'Sound enters normally, and natural canal resonance explains why wear focused near 4 kHz.',
    earplug: 'Repeated unprotected gigs permanently wore away the 3–6 kHz hair cells; filtered plugs protect what remains.',
    eardrum: 'Eardrum remains mechanically healthy, passing full drum and vowel energy inward.',
    middle: 'Ossicle bones still hammer full-strength bass into the inner ear.',
    ossicles: 'Hammer, anvil, and stirrup still work normally — cranking volume just slams the bass.',
    vestibular: 'Balance loops stay healthy while noise wear targets the cochlea’s sound hair cells.',
    cochlea: 'Outer hair cells in the 4 kHz turn have flattened & gone dark — turning up volume cannot regrow them.',
    nerve: 'Consonants (s, f, t, k) drop out of the nerve signal, making lyrics & pub speech blur.',
    damageRatio: 0.88,
    droopRatio: 0.92,
    plugMode: 'none',
    asymmetry: null,
  },
  severe_hf: {
    badge: 'Strong treble loss · Basal turn inactive',
    pinna: 'Outer ear gathers sound normally while high-pitched room air vanishes inside the cochlea.',
    canal: 'Waves enter openly, dominated by low-frequency energy inside the inner ear.',
    earplug: 'Protect remaining hair cells with filtered earplugs in loud venues.',
    eardrum: 'Eardrum still takes 100% of headphone air pressure even when treble sounds missing.',
    middle: 'Low vibrations pass freely through the middle-ear bones.',
    ossicles: 'Ossicles transmit full low-end punch into the cochlea.',
    vestibular: 'Semicircular canals remain steady alongside the inner-ear snail shell.',
    cochlea: 'Most high- and mid-frequency hair cells across the cochlear base are inactive; only deep bass apex cells fire.',
    nerve: 'Widened cochlear tuning smears instruments and speech together.',
    damageRatio: 1.0,
    droopRatio: 1.0,
    plugMode: 'none',
    asymmetry: null,
  },
  foam_plugs: {
    badge: 'Foam earplug · Blocks treble, leaks bass',
    pinna: 'Outer ear catches the live band right up to the foam-sealed canal entrance.',
    canal: 'Expanding foam seals the canal unevenly — absorbing treble while heavy bass vibrates through.',
    earplug: 'Dense foam dumps high frequencies >24 dB more than bass, making live bands sound underwater — so people pull them out.',
    eardrum: 'Eardrum receives mostly muffled low-end thump.',
    middle: 'Eardrum and ossicles rock mainly on slow, muffled bass waves.',
    ossicles: 'Stirrup bone moves gently on bass-heavy vibrations with crisp highs stripped away.',
    vestibular: 'Inner-ear labyrinth stays shielded from peak concert blasts.',
    cochlea: 'Hair cells are shielded, but treble stereocilia bundles barely receive any music sparkle.',
    nerve: 'Brain hears a dull, boomy mix with muffled vocals.',
    damageRatio: 0,
    droopRatio: 0.15,
    plugMode: 'foam',
    asymmetry: null,
  },
  musician_plugs: {
    badge: 'Musicians’ −15 dB filter · Safe & clear',
    pinna: 'Outer ear funnels natural live tone straight into the precision acoustic filter.',
    canal: 'Precision acoustic filter lowers all wave heights evenly by 15 dB before they hit the eardrum.',
    earplug: 'Tuned acoustic duct attenuates bass, vocals, and cymbals equally — music sounds natural, just safer.',
    eardrum: 'Eardrum vibrates with full musical clarity at a gentle, safe excursion.',
    middle: 'Eardrum & ossicles vibrate gently without dangerous peak slams.',
    ossicles: 'Hammer, anvil, and stirrup glide smoothly at the oval window without overload.',
    vestibular: 'Calm, comfortable fluid levels across the whole inner ear.',
    cochlea: 'Every single hair-cell bundle from bass apex to treble base stays upright, healthy, and sparkling.',
    nerve: 'Clear, balanced music & conversation with zero post-gig hangover.',
    damageRatio: 0,
    droopRatio: 0,
    plugMode: 'musician',
    asymmetry: null,
  },
  asymmetric: {
    badge: 'Uneven ears · One side quieter',
    pinna: 'Both outer ears funnel sound, yet one inner ear took heavier speaker blasts.',
    canal: 'Standing beside a PA speaker stack or stage monitor often stresses one ear far more than the other.',
    earplug: 'Filtered earplugs protect both ears evenly regardless of where speakers sit.',
    eardrum: 'Both eardrums vibrate, while inner-ear hair-cell sensitivity differs between sides.',
    middle: 'Both ossicle chains work, but one inner ear responds more weakly.',
    ossicles: 'Middle-ear bones pivot cleanly on both sides.',
    vestibular: 'Balance stays steady while left/right sound localization feels tilted.',
    cochlea: 'Hair cells in the affected ear lose sensitivity, tilting stereo music & making spatial localization harder.',
    nerve: 'Brain receives uneven left/right signals, making crowded rooms tiring.',
    damageRatio: 0.55,
    droopRatio: 0.65,
    plugMode: 'none',
    asymmetry: 'right',
  },
});

export function normaliseAnatomyEffectKey(rawKey = 'original') {
  const k = String(rawKey || 'original').toLowerCase();
  if (k.includes('foam')) return 'foam_plugs';
  if (k.includes('musician') || k === 'filtered') return 'musician_plugs';
  if (k.includes('post_gig') || k === 'muffled') return 'post_gig';
  if (k.includes('nihl_moderate') || k.includes('nihl_mild') || k.includes('high_frequency') || k.includes('severe') || k === 'stronger' || k.includes('broadband') || k.includes('age_related')) {
    return 'severe_hf';
  }
  if (k.includes('nihl') || k.includes('notch') || k === 'permanent') return 'permanent_notch';
  if (k.includes('asymmetric') || k === 'left' || k === 'right') return 'asymmetric';
  return 'original';
}

export function describeEarAnatomyImpact(effectKey = 'original', tinnitus = 'off', focusPart = 'cochlea') {
  const normKey = normaliseAnatomyEffectKey(effectKey);
  const guide = ANATOMY_IMPACT_GUIDES[normKey] ?? ANATOMY_IMPACT_GUIDES.original;
  const partCopy = guide[focusPart] || guide[normalisePartId(focusPart)] || guide.cochlea;
  const tinCopy = tinnitus === 'ringing'
    ? ' Auditory nerve: spontaneous 3.4 kHz ringing sparks fire even in silence.'
    : tinnitus === 'hiss'
      ? ' Auditory nerve: spontaneous high-band hiss activity lingers in quiet gaps.'
      : '';
  return {
    effectKey: normKey,
    badge: guide.badge,
    text: `${partCopy}${tinCopy}`,
    plugMode: guide.plugMode,
    damageRatio: guide.damageRatio,
    droopRatio: guide.droopRatio,
  };
}

export function computeHairCellHealth(u, normKey) {
  const notchDist = Math.abs(u - 0.27);
  const hfWeight = Math.max(0, 1 - u * 1.45);
  const notchWeight = Math.exp(-(notchDist * notchDist) / 0.028);
  if (normKey === 'post_gig') {
    return 1 - 0.68 * Math.max(hfWeight * 0.78, notchWeight);
  }
  if (normKey === 'permanent_notch') {
    return 1 - 0.93 * Math.max(hfWeight * 0.55, notchWeight);
  }
  if (normKey === 'severe_hf') {
    return u < 0.7 ? 0.08 : 1;
  }
  if (normKey === 'asymmetric') {
    return 1 - 0.55 * hfWeight;
  }
  return 1;
}

export function computeZoomUiMetrics(radius = 9.4, baselineRadius = 9.4) {
  const safeR = Math.max(2.2, Math.min(18, Number(radius) || baselineRadius));
  const zoomRatio = Number((baselineRadius / safeR).toFixed(2));
  const zoomState = zoomRatio >= 1.32 ? 'close' : (zoomRatio <= 0.85 ? 'wide' : 'overview');
  const radialSpread = zoomRatio < 1
    ? Math.min(1.55, 1 + (1 - zoomRatio) * 1.25)
    : Math.max(0.42, 1 / Math.pow(zoomRatio, 0.72));
  const basePinScale = Number(Math.max(0.86, Math.min(1.12, 0.78 + zoomRatio * 0.22)).toFixed(3));
  return { zoomRatio, zoomState, radialSpread, basePinScale };
}

export function resolveNonOverlappingPins(items = [], {
  minX = 52,
  maxX = 900,
  minY = 64,
  maxY = 500,
  minGapY = 29,
  collideWidth = 114,
  zoomState = 'overview',
  obstacles = [],
} = {}) {
  const safeMaxX = Math.max(minX + 40, maxX);
  const safeMaxY = Math.max(minY + 40, maxY);
  const pinHalfW = Math.round(collideWidth * 0.52);
  const pinHalfH = Math.round(minGapY * 0.55);

  function pushOutOfObstacles(p) {
    for (const obs of obstacles) {
      if (!obs) continue;
      const oLeft = obs.left - pinHalfW;
      const oRight = obs.right + pinHalfW;
      const oTop = obs.top - pinHalfH;
      const oBottom = obs.bottom + pinHalfH;
      if (p.lx > oLeft && p.lx < oRight && p.ly > oTop && p.ly < oBottom) {
        const candidates = [];
        if (oLeft >= minX) candidates.push({ lx: oLeft, ly: p.ly, cost: Math.abs(p.lx - oLeft) });
        if (oRight <= safeMaxX) candidates.push({ lx: oRight, ly: p.ly, cost: Math.abs(oRight - p.lx) });
        if (oTop >= minY) candidates.push({ lx: p.lx, ly: oTop, cost: Math.abs(p.ly - oTop) });
        if (oBottom <= safeMaxY) candidates.push({ lx: p.lx, ly: oBottom, cost: Math.abs(oBottom - p.ly) });
        if (candidates.length > 0) {
          candidates.sort((a, b) => a.cost - b.cost);
          p.lx = Math.max(minX, Math.min(safeMaxX, candidates[0].lx));
          p.ly = Math.max(minY, Math.min(safeMaxY, candidates[0].ly));
        }
      }
    }
  }

  const out = items.map((item) => {
    const anchorInSafeArea = item.inFront
      && item.ax >= 10
      && item.ax <= safeMaxX + 36
      && item.ay >= 14
      && item.ay <= safeMaxY + 38;
    const visible = zoomState === 'close'
      ? (anchorInSafeArea && (item.active || (item.ax >= 22 && item.ax <= safeMaxX + 12 && item.ay >= minY - 26 && item.ay <= safeMaxY + 18)))
      : anchorInSafeArea;
    const p = {
      ...item,
      visible,
      lx: Math.max(minX, Math.min(safeMaxX, item.rawLx)),
      ly: Math.max(minY, Math.min(safeMaxY, item.rawLy)),
    };
    if (p.visible && obstacles.length > 0) {
      pushOutOfObstacles(p);
    }
    return p;
  });

  const visibleItems = out.filter((p) => p.visible);
  for (let pass = 0; pass < 4; pass += 1) {
    for (let i = 0; i < visibleItems.length; i += 1) {
      for (let j = i + 1; j < visibleItems.length; j += 1) {
        const a = visibleItems[i];
        const b = visibleItems[j];
        const dx = Math.abs(a.lx - b.lx);
        const dy = b.ly - a.ly;
        if (dx < collideWidth && Math.abs(dy) < minGapY) {
          const push = (minGapY - Math.abs(dy)) * 0.55 + 0.5;
          const dir = dy >= 0 ? 1 : -1;
          if (a.active && !b.active) {
            b.ly = Math.max(minY, Math.min(safeMaxY, b.ly + dir * push * 2));
          } else if (b.active && !a.active) {
            a.ly = Math.max(minY, Math.min(safeMaxY, a.ly - dir * push * 2));
          } else {
            a.ly = Math.max(minY, Math.min(safeMaxY, a.ly - dir * push));
            b.ly = Math.max(minY, Math.min(safeMaxY, b.ly + dir * push));
          }
        }
      }
    }
    if (obstacles.length > 0) {
      for (const p of visibleItems) pushOutOfObstacles(p);
    }
  }

  // Hide any pin whose anchor or final pill still sits directly behind a HUD card obstacle
  if (obstacles.length > 0) {
    for (const p of visibleItems) {
      for (const obs of obstacles) {
        if (!obs) continue;
        const trappedPill = p.lx > obs.left - 40 && p.lx < obs.right + 40 && p.ly > obs.top - 12 && p.ly < obs.bottom + 12;
        const hiddenAnchor = p.ax > obs.left + 8 && p.ax < obs.right - 8 && p.ay > obs.top + 8 && p.ay < obs.bottom - 8;
        if (trappedPill || hiddenAnchor) {
          p.visible = false;
          break;
        }
      }
    }
  }
  return out;
}

export function connectEar3DStage({
  root = document,
  onSelectPreset = () => {},
  onToggleAudio = null,
  onCrowdChange = null,
  getWebLlmClient = () => null,
} = {}) {
  const stageEl = root.querySelector('#ear-3d-stage');
  if (!stageEl) {
    return {
      setState() {},
      setAudioEnergy() {},
      getState: () => ({}),
      dispose() {},
    };
  }

  const canvasWrap = stageEl.querySelector('#ear-3d-canvas-wrap');
  const leadersSvg = stageEl.querySelector('#ear-3d-leaders-svg');
  const pinsLayer = stageEl.querySelector('#ear-3d-pins-layer');
  const hoverTooltip = stageEl.querySelector('#ear-3d-hover-tooltip');
  const badgeEl = stageEl.querySelector('#ear-3d-badge');
  const zoomIndicatorEl = stageEl.querySelector('#ear-zoom-indicator');
  const mobileHintEl = stageEl.querySelector('#ear-mobile-hint');
  const calloutEl = stageEl.querySelector('#ear-3d-callout');

  const heroEditorialEl = stageEl.querySelector('#ear-hero-editorial');
  const topToolsEl = stageEl.querySelector('#ear-3d-top-tools');
  const inspectorEl = stageEl.querySelector('#ear-ai-inspector');
  const dockEl = stageEl.querySelector('#ear-floating-dock');
  const inspectorToggleBtn = stageEl.querySelector('#ear-ai-collapse');
  const aiStatusBadgeEl = stageEl.querySelector('#ear-ai-status-badge');
  const aiScrollEl = stageEl.querySelector('#ear-ai-scroll');
  const aiProgressWrapEl = stageEl.querySelector('#ear-ai-progress-wrap');
  const aiProgressEl = stageEl.querySelector('#ear-ai-progress');
  const aiProgressLabelEl = stageEl.querySelector('#ear-ai-progress-label');
  const aiPartKickerEl = stageEl.querySelector('#ear-ai-part-kicker');
  const aiPartTitleEl = stageEl.querySelector('#ear-ai-part-title');
  const aiPartLatinEl = stageEl.querySelector('#ear-ai-part-latin');
  const aiReactionPillEl = stageEl.querySelector('#ear-ai-reaction-pill');
  const aiThreadEl = stageEl.querySelector('#ear-ai-chat-thread');
  const aiLiveReplyEl = stageEl.querySelector('#ear-ai-live-reply');
  const aiStartersEl = stageEl.querySelector('#ear-ai-starters');
  const aiQuestionInput = stageEl.querySelector('#ear-ai-question');
  const aiAskBtn = stageEl.querySelector('#ear-ai-ask');
  const aiDeepDiveBtn = stageEl.querySelector('#ear-ai-deepdive');

  const sceneModeBtns = [...stageEl.querySelectorAll('[data-ear-scene]')];
  const partBtns = [...stageEl.querySelectorAll('[data-ear-part]')];
  const presetBtns = [...stageEl.querySelectorAll('[data-ear-quick-effect]')];
  const playAudioBtn = stageEl.querySelector('#ear-3d-play-audio');
  const explodeWrap = stageEl.querySelector('#ear-3d-explode-wrap');
  const explodeSlider = stageEl.querySelector('#ear-3d-explode');
  const explodeToggleBtn = stageEl.querySelector('#ear-3d-explode-btn');
  const crowdWrap = stageEl.querySelector('#ear-3d-crowd-wrap');
  const crowdSlider = stageEl.querySelector('#ear-3d-crowd');
  const crowdOut = stageEl.querySelector('#ear-3d-crowd-val');
  const earTinnitusWarning = stageEl.querySelector('#ear-tinnitus-warning');
  const earTinnitusStopBtn = stageEl.querySelector('#ear-tinnitus-stop');
  const calmBtn = stageEl.querySelector('#ear-3d-calm');
  const xrayBtn = stageEl.querySelector('#ear-3d-xray');
  const labelsBtn = stageEl.querySelector('#ear-3d-labels-toggle');
  const soundFeedbackBtn = stageEl.querySelector('#ear-3d-sound-toggle');
  const zoomInBtn = stageEl.querySelector('#ear-3d-zoom-in');
  const zoomOutBtn = stageEl.querySelector('#ear-3d-zoom-out');
  const resetViewBtn = stageEl.querySelector('#ear-3d-reset-view');

  const prefersReduced = Boolean(
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
  );

  let state = {
    effectKey: 'original',
    tinnitus: 'off',
    crowdPercent: 0,
    playing: false,
    bassEnergy: 0.28,
    trebleEnergy: 0.32,
    sceneMode: 'anatomy',
    focusPart: 'cochlea',
    hoveredPart: null,
    xrayMode: false,
    showLabels: true,
    explodeAmount: 0,
    touchAudio: true,
    inspectorCollapsed: false,
    calmMotion: prefersReduced,
    quieterEar: null,
  };

  let activeAiAbort = null;
  let focusCameraCallback = null;
  let synthCtx = null;
  let lastStrumSlot = -1;
  let lastStrumTime = 0;

  // Tactile Web Audio physical-modelling touch sound synthesizer!
  // Lets visitors literally HEAR individual cochlear hair cells (healthy vs damaged!) and ear structures.
  function playAnatomyTouchSound(partId, { hairU = null, tonotopicHz = null } = {}) {
    if (!state.touchAudio || typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      synthCtx ??= new AudioContextClass();
      if (synthCtx.state === 'suspended') void synthCtx.resume();

      const now = synthCtx.currentTime;
      const normKey = normaliseAnatomyEffectKey(state.effectKey);
      const master = synthCtx.createGain();
      master.connect(synthCtx.destination);

      if (partId === 'cochlea' && hairU !== null) {
        // Strum the exact cochlear hair-cell bundle at its place pitch — attenuated if fatigued/damaged!
        const health = computeHairCellHealth(hairU, normKey);
        const foamMuffle = normKey === 'foam_plugs' && hairU < 0.55 ? 0.16 : 1;
        const musScale = normKey === 'musician_plugs' ? 0.65 : 1;
        const audibleGain = Math.max(0.012, 0.095 * health * health * foamMuffle * musScale);

        const freq = Math.max(130, Math.min(5200, Number(tonotopicHz) || 880));
        const osc = synthCtx.createOscillator();
        const filt = synthCtx.createBiquadFilter();
        osc.type = health > 0.55 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        filt.type = 'lowpass';
        filt.frequency.setValueAtTime(health > 0.55 ? freq * 2.5 : Math.min(750, freq * 0.8), now);

        master.gain.setValueAtTime(0.0001, now);
        master.gain.exponentialRampToValueAtTime(audibleGain, now + 0.012);
        master.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

        osc.connect(filt);
        filt.connect(master);
        osc.start(now);
        osc.stop(now + 0.3);
        return;
      }

      // Subtle bespoke tactile feedback for each anatomical structure
      const osc = synthCtx.createOscillator();
      osc.connect(master);
      master.gain.setValueAtTime(0.0001, now);

      if (partId === 'eardrum') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(145, now);
        osc.frequency.exponentialRampToValueAtTime(58, now + 0.16);
        master.gain.exponentialRampToValueAtTime(0.09, now + 0.008);
        master.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (partId === 'ossicles') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1180, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.07);
        master.gain.exponentialRampToValueAtTime(0.06, now + 0.004);
        master.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (partId === 'nerve' && (state.tinnitus === 'ringing' || state.tinnitus === 'hiss')) {
        if (state.tinnitus === 'hiss') {
          osc.disconnect();
          const len = Math.round(synthCtx.sampleRate * 0.75);
          const noiseBuf = synthCtx.createBuffer(1, len, synthCtx.sampleRate);
          const chan = noiseBuf.getChannelData(0);
          for (let i = 0; i < len; i += 1) chan[i] = (Math.random() * 2 - 1);
          const noiseSrc = synthCtx.createBufferSource();
          noiseSrc.buffer = noiseBuf;
          const bp = synthCtx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(4800, now);
          bp.Q.setValueAtTime(1.1, now);
          noiseSrc.connect(bp);
          bp.connect(master);
          master.gain.exponentialRampToValueAtTime(0.11, now + 0.04);
          master.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);
          noiseSrc.start(now);
          noiseSrc.stop(now + 0.75);
        } else {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(3400, now);
          const lfo = synthCtx.createOscillator();
          const lfoGain = synthCtx.createGain();
          lfo.frequency.setValueAtTime(0.45, now);
          lfoGain.gain.setValueAtTime(9, now);
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          master.gain.exponentialRampToValueAtTime(0.095, now + 0.045);
          master.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
          lfo.start(now);
          osc.start(now);
          lfo.stop(now + 0.88);
          osc.stop(now + 0.88);
        }
      } else {
        const pitchByPart = { pinna: 520, canal: 660, earplug: 390, vestibular: 740, cochlea: 880, nerve: 1040 };
        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitchByPart[partId] || 660, now);
        master.gain.exponentialRampToValueAtTime(0.045, now + 0.01);
        master.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.18);
      }
    } catch {
      // Ignore Web Audio restrictions cleanly
    }
  }

  // Build architectural callout buttons + SVG leader lines!
  const pinElements = new Map();
  const leaderLines = new Map();
  if (pinsLayer) {
    pinsLayer.replaceChildren();
    if (leadersSvg) leadersSvg.replaceChildren();
    const svgNs = 'http://www.w3.org/2000/svg';

    for (const part of ANATOMY_PARTS) {
      if (leadersSvg) {
        const g = document.createElementNS(svgNs, 'g');
        g.setAttribute('class', 'ear-leader-group');
        const line = document.createElementNS(svgNs, 'line');
        line.setAttribute('class', 'ear-leader-line');
        const dot = document.createElementNS(svgNs, 'circle');
        dot.setAttribute('class', 'ear-leader-dot');
        dot.setAttribute('r', '3.2');
        g.append(line, dot);
        leadersSvg.append(g);
        leaderLines.set(part.id, { g, line, dot });
      }

      const pinBtn = document.createElement('button');
      pinBtn.type = 'button';
      pinBtn.className = 'ear-3d-pin';
      pinBtn.dataset.earPin = part.id;
      pinBtn.style.setProperty('--pin-accent', part.accent);
      pinBtn.setAttribute('aria-label', `${part.index} ${part.title}`);
      const numSpan = document.createElement('span');
      numSpan.className = 'ear-3d-pin-num';
      numSpan.textContent = part.index;
      const labelSpan = document.createElement('span');
      labelSpan.className = 'ear-3d-pin-label';
      labelSpan.textContent = part.shortLabel;
      pinBtn.append(numSpan, labelSpan);
      pinBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        selectEarPart(part.id, { userTouched: true });
      });
      pinBtn.addEventListener('pointerenter', () => {
        state.hoveredPart = part.id;
      });
      pinBtn.addEventListener('pointerleave', () => {
        if (state.hoveredPart === part.id) state.hoveredPart = null;
      });
      pinsLayer.append(pinBtn);
      pinElements.set(part.id, pinBtn);
    }
  }

  function appendAnatomyChatTurn(userPrompt, botReply) {
    if (!aiThreadEl) return;
    const uBub = document.createElement('div');
    uBub.className = 'chat-bubble user ear-ai-turn';
    uBub.textContent = userPrompt;
    const bBub = document.createElement('div');
    bBub.className = 'chat-bubble bot ear-ai-turn';
    bBub.textContent = botReply;

    if (aiLiveReplyEl && aiLiveReplyEl.parentElement === aiThreadEl) {
      aiThreadEl.insertBefore(uBub, aiLiveReplyEl);
      aiThreadEl.insertBefore(bBub, aiLiveReplyEl);
    } else {
      aiThreadEl.append(uBub, bBub);
    }

    const turns = aiThreadEl.querySelectorAll('.ear-ai-turn');
    while (turns.length > 8) {
      turns[0]?.remove();
      turns[1]?.remove();
      break;
    }
    aiThreadEl.scrollTop = aiThreadEl.scrollHeight;
    if (aiScrollEl) aiScrollEl.scrollTop = aiScrollEl.scrollHeight;
  }

  const isMobileViewport = () => Boolean(
    typeof window !== 'undefined'
    && (window.innerWidth <= 920 || ((globalThis.navigator?.maxTouchPoints ?? 0) > 1 && window.innerWidth <= 1024)),
  );

  let unsubLlmStatus = null;
  function ensureLlmSubscription() {
    if (unsubLlmStatus) return;
    const llmClient = getWebLlmClient?.();
    if (typeof llmClient?.subscribe !== 'function') return;
    unsubLlmStatus = llmClient.subscribe((st) => {
      if (aiProgressWrapEl) {
        aiProgressWrapEl.hidden = !st.loading;
      }
      if (st.loading) {
        if (aiProgressEl) aiProgressEl.value = Math.max(0.03, Math.min(1, Number(st.progress) || 0));
        if (aiProgressLabelEl) aiProgressLabelEl.textContent = st.progressText || 'Loading on-device AI…';
        if (aiStatusBadgeEl) aiStatusBadgeEl.textContent = `Loading AI · ${Math.round((Number(st.progress) || 0) * 100)}%`;
      } else if (st.loadedModel) {
        if (aiStatusBadgeEl) aiStatusBadgeEl.textContent = 'AI Ear Guide · Local LLM';
      } else if (aiStatusBadgeEl) {
        aiStatusBadgeEl.textContent = 'AI Ear Guide · Instant';
      }
    });
  }

  function renderStarterChips() {
    if (!aiStartersEl) return;
    const questions = getPartStarterQuestions(state.focusPart, state.tinnitus);
    aiStartersEl.replaceChildren();
    for (const q of questions) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'ear-note-chip';
      chip.textContent = q;
      chip.addEventListener('click', () => {
        void askAiAboutCurrentPart(q, false);
      });
      aiStartersEl.append(chip);
    }
  }

  async function askAiAboutCurrentPart(userQuestion = '', forceModel = false) {
    activeAiAbort?.abort();
    const controller = new AbortController();
    activeAiAbort = controller;

    const normEffect = normaliseAnatomyEffectKey(state.effectKey);
    const partMeta = ANATOMY_PART_BY_ID[normalisePartId(state.focusPart)];
    const llmClient = getWebLlmClient?.();
    ensureLlmSubscription();
    // Avoid 900 MB WebGPU downloads on mobile browsers — use fast, verified physiology deep-dive on mobile!
    const allowLocalModel = Boolean(!isMobileViewport() && llmClient?.isSupported?.() && (forceModel || llmClient?.getLoadedModel?.()));

    if (userQuestion && !allowLocalModel) {
      const instantAnswer = answerEarPartQuestionInstant({
        partId: state.focusPart,
        effectKey: normEffect,
        tinnitus: state.tinnitus,
        question: userQuestion,
      });
      appendAnatomyChatTurn(userQuestion, instantAnswer);
      return;
    }

    if (aiLiveReplyEl) {
      aiLiveReplyEl.hidden = false;
      aiLiveReplyEl.dataset.streaming = 'true';
      aiLiveReplyEl.textContent = allowLocalModel
        ? `Examining ${partMeta.title.toLowerCase()}…`
        : `Analysing ${partMeta.title.toLowerCase()}…`;
    }

    try {
      const res = await generateEarPartAiResponse({
        llmClient: allowLocalModel ? llmClient : null,
        partId: state.focusPart,
        effectKey: normEffect,
        tinnitus: state.tinnitus,
        userQuestion,
        useModel: forceModel || allowLocalModel,
        signal: controller.signal,
        onToken: (partial) => {
          if (activeAiAbort !== controller || !aiLiveReplyEl) return;
          aiLiveReplyEl.hidden = false;
          aiLiveReplyEl.textContent = partial;
          if (aiThreadEl) aiThreadEl.scrollTop = aiThreadEl.scrollHeight;
          if (aiScrollEl) aiScrollEl.scrollTop = aiScrollEl.scrollHeight;
        },
      });
      if (activeAiAbort !== controller || res?.aborted) return;
      if (aiLiveReplyEl) {
        delete aiLiveReplyEl.dataset.streaming;
        if (userQuestion) {
          aiLiveReplyEl.hidden = true;
          appendAnatomyChatTurn(userQuestion, res.text);
        } else {
          aiLiveReplyEl.hidden = false;
          aiLiveReplyEl.textContent = res.text;
          if (aiScrollEl) aiScrollEl.scrollTop = aiScrollEl.scrollHeight;
        }
      }
    } finally {
      if (activeAiAbort === controller) {
        activeAiAbort = null;
        if (aiLiveReplyEl) delete aiLiveReplyEl.dataset.streaming;
      }
    }
  }

  function syncHud({ clearExtraTurns = false, customStrumNote = '' } = {}) {
    const normEffect = normaliseAnatomyEffectKey(state.effectKey);
    const cleanPart = normalisePartId(state.focusPart);
    const legacyInfo = describeEarAnatomyImpact(normEffect, state.tinnitus, cleanPart);
    const aiInfo = getInstantEarPartExplanation(cleanPart, normEffect, state.tinnitus);
    const theme = getEffectTheme(normEffect);

    if (badgeEl) {
      badgeEl.textContent = legacyInfo.badge;
      badgeEl.style.setProperty('--badge-accent', theme.color);
    }

    if (aiPartKickerEl) {
      aiPartKickerEl.textContent = `${aiInfo.partIndex} · ${aiInfo.partRegion}`;
    }
    if (aiPartTitleEl) aiPartTitleEl.textContent = aiInfo.partTitle;
    if (aiPartLatinEl) aiPartLatinEl.textContent = aiInfo.partLatin;
    if (aiReactionPillEl) {
      aiReactionPillEl.textContent = customStrumNote || aiInfo.statusBadge;
      aiReactionPillEl.style.setProperty('--pill-accent', theme.color);
    }

    if (calloutEl) {
      calloutEl.textContent = `${aiInfo.roleSummary}\n\n${aiInfo.reactionText}`;
    }

    if (inspectorEl) {
      inspectorEl.dataset.collapsed = String(state.inspectorCollapsed);
    }
    if (inspectorToggleBtn) {
      inspectorToggleBtn.textContent = state.inspectorCollapsed ? 'Open AI Guide' : 'Minimise';
      inspectorToggleBtn.setAttribute('aria-expanded', String(!state.inspectorCollapsed));
    }

    if (clearExtraTurns && aiThreadEl) {
      for (const el of aiThreadEl.querySelectorAll('.ear-ai-turn')) el.remove();
      if (aiLiveReplyEl) {
        aiLiveReplyEl.hidden = true;
        aiLiveReplyEl.textContent = '';
      }
    }

    if (playAudioBtn) {
      playAudioBtn.setAttribute('aria-pressed', String(state.playing));
      playAudioBtn.textContent = state.playing ? 'Pause music' : 'Play music through ear';
    }

    if (explodeSlider) {
      explodeSlider.value = String(Math.round(state.explodeAmount * 100));
    }
    if (explodeToggleBtn) {
      explodeToggleBtn.setAttribute('aria-pressed', String(state.explodeAmount > 0.1));
    }
    const isPubScene = state.sceneMode === 'pub';
    if (explodeWrap) explodeWrap.hidden = isPubScene;
    if (crowdWrap) crowdWrap.hidden = !isPubScene;
    if (crowdSlider) crowdSlider.value = String(Math.round(Number(state.crowdPercent) || 0));
    if (crowdOut) {
      const pct = Math.round(Number(state.crowdPercent) || 0);
      crowdOut.textContent = pct > 0 ? `${pct}%` : 'Quiet';
    }

    for (const btn of sceneModeBtns) {
      btn.setAttribute('aria-pressed', String(btn.dataset.earScene === state.sceneMode));
    }
    for (const btn of partBtns) {
      const btnPart = normalisePartId(btn.dataset.earPart);
      btn.setAttribute('aria-pressed', String(btnPart === cleanPart));
    }
    for (const [id, pinEl] of pinElements.entries()) {
      pinEl.setAttribute('aria-pressed', String(id === cleanPart));
    }
    for (const [id, leader] of leaderLines.entries()) {
      leader.g.classList.toggle('is-active', id === cleanPart);
    }
    if (earTinnitusWarning) {
      earTinnitusWarning.hidden = state.tinnitus !== 'ringing';
    }
    for (const btn of presetBtns) {
      const targetKey = btn.dataset.earQuickEffect;
      const pressed = targetKey === 'ringing_demo'
        ? state.tinnitus === 'ringing' || state.tinnitus === 'hiss'
        : normaliseAnatomyEffectKey(targetKey) === normEffect && state.tinnitus === 'off';
      btn.setAttribute('aria-pressed', String(pressed));
    }
    if (calmBtn) {
      calmBtn.setAttribute('aria-pressed', String(state.calmMotion));
    }
    if (xrayBtn) {
      xrayBtn.setAttribute('aria-pressed', String(state.xrayMode));
    }
    if (labelsBtn) {
      labelsBtn.setAttribute('aria-pressed', String(state.showLabels));
    }
    if (soundFeedbackBtn) {
      soundFeedbackBtn.setAttribute('aria-pressed', String(state.touchAudio));
    }
    const showOverlayPins = state.showLabels && state.sceneMode !== 'pub';
    if (pinsLayer) pinsLayer.hidden = !showOverlayPins;
    if (leadersSvg) leadersSvg.style.display = showOverlayPins ? 'block' : 'none';

    if (aiDeepDiveBtn) {
      // Keep AI Deep-dive always available (streams WebLLM on supported desktop or rich 3-angle physiology breakdown on mobile!)
      aiDeepDiveBtn.hidden = false;
    }

    renderStarterChips();
  }

  function selectEarPart(partId, { userTouched = false, hitPoint = null, hairMeta = null } = {}) {
    const clean = normalisePartId(partId);
    state.focusPart = clean;
    state.sceneMode = 'anatomy';
    if (userTouched && state.inspectorCollapsed) {
      state.inspectorCollapsed = false;
    }

    let customStrumNote = '';
    if (userTouched && hairMeta) {
      const normEffect = normaliseAnatomyEffectKey(state.effectKey);
      const health = computeHairCellHealth(hairMeta.hairU, normEffect);
      const regionDesc = hairMeta.hairU < 0.2
        ? 'Outer basal turn (shimmer & cymbals)'
        : (hairMeta.hairU < 0.45 ? 'Upper-mid turn (crisp s, f, t consonants)' : 'Deep apical turn (warm bass & beat)');
      const stateWord = health > 0.78 ? 'healthy & responsive' : (normEffect === 'post_gig' ? 'fatigued & muffled' : 'damaged & silent');
      customStrumNote = `Hair bundle #${hairMeta.hairSlot + 1} · ${regionDesc} — ${stateWord}`;
    }

    syncHud({ clearExtraTurns: false, customStrumNote });
    focusCameraCallback?.(clean, hitPoint);

    if (userTouched) {
      playAnatomyTouchSound(clean, hairMeta || {});
      const llmClient = getWebLlmClient?.();
      if (llmClient?.getLoadedModel?.()) {
        void askAiAboutCurrentPart('', false);
      } else if (aiLiveReplyEl) {
        aiLiveReplyEl.hidden = true;
      }
    }
  }

  inspectorToggleBtn?.addEventListener('click', () => {
    state.inspectorCollapsed = !state.inspectorCollapsed;
    syncHud();
  });

  playAudioBtn?.addEventListener('click', () => {
    if (typeof onToggleAudio === 'function') {
      onToggleAudio({ effectKey: state.effectKey, tinnitus: state.tinnitus, currentlyPlaying: state.playing });
    } else {
      onSelectPreset({ effectKey: state.effectKey, tinnitus: state.tinnitus });
    }
  });

  explodeSlider?.addEventListener('input', () => {
    state.explodeAmount = Math.max(0, Math.min(1, (Number(explodeSlider.value) || 0) / 100));
    syncHud();
  });

  explodeToggleBtn?.addEventListener('click', () => {
    state.explodeAmount = state.explodeAmount > 0.2 ? 0 : 0.78;
    if (state.explodeAmount > 0) focusCameraCallback?.('overview', null);
    syncHud();
  });

  for (const btn of sceneModeBtns) {
    btn.addEventListener('click', () => {
      state.sceneMode = btn.dataset.earScene || 'anatomy';
      if (state.sceneMode === 'pub' && (!state.crowdPercent || state.crowdPercent < 10)) {
        state.crowdPercent = 45;
        onCrowdChange?.(45);
      }
      syncHud();
      focusCameraCallback?.(state.sceneMode === 'pub' ? 'pub' : 'overview', null);
    });
  }
  crowdSlider?.addEventListener('input', () => {
    const pct = Math.max(0, Math.min(100, Number(crowdSlider.value) || 0));
    state.crowdPercent = pct;
    syncHud();
    onCrowdChange?.(pct);
  });
  for (const btn of partBtns) {
    btn.addEventListener('click', () => {
      selectEarPart(btn.dataset.earPart || 'cochlea', { userTouched: true });
    });
  }
  for (const btn of presetBtns) {
    btn.addEventListener('click', () => {
      const next = btn.dataset.earQuickEffect || 'original';
      if (next === 'ringing_demo') {
        if (state.tinnitus === 'ringing' || state.tinnitus === 'hiss') {
          state.tinnitus = 'off';
          syncHud({ clearExtraTurns: true });
          onSelectPreset({ effectKey: state.effectKey, tinnitus: 'off' });
          return;
        }
        const activateTinnitus = (chosenSound) => {
          if (normaliseAnatomyEffectKey(state.effectKey) === 'original') {
            state.effectKey = 'post_gig';
          }
          state.tinnitus = chosenSound;
          state.focusPart = 'nerve';
          syncHud({ clearExtraTurns: true });
          focusCameraCallback?.(state.focusPart, null);
          onSelectPreset({ effectKey: state.effectKey, tinnitus: state.tinnitus });
        };
        confirmRingingPlayback({
          onConfirm: () => activateTinnitus('ringing'),
          onUseHiss: () => activateTinnitus('hiss'),
        });
        return;
      }
      state.effectKey = next;
      if (next === 'foam_plugs' || next === 'musician_plugs') {
        state.tinnitus = 'off';
        state.focusPart = 'earplug';
      } else if (next === 'original') {
        state.tinnitus = 'off';
      } else if (next === 'post_gig' || next === 'permanent_notch') {
        state.focusPart = 'cochlea';
      }
      syncHud({ clearExtraTurns: true });
      focusCameraCallback?.(state.focusPart, null);
      onSelectPreset({ effectKey: state.effectKey, tinnitus: state.tinnitus });
    });
  }
  earTinnitusStopBtn?.addEventListener('click', () => {
    state.tinnitus = 'off';
    syncHud();
    onSelectPreset({ effectKey: state.effectKey, tinnitus: 'off' });
  });
  calmBtn?.addEventListener('click', () => {
    state.calmMotion = !state.calmMotion;
    syncHud();
  });
  xrayBtn?.addEventListener('click', () => {
    state.xrayMode = !state.xrayMode;
    syncHud();
  });
  labelsBtn?.addEventListener('click', () => {
    state.showLabels = !state.showLabels;
    syncHud();
  });
  soundFeedbackBtn?.addEventListener('click', () => {
    state.touchAudio = !state.touchAudio;
    syncHud();
  });

  function submitEarQuestion() {
    const q = aiQuestionInput?.value?.trim() || '';
    if (!q) {
      aiQuestionInput?.focus();
      return;
    }
    aiQuestionInput.value = '';
    state.inspectorCollapsed = false;
    void askAiAboutCurrentPart(q, false);
  }
  aiAskBtn?.addEventListener('click', submitEarQuestion);
  aiQuestionInput?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      submitEarQuestion();
    }
  });
  aiDeepDiveBtn?.addEventListener('click', () => {
    state.inspectorCollapsed = false;
    void askAiAboutCurrentPart('', true);
  });

  syncHud();

  let disposed = false;
  let cleanupThree = () => {};

  if (typeof window !== 'undefined' && canvasWrap) {
    void import('./vendor/three.module.min.js')
      .then((THREE) => {
        if (disposed) return;
        let renderer;
        try {
          renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        } catch {
          canvasWrap.dataset.webgl = 'unavailable';
          return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        if ('toneMapping' in renderer && THREE.ACESFilmicToneMapping !== undefined) {
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.06;
        }
        renderer.domElement.className = 'ear-3d-canvas';
        renderer.domElement.setAttribute('aria-label', 'Interactive 3D human ear sculpture');
        canvasWrap.prepend(renderer.domElement);

        const scene = new THREE.Scene();
        let envMap = createStudioEnvironmentTexture(THREE, renderer, getTheme() === 'dark');
        if (envMap) scene.environment = envMap;

        const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 120);

        // Studio lighting (dynamically adapts between sunlit gallery Light Mode and spotlight Dark Mode!)
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe2d9f3, 1.15);
        const keyLight = new THREE.DirectionalLight(0xfffaf2, 1.45);
        keyLight.position.set(4.5, 8.5, 8.0);
        const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.72);
        fillLight.position.set(-7.5, 2.5, 5.5);
        const subsurfaceLight = new THREE.PointLight(0xfda4af, 0.95, 16);
        subsurfaceLight.position.set(-5.8, -0.4, -2.5);
        scene.add(hemiLight, keyLight, fillLight, subsurfaceLight);

        const labFloor = buildSpatialLabFloor(THREE);
        scene.add(labFloor);

        function applyThreeTheme(mode) {
          const dark = mode === 'dark';
          hemiLight.color.setHex(dark ? 0xc7d2fe : 0xffffff);
          hemiLight.groundColor.setHex(dark ? 0x1e1b4b : 0xe2d9f3);
          hemiLight.intensity = dark ? 0.85 : 1.15;
          keyLight.intensity = dark ? 1.65 : 1.45;
          fillLight.color.setHex(dark ? 0x60a5fa : 0xdbeafe);
          fillLight.intensity = dark ? 0.95 : 0.72;
          const nextEnv = createStudioEnvironmentTexture(THREE, renderer, dark);
          if (nextEnv) {
            envMap?.dispose?.();
            envMap = nextEnv;
            scene.environment = envMap;
          }
        }
        applyThreeTheme(getTheme());
        const unsubTheme = onThemeChange(applyThreeTheme);

        const anatomy = buildHumanEarAnatomy(THREE);
        scene.add(anatomy.rootGroup);

        // Sculpted 3D Classical Human Portrait Bust + Stage Speaker + 360° Crowd Soundscape!
        const headScene = buildSpatialHumanHeadScene(THREE);
        const { pubSpaceGroup } = headScene;
        pubSpaceGroup.visible = false;
        scene.add(pubSpaceGroup);

        // Camera framed generously in open space
        const getOverviewTargetX = () => (window.innerWidth > 1080 && !state.inspectorCollapsed ? 0.55 : -0.15);

        const overviewCamera = {
          radius: 9.4,
          theta: 0.08,
          phi: 1.38,
        };

        const currentTarget = new THREE.Vector3(getOverviewTargetX(), 0.08, 0.05);
        const desiredTarget = currentTarget.clone();
        let currentRadius = overviewCamera.radius;
        let desiredRadius = overviewCamera.radius;
        let currentTheta = overviewCamera.theta;
        let desiredTheta = overviewCamera.theta;
        let currentPhi = overviewCamera.phi;
        let desiredPhi = overviewCamera.phi;
        let currentExplode = 0;

        const beaconTargetPos = new THREE.Vector3(...ANATOMY_PART_BY_ID.cochlea.camTarget);
        let userZoomedManually = false;
        const dismissMobileHint = () => {
          if (mobileHintEl && !mobileHintEl.dataset.dismissed) {
            mobileHintEl.dataset.dismissed = 'true';
          }
        };

        focusCameraCallback = (partOrMode, customHitPoint = null) => {
          userZoomedManually = false;
          if (partOrMode === 'pub') {
            const rightBias = window.innerWidth > 1080 && !state.inspectorCollapsed ? 0.45 : 0;
            desiredTarget.set(rightBias, 0.05, 0.15);
            desiredRadius = 6.2;
            desiredTheta = -0.34;
            desiredPhi = 1.34;
            return;
          }
          if (partOrMode === 'overview') {
            desiredTarget.set(getOverviewTargetX(), 0.08, 0.05);
            desiredRadius = overviewCamera.radius + state.explodeAmount * 2.4;
            desiredTheta = overviewCamera.theta;
            desiredPhi = overviewCamera.phi;
            return;
          }
          const meta = ANATOMY_PART_BY_ID[normalisePartId(partOrMode)];
          if (!meta) return;
          const ex = meta.explodeOffset;
          const rightPanelBias = window.innerWidth > 1080 && !state.inspectorCollapsed ? 0.48 : 0;
          desiredTarget.set(
            meta.camTarget[0] + ex[0] * state.explodeAmount + rightPanelBias,
            meta.camTarget[1] + ex[1] * state.explodeAmount,
            meta.camTarget[2] + ex[2] * state.explodeAmount,
          );
          desiredRadius = meta.camSpherical.radius;
          desiredTheta = meta.camSpherical.theta;
          desiredPhi = meta.camSpherical.phi;
          if (customHitPoint) {
            beaconTargetPos.copy(customHitPoint);
          } else {
            beaconTargetPos.set(
              meta.camTarget[0] + ex[0] * state.explodeAmount,
              meta.camTarget[1] + ex[1] * state.explodeAmount,
              meta.camTarget[2] + ex[2] * state.explodeAmount,
            );
          }
        };

        zoomInBtn?.addEventListener('click', () => {
          userZoomedManually = true;
          dismissMobileHint();
          desiredRadius = Math.max(2.5, desiredRadius * 0.8);
        });
        zoomOutBtn?.addEventListener('click', () => {
          userZoomedManually = true;
          dismissMobileHint();
          desiredRadius = Math.min(14.5, desiredRadius * 1.25);
        });
        resetViewBtn?.addEventListener('click', () => {
          userZoomedManually = false;
          state.explodeAmount = 0;
          syncHud();
          focusCameraCallback('overview');
        });

        const raycaster = new THREE.Raycaster();
        const pointerNdc = new THREE.Vector2();
        const activePointers = new Map();
        let lastPinchDist = 0;
        let downPos = { x: 0, y: 0, button: 0 };
        let movedDistance = 0;

        function getIntersectionsAtClientPos(clientX, clientY) {
          const rect = renderer.domElement.getBoundingClientRect();
          if (!rect.width || !rect.height) return [];
          pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
          pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointerNdc, camera);
          const targetGroup = state.sceneMode === 'pub' ? pubSpaceGroup.children : anatomy.rootGroup.children;
          const hits = raycaster.intersectObjects(targetGroup, true);
          return hits.filter((h) => h.object?.visible && h.object?.userData?.anatomyPart);
        }

        const onPointerDown = (e) => {
          dismissMobileHint();
          activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (activePointers.size === 1) {
            downPos = { x: e.clientX, y: e.clientY, button: e.button };
            movedDistance = 0;
          } else if (activePointers.size === 2) {
            userZoomedManually = true;
            const pts = [...activePointers.values()];
            lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          }
          renderer.domElement.setPointerCapture?.(e.pointerId);
        };

        const onPointerMove = (e) => {
          if (activePointers.has(e.pointerId)) {
            const prev = activePointers.get(e.pointerId);
            const dx = e.clientX - prev.x;
            const dy = e.clientY - prev.y;
            activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            movedDistance += Math.hypot(dx, dy);

            if (activePointers.size === 2) {
              const pts = [...activePointers.values()];
              const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
              if (lastPinchDist > 8 && dist > 8) {
                desiredRadius = Math.max(2.5, Math.min(14.5, desiredRadius * (lastPinchDist / dist)));
              }
              lastPinchDist = dist;
              return;
            }

            if (e.shiftKey || downPos.button === 2) {
              const panScale = currentRadius * 0.0016;
              const rightVec = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
              const upVec = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
              desiredTarget.addScaledVector(rightVec, -dx * panScale);
              desiredTarget.addScaledVector(upVec, dy * panScale);
              desiredTarget.x = Math.max(-6.5, Math.min(6.5, desiredTarget.x));
              desiredTarget.y = Math.max(-2.2, Math.min(2.4, desiredTarget.y));
            } else {
              desiredTheta -= dx * 0.0072;
              desiredPhi = Math.max(0.34, Math.min(2.5, desiredPhi - dy * 0.0062));
            }
            if (hoverTooltip) hoverTooltip.hidden = true;
            return;
          }

          // Hover raycasting + live cochlear hair-cell strumming when brushing across the spiral!
          const hits = getIntersectionsAtClientPos(e.clientX, e.clientY);
          if (hits.length > 0) {
            const topHit = hits[0];
            const partId = topHit.object.userData.anatomyPart;
            state.hoveredPart = partId;
            renderer.domElement.style.cursor = 'pointer';

            const hairSlot = topHit.object.userData.hairSlot;
            if (typeof hairSlot === 'number' && anatomy.hairCells[hairSlot]) {
              anatomy.hairCells[hairSlot].userData.rippleBoost = 1.0;
              const nowMs = performance.now();
              if (hairSlot !== lastStrumSlot && nowMs - lastStrumTime > 75 && synthCtx?.state === 'running') {
                lastStrumSlot = hairSlot;
                lastStrumTime = nowMs;
                playAnatomyTouchSound('cochlea', {
                  hairU: topHit.object.userData.hairU,
                  tonotopicHz: topHit.object.userData.tonotopicHz,
                });
              }
            }

            if (hoverTooltip) {
              const meta = ANATOMY_PART_BY_ID[partId];
              const rect = canvasWrap.getBoundingClientRect();
              hoverTooltip.hidden = false;
              hoverTooltip.textContent = typeof hairSlot === 'number'
                ? `${meta.index} · Hair-cell bundle #${hairSlot + 1} — Click to inspect`
                : `${meta.index} · ${meta.title}`;
              hoverTooltip.style.left = `${Math.min(rect.width - 190, Math.max(14, e.clientX - rect.left + 14))}px`;
              hoverTooltip.style.top = `${Math.max(14, e.clientY - rect.top - 32)}px`;
            }
          } else {
            state.hoveredPart = null;
            renderer.domElement.style.cursor = '';
            if (hoverTooltip) hoverTooltip.hidden = true;
          }
        };

        const onPointerUp = (e) => {
          const wasSingleTap = activePointers.size === 1 && movedDistance < 7 && downPos.button === 0;
          activePointers.delete(e.pointerId);
          renderer.domElement.releasePointerCapture?.(e.pointerId);
          if (wasSingleTap) {
            const hits = getIntersectionsAtClientPos(e.clientX, e.clientY);
            if (hits.length > 0) {
              const hit = hits[0];
              if (state.sceneMode === 'pub') {
                const side = hit.object.userData.headSide;
                if (side === 'left' || side === 'right') {
                  state.quieterEar = state.quieterEar === side ? null : side;
                  state.effectKey = state.quieterEar ? 'asymmetric' : state.effectKey;
                }
                const part = hit.object.userData.anatomyPart || 'pinna';
                state.focusPart = normalisePartId(part);
                state.inspectorCollapsed = false;
                syncHud({ clearExtraTurns: false });
                playAnatomyTouchSound(state.focusPart);
                return;
              }
              const hairSlot = hit.object.userData.hairSlot;
              if (typeof hairSlot === 'number' && anatomy.hairCells[hairSlot]) {
                anatomy.hairCells[hairSlot].userData.rippleBoost = 1.4;
              }
              selectEarPart(hit.object.userData.anatomyPart, {
                userTouched: true,
                hitPoint: hit.point,
                hairMeta: typeof hairSlot === 'number'
                  ? {
                      hairSlot,
                      hairU: hit.object.userData.hairU,
                      tonotopicHz: hit.object.userData.tonotopicHz,
                    }
                  : null,
              });
            }
          }
        };

        const onPointerLeave = () => {
          if (activePointers.size === 0) {
            state.hoveredPart = null;
            if (hoverTooltip) hoverTooltip.hidden = true;
          }
        };

        // Only zoom with Ctrl/pinch or when hovered directly inside the middle of the model so normal page scrolling never feels hijacked!
        const onWheel = (e) => {
          if (e.ctrlKey || e.metaKey || state.hoveredPart !== null) {
            e.preventDefault();
            userZoomedManually = true;
            dismissMobileHint();
            const zoomFactor = e.deltaY > 0 ? 1.09 : 0.91;
            desiredRadius = Math.max(2.5, Math.min(14.5, desiredRadius * zoomFactor));
          }
        };

        const onContextMenu = (e) => e.preventDefault();

        renderer.domElement.addEventListener('pointerdown', onPointerDown);
        renderer.domElement.addEventListener('pointermove', onPointerMove);
        renderer.domElement.addEventListener('pointerup', onPointerUp);
        renderer.domElement.addEventListener('pointercancel', onPointerUp);
        renderer.domElement.addEventListener('pointerleave', onPointerLeave);
        renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
        renderer.domElement.addEventListener('contextmenu', onContextMenu);

        let viewWidth = 960;
        let viewHeight = 560;
        let lastAppliedZoomLabel = '';
        function resize() {
          const rect = canvasWrap.getBoundingClientRect();
          viewWidth = Math.max(280, rect.width || 960);
          viewHeight = Math.max(280, rect.height || 560);
          renderer.setSize(viewWidth, viewHeight, false);
          const aspect = viewWidth / viewHeight;
          // Widen vertical FOV on portrait mobile viewports so the full 3D ear & bust fit without horizontal clipping!
          camera.fov = aspect < 1.15 ? Math.min(58, Math.round(38 / Math.pow(Math.max(0.5, aspect), 0.52))) : 38;
          camera.aspect = aspect;
          camera.updateProjectionMatrix();
          if (leadersSvg) {
            leadersSvg.setAttribute('viewBox', `0 0 ${viewWidth} ${viewHeight}`);
          }
        }
        resize();
        const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
        ro?.observe(canvasWrap);

        const baseEmissives = new WeakMap();
        anatomy.rootGroup.traverse((obj) => {
          if (obj.isMesh && obj.material?.emissive) {
            baseEmissives.set(obj.material, {
              hex: obj.material.emissive.getHex(),
              intensity: obj.material.emissiveIntensity ?? 0.1,
            });
          }
        });

        let rafId = 0;
        const clock = new THREE.Clock();
        const tmpColor = new THREE.Color();
        const anchorVec = new THREE.Vector3();
        const labelVec = new THREE.Vector3();
        const waveTangent = new THREE.Vector3();
        const upAxis = new THREE.Vector3(0, 0, 1);

        function animate() {
          if (disposed) return;
          const t = clock.getElapsedTime();
          const motionScale = state.calmMotion ? 0.08 : 1;
          const normKey = normaliseAnatomyEffectKey(state.effectKey);
          const impact = ANATOMY_IMPACT_GUIDES[normKey] ?? ANATOMY_IMPACT_GUIDES.original;

          const showAnatomy = state.sceneMode !== 'pub';
          anatomy.rootGroup.visible = showAnatomy;
          pubSpaceGroup.visible = !showAnatomy;

          // Smooth Exploded-View Separation along the anatomical pathway!
          currentExplode += (state.explodeAmount - currentExplode) * 0.1;
          for (const part of ANATOMY_PARTS) {
            const grp = anatomy.partGroups[part.id];
            const baseP = anatomy.partBasePositions[part.id];
            if (grp && baseP) {
              grp.position.set(
                baseP.x + part.explodeOffset[0] * currentExplode,
                baseP.y + part.explodeOffset[1] * currentExplode,
                baseP.z + part.explodeOffset[2] * currentExplode,
              );
            }
          }
          // Subtle idle breathing drift when calmMotion is off and user isn't dragging
          if (activePointers.size === 0 && !state.calmMotion) {
            anatomy.rootGroup.position.y = Math.sin(t * 0.9) * 0.045;
          }

          if (!showAnatomy && activePointers.size === 0) {
            // Keep camera smoothly looking at the sculpted 3D human bust while allowing full 360° orbit!
            const rightBias = window.innerWidth > 1080 && !state.inspectorCollapsed ? 0.45 : 0;
            desiredTarget.x += (rightBias - desiredTarget.x) * 0.04;
          }
          currentTarget.lerp(desiredTarget, 0.085);
          currentRadius += (desiredRadius - currentRadius) * 0.09;
          currentTheta += (desiredTheta - currentTheta) * 0.09;
          currentPhi += (desiredPhi - currentPhi) * 0.09;

          const sinPhi = Math.sin(currentPhi);
          camera.position.set(
            currentTarget.x + currentRadius * sinPhi * Math.sin(currentTheta),
            currentTarget.y + currentRadius * Math.cos(currentPhi),
            currentTarget.z + currentRadius * sinPhi * Math.cos(currentTheta),
          );
          camera.lookAt(currentTarget);
          camera.updateMatrixWorld();

          // Live Zoom-Reactive Text, Header Compaction, & Proximity Part Detection!
          const baselineR = showAnatomy ? overviewCamera.radius : 6.2;
          const zoomMetrics = computeZoomUiMetrics(currentRadius, baselineR);
          if (canvasWrap.dataset.zoomState !== zoomMetrics.zoomState) {
            canvasWrap.dataset.zoomState = zoomMetrics.zoomState;
          }
          if (stageEl.dataset.zoomState !== zoomMetrics.zoomState) {
            stageEl.dataset.zoomState = zoomMetrics.zoomState;
          }
          canvasWrap.style.setProperty('--ear-pin-scale', String(zoomMetrics.basePinScale));

          const activePartId = normalisePartId(state.focusPart);
          const activePartMeta = ANATOMY_PART_BY_ID[activePartId];
          const zoomText = showAnatomy
            ? (zoomMetrics.zoomState === 'close'
                ? `${zoomMetrics.zoomRatio.toFixed(1)}× Close-up · ${activePartMeta?.shortLabel || 'Ear'}`
                : zoomMetrics.zoomState === 'wide'
                  ? `${zoomMetrics.zoomRatio.toFixed(1)}× Wide view`
                  : `${zoomMetrics.zoomRatio.toFixed(1)}× Overview`)
            : `${zoomMetrics.zoomRatio.toFixed(1)}× Spatial view`;
          if (zoomIndicatorEl && zoomText !== lastAppliedZoomLabel) {
            lastAppliedZoomLabel = zoomText;
            zoomIndicatorEl.textContent = zoomText;
          }

          const pulse = state.playing ? 1 : 0.45;
          const bassAmp = (0.24 + state.bassEnergy * 0.85) * pulse;
          const trebleAmp = (0.22 + state.trebleEnergy * 0.85) * pulse;

          if (showAnatomy) {
            for (const mat of anatomy.xrayMaterials) {
              const baseOp = mat.userData?.baseOpacity ?? 0.4;
              const targetOp = state.xrayMode ? Math.min(0.1, baseOp * 0.22) : baseOp;
              mat.opacity += (targetOp - mat.opacity) * 0.12;
            }

            const activePart = normalisePartId(state.focusPart);
            for (const part of ANATOMY_PARTS) {
              const isSelected = part.id === activePart;
              const isHovered = part.id === state.hoveredPart;
              const meshes = anatomy.highlightMeshesByPart[part.id] || [];
              for (const m of meshes) {
                if (!m?.material?.emissive) continue;
                const saved = baseEmissives.get(m.material);
                if (!saved) continue;
                if (isHovered || isSelected) {
                  m.material.emissive.set(part.accent);
                  m.material.emissiveIntensity = isHovered ? 0.42 : (0.22 + 0.08 * Math.sin(t * 3.2));
                } else {
                  m.material.emissive.setHex(saved.hex);
                  m.material.emissiveIntensity = saved.intensity;
                }
              }
            }

            anatomy.touchBeacon.position.lerp(beaconTargetPos, 0.14);
            anatomy.beaconHalo.lookAt(camera.position);
            const activeMeta = ANATOMY_PART_BY_ID[activePart];
            if (activeMeta) {
              anatomy.beaconInner.material.color.set(activeMeta.accent);
              anatomy.beaconHalo.material.color.set(activeMeta.accent);
            }
            const beaconScale = 1 + 0.2 * Math.sin(t * 3.8);
            anatomy.beaconHalo.scale.setScalar(beaconScale);
            anatomy.beaconHalo.material.opacity = 0.65 - 0.2 * Math.sin(t * 3.8);

            // Earplugs inside canal
            const wantFoam = impact.plugMode === 'foam';
            const wantMusician = impact.plugMode === 'musician';
            anatomy.foamPlugGroup.visible = wantFoam || anatomy.foamPlugGroup.position.x > -5.6;
            anatomy.musicianPlugGroup.visible = wantMusician || anatomy.musicianPlugGroup.position.x > -5.6;
            anatomy.plugSlotRing.material.opacity = (wantFoam || wantMusician) ? 0.06 : 0.3;

            const foamTargetX = wantFoam ? -2.92 : -6.2;
            const musTargetX = wantMusician ? -2.92 : -6.2;
            anatomy.foamPlugGroup.position.x += (foamTargetX - anatomy.foamPlugGroup.position.x) * 0.12;
            anatomy.musicianPlugGroup.position.x += (musTargetX - anatomy.musicianPlugGroup.position.x) * 0.12;
            if (wantFoam) {
              const expand = 1 + 0.045 * Math.sin(t * 2.5 * motionScale);
              anatomy.foamPlugGroup.scale.set(1, expand, expand);
            }

            // Canal acoustic waves (shifted with canal's exploded offset)
            const canalShiftX = ANATOMY_PART_BY_ID.canal.explodeOffset[0] * currentExplode;
            anatomy.waveRings.forEach((ring) => {
              const u = (ring.userData.phase + t * 0.44 * motionScale) % 1;
              const pos = anatomy.canalCurve.getPointAt(u);
              anatomy.canalCurve.getTangentAt(u, waveTangent);
              ring.position.set(pos.x + canalShiftX, pos.y, pos.z);
              ring.quaternion.setFromUnitVectors(upAxis, waveTangent);

              const pastPlug = pos.x > -2.85;
              let scale = 0.85 + 0.25 * Math.sin(t * 6 * motionScale + ring.userData.phase * 6.2);
              let alpha = Math.sin(u * Math.PI) * 0.72;
              if (ring.userData.isTreble) {
                ring.material.color.setHex(0x2563eb);
                if (wantFoam && pastPlug) {
                  alpha *= 0.05;
                  scale *= 0.32;
                } else if (wantMusician && pastPlug) {
                  alpha *= 0.55;
                  scale *= 0.68;
                }
              } else {
                ring.material.color.setHex(0x059669);
                if (wantFoam && pastPlug) {
                  alpha *= 0.84;
                } else if (wantMusician && pastPlug) {
                  alpha *= 0.55;
                  scale *= 0.68;
                }
              }
              ring.scale.setScalar(Math.max(0.14, scale));
              ring.material.opacity = Math.max(0, alpha);
            });

            // Conical Eardrum & Articulated Ossicles
            const plugAtten = wantMusician ? 0.52 : (wantFoam ? 0.74 : 1);
            const drumExcursion = Math.sin(t * 14 * motionScale) * 0.065 * bassAmp * plugAtten;
            const drumBaseX = anatomy.partBasePositions.eardrum.x + ANATOMY_PART_BY_ID.eardrum.explodeOffset[0] * currentExplode;
            anatomy.eardrumGroup.position.x = drumBaseX + drumExcursion;
            anatomy.ossicleChain.rotation.z = -drumExcursion * 1.15;
            anatomy.stapesGroup.position.x = 0.38 + drumExcursion * 0.65;

            // 48 Tonotopic Hair-Cell Stereocilia Bundles + Strum Ripple!
            anatomy.hairCells.forEach((bundle) => {
              const u = bundle.userData.u;
              const health = computeHairCellHealth(u, normKey);
              bundle.userData.rippleBoost *= 0.88;

              if (health > 0.78) {
                tmpColor.setHSL(0.45 + (1 - u) * 0.09, 0.82, wantFoam && u < 0.55 ? 0.34 : 0.46);
              } else if (normKey === 'post_gig') {
                tmpColor.setHex(0xd97706);
              } else {
                tmpColor.setHex(0xdc2626);
              }

              const mat = bundle.userData.material;
              mat.color.copy(tmpColor);
              mat.emissive.copy(tmpColor).multiplyScalar(health > 0.4 ? 0.45 + bundle.userData.rippleBoost * 0.5 : 0.15);

              const localEnergy = u > 0.55 ? bassAmp : trebleAmp * (wantFoam ? 0.15 : 1);
              const dance = Math.abs(Math.sin(t * (7 + (1 - u) * 9) * motionScale + u * 14)) * 0.46 * localEnergy * health;
              const strumLift = bundle.userData.rippleBoost * 0.65 * Math.max(0.2, health);
              bundle.scale.set(1, Math.max(0.16, health * (wantMusician ? 0.82 : 1) + dance + strumLift), 1);

              bundle.quaternion.copy(bundle.userData.baseQuat);
              if (health < 0.76) {
                bundle.rotateZ((1 - health) * 1.12);
              }
            });

            // Cochlear Nerve Pulses
            const hasTin = state.tinnitus === 'ringing' || state.tinnitus === 'hiss';
            anatomy.nerveSparks.forEach((spark, idx) => {
              const speed = hasTin ? 0.88 : 0.36 * pulse;
              const u = (spark.userData.offset + t * speed * Math.max(0.25, motionScale)) % 1;
              spark.position.copy(anatomy.cochlearNerveCurve.getPointAt(u));
              if (hasTin && idx % 2 === 0) {
                spark.position.y += Math.sin(t * 19 * motionScale + idx) * 0.085;
                spark.material.color.setHex(state.tinnitus === 'ringing' ? 0xd97706 : 0x7c3aed);
                spark.material.opacity = 0.95;
                spark.scale.setScalar(1.25);
              } else {
                spark.material.color.setHex(0x0284c7);
                spark.material.opacity = (normKey === 'severe_hf' && idx % 3 !== 0) ? 0.12 : 0.52 * pulse;
                spark.scale.setScalar(0.75);
              }
            });

            // Project Zoom-Reactive Architectural SVG Leader Lines + HUD Obstacle-Aware Anti-Overlapping Callout Tags!
            if (pinsLayer && state.showLabels) {
              const isDesktopOverlay = window.innerWidth > 1080;
              const wrapRect = canvasWrap.getBoundingClientRect();
              const obstacles = [];
              if (isDesktopOverlay && wrapRect.width > 0 && wrapRect.height > 0) {
                for (const hudEl of [heroEditorialEl, topToolsEl, inspectorEl, dockEl]) {
                  if (!hudEl || hudEl.hidden) continue;
                  const r = hudEl.getBoundingClientRect();
                  if (!r.width || !r.height) continue;
                  const left = r.left - wrapRect.left;
                  const top = r.top - wrapRect.top;
                  const right = r.right - wrapRect.left;
                  const bottom = r.bottom - wrapRect.top;
                  if (right > 0 && left < viewWidth && bottom > 0 && top < viewHeight) {
                    obstacles.push({ left, top, right, bottom });
                  }
                }
              }

              const inspectorW = (isDesktopOverlay && inspectorEl && !state.inspectorCollapsed)
                ? (inspectorEl.offsetWidth || 360) + 28
                : 0;
              const dockH = (isDesktopOverlay && dockEl) ? (dockEl.offsetHeight || 110) + 22 : 20;
              const minX = isDesktopOverlay ? 58 : 42;
              const maxX = Math.max(minX + 80, viewWidth - inspectorW - (isDesktopOverlay ? 44 : 42));
              const minY = isDesktopOverlay
                ? (zoomMetrics.zoomState === 'close' ? 28 : 34)
                : 22;
              const maxY = Math.max(minY + 60, viewHeight - dockH);

              const rawCandidates = [];
              let closestCentrePart = null;
              let closestCentreDist = Infinity;
              const centreX = (minX + maxX) * 0.5;
              const centreY = (minY + maxY) * 0.5;

              for (const part of ANATOMY_PARTS) {
                const ex = part.explodeOffset;
                const wx = part.pinAnchor[0] + ex[0] * currentExplode;
                const wy = part.pinAnchor[1] + ex[1] * currentExplode + anatomy.rootGroup.position.y;
                const wz = part.pinAnchor[2] + ex[2] * currentExplode;

                anchorVec.set(wx, wy, wz).project(camera);

                // Scale label offset radially with zoom so labels fan out when zoomed out & tuck close when zoomed in!
                const offDx = (part.pinLabelOffset[0] - part.pinAnchor[0]) * zoomMetrics.radialSpread;
                const offDy = (part.pinLabelOffset[1] - part.pinAnchor[1]) * zoomMetrics.radialSpread;
                const offDz = (part.pinLabelOffset[2] - part.pinAnchor[2]) * zoomMetrics.radialSpread;

                labelVec.set(
                  wx + offDx + ex[0] * currentExplode * 0.05,
                  wy + offDy,
                  wz + offDz,
                ).project(camera);

                const inFront = anchorVec.z < 1 && anchorVec.z > -1 && labelVec.z < 1 && labelVec.z > -1;
                const ax = (anchorVec.x * 0.5 + 0.5) * viewWidth;
                const ay = (-anchorVec.y * 0.5 + 0.5) * viewHeight;
                const rawLx = (labelVec.x * 0.5 + 0.5) * viewWidth;
                const rawLy = (-labelVec.y * 0.5 + 0.5) * viewHeight;

                if (inFront) {
                  const screenDist = Math.hypot(ax - centreX, ay - centreY);
                  if (screenDist < closestCentreDist) {
                    closestCentreDist = screenDist;
                    closestCentrePart = part.id;
                  }
                }

                rawCandidates.push({
                  id: part.id,
                  inFront,
                  ax,
                  ay,
                  rawLx,
                  rawLy,
                  active: part.id === activePart || part.id === state.hoveredPart,
                });
              }

              // If user manually zoomed close into a structure near viewport centre, sync AI focus automatically!
              if (
                userZoomedManually
                && zoomMetrics.zoomRatio >= 1.55
                && closestCentrePart
                && closestCentreDist < Math.min(viewWidth, viewHeight) * 0.28
                && closestCentrePart !== activePart
              ) {
                state.focusPart = closestCentrePart;
                syncHud({ clearExtraTurns: false });
              }

              const solvedPins = resolveNonOverlappingPins(rawCandidates, {
                minX,
                maxX,
                minY,
                maxY,
                minGapY: isDesktopOverlay ? 30 : 25,
                collideWidth: isDesktopOverlay ? 118 : 94,
                zoomState: zoomMetrics.zoomState,
                obstacles,
              });

              for (const p of solvedPins) {
                const pinEl = pinElements.get(p.id);
                const leader = leaderLines.get(p.id);
                if (!pinEl) continue;

                const scaleVal = p.active
                  ? Math.min(1.16, zoomMetrics.basePinScale * 1.08)
                  : zoomMetrics.basePinScale;

                pinEl.style.opacity = p.visible ? '1' : '0';
                pinEl.style.pointerEvents = p.visible ? 'auto' : 'none';
                pinEl.style.transform = `translate(${p.lx.toFixed(1)}px, ${p.ly.toFixed(1)}px) translate(-50%, -50%) scale(${scaleVal.toFixed(3)})`;

                if (leader) {
                  leader.g.style.opacity = p.visible ? '1' : '0';
                  leader.line.setAttribute('x1', p.ax.toFixed(1));
                  leader.line.setAttribute('y1', p.ay.toFixed(1));
                  leader.line.setAttribute('x2', p.lx.toFixed(1));
                  leader.line.setAttribute('y2', p.ly.toFixed(1));
                  leader.dot.setAttribute('cx', p.ax.toFixed(1));
                  leader.dot.setAttribute('cy', p.ay.toFixed(1));
                }
              }
            }
          } else {
            // Sculpted 3D Human Portrait Bust + Stage Wavefronts + 360° Bar Chatter!
            const wantFoam = impact.plugMode === 'foam';
            const wantMusician = impact.plugMode === 'musician';
            headScene.leftMiniPlug.visible = wantFoam || wantMusician;
            headScene.rightMiniPlug.visible = wantFoam || wantMusician;
            headScene.leftMiniPlugMat.color.setHex(wantFoam ? 0xeab308 : 0x14b8a6);

            const leftDim = state.quieterEar === 'left' ? 0.32 : 1;
            const rightDim = (state.quieterEar === 'right' || (normKey === 'asymmetric' && state.quieterEar !== 'left')) ? 0.32 : 1;
            headScene.leftEarHalo.scale.setScalar((0.92 + bassAmp * 0.28) * leftDim);
            headScene.rightEarHalo.scale.setScalar((0.92 + bassAmp * 0.28) * rightDim);
            headScene.leftEarHalo.material.color.setHex(leftDim < 0.5 ? 0xdc2626 : (wantMusician ? 0x0d9488 : 0x059669));
            headScene.rightEarHalo.material.color.setHex(rightDim < 0.5 ? 0xdc2626 : (wantMusician ? 0x0d9488 : 0x059669));

            // Directional stage wavefront arcs sweeping from Front Speaker (z = +3.0) to Listener Bust (z = 0)
            headScene.musicWaveArcs.forEach((arc) => {
              const prog = (arc.userData.phase + t * 0.42 * motionScale) % 1;
              const zPos = 2.95 - prog * 3.15;
              const spread = 0.65 + prog * 1.45;
              arc.position.set(0, 0.14, zPos);
              arc.scale.set(spread, spread, 1);

              const isHigh = arc.userData.isHigh;
              const muffled = isHigh && (normKey === 'post_gig' || normKey === 'permanent_notch' || normKey === 'severe_hf' || wantFoam);
              const nearHead = zPos < 0.85;
              let alpha = Math.sin(prog * Math.PI) * 0.72;
              if (muffled && nearHead) alpha *= 0.14;
              else if (wantMusician && nearHead) alpha *= 0.55;
              arc.material.opacity = Math.max(0, alpha);
              arc.material.color.setHex(muffled && nearHead ? 0x94a3b8 : (isHigh ? 0x2563eb : 0x059669));
            });

            // 360° Bar Crowd Voice Rings closing in around the head
            const crowdRatio = Math.max(0.15, Math.min(1, (Number(state.crowdPercent) || 45) / 100));
            headScene.chatterOrbs.forEach((cRing, idx) => {
              const s = cRing.userData.seed;
              const ang = s + t * (0.28 + (idx % 3) * 0.08) * motionScale;
              const rad = 1.45 + (1 - crowdRatio) * 1.35 + Math.sin(t * 1.8 + s) * 0.16;
              const yOff = 0.05 + Math.sin(s * 2 + t * 1.2 * motionScale) * 0.55;
              cRing.position.set(Math.cos(ang) * rad, yOff, Math.sin(ang) * rad);
              cRing.lookAt(0, 0.1, 0);
              const ripple = 0.85 + 0.35 * Math.sin(t * 5 * motionScale + idx);
              cRing.scale.setScalar(ripple);
              cRing.material.opacity = crowdRatio * 0.68;
            });
          }

          renderer.render(scene, camera);
          rafId = requestAnimationFrame(animate);
        }
        rafId = requestAnimationFrame(animate);

        cleanupThree = () => {
          cancelAnimationFrame(rafId);
          unsubTheme?.();
          unsubLlmStatus?.();
          ro?.disconnect();
          envMap?.dispose?.();
          renderer.domElement.removeEventListener('pointerdown', onPointerDown);
          renderer.domElement.removeEventListener('pointermove', onPointerMove);
          renderer.domElement.removeEventListener('pointerup', onPointerUp);
          renderer.domElement.removeEventListener('pointercancel', onPointerUp);
          renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
          renderer.domElement.removeEventListener('wheel', onWheel);
          renderer.domElement.removeEventListener('contextmenu', onContextMenu);
          renderer.dispose();
        };
      })
      .catch(() => {
        if (canvasWrap) canvasWrap.dataset.webgl = 'unavailable';
      });
  }

  return {
    setState(patch = {}) {
      const prevKey = `${normaliseAnatomyEffectKey(state.effectKey)}|${state.tinnitus}|${normalisePartId(state.focusPart)}`;
      state = { ...state, ...patch };
      const nextKey = `${normaliseAnatomyEffectKey(state.effectKey)}|${state.tinnitus}|${normalisePartId(state.focusPart)}`;
      syncHud({ clearExtraTurns: false });
      if (patch.focusPart && prevKey !== nextKey) {
        focusCameraCallback?.(state.focusPart, null);
      }
    },
    setAudioEnergy({ bass = 0.28, treble = 0.32, playing = true } = {}) {
      state.bassEnergy = Math.max(0, Math.min(1, bass));
      state.trebleEnergy = Math.max(0, Math.min(1, treble));
      state.playing = Boolean(playing);
    },
    getState: () => ({ ...state }),
    dispose() {
      disposed = true;
      activeAiAbort?.abort();
      cleanupThree();
    },
  };
}
