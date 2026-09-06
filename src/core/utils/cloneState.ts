/** Game state contains plain objects/arrays only. Works on native engines too,
 * without relying on structuredClone being available in Hermes. */
export function cloneState<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(item => cloneState(item)) as T;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneState(item)])) as T;
}
