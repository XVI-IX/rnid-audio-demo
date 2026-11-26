// Audiology-grounded educational context for Listen and Studio views.
// Explains the three cochlear mechanisms modelled by Cambridge MSBG, dynamic listening cues
// across all five profiles + tinnitus, and practical RNID-aligned harm reduction.

export const MSBG_MECHANISMS = [
  {
    id: 'threshold',
    title: '1. Threshold loss',
    summary: 'Quiet high-frequency details drop below audibility and vanish completely rather than playing softly.',
    detail: 'Cymbal shimmer, room air, breath, and soft consonants simply disappear once they fall below the elevated threshold.',
  },
  {
    id: 'recruitment',
    title: '2. Loudness recruitment',
    summary: 'Soft sounds vanish, yet loud bass and drums still hit at nearly full strength.',
    detail: 'Healthy outer hair cells amplify quiet sounds by up to 50 dB while leaving loud sounds alone. When damaged, subtle detail disappears while loud peaks suddenly jump out.',
  },
  {
    id: 'smearing',
    title: '3. Frequency smearing',
    summary: 'Damaged cochlear filters widen, blurring neighbouring instruments and speech sounds together.',
    detail: 'Even if you turn the volume up, widened auditory filters cannot cleanly separate vocals from guitars or pub background noise.',
  },
];

export const FILTER_LANDMARKS = [
  {
    band: '<250 Hz',
    minHz: 25,
    maxHz: 250,
    title: 'Bass & rhythm',
    detail: 'Kick drum, bassline & vocal warmth — usually preserved longest after noise exposure.',
  },
  {
    band: '250 Hz–2 kHz',
    minHz: 250,
    maxHz: 2000,
    title: 'Vowels & melody',
    detail: 'Core vocal energy, chords & snare body — lets you hear that someone is speaking.',
  },
  {
    band: '2–6 kHz',
    minHz: 2000,
    maxHz: 6000,
    title: 'Speech consonants & attack',
    detail: 'Crisp s, f, th, k consonants & percussion snap — home of the 4 kHz noise notch.',
  },
  {
    band: '>6 kHz',
    minHz: 6000,
    maxHz: 16000,
    title: 'Cymbal air & sparkle',
    detail: 'Hi-hat sizzle, acoustic detail & stereo space — the first detail to dull.',
  },
];

export const STUDIO_GUIDES = {
  reference: {
    heading: 'Original (unfiltered reference)',
    badge: 'Healthy cochlear baseline',
    inMusic: 'Full high-frequency air, crisp hi-hat transients, wide dynamic contrast between ghost notes and loud hits, and clear separation between overlapping instruments.',
    inLife: 'Consonants like s, f, th and k cut cleanly through café or pub chatter, so you catch words effortlessly without watching lips.',
    inEar: 'Intact outer hair cells sharpen cochlear tuning and amplify quiet details, while healthy auditory nerve synapses track fast timing cues.',
  },
  post_gig_muffled_v1: {
    heading: 'Post-gig muffled (temporary threshold shift)',
    badge: 'Temporary warning sign · 3–6 kHz dip',
    inMusic: 'Hi-hats, cymbal tails and vocal breath sound slightly veiled (20–25 dB dip around 4 kHz), while kick drum and bassline hit at full power.',
    inLife: 'Walking out of a gig, friends’ voices sound cotton-wool muffled and street sounds lose their sharp edge for several hours or the next morning.',
    inEar: 'Temporary fatigue of outer hair cells and glutamate synapses in the 3–6 kHz region — a biological warning sign that repeated unguarded exposure turns into permanent loss and hidden synaptopathy.',
  },
  nihl_demo_v1: {
    heading: 'Permanent noise-induced loss (4 kHz notch)',
    badge: 'Cumulative permanent damage · 30–35 dB notch',
    inMusic: 'Snare snap, guitar pick attack and bright synth harmonics recede noticeably across 3–6 kHz, yet bass and midrange loudness feel almost normal (loudness recruitment).',
    inLife: 'In a busy restaurant or bar, vowels come through at normal volume so you know someone spoke, but consonants like s, f, th and k vanish into the crowd noise.',
    inEar: 'Cumulative, irreversible loss of outer hair cells centred near 4 kHz (where ear-canal resonance concentrates sound energy by 10–15 dB), widening cochlear filters permanently.',
  },
  high_frequency_demo_v1: {
    heading: 'Less treble (steep high-frequency loss)',
    badge: 'Steep sloping loss above 2 kHz',
    inMusic: 'Cymbals, bells and upper harmonics vanish almost completely above 3 kHz (55–75 dB HL thresholds), leaving a warm but indistinct low-mid mix with smeared detail.',
    inLife: 'High-pitched alarms, birdsong and children’s voices drop out; group conversations become exhausting because blurred frequency filters cannot separate competing speakers.',
    inEar: 'Extensive outer and inner hair-cell loss at the basal (high-frequency) end of the cochlea, combining severe high-frequency threshold elevation, strong recruitment and broad spectral smearing.',
  },
  broadband_demo_v1: {
    heading: 'Quieter (moderate broadband loss)',
    badge: 'Bilateral loss across 250 Hz–8 kHz',
    inMusic: 'Both bass weight and treble detail drop back (27–47 dB HL across all bands); quiet musical passages disappear quickly while loud peaks still punch through via recruitment.',
    inLife: 'Everyday conversation requires higher volume or closer distance even in quiet rooms, and background noise rapidly overwhelms speech clarity.',
    inEar: 'Widespread cochlear sensitivity loss across low, mid and high frequencies, engaging wider auditory filters and compressed loudness growth across the whole spectrum.',
  },
  asymmetric_demo_v1: {
    heading: 'Right ear quieter (asymmetric loss)',
    badge: 'Left near-normal · Right moderate-severe',
    inMusic: 'On stereo headphones, the image pulls left: bright percussion and midrange presence stay clear in the left ear while the right ear sounds recessed and duller.',
    inLife: 'Telling where a car or voice is coming from becomes difficult, and someone speaking on your right side in a noisy room is much harder to follow ("head-shadow" effect).',
    inEar: 'Uneven cochlear damage between ears — seen, for example, in musicians standing consistently beside a snare, cymbal stack or monitor wedge on one side.',
  },
};

export const TINNITUS_NOTES = {
  off: '',
  ringing: 'Tonal tinnitus active (~3.4 kHz): When cochlear input drops around 3–6 kHz, central auditory pathways turn up internal neural gain, creating a steady high ring that stands out sharpest in quiet gaps and fade-outs.',
  hiss: 'Narrowband hiss active (2.7–9 kHz): Reduced high-frequency nerve input can trigger spontaneous central auditory activity perceived as a high, airy hiss — masked during loud bars, unmistakable when the music stops.',
};

export const HOME_VIDEO_GUIDES = {
  original: {
    title: 'Original mix',
    summary: 'Crisp bells, fast percussion edges and open high-frequency space sit naturally above the bassline.',
    everyday: 'Healthy cochlear tuning keeps quiet high notes clear without needing extra volume.',
  },
  muffled: {
    title: 'Post-gig muffled (temporary shift)',
    summary: 'The bell strikes and bright percussion sound softer. The bassline stays easier to hear.',
    everyday: 'Your ears are signalling temporary hair-cell and synapse overload — repeated shifts build permanent damage.',
  },
  stronger: {
    title: 'Strong treble loss',
    summary: 'Steep high-frequency loss removes bright bells and hi-hat air completely, blurring instruments together.',
    everyday: 'In everyday life, speech consonants (s, f, th, k) vanish in noisy rooms even when voices still sound loud enough.',
  },
  left: {
    title: 'Left ear quieter',
    summary: 'With stereo headphones, the music shifts to the right as percussion and other bright sounds become quieter in the left ear.',
    everyday: 'Uneven hearing can make it harder to tell where sounds come from or follow someone speaking on your left in a noisy room.',
  },
  right: {
    title: 'Right ear quieter',
    summary: 'With stereo headphones, the music shifts to the left as percussion and other bright sounds become quieter in the right ear.',
    everyday: 'Uneven hearing can make it harder to tell where sounds come from or follow someone speaking on your right in a noisy room.',
  },
};

export function getStudioGuide(track, profileId, tinnitus = 'off') {
  const key = track === 'reference' ? 'reference' : (STUDIO_GUIDES[profileId] ? profileId : 'high_frequency_demo_v1');
  const guide = STUDIO_GUIDES[key];
  const tinnitusNote = TINNITUS_NOTES[tinnitus] ?? '';
  return { ...guide, profileKey: key, tinnitusNote };
}

export function getHomeVideoGuide(hearing = 'original', tinnitus = 'off') {
  const base = HOME_VIDEO_GUIDES[hearing] ?? HOME_VIDEO_GUIDES.original;
  const tinnitusNote = TINNITUS_NOTES[tinnitus] ?? '';
  return { ...base, hearing, tinnitus, tinnitusNote };
}

export function connectHomeHearingGuide(root = document) {
  const container = root.querySelector('#home-hearing-guide');
  if (!container) return () => {};

  const titleEl = container.querySelector('[data-guide-title]');
  const summaryEl = container.querySelector('[data-guide-summary]');
  const everydayEl = container.querySelector('[data-guide-everyday]');
  const tinnitusEl = container.querySelector('[data-guide-tinnitus]');

  return ({ hearing, tinnitus }) => {
    const info = getHomeVideoGuide(hearing, tinnitus);
    if (titleEl) titleEl.textContent = info.title;
    if (summaryEl) summaryEl.textContent = info.summary;
    if (everydayEl) everydayEl.textContent = info.everyday;
    if (tinnitusEl) {
      tinnitusEl.textContent = info.tinnitusNote;
      tinnitusEl.hidden = !info.tinnitusNote;
    }
  };
}

export function connectStudioHearingGuide(root = document) {
  const panel = root.querySelector('#studio-hearing-guide');
  if (!panel) return () => {};

  const headingEl = panel.querySelector('[data-studio-guide-heading]');
  const badgeEl = panel.querySelector('[data-studio-guide-badge]');
  const musicEl = panel.querySelector('[data-studio-guide-music]');
  const lifeEl = panel.querySelector('[data-studio-guide-life]');
  const earEl = panel.querySelector('[data-studio-guide-ear]');
  const tinnitusEl = panel.querySelector('[data-studio-guide-tinnitus]');

  return ({ track = 'reference', profileId = 'high_frequency_demo_v1', tinnitus = 'off' } = {}) => {
    const guide = getStudioGuide(track, profileId, tinnitus);
    if (headingEl) headingEl.textContent = guide.heading;
    if (badgeEl) badgeEl.textContent = guide.badge;
    if (musicEl) musicEl.textContent = guide.inMusic;
    if (lifeEl) lifeEl.textContent = guide.inLife;
    if (earEl) earEl.textContent = guide.inEar;
    if (tinnitusEl) {
      tinnitusEl.textContent = guide.tinnitusNote;
      tinnitusEl.hidden = !guide.tinnitusNote;
    }
  };
}
