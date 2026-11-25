import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { mountCanopyCat } from './mount.js';

export const CanopyCat = forwardRef(function CanopyCat(
  {
    tree = 'maple',
    cat = 'auto',
    weather = 'breezy',
    direction = 'right',
    speed,
    gusts,
    size = 150,
    growthSpeed = 100,
    sheddingSpeed = 100,
    leafRetention = 50,
    controls = true,
    lang = 'en',
    theme = 'auto',
    position = 'bottom-right',
    persist = false,
    className,
    style,
  },
  ref,
) {
  const hostRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return undefined;
    const inst = mountCanopyCat(el, {
      tree, cat, weather, direction, speed, gusts, size,
      growthSpeed, sheddingSpeed, leafRetention,
      controls, lang, theme, position, persist,
    });
    instanceRef.current = inst;
    return () => {
      inst.destroy();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    instanceRef.current?.setOptions({
      tree, cat, weather, direction, speed, gusts, size,
      growthSpeed, sheddingSpeed, leafRetention,
      controls, lang, theme, position, persist,
    });
  }, [tree, cat, weather, direction, speed, gusts, size, growthSpeed, sheddingSpeed, leafRetention, controls, lang, theme, position, persist]);

  useImperativeHandle(ref, () => ({
    setOptions: patch => instanceRef.current?.setOptions(patch),
    getOptions: () => instanceRef.current?.getOptions(),
    triggerAction: action => instanceRef.current?.triggerAction(action) ?? false,
    regrow: () => instanceRef.current?.regrow(),
    poke: branch => instanceRef.current?.poke(branch),
    reset: () => instanceRef.current?.reset(),
  }), []);

  return React.createElement('div', { ref: hostRef, className, style });
});

export default CanopyCat;
