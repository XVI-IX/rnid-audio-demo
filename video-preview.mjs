export function isVideoFile(file) {
  const type = file?.type?.split(';', 1)[0].trim().toLowerCase();
  return /\.(mp4|webm)$/i.test(file?.name ?? '') || type === 'video/mp4' || type === 'video/webm';
}

export function connectVideoPreview(video) {
  if (!video) return;
  let url;

  function seek(position) {
    if (!url || !Number.isFinite(video.duration)) return;
    const target = Math.max(0, Math.min(video.duration, position));
    if (Math.abs(video.currentTime - target) < 0.005) return;
    try { video.currentTime = target; } catch { /* The video may still be buffering. */ }
  }

  return {
    load(file, signal) {
      url = URL.createObjectURL(file);
      video.muted = true;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => fail(), 8000);
        function finish(error) {
          clearTimeout(timer);
          video.removeEventListener('loadedmetadata', ready);
          video.removeEventListener('error', fail);
          signal.removeEventListener('abort', cancel);
          if (error) reject(error);
          else resolve(video.duration);
        }
        function ready() {
          if (video.videoWidth && video.videoHeight) finish();
          else fail();
        }
        function fail() { finish(new Error('This browser could not open the video. Try another MP4 or WebM file.')); }
        function cancel() { finish(new Error('File selection changed.')); }
        video.addEventListener('loadedmetadata', ready);
        video.addEventListener('error', fail);
        signal.addEventListener('abort', cancel, { once: true });
        video.src = url;
        video.load();
      });
    },
    show() { video.hidden = false; },
    seek,
    async start(position) {
      video.muted = true;
      seek(position);
      await video.play();
    },
    stop(position) {
      video.pause();
      seek(position);
    },
    follow(position) {
      if (!video.paused && !video.seeking && Math.abs(video.currentTime - position) > 0.12) seek(position);
    },
    reset() {
      if (!url) return;
      video.pause();
      video.hidden = true;
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
      url = undefined;
    },
  };
}
