const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Firebase JS SDK v10 ships separate bundles for web and react-native, and the
// meta wrappers (`firebase/app`, `firebase/auth`) don't expose a `react-native`
// main field. Without these overrides Metro ends up:
//   1) loading the auth **browser** bundle (which never calls
//      `registerAuth("ReactNative")` at import time), OR
//   2) loading **two** copies of @firebase/app — one used by initializeApp,
//      another used by @firebase/auth's module-level registerAuth — so the
//      registration happens on a different App than the one we pass to
//      initializeAuth.
//
// Both manifest as: "Component auth has not been registered yet".
// Pinning the exact file per package ensures a single module instance.
const aliases = {
  ios: {
    'firebase/auth': 'node_modules/@firebase/auth/dist/rn/index.js',
    '@firebase/auth': 'node_modules/@firebase/auth/dist/rn/index.js',
    'firebase/app': 'node_modules/@firebase/app/dist/index.cjs.js',
    '@firebase/app': 'node_modules/@firebase/app/dist/index.cjs.js',
  },
  android: {
    'firebase/auth': 'node_modules/@firebase/auth/dist/rn/index.js',
    '@firebase/auth': 'node_modules/@firebase/auth/dist/rn/index.js',
    'firebase/app': 'node_modules/@firebase/app/dist/index.cjs.js',
    '@firebase/app': 'node_modules/@firebase/app/dist/index.cjs.js',
  },
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const platformAliases = aliases[platform];
  if (platformAliases && platformAliases[moduleName]) {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, platformAliases[moduleName]),
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
