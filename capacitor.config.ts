import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId:   'com.veryshort.app',
  appName: 'VS · Very Short',
  webDir:  'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration:    1200,
      backgroundColor:       '#000000',
      androidScaleType:      'CENTER_CROP',
      showSpinner:           false,
      splashFullScreen:      true,
      splashImmersive:       true
    },
    StatusBar: {
      style:           'DARK',
      backgroundColor: '#000000'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
}

export default config
