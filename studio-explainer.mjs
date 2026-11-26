// Instant pre-saved plain-English song explanations for the Studio's 12 preset tracks.
// Loads pre-measured acoustic badges, clearest/quietest timestamps, and bespoke jargon-free
// overviews + Q&A answers from `./demo/studio-explanations.json` in 0 ms (no LLM wait needed),
// with optional custom follow-up questions routed through the shared on-device WebLLM client.

import {
  EXPLAINER_BANDS,
  buildSafeMedicalResponse,
  connectExplainerChat,
  formatExplainerTime,
  isMedicalAdviceQuery,
} from './audio-explainer.mjs?v=3bfa62ebf4';

const SAVED_JSON_URL = new URL('./demo/studio-explanations.json', import.meta.url);

export const STUDIO_EXPLAINER_TOPICS = Object.freeze([
  { id: 'overview', label: 'Song overview' },
  { id: 'bass', label: 'Why does the bass still sound loud?' },
  { id: 'pub', label: 'How would this sound in a noisy pub?' },
  { id: 'tinnitus', label: 'Why is tinnitus louder in quiet parts?' },
  { id: 'ears', label: 'Left vs right headphones' },
]);

export function matchSavedTopic(questionText = '') {
  const q = String(questionText || '').trim().toLowerCase();
  if (!q) return 'overview';
  if (/^(?:song\s+)?overview$/i.test(q)) return 'overview';
  if (/pub|crowd|restaurant|bar|noisy|chatter|mumble/.test(q)) return 'pub';
  if (/tinnitus|ring|hiss|quiet|silence|fade/.test(q)) return 'tinnitus';
  if (/bass|loud|volume|turn.*up|boom/.test(q)) return 'bass';
  if (/left|right|ear|stereo|side|uneven|asymmetr/.test(q)) return 'ears';
  return null;
}

export function resolveSavedStudioExplanation(data, {
  songId = 'engineering-demo',
  track = 'reference',
  profileId = 'high_frequency_demo_v1',
  tinnitus = 'off',
  topic = 'overview',
} = {}) {
  const tracks = data?.tracks;
  if (!tracks) return null;
  const songEntry = tracks[songId] ?? tracks['engineering-demo'] ?? Object.values(tracks)[0];
  if (!songEntry?.profiles) return null;

  const effectiveProfile = track === 'reference' ? 'reference' : (profileId || 'high_frequency_demo_v1');
  const profData = songEntry.profiles[effectiveProfile] ?? songEntry.profiles.reference;
  if (!profData) return null;

  const tinKey = tinnitus === 'ringing' || tinnitus === 'hiss' ? tinnitus : 'off';
  let text = profData.overview?.[tinKey] ?? profData.overview?.off ?? '';
  if (topic && topic !== 'overview' && profData.answers?.[topic]) {
    text = profData.answers[topic];
  }

  return {
    songId: songEntry.id,
    songTitle: songEntry.title,
    profileKey: effectiveProfile,
    tinnitus: tinKey,
    topic: topic || 'overview',
    brightestSeconds: profData.brightestSeconds ?? 0,
    quietestSeconds: profData.quietestSeconds ?? 0,
    pills: Array.isArray(profData.pills) ? profData.pills : [],
    text,
    asymmetryDb: profData.asymmetryDb ?? 0,
    asymmetricEar: profData.asymmetricEar ?? null,
  };
}

function buildSyntheticReportFromSaved(resolved, profileLabel) {
  const severityToDb = { none: -0.3, mild: -3.5, moderate: -11.0, strong: -24.0 };
  const bands = EXPLAINER_BANDS.map((band, idx) => {
    const pill = resolved.pills[idx];
    const db = severityToDb[pill?.severity] ?? -0.5;
    return {
      ...band,
      friendlyStatus: pill?.status || 'Clear & bright',
      originalDb: -20,
      simulatedDb: -20 + db,
      deltaDb: db,
      leftDeltaDb: pill?.quieterEar === 'left' ? db - 12 : db,
      rightDeltaDb: pill?.quieterEar === 'right' ? db - 12 : db,
    };
  });
  return {
    durationSeconds: 60,
    section: null,
    profileId: resolved.profileKey === 'reference' ? 'original' : resolved.profileKey,
    profileLabel,
    tinnitus: resolved.tinnitus,
    bands,
    brightestMomentSeconds: resolved.brightestSeconds,
    quietestMomentSeconds: resolved.quietestSeconds,
    crestShiftDb: 0,
    asymmetryDb: resolved.asymmetryDb,
    asymmetricEar: resolved.asymmetricEar,
  };
}

export function connectStudioExplainer({
  root = document,
  formatTime = formatExplainerTime,
  onSeek = () => {},
  getProfileLabel = (id) => id,
  getWebLlmClient = () => null,
  fetchImpl = globalThis.fetch,
} = {}) {
  const container = root.querySelector('#studio-ai-explainer');
  if (!container) return { update() {} };

  const titleEl = container.querySelector('#studio-explainer-title');
  const badgeEl = container.querySelector('#studio-explainer-badge');
  const pillsEl = container.querySelector('#studio-explainer-pills');
  const jumpBrightBtn = container.querySelector('#studio-explainer-jump-bright');
  const jumpQuietBtn = container.querySelector('#studio-explainer-jump-quiet');
  const chatHistoryEl = container.querySelector('#studio-chat-history');
  const textEl = container.querySelector('#studio-explainer-text');
  const topicBtns = [...container.querySelectorAll('[data-studio-topic]')];
  const questionInput = container.querySelector('#studio-explainer-question');
  const askBtn = container.querySelector('#studio-explainer-ask');
  const chat = connectExplainerChat(container, textEl);

  function appendChatBubble(role, messageText) {
    if (!chatHistoryEl) return null;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    bubble.textContent = messageText;
    chatHistoryEl.append(bubble);
    // Cap extra bubbles so chat stays snappy
    const extras = chatHistoryEl.querySelectorAll('.chat-bubble.extra');
    if (extras.length > 8) extras[0].remove();
    bubble.classList.add('extra');
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
    return bubble;
  }

  let savedData = null;
  let state = {
    songId: 'engineering-demo',
    songTitle: 'Original synthetic demo',
    track: 'reference',
    profileId: 'high_frequency_demo_v1',
    tinnitus: 'off',
  };
  let activeTopic = 'overview';
  let customGeneration = null;

  function render() {
    if (!savedData) return;
    const resolved = resolveSavedStudioExplanation(savedData, {
      ...state,
      topic: activeTopic,
    });
    if (!resolved) return;

    container.hidden = false;
    if (titleEl) {
      titleEl.textContent = `What changed in ${state.songTitle || resolved.songTitle}`;
    }
    if (badgeEl && !customGeneration) {
      badgeEl.textContent = 'Saved AI guide · Instant';
    }
    const profile = state.track === 'reference' ? 'Original' : getProfileLabel(state.profileId);
    const tinnitusLabel = resolved.tinnitus === 'off' ? '' : ` · ${resolved.tinnitus === 'ringing' ? 'Ringing' : 'Hiss'}`;
    chat.setContext(`${profile}${tinnitusLabel} · Listen at ${formatTime(resolved.brightestSeconds)}`);

    if (pillsEl) {
      pillsEl.replaceChildren();
      for (const pill of resolved.pills) {
        const item = document.createElement('span');
        item.className = 'explainer-band-pill';
        item.setAttribute('role', 'listitem');
        item.dataset.severity = pill.severity || 'none';
        if (pill.quieterEar) {
          item.title = `${pill.label}: ${pill.quieterEar} ear sounds quieter on headphones`;
        } else {
          item.title = pill.label;
        }
        const name = document.createElement('span');
        name.className = 'explainer-pill-name';
        name.textContent = pill.label;
        const status = document.createElement('strong');
        status.className = 'explainer-pill-db';
        status.textContent = pill.status;
        item.append(name, ' ', status);
        pillsEl.append(item);
      }
    }

    if (jumpBrightBtn) {
      jumpBrightBtn.textContent = `Jump to clearest difference (${formatTime(resolved.brightestSeconds)})`;
      jumpBrightBtn.onclick = () => onSeek(resolved.brightestSeconds);
    }
    if (jumpQuietBtn) {
      const showQuiet = resolved.tinnitus !== 'off' || activeTopic === 'tinnitus';
      jumpQuietBtn.hidden = !showQuiet;
      jumpQuietBtn.textContent = `Jump to quietest moment (${formatTime(resolved.quietestSeconds)})`;
      jumpQuietBtn.onclick = () => onSeek(resolved.quietestSeconds);
    }

    for (const btn of topicBtns) {
      btn.setAttribute('aria-pressed', String(btn.dataset.studioTopic === activeTopic));
    }

    if (textEl && !customGeneration) {
      delete textEl.dataset.streaming;
      textEl.textContent = resolved.text;
    }
  }

  for (const btn of topicBtns) {
    btn.addEventListener('click', () => {
      if (!savedData) return;
      customGeneration?.abort();
      customGeneration = null;
      chat.begin(btn.textContent.trim());
      activeTopic = btn.dataset.studioTopic || 'overview';
      render();
      if (activeTopic !== 'overview') {
        appendChatBubble('user', btn.textContent?.trim() || activeTopic);
        if (textEl?.textContent) appendChatBubble('bot', textEl.textContent);
      }
    });
  }

  async function askCustomQuestion() {
    const rawQ = questionInput?.value?.trim() || '';
    if (!rawQ || !savedData) return;
    if (questionInput) questionInput.value = '';
    customGeneration?.abort();
    customGeneration = null;
    chat.begin(rawQ);
    appendChatBubble('user', rawQ);

    // 0. Block medical/diagnostic/treatment queries immediately with RNID non-clinical safety guidance
    if (isMedicalAdviceQuery(rawQ)) {
      activeTopic = '';
      for (const btn of topicBtns) btn.setAttribute('aria-pressed', 'false');
      const resolved = resolveSavedStudioExplanation(savedData, { ...state, topic: 'overview' });
      if (textEl) {
        delete textEl.dataset.streaming;
        const safeMsg = buildSafeMedicalResponse({
          brightestMomentSeconds: resolved?.brightestSeconds,
        });
        textEl.textContent = safeMsg;
        appendChatBubble('bot', safeMsg);
      }
      if (badgeEl) badgeEl.textContent = 'Safety note · Non-diagnostic';
      return;
    }

    // 1. Instant 0 ms hit if question matches one of our saved topics!
    const matched = matchSavedTopic(rawQ);
    if (matched) {
      activeTopic = matched;
      render();
      if (textEl?.textContent) appendChatBubble('bot', textEl.textContent);
      return;
    }

    // 2. Otherwise use the shared on-device WebLLM client (if WebGPU is supported) or show best saved overview
    const resolved = resolveSavedStudioExplanation(savedData, { ...state, topic: 'overview' });
    if (!resolved) return;

    const llmClient = getWebLlmClient?.();
    if (!llmClient || !llmClient.isSupported?.()) {
      activeTopic = 'overview';
      render();
      return;
    }

    const controller = new AbortController();
    customGeneration = controller;
    activeTopic = '';
    for (const btn of topicBtns) btn.setAttribute('aria-pressed', 'false');

    if (badgeEl) badgeEl.textContent = 'Answering locally…';
    if (textEl) {
      textEl.dataset.streaming = 'true';
      textEl.textContent = 'Finding an answer about this song…';
    }

    const profLabel = state.track === 'reference' ? 'Original' : getProfileLabel(state.profileId);
    const synthReport = buildSyntheticReportFromSaved(resolved, profLabel);

    try {
      const res = await llmClient.generateExplanation({
        report: synthReport,
        userQuestion: rawQ,
        signal: controller.signal,
        onToken: (_delta, partial) => {
          if (customGeneration !== controller || !textEl) return;
          textEl.textContent = partial;
        },
      });
      if (customGeneration !== controller) return;
      if (textEl && res.text) textEl.textContent = res.text;
    } catch {
      if (customGeneration !== controller) return;
      if (textEl) textEl.textContent = resolved.text;
    } finally {
      if (customGeneration === controller) {
        customGeneration = null;
        if (textEl) delete textEl.dataset.streaming;
        if (badgeEl) badgeEl.textContent = 'Saved AI guide · Instant';
      }
    }
  }

  askBtn?.addEventListener('click', () => {
    void askCustomQuestion();
  });
  questionInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void askCustomQuestion();
    }
  });

  if (typeof fetchImpl === 'function') {
    void fetchImpl(SAVED_JSON_URL)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.tracks) {
          savedData = json;
          render();
        }
      })
      .catch(() => {});
  }

  return {
    update(nextState = {}) {
      const prevKey = `${state.songId}|${state.track}|${state.profileId}|${state.tinnitus}`;
      state = { ...state, ...nextState };
      const nextKey = `${state.songId}|${state.track}|${state.profileId}|${state.tinnitus}`;
      if (prevKey !== nextKey) {
        customGeneration?.abort();
        customGeneration = null;
        activeTopic = 'overview';
        chat.reset();
      }
      render();
    },
  };
}
