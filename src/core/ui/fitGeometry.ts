export interface Size { width: number; height: number }

/** Position the unscaled layout box; the transform scales around its centre. */
export function fitContent(viewport: Size, content: Size) {
  const measured = [viewport.width, viewport.height, content.width, content.height]
    .every(value => Number.isFinite(value) && value > 0);
  return {
    scale: measured ? Math.min(1, viewport.width / content.width, viewport.height / content.height) : 0,
    left: (viewport.width - content.width) / 2,
    top: (viewport.height - content.height) / 2,
  };
}
