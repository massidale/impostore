module.exports = {
  expo: {
    name: "gamesHub",
    slug: "games-hub",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/LOGO.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/LOGO.png",
      resizeMode: "contain",
      backgroundColor: "#111827"
    },
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/LOGO.png",
        backgroundColor: "#111827"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false
    },
    web: {
      favicon: "./assets/LOGO.png",
      name: "gamesHub",
      shortName: "gamesHub",
      description: "Collezione di party game italiani multiplayer",
      themeColor: "#111827",
      backgroundColor: "#111827",
      display: "standalone",
      orientation: "portrait",
      bundler: "metro"
    }
  }
};
