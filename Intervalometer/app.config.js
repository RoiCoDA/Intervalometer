const { withAndroidManifest, withAppBuildGradle } = require('expo/config-plugins'); 

const withAndroidToolsPatch = (config) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;
    const mainApplication = manifest.application[0];

    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    mainApplication.$['tools:replace'] = 'android:appComponentFactory';
    mainApplication.$['android:appComponentFactory'] = 'androidx.core.app.CoreComponentFactory';

    return config;
  });
};


const withGradleFixes = (config) => {
  return withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('resolutionStrategy')) {
      config.modResults.contents += `
      
      android {
          packagingOptions {
              pickFirst 'META-INF/androidx.appcompat_appcompat.version'
              pickFirst 'lib/**/libworklets.so'
          }
      }

      configurations.all {
          resolutionStrategy {
              exclude group: 'com.android.support', module: 'support-compat'
              exclude group: 'com.android.support', module: 'support-core-ui'
              exclude group: 'com.android.support', module: 'support-core-utils'
              exclude group: 'com.android.support', module: 'support-fragment'
              exclude group: 'com.android.support', module: 'support-media-compat'
              exclude group: 'com.android.support', module: 'support-v4'
              exclude group: 'com.android.support', module: 'appcompat-v7'
              exclude group: 'com.android.support', module: 'versionedparcelable'
          }
      }
      `;
    }
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
    icon: "./assets/icon.png",
    android: {
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      supportsRtl: false,
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.INTERNET"
      ],
      package: "com.awesomeprojectboris.Intervalometer",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#1a1a1a" 
      },
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

module.exports.expo = withGradleFixes(
  withAndroidToolsPatch(module.exports.expo)
);