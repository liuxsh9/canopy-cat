import type { CSSProperties, ForwardRefExoticComponent, RefAttributes } from 'react';
import type { CanopyCatInstance, CanopyCatOptions } from './index.d.ts';

export type CanopyCatHandle = Pick<
  CanopyCatInstance,
  'setOptions' | 'getOptions' | 'triggerAction' | 'regrow' | 'poke' | 'reset'
>;

export interface CanopyCatProps extends Omit<CanopyCatOptions, 'onChange'> {
  className?: string;
  style?: CSSProperties;
}

export declare const CanopyCat: ForwardRefExoticComponent<CanopyCatProps & RefAttributes<CanopyCatHandle>>;
export default CanopyCat;
