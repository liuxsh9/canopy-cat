import { listen } from '@tauri-apps/api/event';
import { availableMonitors, getCurrentWindow, LogicalSize, PhysicalPosition, PhysicalSize, primaryMonitor } from '@tauri-apps/api/window';
import { normalizeOptions, RANGES, TREE_ARTWORKS, WEATHER_PRESETS } from '../src/core/presets.js';
import { sceneDisplaySize, SCENE_HEIGHT, SCENE_INSET, SCENE_WIDTH } from '../src/core/seasonalTreeArt.js';
import { mountCanopyCat } from '../src/mount.js';
import { createTray } from './tray.js';
import { petBounds } from './window-position.js';

const STORAGE_KEY = 'canopy-cat.desktop.v1';
const SIZES = [50, 75, 100, 125, 150, 175, 200];
const lang = navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
const petWindow = getCurrentWindow();
const dragHandle = document.querySelector('#move');

function loadPreferences() {
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    // A fresh desktop window uses the defaults if its preferences cannot be read.
  }
  const { tree, cat, weather, size } = normalizeOptions({ cat: 'seal-ragdoll', ...stored });
  const position = stored.position;
  return {
    tree,
    cat,
    weather,
    size: SIZES.includes(size) ? size : RANGES.size.initial,
    alwaysOnTop: stored.alwaysOnTop === true,
    position: Number.isFinite(position?.x) && Number.isFinite(position?.y) ? position : null,
  };
}

const preferences = loadPreferences();
const scene = mountCanopyCat('#pet', { ...preferences, controls: false, position: 'inline', lang });
scene.setPaused(true);

let shown = false;
let updateTrayVisibility;
let moveTimer;
let displayTimer;
let pending = Promise.resolve();

function run(action) {
  pending = pending.then(action).catch(error => console.error('CanopyCat desktop:', error));
}

function savePreferences() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // The pet stays usable when WebView storage is unavailable.
  }
}

async function rememberPosition() {
  const { x, y } = await petWindow.outerPosition();
  if (preferences.position?.x === x && preferences.position?.y === y) return;
  preferences.position = { x, y };
  savePreferences();
}

async function placeWindow(position, size = preferences.size) {
  const logicalSize = sceneDisplaySize(size);
  const [monitors, primary] = await Promise.all([availableMonitors(), primaryMonitor()]);
  const bounds = petBounds(monitors, primary, position, logicalSize);
  if (bounds) {
    await petWindow.setPosition(new PhysicalPosition(bounds.x, bounds.y));
    await petWindow.setSize(new PhysicalSize(bounds.width, bounds.height));
  } else {
    await petWindow.setSize(new LogicalSize(logicalSize.width, logicalSize.height));
  }
}

function positionDragHandle() {
  const { x, y } = TREE_ARTWORKS[preferences.tree].root;
  dragHandle.style.left = `${(x + SCENE_INSET.x) / SCENE_WIDTH * 100}%`;
  dragHandle.style.top = `${(y + SCENE_INSET.y) / SCENE_HEIGHT * 100}%`;
}

async function setScene(field, value) {
  if (field === 'size') await placeWindow(await petWindow.outerPosition(), value);
  const patch = { [field]: value };
  if (field === 'weather') {
    const { speed, gusts } = WEATHER_PRESETS[value];
    Object.assign(patch, { speed, gusts });
  }
  scene.setOptions(patch);
  preferences[field] = value;
  if (field === 'tree') positionDragHandle();
  savePreferences();
}

async function show() {
  if (shown) return;
  await placeWindow(preferences.position);
  await petWindow.show();
  shown = true;
  scene.setPaused(false);
  await updateTrayVisibility(true);
  await rememberPosition();
}

async function hide() {
  await rememberPosition();
  await petWindow.hide();
  shown = false;
  scene.setPaused(true);
  await updateTrayVisibility(false);
}

async function setTop(value) {
  await petWindow.setAlwaysOnTop(value);
  preferences.alwaysOnTop = value;
  savePreferences();
}

async function resetPosition() {
  await placeWindow(null);
  await rememberPosition();
}

document.documentElement.lang = lang;
dragHandle.title = lang === 'zh' ? '拖动树干底部移动宠物' : 'Drag the base to move the pet';
dragHandle.setAttribute('aria-label', dragHandle.title);
dragHandle.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  event.preventDefault();
  petWindow.startDragging().catch(error => console.error('CanopyCat drag:', error));
});
positionDragHandle();

run(async () => {
  await petWindow.setAlwaysOnTop(preferences.alwaysOnTop);
  updateTrayVisibility = await createTray({
    lang, preferences, sizes: SIZES, run, setScene, show, hide, setTop, rememberPosition,
    reset: resetPosition,
    setClickThrough: value => petWindow.setIgnoreCursorEvents(value),
  });
  await Promise.all([
    listen('desktop:show', () => run(show)),
    listen('desktop:display-change', () => {
      clearTimeout(displayTimer);
      displayTimer = setTimeout(() => run(async () => {
        if (!shown) return;
        await placeWindow(await petWindow.outerPosition());
        await rememberPosition();
      }), 200);
    }),
    petWindow.onMoved(() => {
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => run(async () => {
        if (shown) await rememberPosition();
      }), 160);
    }),
  ]);
  await show();
});
