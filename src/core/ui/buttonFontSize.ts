/** Shrink a single-line label to the measured space without enlarging short labels. */
export function buttonFontSize(base: number, available: number, natural: number): number {
  if (available <= 0 || natural <= 0) return base;
  return base * Math.min(1, available / natural);
}
