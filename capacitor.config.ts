/// <reference types="@capacitor/local-notifications" />

export interface CapacitorAppConfig {
  appId: string;
  appName: string;
  webDir: string;
  bundledWebRuntime?: boolean;
  server?: {
    androidScheme?: string;
    hostname?: string;
    cleartext?: boolean;
    allowNavigation?: string[];
    [key: string]: any;
  };
  plugins?: {
    LocalNotifications?: {
      smallIcon?: string;
      iconColor?: string;
      sound?: string;
    };
    CapacitorUpdater?: {
      autoUpdate?: boolean;
      statsUrl?: string;
      channel?: string;
    };
    GoogleAuth?: {
      scopes?: string[];
      serverClientId?: string;
      forceCodeForRefreshToken?: boolean;
    };
    [key: string]: any;
  };
}

const config: CapacitorAppConfig = {
  appId: 'com.athar.islamic',
  appName: 'أَثَرُ',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'localhost',
    cleartext: true,
    allowNavigation: [
      'https://omixodcgbijfrxgyviz.supabase.co',
      'omixodcgbijfrxgyviz.supabase.co',
      '*.supabase.co',
      'capgo.app',
      '*.google.com',
      '*.googleapis.com',
    ],
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_athar',
      iconColor: '#D4AF37',
      sound: 'default',
    },
    CapacitorUpdater: {
      autoUpdate: true,
      statsUrl: 'https://capgo.app/api/stats',
      channel: 'production',
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '135467811448-gjhrs9dorgp398v16pvrumsoca3nadgr.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
