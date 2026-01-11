module.exports = {
  expo: {
    name: "impostore",
    slug: "impostore",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#111827"
    },
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#111827"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false
    },
    web: {
      favicon: "./assets/favicon.png",
      name: "Impostore",
      shortName: "Impostore",
      description: "Party game italiano multiplayer",
      themeColor: "#111827",
      backgroundColor: "#111827",
      display: "standalone",
      orientation: "portrait",
      bundler: "metro"
    }
  }
};
