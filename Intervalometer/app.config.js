const { withAndroidManifest } = require('@expo/config-plugins');

// The Script: Forces Android to accept the Voice/NewArch conflict
const withAndroidToolsPatch = (config) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;
    const mainApplication = manifest.application[0];

    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    mainApplication.$['tools:replace'] = 'android:appComponentFactory';

    return config;
  });
};

module.exports = {
  expo: {
    name: "Intervalometer",
    slug: "Intervalometer",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    newArchEnabled: true, 
    
    extra: {
      eas: {
        projectId: "68bb2296-244a-4ed8-8862-e8814418b7f3"
      }
    },

    ios: {
      supportsTablet: true,
      infoPlist: {
        NSMicrophoneUsageDescription: "Allow the app to listen for the 'Go' command to advance steps.",
        NSSpeechRecognitionUsageDescription: "Allow the app to recognize your voice for the 'Go' command."
      }
    },
    android: {
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.INTERNET"
      ],
      package: "com.awesomeprojectboris.Intervalometer"
    },
    web: {
      output: "static"
    },
    plugins: [
      "expo-router",
      [
        "expo-build-properties",
        {
          android: {
            useAndroidX: true,
            enableJetifier: true 
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    }
  }
};

module.exports.expo = withAndroidToolsPatch(module.exports.expo);