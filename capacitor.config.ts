/// <reference types="@capacitor/local-notifications" />

export interface CapacitorAppConfig {
  appId: string;
  appName: string;
  webDir: string;
  bundledWebRuntime?: boolean;
  server?: {
    androidScheme?: string;
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
    [key: string]: any;
  };
}

const config: CapacitorAppConfig = {
  appId: 'com.athar.islamic',
  appName: 'أَثَرُ',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
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
    // إعدادات CapGo لتلقي التحديثات تلقائياً
    CapacitorUpdater: {
      autoUpdate: true,
      statsUrl: 'https://capgo.app/api/stats',
      channel: 'production',
    },
    // إعدادات مصادقة Google الصحيحة والمطابقة لمشروع athar-e45df
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '415933880825-i4k5hbei0fb3l9e3bmp5kh4daitkkpag.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
