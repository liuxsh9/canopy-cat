export type TreeOption = 'cherry' | 'silk' | 'maple' | 'plum';
export type ResolvedTree = TreeOption;
export type CatOption =
  | 'auto'
  | 'none'
  | 'russian-blue'
  | 'calico'
  | 'tuxedo'
  | 'ginger'
  | 'silver-tabby'
  | 'ragdoll'
  | 'american-curl'
  | 'orange-rex';
export type WeatherPreset = 'calm' | 'breezy' | 'storm';
export type WindDirection = 'left' | 'right';
export type GustLevel = 'off' | 'light' | 'strong';
export type CatAction = 'pet' | 'scratch' | 'climb' | 'groom' | 'nap' | 'stretch' | 'stroll' | 'jumpDown';

export interface CanopyCatOptions {
  tree?: TreeOption;
  cat?: CatOption;
  weather?: WeatherPreset;
  direction?: WindDirection;
  speed?: number;
  gusts?: GustLevel;
  size?: number;
  growthSpeed?: number;
  sheddingSpeed?: number;
  leafRetention?: number;
  controls?: boolean;
  lang?: 'en' | 'zh';
  theme?: 'auto' | 'light' | 'dark';
  position?: 'bottom-right' | 'bottom-left' | 'inline';
  persist?: boolean;
  onChange?: (options: Required<Omit<CanopyCatOptions, 'onChange'>>) => void;
}

export interface CanopyCatInstance {
  getOptions(): Required<Omit<CanopyCatOptions, 'onChange'>> & { resolvedTree: ResolvedTree };
  setOptions(patch: Partial<CanopyCatOptions>): void;
  openPanel(): void;
  closePanel(): void;
  regrow(): void;
  poke(branch?: string): void;
  triggerAction(action: CatAction): boolean;
  reset(): void;
  destroy(): void;
}

export declare function mountCanopyCat(target: Element | string, options?: CanopyCatOptions): CanopyCatInstance;
export declare function defineCanopyCatElement(tagName?: string): void;
export declare function resolveTreeKey(tree?: TreeOption): ResolvedTree;
export declare function paintCatPreview(canvas: HTMLCanvasElement, breedKey: Exclude<CatOption, 'auto' | 'none'>): void;
export declare const CAT_BREED_KEYS: readonly Exclude<CatOption, 'auto' | 'none'>[];
export declare const CAT_BREEDS: Record<string, { label: { en: string; zh: string }; recommendedFor: ResolvedTree | null }>;
export declare const TREE_TYPES: Record<TreeOption, { en: string; zh: string }>;
export declare const WEATHER_PRESETS: Record<WeatherPreset, { label: { en: string; zh: string }; speed: number; gusts: GustLevel }>;

export declare class CanopyCatElement extends HTMLElement {
  setOptions(patch: Partial<CanopyCatOptions>): void;
  getOptions(): ReturnType<CanopyCatInstance['getOptions']>;
  triggerAction(action: CatAction): boolean;
  regrow(): void;
  poke(branch?: string): void;
}
