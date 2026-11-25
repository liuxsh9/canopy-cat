import { mountCanopyCat } from './mount.js';

const ATTR_MAP = {
  tree: 'tree',
  cat: 'cat',
  weather: 'weather',
  direction: 'direction',
  'wind-direction': 'direction',
  speed: 'speed',
  'wind-speed': 'speed',
  gusts: 'gusts',
  size: 'size',
  'growth-speed': 'growthSpeed',
  'shedding-speed': 'sheddingSpeed',
  'leaf-retention': 'leafRetention',
  controls: 'controls',
  lang: 'lang',
  theme: 'theme',
  position: 'position',
  persist: 'persist',
};

function parseAttr(name, value) {
  if (name === 'controls') return value !== 'false' && value !== '0';
  if (name === 'persist') return value !== null && value !== 'false' && value !== '0';
  if (['speed', 'wind-speed', 'size', 'growth-speed', 'shedding-speed', 'leaf-retention'].includes(name)) {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return value ?? undefined;
}

const BaseElement = typeof HTMLElement === 'function' ? HTMLElement : class {};

export class CanopyCatElement extends BaseElement {
  static get observedAttributes() {
    return Object.keys(ATTR_MAP);
  }

  constructor() {
    super();
    this._instance = null;
  }

  _collectOptions() {
    const opts = {};
    for (const attr of CanopyCatElement.observedAttributes) {
      if (!this.hasAttribute(attr)) continue;
      const parsed = parseAttr(attr, this.getAttribute(attr));
      if (parsed !== undefined) opts[ATTR_MAP[attr]] = parsed;
    }
    return opts;
  }

  connectedCallback() {
    if (this._instance) return;
    this._instance = mountCanopyCat(this, this._collectOptions());
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal || !this._instance) return;
    const key = ATTR_MAP[name];
    if (!key) return;
    const parsed = parseAttr(name, newVal);
    if (parsed !== undefined) this._instance.setOptions({ [key]: parsed });
  }

  disconnectedCallback() {
    this._instance?.destroy();
    this._instance = null;
  }

  setOptions(patch) {
    this._instance?.setOptions(patch);
  }

  getOptions() {
    return this._instance?.getOptions() ?? this._collectOptions();
  }

  triggerAction(action) {
    return this._instance?.triggerAction(action) ?? false;
  }

  regrow() {
    this._instance?.regrow();
  }

  poke(branch) {
    this._instance?.poke(branch);
  }
}

export function defineCanopyCatElement(tagName = 'canopy-cat') {
  if (typeof customElements !== 'undefined' && !customElements.get(tagName)) {
    customElements.define(tagName, CanopyCatElement);
  }
}
