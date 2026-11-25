import { CAT_BREEDS, paintCatPreview } from './core/seasonalCatArt.js';
import {
  CAT_TYPES,
  GUST_OPTIONS,
  RANGES,
  resolveTreeKey,
  TREE_STYLES,
  TREE_TYPES,
  WEATHER_PRESETS,
  WIND_DIRECTIONS,
} from './core/presets.js';

const PIXEL_PLAY_URL = 'https://feralui.dev/pixel-play';
const CANOPY_CAT_URL = 'https://github.com/liuxsh9/canopy-cat';

export const PANEL_CSS = `
:host {
  --cc-bg: #ffffff;
  --cc-bg-hover: #f3f4f6;
  --cc-border: #e5e7eb;
  --cc-border-strong: #d1d5db;
  --cc-text: #1f2937;
  --cc-text-secondary: #4b5563;
  --cc-text-tertiary: #6b7280;
  --cc-primary: #2563eb;
  --cc-radius: 8px;
  --cc-shadow: 0 10px 30px rgba(15, 23, 42, 0.14);
  --cc-font: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
  display: block;
  font-family: var(--cc-font);
}

:host([data-theme="dark"]) {
  --cc-bg: #181c24;
  --cc-bg-hover: #232936;
  --cc-border: #2c3444;
  --cc-border-strong: #3b4559;
  --cc-text: #f3f4f6;
  --cc-text-secondary: #cbd5e1;
  --cc-text-tertiary: #94a3b8;
  --cc-primary: #60a5fa;
  --cc-shadow: 0 12px 32px rgba(0, 0, 0, 0.48);
}

@media (prefers-color-scheme: dark) {
  :host([data-theme="auto"]) {
    --cc-bg: #181c24;
    --cc-bg-hover: #232936;
    --cc-border: #2c3444;
    --cc-border-strong: #3b4559;
    --cc-text: #f3f4f6;
    --cc-text-secondary: #cbd5e1;
    --cc-text-tertiary: #94a3b8;
    --cc-primary: #60a5fa;
    --cc-shadow: 0 12px 32px rgba(0, 0, 0, 0.48);
  }
}

.cc-root {
  position: relative;
  display: inline-block;
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
}

.cc-root[data-position="bottom-right"] {
  position: fixed;
  right: 12px;
  bottom: 8px;
  z-index: 9999;
}

.cc-root[data-position="bottom-left"] {
  position: fixed;
  left: 12px;
  bottom: 8px;
  z-index: 9999;
}

.cc-stage {
  position: relative;
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  pointer-events: auto;
  cursor: pointer;
  outline: none;
  line-height: 0;
}

.cc-stage:focus-visible {
  outline: 2px solid var(--cc-primary);
  outline-offset: 2px;
  border-radius: var(--cc-radius);
}

.cc-stage[data-hover="grabbable"] {
  cursor: grab;
}

.cc-stage[data-dragging="true"] {
  cursor: grabbing;
}

.cc-stage[data-hover="companion"] {
  cursor: pointer;
}

.cc-stage canvas {
  display: block;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.cc-panel {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  width: min(312px, calc(100vw - 24px));
  max-height: min(440px, calc(100vh - 96px));
  display: flex;
  flex-direction: column;
  background: var(--cc-bg);
  color: var(--cc-text);
  border: 1px solid var(--cc-border);
  border-radius: var(--cc-radius);
  box-shadow: var(--cc-shadow);
  font-size: 12px;
  line-height: 1.4;
  pointer-events: auto;
  z-index: 10000;
  overflow: hidden;
}

.cc-root[data-position="bottom-left"] .cc-panel {
  right: auto;
  left: 0;
}

.cc-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--cc-border);
}

.cc-panel-title {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
  font-size: 13px;
}

.cc-icon-btn,
.cc-btn {
  font: inherit;
  color: var(--cc-text-secondary);
  background: transparent;
  border: 1px solid var(--cc-border);
  border-radius: 6px;
  padding: 3px 8px;
  cursor: pointer;
  line-height: 1.3;
  transition: background 0.14s, color 0.14s, border-color 0.14s;
}

.cc-icon-btn {
  padding: 1px 6px;
  font-size: 11px;
  border-color: transparent;
}

.cc-icon-btn:hover,
.cc-btn:hover {
  background: var(--cc-bg-hover);
  color: var(--cc-text);
}

.cc-panel-body {
  padding: 8px 10px 10px;
  overflow-y: auto;
  display: grid;
  gap: 2px;
}

.cc-source {
  margin-bottom: 6px;
  padding: 6px 8px;
  border: 1px solid var(--cc-border);
  border-radius: 6px;
  background: var(--cc-bg-hover);
  color: var(--cc-text-secondary);
  font-size: 11px;
}

.cc-source p {
  margin: 0 0 4px;
}

.cc-source-links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
}

.cc-source a {
  color: var(--cc-primary);
  text-decoration: underline;
}

.cc-group {
  padding: 6px 0;
  border-top: 1px solid var(--cc-border);
}

.cc-group:first-of-type {
  padding-top: 2px;
  border-top: 0;
}

.cc-group-title {
  margin-bottom: 5px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--cc-text-tertiary);
}

.cc-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 10px;
}

.cc-field {
  min-width: 0;
  display: grid;
  gap: 3px;
  color: var(--cc-text-secondary);
}

.cc-field--full {
  grid-column: 1 / -1;
}

.cc-range-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 4px;
}

.cc-range-head span {
  font-variant-numeric: tabular-nums;
  color: var(--cc-text-tertiary);
}

.cc-select-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.cc-panel select {
  width: 100%;
  min-width: 0;
  font: inherit;
  color: var(--cc-text);
  background: var(--cc-bg);
  border: 1px solid var(--cc-border-strong);
  border-radius: 6px;
  padding: 3px 6px;
}

.cc-panel input[type="range"] {
  width: 100%;
  margin: 0;
  accent-color: var(--cc-primary);
}

.cc-cat-preview {
  flex: none;
  display: grid;
  place-items: center;
  width: 32px;
  height: 26px;
  border: 1px solid var(--cc-border);
  border-radius: 6px;
  background: var(--cc-bg-hover);
  overflow: hidden;
}

.cc-cat-preview canvas {
  display: block;
  width: 30px;
  height: 26px;
  image-rendering: pixelated;
}

.cc-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 8px;
  margin-top: 2px;
  border-top: 1px solid var(--cc-border);
}
`;

const tText = (obj, lang) => (typeof obj === 'string' ? obj : obj?.[lang] ?? obj?.en ?? '');

export function createSettingsPanel(doc, { getOptions, update, reset, regrow, onClose }) {
  const section = doc.createElement('section');
  section.className = 'cc-panel';
  let showSource = false;

  function render() {
    const opts = getOptions();
    const lang = opts.lang;
    const resolvedTree = resolveTreeKey(opts.tree);
    const style = TREE_STYLES[resolvedTree];
    const recCatKey = style.artwork.recommendedCat ?? 'russian-blue';
    const recCatLabel = CAT_BREEDS[recCatKey]?.label;
    const resolvedCat = opts.cat === 'none' ? null : opts.cat === 'auto' ? recCatKey : opts.cat;

    const catOptions = {
      ...CAT_TYPES,
      auto: recCatLabel
        ? { en: `Auto (${recCatLabel.en})`, zh: `随树推荐（${recCatLabel.zh}）` }
        : CAT_TYPES.auto,
    };

    section.setAttribute('aria-label', tText(style.settings, lang));
    section.innerHTML = '';

    const head = doc.createElement('div');
    head.className = 'cc-panel-head';
    const titleWrap = doc.createElement('div');
    titleWrap.className = 'cc-panel-title';
    const strong = doc.createElement('strong');
    strong.textContent = tText(TREE_TYPES[resolvedTree], lang);
    const infoBtn = doc.createElement('button');
    infoBtn.type = 'button';
    infoBtn.className = 'cc-icon-btn';
    infoBtn.textContent = 'ⓘ';
    infoBtn.title = lang === 'zh' ? '参考来源' : 'Inspiration';
    infoBtn.onclick = () => { showSource = !showSource; render(); };
    titleWrap.append(strong, infoBtn);

    const closeBtn = doc.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'cc-btn';
    closeBtn.textContent = lang === 'zh' ? '关闭' : 'Close';
    closeBtn.onclick = onClose;
    head.append(titleWrap, closeBtn);

    const body = doc.createElement('div');
    body.className = 'cc-panel-body';

    if (showSource) {
      const src = doc.createElement('div');
      src.className = 'cc-source';
      const p = doc.createElement('p');
      p.textContent = lang === 'zh'
        ? '季节树动画灵感来自 FeralUI 的 Pixel Play。'
        : 'Seasonal tree motion inspired by Pixel Play from FeralUI.';
      const links = doc.createElement('div');
      links.className = 'cc-source-links';
      const a = doc.createElement('a');
      a.href = PIXEL_PLAY_URL;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = lang === 'zh' ? '查看原作 · feralui.dev' : 'View original · feralui.dev';
      const repo = doc.createElement('a');
      repo.href = CANOPY_CAT_URL;
      repo.target = '_blank';
      repo.rel = 'noopener noreferrer';
      repo.textContent = lang === 'zh' ? '开源项目 · CanopyCat' : 'Open source · CanopyCat';
      links.append(a, repo);
      src.append(p, links);
      body.appendChild(src);
    }

    const makeSelect = (labelObj, value, options, onChange, { full = false, trailing = null } = {}) => {
      const wrap = doc.createElement('div');
      wrap.className = `cc-field${full ? ' cc-field--full' : ''}`;
      const label = doc.createElement('label');
      label.textContent = tText(labelObj, lang);
      const row = doc.createElement('div');
      if (trailing) row.className = 'cc-select-row';
      const select = doc.createElement('select');
      for (const [k, v] of Object.entries(options)) {
        const opt = doc.createElement('option');
        opt.value = k;
        opt.textContent = tText(v, lang);
        if (k === value) opt.selected = true;
        select.appendChild(opt);
      }
      select.onchange = () => onChange(select.value);
      row.appendChild(select);
      if (trailing) row.appendChild(trailing);
      wrap.append(label, row);
      return wrap;
    };

    const makeRange = (labelObj, value, { min, max, step }, onChange, { full = false } = {}) => {
      const wrap = doc.createElement('div');
      wrap.className = `cc-field${full ? ' cc-field--full' : ''}`;
      const top = doc.createElement('div');
      top.className = 'cc-range-head';
      const label = doc.createElement('label');
      label.textContent = tText(labelObj, lang);
      const valSpan = doc.createElement('span');
      valSpan.textContent = `${value}%`;
      top.append(label, valSpan);
      const input = doc.createElement('input');
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(value);
      input.oninput = () => {
        valSpan.textContent = `${input.valueAsNumber}%`;
        onChange(input.valueAsNumber);
      };
      wrap.append(top, input);
      return wrap;
    };

    const makeGroup = (titleObj, nodes) => {
      const g = doc.createElement('div');
      g.className = 'cc-group';
      const h = doc.createElement('div');
      h.className = 'cc-group-title';
      h.textContent = tText(titleObj, lang);
      const fields = doc.createElement('div');
      fields.className = 'cc-fields';
      nodes.forEach(n => fields.appendChild(n));
      g.append(h, fields);
      return g;
    };

    let previewBadge = null;
    if (resolvedCat) {
      previewBadge = doc.createElement('span');
      previewBadge.className = 'cc-cat-preview';
      previewBadge.setAttribute('aria-hidden', 'true');
      const pc = doc.createElement('canvas');
      pc.width = 60;
      pc.height = 52;
      paintCatPreview(pc, resolvedCat);
      previewBadge.appendChild(pc);
    }

    body.appendChild(makeGroup(
      { en: 'Scene & companion', zh: '场景与伴侣' },
      [
        makeSelect({ en: 'Tree', zh: '树种' }, opts.tree, TREE_TYPES, tree => update({ tree })),
        makeSelect({ en: 'Cat', zh: '小猫' }, opts.cat, catOptions, cat => update({ cat }), { trailing: previewBadge }),
        makeRange({ en: 'Tree size', zh: '树木大小' }, opts.size, RANGES.size, size => update({ size }), { full: true }),
      ],
    ));

    const weatherOpts = Object.fromEntries(Object.entries(WEATHER_PRESETS).map(([k, v]) => [k, v.label]));
    body.appendChild(makeGroup(
      { en: 'Weather & wind', zh: '天气与风力' },
      [
        makeSelect({ en: 'Weather', zh: '天气' }, opts.weather, weatherOpts, weather => {
          const preset = WEATHER_PRESETS[weather];
          update({ weather, speed: preset.speed, gusts: preset.gusts });
        }),
        makeSelect({ en: 'Wind direction', zh: '风向' }, opts.direction, WIND_DIRECTIONS, direction => update({ direction })),
        makeRange({ en: 'Wind speed', zh: '风速' }, opts.speed, RANGES.speed, speed => update({ speed })),
        makeSelect({ en: 'Gusts', zh: '阵风' }, opts.gusts, GUST_OPTIONS, gusts => update({ gusts })),
      ],
    ));

    body.appendChild(makeGroup(
      style.foliageSection,
      [
        makeRange(style.shedding, opts.sheddingSpeed, RANGES.sheddingSpeed, sheddingSpeed => update({ sheddingSpeed })),
        makeRange(style.growth, opts.growthSpeed, RANGES.growthSpeed, growthSpeed => update({ growthSpeed })),
        makeRange(style.retention, opts.leafRetention, RANGES.leafRetention, leafRetention => update({ leafRetention }), { full: true }),
      ],
    ));

    const foot = doc.createElement('div');
    foot.className = 'cc-foot';
    const resetBtn = doc.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'cc-btn';
    resetBtn.textContent = lang === 'zh' ? '恢复默认' : 'Restore defaults';
    resetBtn.onclick = reset;
    const regrowBtn = doc.createElement('button');
    regrowBtn.type = 'button';
    regrowBtn.className = 'cc-btn';
    regrowBtn.textContent = tText(style.regrow, lang);
    regrowBtn.onclick = regrow;
    foot.append(resetBtn, regrowBtn);
    body.appendChild(foot);

    section.append(head, body);
  }

  render();
  return { element: section, render };
}
