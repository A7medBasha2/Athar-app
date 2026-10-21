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
      channel: 'production',
    },
    // إعدادات مصادقة Google الأصلية لمنع فتح المتصفح الخارجي وظهور الخطأ وشاشة بيضاء (محدثة لمشروع athar-e45df)
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '135467811448-2e41ttmuthf5eqf2fedv8paoms2mhj5q.apps.googleusercontent.com',
      clientId: '135467811448-2e41ttmuthf5eqf2fedv8paoms2mhj5q.apps.googleusercontent.com',
      androidClientId: '135467811448-2e41ttmuthf5eqf2fedv8paoms2mhj5q.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
