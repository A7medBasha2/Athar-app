/// <reference types="@capacitor/local-notifications" />

export interface CapacitorAppConfig {
  appId: string;
  appName: string;
  webDir: string;
  bundledWebRuntime?: boolean;
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
      channel: 'production'
    }
  },
};

export default config;
