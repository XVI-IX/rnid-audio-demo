// Editorial 4-Act Night Out Chapter Strip
// Connects the 3D Ear Hero, Busy Bar Explorer, Studio, and Your Audio into one seamless story.

export const STORY_CHAPTERS = Object.freeze([
  {
    id: 'gig',
    step: '01 · 10:30 pm',
    title: 'At the gig',
    blurb: 'Compare bare ears and earplugs inside the 3D ear.',
    targetView: 'listen',
    scrollSelector: '#ear-3d-stage',
    earEffect: 'musician_plugs',
    earPart: 'earplug',
    earScene: 'anatomy',
    tinnitus: 'off',
    bandPreset: 'musician_plugs',
    crowdPercent: 0,
  },
  {
    id: 'bar',
    step: '02 · 12:15 am',
    title: 'Busy bar chatter',
    blurb: 'Add background crowd noise with post-gig muffling to hear why speech blurs.',
    targetView: 'listen',
    scrollSelector: '#freq-band-sim',
    earEffect: 'post_gig',
    earPart: 'cochlea',
    earScene: 'anatomy',
    tinnitus: 'off',
    bandPreset: 'post_gig',
    crowdPercent: 45,
  },
  {
    id: 'quiet',
    step: '03 · 1:30 am',
    title: 'Quiet room & Studio',
    blurb: 'Compare 12 full cleared tracks when the room goes quiet and soft ringing steps forward.',
    targetView: 'studio',
    scrollSelector: '#player',
    earEffect: 'post_gig',
    earPart: 'nerve',
    earScene: 'anatomy',
    tinnitus: 'ringing',
    studioProfile: 'post_gig_muffled_v1',
  },
  {
    id: 'remix',
    step: '04 · Your clip',
    title: 'Your audio & video',
    blurb: 'Paint different effects across chapters of your own clip and export locally.',
    targetView: 'your-audio',
    scrollSelector: '#render-form',
    earEffect: 'permanent_notch',
    earPart: 'cochlea',
    earScene: 'anatomy',
    tinnitus: 'off',
  },
]);

export function connectStoryJourney({
  root = document,
  onNavigateView = () => {},
  onUpdateEar3D = () => {},
  onTriggerPubDemo = () => {},
  onTriggerBandPreset = () => {},
  onConfigureStudio = () => {},
} = {}) {
  const bar = root.querySelector('#story-journey-bar');
  if (!bar) return { setActiveChapter() {} };

  const chapterBtns = [...bar.querySelectorAll('[data-story-chapter]')];
  const nextBtn = bar.querySelector('#story-next-btn');
  const captionEl = bar.querySelector('#story-active-caption');
  let activeIdx = 0;

  function render() {
    const ch = STORY_CHAPTERS[activeIdx] ?? STORY_CHAPTERS[0];
    for (const [idx, btn] of chapterBtns.entries()) {
      btn.setAttribute('aria-pressed', String(idx === activeIdx));
    }
    if (captionEl) {
      captionEl.textContent = `${ch.step} — ${ch.blurb}`;
    }
    if (nextBtn) {
      const nextCh = STORY_CHAPTERS[(activeIdx + 1) % STORY_CHAPTERS.length];
      nextBtn.textContent = activeIdx === STORY_CHAPTERS.length - 1
        ? 'Back to 01 · At the gig'
        : `Next: ${nextCh.title} →`;
    }
  }

  function activateChapter(index, { userTriggered = true } = {}) {
    activeIdx = Math.max(0, Math.min(STORY_CHAPTERS.length - 1, index));
    const ch = STORY_CHAPTERS[activeIdx];
    render();
    if (!userTriggered) return;

    onNavigateView(ch.targetView);
    onUpdateEar3D({
      effectKey: ch.earEffect,
      tinnitus: ch.tinnitus,
      sceneMode: ch.earScene,
      focusPart: ch.earPart,
      crowdPercent: ch.crowdPercent ?? 0,
    });

    if (ch.id === 'gig') {
      onTriggerBandPreset('musician_plugs');
    } else if (ch.id === 'bar') {
      onTriggerPubDemo();
    } else if (ch.id === 'quiet') {
      onConfigureStudio({ profileId: ch.studioProfile, tinnitus: ch.tinnitus });
    }

    const targetEl = ch.scrollSelector ? root.querySelector(ch.scrollSelector) : null;
    targetEl?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  chapterBtns.forEach((btn, idx) => {
    btn.addEventListener('click', () => activateChapter(idx));
  });

  nextBtn?.addEventListener('click', () => {
    activateChapter((activeIdx + 1) % STORY_CHAPTERS.length);
  });

  render();
  return {
    setActiveChapter(idOrIndex) {
      const idx = typeof idOrIndex === 'number'
        ? idOrIndex
        : STORY_CHAPTERS.findIndex((c) => c.id === idOrIndex);
      if (idx >= 0) activateChapter(idx, { userTriggered: false });
    },
  };
}
