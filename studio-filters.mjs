const profileNames = {
  post_gig_muffled_v1: 'Post-gig muffled (temporary)',
  nihl_demo_v1: 'Noise-induced loss (permanent)',
  high_frequency_demo_v1: 'Less treble (high-frequency loss)',
  broadband_demo_v1: 'Quieter sound (broadband loss)',
  asymmetric_demo_v1: 'Right ear quieter (asymmetric loss)',
  engineering_v1: 'Pipeline test (engineering fixture)',
};

export function displayProfileName(id, fallbackLabel = id) {
  return Object.hasOwn(profileNames, id) ? profileNames[id] : fallbackLabel;
}

export function updateStudioFilter(profileId, root = document) {
  const section = root.querySelector('#filter-export');
  if (!section) return;
  section.hidden = !Object.hasOwn(profileNames, profileId);
  if (section.hidden) return;

  section.querySelector('#filter-profile').textContent = displayProfileName(profileId);
  for (const [selector, extension] of [['#filter-wav', 'wav'], ['#filter-json', 'json']]) {
    const filename = `${profileId}-ir.${extension}`;
    const link = section.querySelector(selector);
    link.href = new URL(`./filters/${filename}`, import.meta.url).href;
    link.download = filename;
  }
}
