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
      clientId?: string;
      androidClientId?: string;
      forceCodeForRefreshToken?: boolean;
    };
    [key: string]: any;
  };
}

const GOOGLE_WEB_CLIENT_ID = '135467811448-gjhns9dorgp398v16pvrumseoa3nadgr.apps.googleusercontent.com';

const config: CapacitorAppConfig = {
  appId: 'com.athar.islamic',
  appName: 'أَثَرُ',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'localhost',
    cleartext: true,
    allowNavigation: [
      'https://omixodcgbijfjrxgyviz.supabase.co',
      'omixodcgbijfjrxgyviz.supabase.co',
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
      serverClientId: GOOGLE_WEB_CLIENT_ID,
      clientId: GOOGLE_WEB_CLIENT_ID,
      androidClientId: GOOGLE_WEB_CLIENT_ID,
      forceCodeForRefreshToken: false,
    },
  },
};

export default config;
