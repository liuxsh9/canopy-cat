import { clamp } from '../src/core/seasonalTreeArt.js';

export function petBounds(monitors, primary, position, logicalSize) {
  const previousMonitor = position && monitors.find(({ position: origin, size }) => (
    position.x >= origin.x && position.x < origin.x + size.width &&
    position.y >= origin.y && position.y < origin.y + size.height
  ));
  const monitor = previousMonitor || primary || monitors[0];
  if (!monitor) return null;

  const { position: workOrigin, size: workSize } = monitor.workArea;
  const width = Math.ceil(logicalSize.width * monitor.scaleFactor);
  const height = Math.ceil(logicalSize.height * monitor.scaleFactor);
  const right = Math.max(workOrigin.x, workOrigin.x + workSize.width - width);
  const bottom = Math.max(workOrigin.y, workOrigin.y + workSize.height - height);
  const gap = Math.round(12 * monitor.scaleFactor);

  return {
    width,
    height,
    x: clamp(previousMonitor ? position.x : right - gap, workOrigin.x, right),
    y: clamp(previousMonitor ? position.y : bottom - gap, workOrigin.y, bottom),
  };
}
