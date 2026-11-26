import { CUE_SAMPLE_RATE } from './cue.mjs?v=8660164ccc';

const idPattern = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const validViews = new Set(['reference', 'simulated']);

function id(value) {
  return typeof value === 'string' && idPattern.test(value) ? value : null;
}

function isCueSample(value) {
  return Number.isSafeInteger(value) && value >= 0 && value < CUE_SAMPLE_RATE * 1000;
}

export function readListeningLink(pageUrl) {
  const params = new URL(pageUrl).searchParams;
  const song = id(params.get('song'));
  if (!song) return null;

  const view = params.get('view');
  const time = params.get('t');
  const cue = params.get('cue');
  return {
    song,
    excerpt: id(params.get('excerpt')),
    profile: id(params.get('profile')),
    view: validViews.has(view) ? view : null,
    time: time !== null && /^\d{1,3}(?:\.\d{1,3})?$/.test(time) ? Number(time) : null,
    cue: cue !== null && /^\d{1,8}$/.test(cue) && isCueSample(Number(cue)) ? Number(cue) : null,
  };
}

export function listeningLink(pageUrl, state) {
  const url = new URL(pageUrl);
  url.search = '';
  url.hash = 'demo';
  for (const name of ['song', 'excerpt', 'profile']) {
    const value = id(state[name]);
    if (value) url.searchParams.set(name, value);
  }
  if (validViews.has(state.view)) url.searchParams.set('view', state.view);
  if (isCueSample(state.cue)) url.searchParams.set('cue', String(state.cue));
  if (Number.isFinite(state.time) && state.time >= 0 && state.time < 1000) {
    url.searchParams.set('t', String(Math.round(state.time * 1000) / 1000));
  }
  return url;
}

export function connectListeningShare(getState) {
  const button = document.querySelector('#share-demo');
  const status = document.querySelector('#share-status');
  const manual = document.querySelector('#share-url');
  button.addEventListener('click', async () => {
    const url = listeningLink(window.location.href, getState()).href;
    manual.hidden = true;
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = 'Listening link copied.';
    } catch {
      manual.value = url;
      manual.hidden = false;
      manual.focus();
      manual.select();
      status.textContent = 'Copy the selected listening link.';
    }
  });
}
