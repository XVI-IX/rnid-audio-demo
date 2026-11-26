export function connectHomeVideoEffects() {
  const picture = document.querySelector('#home-video-picture');
  const video = picture?.querySelector('video');
  const canvas = picture?.querySelector('canvas');
  const plot = canvas?.getContext('2d');
  if (!video || !plot) return;

  const buttons = document.querySelectorAll('[data-home-video-effect]');
  const { width, height } = canvas;
  const mosaic = document.createElement('canvas');
  mosaic.width = 32;
  mosaic.height = 18;
  const tiles = mosaic.getContext('2d');
  if (!tiles) return;
  const poster = new Image();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const useVideoFrames = typeof video.requestVideoFrameCallback === 'function';
  const vignette = plot.createRadialGradient(width / 2, height / 2, height * 0.16, width / 2, height / 2, height);
  vignette.addColorStop(0, '#101d2200');
  vignette.addColorStop(1, '#101d22b0');
  let mode = 'off';
  let pending;

  function drawMosaic(source) {
    tiles.drawImage(source, 0, 0, mosaic.width, mosaic.height);
    plot.imageSmoothingEnabled = false;
    plot.drawImage(mosaic, 0, 0, width, height);
    plot.imageSmoothingEnabled = true;
  }

  function drawDizziness(source) {
    const phase = video.currentTime * 1.65;
    const horizontal = reducedMotion.matches ? 0 : Math.sin(phase) * width * 0.022;
    const vertical = reducedMotion.matches ? 0 : Math.sin(phase * 0.7) * height * 0.026;
    const angle = reducedMotion.matches ? 0 : Math.sin(phase * 0.85) * 0.035;
    const left = -width * 0.56;
    const top = -height * 0.56;
    plot.save();
    plot.translate(width / 2 + horizontal, height / 2 + vertical);
    plot.rotate(angle);
    plot.drawImage(source, left, top, width * 1.12, height * 1.12);
    plot.globalCompositeOperation = 'screen';
    plot.globalAlpha = 0.54;
    plot.drawImage(source, left + width * 0.027, top + height * 0.015, width * 1.12, height * 1.12);
    plot.restore();
    plot.fillStyle = vignette;
    plot.fillRect(0, 0, width, height);
  }

  function draw() {
    if (mode === 'off' || video.seeking) return;
    const source = video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA ? video : poster;
    if (source === poster && !poster.naturalWidth) return;
    plot.clearRect(0, 0, width, height);
    if (mode === 'mosaic') drawMosaic(source);
    else drawDizziness(source);
    canvas.hidden = false;
  }

  function queueFrame() {
    if (pending !== undefined || mode === 'off' || video.paused || video.ended) return;
    pending = useVideoFrames ? video.requestVideoFrameCallback(refreshFrame) : requestAnimationFrame(refreshFrame);
  }

  function refreshFrame() {
    pending = undefined;
    draw();
    queueFrame();
  }

  function cancelFrame() {
    if (pending === undefined) return;
    if (useVideoFrames) video.cancelVideoFrameCallback(pending);
    else cancelAnimationFrame(pending);
    pending = undefined;
  }

  function refresh() {
    draw();
    queueFrame();
  }

  function selectMode(next) {
    mode = next;
    picture.dataset.pictureEffect = mode;
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button.dataset.homeVideoEffect === mode));
    }
    if (mode === 'off') {
      cancelFrame();
      canvas.hidden = true;
    } else {
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA && !poster.src) poster.src = video.poster;
      refresh();
    }
  }

  for (const button of buttons) {
    button.disabled = false;
    button.addEventListener('click', () => selectMode(button.dataset.homeVideoEffect));
  }
  for (const event of ['loadeddata', 'playing', 'seeked']) video.addEventListener(event, refresh);
  for (const event of ['waiting', 'emptied']) video.addEventListener(event, cancelFrame);
  for (const event of ['pause', 'ended']) video.addEventListener(event, () => {
    cancelFrame();
    draw();
  });
  poster.addEventListener('load', draw);
  reducedMotion.addEventListener('change', draw);
}
