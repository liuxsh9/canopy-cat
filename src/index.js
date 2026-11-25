export { mountCanopyCat } from './mount.js';
export { CanopyCatElement, defineCanopyCatElement } from './element.js';
export {
  CAT_TYPES,
  GUST_OPTIONS,
  RANGES,
  resolveAutoTree,
  resolveTreeKey,
  TREE_ARTWORKS,
  TREE_STYLES,
  TREE_TYPES,
  WEATHER_PRESETS,
  WIND_DIRECTIONS,
} from './core/presets.js';
export { CAT_BREED_KEYS, CAT_BREEDS, paintCatPreview } from './core/seasonalCatArt.js';
export { createSeasonalTree } from './core/seasonalTree.js';

import { defineCanopyCatElement } from './element.js';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  defineCanopyCatElement('canopy-cat');
}
