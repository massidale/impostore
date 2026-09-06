// Metro resolves firebase/auth to its native entry on iOS/Android.
// Firebase 10 exposes this function at runtime but omits it from the web types.
export {};
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: unknown): import('firebase/auth').Persistence;
}
