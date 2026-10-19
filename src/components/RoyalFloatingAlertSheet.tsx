import React from 'react';
import { ReminderPlaybackMode } from '../types';

/**
 * RoyalFloatingAlertSheet - تم حذف وإلغاء تنبيه الويب الداخلي بالكامل
 * والاعتماد الحصري بنسبة 100% على النافذة العائمة الأصلية لنظام أندرويد (AtharFloatingWindowService)
 * لمنع تكرار الواجهات وازدواجية الصوت نهائياً.
 */
export interface FloatingAlertPayload {
  id?: string | number;
  type?: 'ayah_daily' | 'dhikr_salawat' | 'daily_wird' | 'parents_birr' | 'diagnostic_test' | string;
  category?: string;
  title: string;
  body: string;
  badge?: string;
  audioUrl?: string;
  surahNumber?: number;
  ayahNumber?: number;
  surahName?: string;
  verseText?: string;
  reciterName?: string;
  adhkarCategory?: string;
  playSound?: boolean;
  playbackMode?: ReminderPlaybackMode;
  actionText?: string;
  targetTab?: string;
  durationMs?: number;
  elapsedMs?: number;
  isMuted?: boolean;
}

export interface RoyalFloatingAlertSheetProps {
  onNavigateTab?: (tab: string) => void;
  onOpenAyah?: (surah: number, ayah: number) => void;
  onOpenTasbih?: () => void;
  onOpenWird?: () => void;
  onOpenParents?: () => void;
  onOpenAdhkar?: (cat: string) => void;
}

export const RoyalFloatingAlertSheet: React.FC<RoyalFloatingAlertSheetProps> = () => null;
export default RoyalFloatingAlertSheet;
