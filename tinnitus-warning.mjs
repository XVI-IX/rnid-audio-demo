// Ringing Tinnitus Safety & Sound-Sensitivity Warning Controller
// Provides a session-scoped consent prompt before playing high-pitched 3.4 kHz ringing tones,
// with a 1-click fallback to softer band-limited Hiss or Cancel.

let ringingConfirmedForSession = false;
let activeDialogCleanup = null;

export function isRingingConfirmed() {
  return ringingConfirmedForSession;
}

export function setRingingConfirmed(confirmed) {
  ringingConfirmedForSession = Boolean(confirmed);
}

export function resetRingingWarningState() {
  ringingConfirmedForSession = false;
  if (activeDialogCleanup) {
    activeDialogCleanup();
    activeDialogCleanup = null;
  }
}

export function confirmRingingPlayback({
  root = globalThis.document,
  allowHissFallback = true,
  onConfirm = () => {},
  onUseHiss = null,
  onCancel = () => {},
} = {}) {
  if (ringingConfirmedForSession) {
    onConfirm();
    return true;
  }

  const modal = root?.querySelector?.('#tinnitus-warning-modal');
  const confirmBtn = modal?.querySelector?.('#tinnitus-warning-confirm');
  const hissBtn = modal?.querySelector?.('#tinnitus-warning-use-hiss');
  const cancelBtn = modal?.querySelector?.('#tinnitus-warning-cancel');

  // Graceful pass-through in headless/unit-test environments without the modal DOM
  if (!modal || !confirmBtn || !cancelBtn) {
    onConfirm();
    return true;
  }

  if (activeDialogCleanup) {
    activeDialogCleanup();
    activeDialogCleanup = null;
  }

  const previousFocus = root?.activeElement;
  if (hissBtn) {
    hissBtn.hidden = !(allowHissFallback && typeof onUseHiss === 'function');
  }

  modal.hidden = false;
  modal.dataset.open = 'true';

  function closeModal(restoreFocus = false) {
    modal.hidden = true;
    delete modal.dataset.open;
    confirmBtn.removeEventListener('click', handleConfirm);
    hissBtn?.removeEventListener('click', handleUseHiss);
    cancelBtn.removeEventListener('click', handleCancel);
    modal.removeEventListener('click', handleBackdropClick);
    globalThis.window?.removeEventListener?.('keydown', handleKeydown);
    activeDialogCleanup = null;
    if (restoreFocus && typeof previousFocus?.focus === 'function') {
      try { previousFocus.focus(); } catch { /* ignore focus errors */ }
    }
  }

  function handleConfirm() {
    ringingConfirmedForSession = true;
    closeModal(false);
    onConfirm();
  }

  function handleUseHiss() {
    closeModal(false);
    if (typeof onUseHiss === 'function') onUseHiss();
    else onCancel();
  }

  function handleCancel() {
    closeModal(true);
    onCancel();
  }

  function handleBackdropClick(event) {
    if (event.target === modal) {
      handleCancel();
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  }

  confirmBtn.addEventListener('click', handleConfirm);
  hissBtn?.addEventListener('click', handleUseHiss);
  cancelBtn.addEventListener('click', handleCancel);
  modal.addEventListener('click', handleBackdropClick);
  globalThis.window?.addEventListener?.('keydown', handleKeydown);

  activeDialogCleanup = () => closeModal(false);
  try { confirmBtn.focus(); } catch { /* ignore */ }
  return false;
}
