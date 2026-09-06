/** Canonical spelling only: no stemming or semantic substitutions. */
export function normalizeClue(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("it")
    .replace(/[’‘ʼ`]/g, "'")
    .trim();
}
export function normalizeAnswer(value: string): string {
  return normalizeClue(value)
    .replace(/^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu, "")
    .replace(/\s+/gu, " ");
}
