// Near-marker targeting, Shift precision and peak bins come from the collaborator's RNID scrubber prototype.
const FINE_DRAG = 0.1;
const DRAG_THRESHOLD = 3;

function clamp(value, duration) {
  return Math.min(duration, Math.max(0, value));
}

export function computePeaks(buffer, bins = 144) {
  const peaks = new Float32Array(bins);
  const step = buffer.length / bins;
  let loudest = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let bin = 0; bin < bins; bin += 1) {
      const end = bin === bins - 1 ? data.length : Math.floor((bin + 1) * step);
      let peak = peaks[bin];
      for (let frame = Math.floor(bin * step); frame < end; frame += 1) {
        peak = Math.max(peak, Math.abs(data[frame]));
      }
      peaks[bin] = peak;
      loudest = Math.max(loudest, peak);
    }
  }
  return Array.from(peaks, (peak) => loudest ? peak / loudest : 0);
}

export function attachMarkerDrag(canvas, { duration, marker = () => undefined, enabled = () => true,
  preview, commit, grabPixels = 12 }) {
  let drag;
  let frame;

  function nearMarker(x, box, length) {
    const current = marker();
    return Number.isFinite(current) && length > 0 && box.width > 0
      && Math.abs(box.left + current * box.width / length - x) <= grabPixels;
  }

  function showPreview() {
    if (frame !== undefined) return;
    frame = requestAnimationFrame(() => {
      frame = undefined;
      if (drag) preview({ kind: drag.kind, value: drag.value });
    });
  }

  function update(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const horizontal = Math.abs(event.clientX - drag.originX);
    const vertical = Math.abs(event.clientY - drag.originY);
    if (!drag.moved && event.pointerType === 'touch' && vertical > 8 && vertical > horizontal) {
      finish(false);
      return;
    }
    if (!drag.moved && horizontal < DRAG_THRESHOLD) return;
    drag.moved = true;
    const scale = event.shiftKey ? FINE_DRAG : 1;
    drag.value = clamp(drag.value + (event.clientX - drag.x) * drag.secondsPerPixel * scale, drag.length);
    drag.x = event.clientX;
    showPreview();
  }

  function finish(shouldCommit) {
    if (!drag) return;
    const completed = drag;
    drag = undefined;
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    delete canvas.dataset.dragging;
    if (canvas.hasPointerCapture?.(completed.id)) canvas.releasePointerCapture(completed.id);
    preview(null);
    if (shouldCommit) {
      const markerDrag = completed.kind === 'marker' && completed.moved;
      commit({ kind: markerDrag ? 'marker' : 'seek', value: completed.moved ? completed.value : completed.pressed });
    }
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (drag || event.button !== 0 || event.isPrimary === false || !enabled()) return;
    const length = duration();
    const box = canvas.getBoundingClientRect();
    if (!Number.isFinite(length) || length <= 0 || box.width <= 0) return;
    const secondsPerPixel = length / box.width;
    const grabbing = nearMarker(event.clientX, box, length);
    const pressed = clamp((event.clientX - box.left) * secondsPerPixel, length);
    const kind = grabbing ? 'marker' : 'seek';
    drag = { id: event.pointerId, originX: event.clientX, originY: event.clientY, x: event.clientX,
      value: grabbing ? marker() : pressed, length, secondsPerPixel, pressed, kind, moved: false };
    canvas.dataset.dragging = kind;
    if (event.pointerType !== 'touch') event.preventDefault();
    // Window handlers also cover motion when capture is unavailable.
    try { canvas.setPointerCapture?.(event.pointerId); } catch { /* capture unavailable */ }
    showPreview();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag && event.pointerType !== 'touch') {
      if (enabled() && nearMarker(event.clientX, canvas.getBoundingClientRect(), duration())) canvas.dataset.grabMarker = 'true';
      else delete canvas.dataset.grabMarker;
    }
  });
  canvas.addEventListener('pointerleave', () => canvas.removeAttribute('data-grab-marker'));
  window.addEventListener('pointermove', update);
  window.addEventListener('pointerup', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    update(event);
    if (drag) finish(enabled() && duration() === drag.length);
  });
  function cancelPointer(event) {
    if (event.pointerId === drag?.id) finish(false);
  }
  canvas.addEventListener('lostpointercapture', cancelPointer);
  window.addEventListener('pointercancel', cancelPointer);
  window.addEventListener('blur', () => finish(false));
  window.addEventListener('keydown', (event) => {
    if (drag && event.key === 'Escape') {
      event.preventDefault();
      finish(false);
    }
  });
  return () => finish(false);
}

export function attachSectionDrag(canvas, {
  duration,
  section = () => undefined,
  minSpan = 0.5,
  enabled = () => true,
  preview,
  commit,
  grabPixels = 12,
}) {
  let drag;
  let frame;

  function nearSectionEdge(x, box, length) {
    const current = section();
    if (!current || !Number.isFinite(current.start) || !Number.isFinite(current.end)
      || !(length > 0) || !(box.width > 0)) {
      return null;
    }
    const startX = box.left + (current.start * box.width) / length;
    const endX = box.left + (current.end * box.width) / length;
    const distStart = Math.abs(startX - x);
    const distEnd = Math.abs(endX - x);
    if (distStart > grabPixels && distEnd > grabPixels) return null;
    if (distStart < distEnd) return 'start';
    if (distEnd < distStart) return 'end';
    return x <= startX ? 'start' : 'end';
  }

  function currentSectionBounds() {
    const start = drag.edge === 'start' ? drag.value : drag.start;
    const end = drag.edge === 'end' ? drag.value : drag.end;
    return { start, end };
  }

  function showPreview() {
    if (frame !== undefined) return;
    frame = requestAnimationFrame(() => {
      frame = undefined;
      if (!drag) return;
      if (drag.kind === 'section') {
        const { start, end } = currentSectionBounds();
        preview({ kind: 'section', edge: drag.edge, start, end, value: drag.value });
      } else {
        preview({ kind: 'seek', value: drag.value });
      }
    });
  }

  function update(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const horizontal = Math.abs(event.clientX - drag.originX);
    const vertical = Math.abs(event.clientY - drag.originY);
    if (!drag.moved && event.pointerType === 'touch' && vertical > 8 && vertical > horizontal) {
      finish(false);
      return;
    }
    if (!drag.moved && horizontal < DRAG_THRESHOLD) return;
    drag.moved = true;
    const scale = event.shiftKey ? FINE_DRAG : 1;
    const delta = (event.clientX - drag.x) * drag.secondsPerPixel * scale;
    if (drag.kind === 'section') {
      if (drag.edge === 'start') {
        drag.value = Math.min(Math.max(0, drag.value + delta), Math.max(0, drag.end - minSpan));
      } else {
        drag.value = Math.min(drag.length, Math.max(Math.min(drag.length, drag.start + minSpan), drag.value + delta));
      }
    } else {
      drag.value = clamp(drag.value + delta, drag.length);
    }
    drag.x = event.clientX;
    showPreview();
  }

  function finish(shouldCommit) {
    if (!drag) return;
    const completed = drag;
    drag = undefined;
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    delete canvas.dataset.dragging;
    if (canvas.hasPointerCapture?.(completed.id)) canvas.releasePointerCapture(completed.id);
    preview(null);
    if (shouldCommit) {
      if (completed.kind === 'section' && completed.moved) {
        const start = completed.edge === 'start' ? completed.value : completed.start;
        const end = completed.edge === 'end' ? completed.value : completed.end;
        commit({ kind: 'section', edge: completed.edge, start, end, value: completed.value });
      } else {
        commit({ kind: 'seek', value: completed.moved ? completed.value : completed.pressed });
      }
    }
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (drag || event.button !== 0 || event.isPrimary === false || !enabled()) return;
    const length = duration();
    const box = canvas.getBoundingClientRect();
    if (!Number.isFinite(length) || length <= 0 || box.width <= 0) return;
    const secondsPerPixel = length / box.width;
    const edge = nearSectionEdge(event.clientX, box, length);
    const pressed = clamp((event.clientX - box.left) * secondsPerPixel, length);
    if (edge) {
      const current = section();
      drag = {
        id: event.pointerId,
        originX: event.clientX,
        originY: event.clientY,
        x: event.clientX,
        value: edge === 'start' ? current.start : current.end,
        start: current.start,
        end: current.end,
        edge,
        length,
        secondsPerPixel,
        pressed,
        kind: 'section',
        moved: false,
      };
      canvas.dataset.dragging = `section-${edge}`;
    } else {
      drag = {
        id: event.pointerId,
        originX: event.clientX,
        originY: event.clientY,
        x: event.clientX,
        value: pressed,
        length,
        secondsPerPixel,
        pressed,
        kind: 'seek',
        moved: false,
      };
      canvas.dataset.dragging = 'seek';
    }
    if (event.pointerType !== 'touch') event.preventDefault();
    try { canvas.setPointerCapture?.(event.pointerId); } catch { /* capture unavailable */ }
    showPreview();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!drag && event.pointerType !== 'touch') {
      const edge = enabled() ? nearSectionEdge(event.clientX, canvas.getBoundingClientRect(), duration()) : null;
      if (edge) canvas.dataset.grabSection = edge;
      else delete canvas.dataset.grabSection;
    }
  });
  canvas.addEventListener('pointerleave', () => {
    delete canvas.dataset.grabSection;
  });
  window.addEventListener('pointermove', update);
  window.addEventListener('pointerup', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    update(event);
    if (drag) finish(enabled() && duration() === drag.length);
  });
  function cancelPointer(event) {
    if (event.pointerId === drag?.id) finish(false);
  }
  canvas.addEventListener('lostpointercapture', cancelPointer);
  window.addEventListener('pointercancel', cancelPointer);
  window.addEventListener('blur', () => finish(false));
  window.addEventListener('keydown', (event) => {
    if (drag && event.key === 'Escape') {
      event.preventDefault();
      finish(false);
    }
  });
  return () => finish(false);
}
