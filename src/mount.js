import { createSeasonalTree } from './core/seasonalTree.js';
import { sceneDisplaySize, SCENE_HEIGHT, SCENE_WIDTH, TREE_ART_SCALE } from './core/seasonalTreeArt.js';
import { normalizeOptions, resolveTreeKey, TREE_STYLES } from './core/presets.js';
import { createSettingsPanel, PANEL_CSS } from './panel.js';

const STORAGE_KEY = 'canopy_cat_prefs_v1';

function readStored() {
  try {
    const raw = window.localStorage?.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStored(options) {
  try {
    window.localStorage?.setItem(STORAGE_KEY, JSON.stringify({
      tree: options.tree,
      cat: options.cat,
      weather: options.weather,
      direction: options.direction,
      speed: options.speed,
      gusts: options.gusts,
      size: options.size,
      growthSpeed: options.growthSpeed,
      sheddingSpeed: options.sheddingSpeed,
      leafRetention: options.leafRetention,
    }));
  } catch {
    // Ignore storage quota or privacy-mode errors.
  }
}

/**
 * Mount an interactive CanopyCat seasonal tree & pixel cat scene inside any DOM element.
 */
export function mountCanopyCat(target, initialOptions = {}) {
  const host = typeof target === 'string' ? document.querySelector(target) : target;
  if (!host) throw new Error('[canopy-cat] Mount target not found.');

  const doc = host.ownerDocument;
  const win = doc.defaultView || window;

  const wrapper = doc.createElement('div');
  const shadow = wrapper.attachShadow ? wrapper.attachShadow({ mode: 'open' }) : wrapper;
  const styleTag = doc.createElement('style');
  styleTag.textContent = PANEL_CSS;
  shadow.appendChild(styleTag);

  const stored = initialOptions.persist ? readStored() : null;
  let options = normalizeOptions({ ...initialOptions, ...(stored || {}) });
  let resolvedTree = resolveTreeKey(options.tree);
  let panelOpen = false;
  let panelCtrl = null;
  let motion = null;
  let frameId = null;
  let lastPaint = null;
  let inView = true;
  let paused = false;
  let pointer = null;
  let ignoreClick = false;

  const rootEl = doc.createElement('div');
  rootEl.className = 'cc-root';
  rootEl.dataset.position = options.position;
  wrapper.dataset.theme = options.theme;

  const stageBtn = doc.createElement('button');
  stageBtn.type = 'button';
  stageBtn.className = 'cc-stage';

  const canvas = doc.createElement('canvas');
  canvas.width = SCENE_WIDTH * TREE_ART_SCALE;
  canvas.height = SCENE_HEIGHT * TREE_ART_SCALE;
  canvas.setAttribute('aria-hidden', 'true');
  stageBtn.appendChild(canvas);
  rootEl.appendChild(stageBtn);
  shadow.appendChild(rootEl);
  host.appendChild(wrapper);

  function syncCanvasSize() {
    const { width, height } = sceneDisplaySize(options.size);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const styleInfo = TREE_STYLES[resolvedTree];
    const label = styleInfo.settings[options.lang] ?? styleInfo.settings.en;
    stageBtn.title = options.controls ? label : '';
    stageBtn.setAttribute('aria-label', label);
  }

  function scenePoint(event) {
    const rect = canvas.getBoundingClientRect();
    return [
      (event.clientX - rect.left) * SCENE_WIDTH / rect.width,
      (event.clientY - rect.top) * SCENE_HEIGHT / rect.height,
    ];
  }

  const reducedMotion = win.matchMedia?.('(prefers-reduced-motion: reduce)');

  function animate(timestamp) {
    lastPaint ??= timestamp;
    const delta = timestamp - lastPaint;
    if (pointer?.dragging || delta >= 1000 / 32) {
      motion?.advance(Math.min(delta / 1000, 0.08), options);
      lastPaint = timestamp;
    }
    frameId = win.requestAnimationFrame(animate);
  }

  function stopLoop() {
    if (frameId !== null) win.cancelAnimationFrame(frameId);
    frameId = null;
    lastPaint = null;
  }

  function syncLoop() {
    stopLoop();
    if (reducedMotion?.matches) motion?.still();
    else if (!paused && inView && !doc.hidden) frameId = win.requestAnimationFrame(animate);
  }

  function buildMotion() {
    resolvedTree = resolveTreeKey(options.tree);
    const artwork = TREE_STYLES[resolvedTree].artwork;
    motion = createSeasonalTree(canvas, artwork, options.cat);
    syncCanvasSize();
    motion?.still();
    syncLoop();
  }

  function closePanel() {
    if (!panelOpen) return;
    panelOpen = false;
    panelCtrl?.element.remove();
    panelCtrl = null;
  }

  function openPanel() {
    if (!options.controls || panelOpen) return;
    panelOpen = true;
    panelCtrl = createSettingsPanel(doc, {
      getOptions: () => options,
      update: patch => setOptions(patch),
      reset: () => {
        const defaults = normalizeOptions({
          ...initialOptions,
          tree: options.tree,
          cat: options.cat,
          size: options.size,
          controls: options.controls,
          lang: options.lang,
          theme: options.theme,
          position: options.position,
          persist: options.persist,
        });
        setOptions(defaults);
        motion?.still();
      },
      regrow: () => motion?.growCanopy(frameId !== null && options.growthSpeed > 0),
      onClose: closePanel,
    });
    rootEl.appendChild(panelCtrl.element);
  }

  function setOptions(patch = {}) {
    const prevTree = resolvedTree;
    const prevCat = options.cat;
    options = normalizeOptions({ ...options, ...patch });
    rootEl.dataset.position = options.position;
    wrapper.dataset.theme = options.theme;
    const nextTree = resolveTreeKey(options.tree);
    if (nextTree !== prevTree) {
      buildMotion();
    } else {
      syncCanvasSize();
      if (options.cat !== prevCat) motion?.setCat?.(options.cat);
    }
    if (!options.controls && panelOpen) closePanel();
    if (options.persist) writeStored(options);
    panelCtrl?.render();
    if (typeof options.onChange === 'function') options.onChange(options);
  }

  function onPointerDown(event) {
    if (event.button !== 0 || pointer) return;
    const pt = scenePoint(event);
    if (frameId !== null && motion?.petCompanion?.(...pt)) {
      ignoreClick = true;
      event.preventDefault();
      return;
    }
    const branch = motion?.findBranch?.(...pt);
    const grab = branch && motion.grab(...pt, branch);
    if (!grab) return;
    ignoreClick = false;
    pointer = { id: event.pointerId, grab, clientX: event.clientX, clientY: event.clientY, dragging: false };
    event.preventDefault();
    stageBtn.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    const pt = scenePoint(event);
    if (pointer && pointer.id === event.pointerId) {
      if (!pointer.dragging) {
        if (Math.hypot(event.clientX - pointer.clientX, event.clientY - pointer.clientY) < 5) return;
        pointer.dragging = true;
        stageBtn.dataset.dragging = 'true';
        motion?.notifyTreeDrag?.(pointer.grab.bone.name, ...pt);
      }
      motion?.pull(pointer.grab, ...pt);
      return;
    }
    if (frameId !== null && motion?.hitCompanion?.(...pt)) {
      stageBtn.dataset.hover = 'companion';
    } else if (motion?.findBranch?.(...pt)) {
      stageBtn.dataset.hover = 'grabbable';
    } else {
      delete stageBtn.dataset.hover;
    }
  }

  function onPointerEnd(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const gesture = pointer;
    pointer = null;
    const committed = event.type === 'pointerup';
    ignoreClick = gesture.dragging || !committed;
    if (gesture.dragging) {
      delete stageBtn.dataset.dragging;
      motion?.release(committed);
    } else if (committed && frameId !== null) {
      motion?.poke(gesture.grab);
    }
  }

  function onPointerLeave() {
    if (!pointer) delete stageBtn.dataset.hover;
  }

  function onStageClick(event) {
    if (event.detail && ignoreClick) {
      ignoreClick = false;
      return;
    }
    if (!event.detail && frameId !== null) motion?.poke();
    if (!options.controls) return;
    if (panelOpen) closePanel();
    else openPanel();
  }

  function onDocClick(event) {
    if (!panelOpen) return;
    const path = event.composedPath?.() || [];
    if (!path.includes(wrapper)) closePanel();
  }

  function onDocKeyDown(event) {
    if (panelOpen && event.key === 'Escape') {
      event.preventDefault();
      closePanel();
    }
  }

  const observer = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting === inView) return;
      inView = entry.isIntersecting;
      syncLoop();
    })
    : null;

  stageBtn.addEventListener('pointerdown', onPointerDown);
  stageBtn.addEventListener('pointermove', onPointerMove);
  stageBtn.addEventListener('pointerup', onPointerEnd);
  stageBtn.addEventListener('pointercancel', onPointerEnd);
  stageBtn.addEventListener('lostpointercapture', onPointerEnd);
  stageBtn.addEventListener('pointerleave', onPointerLeave);
  stageBtn.addEventListener('click', onStageClick);
  doc.addEventListener('click', onDocClick, true);
  doc.addEventListener('keydown', onDocKeyDown);
  doc.addEventListener('visibilitychange', syncLoop);
  reducedMotion?.addEventListener?.('change', syncLoop);

  buildMotion();
  observer?.observe(canvas);

  return {
    getOptions: () => ({ ...options, resolvedTree }),
    setOptions,
    openPanel,
    closePanel,
    regrow: () => motion?.growCanopy(frameId !== null && options.growthSpeed > 0),
    poke: (branch) => motion?.poke(branch),
    triggerAction: (action) => motion?.triggerCatAction?.(action) ?? false,
    setPaused(value) {
      if (paused === value) return;
      paused = value;
      syncLoop();
    },
    reset: () => {
      options = normalizeOptions(initialOptions);
      buildMotion();
      panelCtrl?.render();
    },
    destroy() {
      stopLoop();
      observer?.disconnect();
      stageBtn.removeEventListener('pointerdown', onPointerDown);
      stageBtn.removeEventListener('pointermove', onPointerMove);
      stageBtn.removeEventListener('pointerup', onPointerEnd);
      stageBtn.removeEventListener('pointercancel', onPointerEnd);
      stageBtn.removeEventListener('lostpointercapture', onPointerEnd);
      stageBtn.removeEventListener('pointerleave', onPointerLeave);
      stageBtn.removeEventListener('click', onStageClick);
      doc.removeEventListener('click', onDocClick, true);
      doc.removeEventListener('keydown', onDocKeyDown);
      doc.removeEventListener('visibilitychange', syncLoop);
      reducedMotion?.removeEventListener?.('change', syncLoop);
      closePanel();
      wrapper.remove();
      motion = null;
    },
  };
}
