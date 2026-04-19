// We import from `@firebase/auth` directly (not the `firebase/auth` wrapper)
// because only the underlying package exposes a `react-native` main field that
// points to the RN bundle — which is the only one that registers the Auth
// component via `registerAuth("ReactNative")` at module load.
//
// The public types don't surface `getReactNativePersistence` (it lives only
// in the RN entry), so we augment the module here.

export {};

declare module '@firebase/auth' {
  export function getReactNativePersistence(
    storage: unknown
  ): import('@firebase/auth').Persistence;
}
