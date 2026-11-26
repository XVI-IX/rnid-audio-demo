import { assembleComparisonZip } from './bundle.mjs?v=a9b61dce6e';
import { connectNIHLAudiogram } from './nihl-audiogram.mjs?v=a9b61dce6e';

const media = new URL('./demo/nihl/', import.meta.url);
const frequencies = new Intl.NumberFormat('en-GB');
const descriptions = {
  normal: 'Both ears are shown at 0 dB HL across the frequencies in this example.',
  nihl_typical: 'The thresholds rise towards 4 kHz, then recover towards 8 kHz.',
  nihl_mild_to_severe: 'The thresholds rise across several frequencies, with the deepest dip at 4 kHz.',
  nihl_moderate_to_severe: 'The 4 kHz dip is deeper, and thresholds remain raised at 8 kHz.',
  age_related: 'In this comparison, thresholds continue to rise towards 8 kHz.',
};

function listeningLimit(example, hz) {
  const changes = [];
  for (const side of ['left', 'right']) {
    const plotted = example[`${side}DbHl`];
    const rendered = example[`${side}RenderDbHl`];
    rendered.forEach((value, index) => {
      if (value !== plotted[index]) {
        changes.push(`${side} ${frequencies.format(hz[index])} Hz (${plotted[index]} to ${value} dB HL)`);
      }
    });
  }
  return changes.length ? `Approximate audio. The listening version uses a limited range at ${changes.join(', ')}. The chart shows the example values.` : '';
}

export function connectNIHLExamples({ pauseOthers = () => {}, volume = () => 1 } = {}) {
  const section = document.querySelector('#nihl-examples');
  if (!section) return () => {};

  const player = section.querySelector('#nihl-audio');
  const downloadButton = section.querySelector('#nihl-download');
  const note = section.querySelector('#nihl-listening-limit');
  const summary = section.querySelector('#nihl-chart-summary');
  const status = section.querySelector('#nihl-status');
  const credit = section.querySelector('#nihl-source');
  const caseButtons = [...section.querySelectorAll('[data-nihl-case]')];
  const versionButtons = [...section.querySelectorAll('[data-nihl-version]')];
  const renderChart = connectNIHLAudiogram(section);

  let catalog;
  let selected;
  let version = 'original';
  let pendingChange;
  let exporting = false;
  player.volume = volume();

  function setAudioSource(name) {
    const url = new URL(name, media).href;
    if (player.src === url && !player.error) return;
    const change = {
      url,
      time: pendingChange?.time ?? (player.ended ? 0 : player.currentTime),
      playing: pendingChange?.playing ?? (!player.paused && !player.ended),
    };
    pendingChange = change;
    player.src = url;
    if (change.time > 0) player.currentTime = change.time;
    if (change.playing) {
      void player.play().catch(error => {
        if (error.name !== 'AbortError' && player.src === url) status.textContent = 'The clip could not play. Press Play to try again.';
      });
    }
  }

  function applyVersion() {
    for (const button of versionButtons) {
      const { nihlVersion } = button.dataset;
      button.setAttribute('aria-pressed', String(nihlVersion === version));
      button.disabled = nihlVersion === 'simulated' && !selected.manifest;
    }
    setAudioSource(version === 'original' ? catalog.reference : selected.audio);
  }

  function selectExample(example) {
    if (selected?.id !== example.id) {
      selected = example;
      version = example.manifest ? 'simulated' : 'original';
      for (const button of caseButtons) {
        button.setAttribute('aria-pressed', String(button.dataset.nihlCase === selected.id));
      }
      renderChart({ ...selected, frequenciesHz: catalog.frequenciesHz });
      summary.textContent = descriptions[selected.id] ?? '';
      const limit = listeningLimit(selected, catalog.frequenciesHz);
      note.textContent = limit;
      note.hidden = !limit;
      downloadButton.disabled = exporting || !selected.manifest;
    }
    applyVersion();
  }

  function showCredit(source) {
    const sourceLink = document.createElement('a');
    sourceLink.href = source.sourceUrl;
    sourceLink.textContent = 'Music source';
    const licenseLink = document.createElement('a');
    licenseLink.href = source.licenseUrl;
    licenseLink.textContent = source.license;
    credit.replaceChildren(`“${source.title}” by ${source.artist}. `, sourceLink, ' · ', licenseLink);
  }

  downloadButton.addEventListener('click', async () => {
    const example = selected;
    if (exporting || !example?.manifest) return;
    exporting = true;
    downloadButton.disabled = true;
    status.textContent = 'Preparing the comparison ZIP…';
    try {
      const bundle = await assembleComparisonZip({
        referenceUrl: new URL(catalog.reference, media),
        simulatedUrl: new URL(example.audio, media),
        manifestUrl: new URL(example.manifest, media),
      });
      const url = URL.createObjectURL(bundle);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${example.id}-comparison.zip`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      status.textContent = 'Comparison ZIP ready.';
    } catch {
      status.textContent = 'The comparison ZIP could not load. Please try again.';
    } finally {
      exporting = false;
      downloadButton.disabled = !selected.manifest;
    }
  });

  for (const button of versionButtons) {
    button.addEventListener('click', () => {
      version = button.dataset.nihlVersion;
      applyVersion();
    });
  }
  player.addEventListener('loadedmetadata', () => {
    if (pendingChange?.url === player.currentSrc) pendingChange = undefined;
  });
  player.addEventListener('play', () => {
    if (!player.paused) pauseOthers();
  });
  player.addEventListener('error', () => {
    pendingChange = undefined;
    status.textContent = 'The clip could not load. Select the example to try again.';
  });

  void (async () => {
    try {
      const response = await fetch(new URL('examples.json', media));
      if (!response.ok) throw new Error('Unable to load the hearing examples.');
      catalog = await response.json();
      for (const button of caseButtons) {
        const example = catalog.cases.find(item => item.id === button.dataset.nihlCase);
        if (!example) continue;
        button.disabled = false;
        button.addEventListener('click', () => {
          if (!exporting) status.textContent = '';
          selectExample(example);
        });
      }
      selectExample(catalog.cases[0]);
      showCredit(catalog.source);
      status.textContent = '';
    } catch {
      status.textContent = 'Hearing examples could not load. Reload the page to try again.';
    }
  })();

  return () => {
    if (pendingChange) pendingChange.playing = false;
    player.pause();
  };
}
