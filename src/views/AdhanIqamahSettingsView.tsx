import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowRight, Bell, Volume2, VolumeX, Shield, Play, Square,
  Sparkles, CheckCircle2, Clock, Check, Moon, Sun, 
  Sunset, Compass, HeartHandshake, Eye, Volume1
} from 'lucide-react';
import { AppSettings, ObligatoryPrayerId, PrayerAdhanSetting, IqamahOffsets } from '../types';
import { StorageService } from '../services/storageService';
import { NativePermissionsBridge } from '../services/nativePermissionsBridge';
import { AudioService } from '../services/audioService';

interface Props {
  onBack: () => void;
  hideHeader?: boolean;
}

const PRAYERS_LIST: Array<{
  id: ObligatoryPrayerId;
  name: string;
  defaultOffset: number;
  icon: typeof Sun;
  timeEstimate: string;
}> = [
  { id: 'fajr', name: 'صلاة الفجر', defaultOffset: 20, icon: Moon, timeEstimate: 'الفجر الصادق وتجلي النور' },
  { id: 'dhuhr', name: 'صلاة الظهر', defaultOffset: 15, icon: Sun, timeEstimate: 'زوال الشمس وتوسط السماء' },
  { id: 'asr', name: 'صلاة العصر', defaultOffset: 15, icon: Compass, timeEstimate: 'ظل كل شيء مثله' },
  { id: 'maghrib', name: 'صلاة المغرب', defaultOffset: 10, icon: Sunset, timeEstimate: 'غروب قرص الشمس وشفق الغروب' },
  { id: 'isha', name: 'صلاة العشاء', defaultOffset: 15, icon: Moon, timeEstimate: 'غياب الشفق الأحمر وهدوء الليل' },
];

const MUADHIN_VOICES: Array<{
  id: 'alafasy' | 'makkah' | 'madinah' | 'alaqsa';
  name: string;
  title: string;
  audioUrl: string;
}> = [
  { id: 'alafasy', name: 'مشاري راشد العفاسي', title: 'تلاوة ندية خاشعة ومميزة', audioUrl: '/audio/adhan_alafasy.mp3' },
  { id: 'makkah', name: 'الحرم المكي الشريف', title: 'أذان المسجد الحرام بمكة المكرمة', audioUrl: '/audio/adhan_makkah.mp3' },
  { id: 'madinah', name: 'المسجد النبوي الشريف', title: 'أذان الروضة الشريفة بالمدينة', audioUrl: '/audio/adhan_madinah.mp3' },
  { id: 'alaqsa', name: 'المسجد الأقصى المبارك', title: 'أذان القدس الشريف والمسجد الأقصى', audioUrl: '/audio/adhan_alaqsa.mp3' },
];

export const AdhanIqamahSettingsView: React.FC<Props> = ({ onBack, hideHeader = false }) => {
  const [settings, setSettings] = useState<AppSettings>(() => StorageService.getSettings());
  const [testingPrayer, setTestingPrayer] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [previewAudioId, setPreviewAudioId] = useState<string | null>(null);
  const [playingPrayerId, setPlayingPrayerId] = useState<string | null>(null);

  const adhanCfg = settings.prayersAdhanConfig || {
    fajr: { enabled: true, voice: 'alafasy', mode: 'full', vibrate: true },
    dhuhr: { enabled: true, voice: 'alafasy', mode: 'full', vibrate: true },
    asr: { enabled: true, voice: 'alafasy', mode: 'full', vibrate: true },
    maghrib: { enabled: true, voice: 'alafasy', mode: 'full', vibrate: true },
    isha: { enabled: true, voice: 'alafasy', mode: 'full', vibrate: true },
    smartFlipToMute: true,
    priorityOverlayEnabled: true,
    fullScreenOverlayEnabled: true,
    autoEchoEnabled: true,
    autoPostAdhanDua: true,
  };

  const iqamahOffsets: IqamahOffsets = settings.iqamahSettings?.offsets || {
    fajr: 20,
    dhuhr: 15,
    asr: 15,
    maghrib: 10,
    isha: 15,
  };

  const notifyChange = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => {
      setSaveToast(null);
    }, 2400);
  };

  const updateAdhanMasterToggle = (val: boolean) => {
    const updated: AppSettings = {
      ...settings,
      adhanEnabled: val,
    };
    setSettings(updated);
    StorageService.saveSettings(updated);

    notifyChange(val ? 'تم تفعيل منظومة الأذان الملكية' : 'تم تعطيل الأذان الصوتي');
  };

  const updateFullScreenOverlayToggle = (val: boolean) => {
    const updated: AppSettings = {
      ...settings,
      prayersAdhanConfig: {
        ...adhanCfg,
        fullScreenOverlayEnabled: val,
      },
    };
    setSettings(updated);
    StorageService.saveSettings(updated);

    notifyChange(val ? 'تم تفعيل شاشة الأذان العائمة فوق التطبيقات' : 'تم تعطيل شاشة الأذان العائمة');
  };

  const updateAutoEchoToggle = (val: boolean) => {
    const updated: AppSettings = {
      ...settings,
      prayersAdhanConfig: {
        ...adhanCfg,
        autoEchoEnabled: val,
      },
    };
    setSettings(updated);
    StorageService.saveSettings(updated);

    notifyChange(val ? 'تم تفعيل الترديد مع المؤذن' : 'تم تعطيل الترديد مع المؤذن');
  };

  const updateAutoPostDuaToggle = (val: boolean) => {
    const updated: AppSettings = {
      ...settings,
      duaAfterAdhanEnabled: val,
      prayersAdhanConfig: {
        ...adhanCfg,
        autoPostAdhanDua: val,
      },
    };
    setSettings(updated);
    StorageService.saveSettings(updated);

    notifyChange(val ? 'تم تفعيل دعاء ما بعد الأذان' : 'تم تعطيل دعاء ما بعد الأذان');
  };

  const updateIqamahMasterToggle = (val: boolean) => {
    const updated: AppSettings = {
      ...settings,
      iqamahSettings: {
        ...settings.iqamahSettings,
        enabled: val,
      },
    };
    setSettings(updated);
    StorageService.saveSettings(updated);

    notifyChange(val ? 'تم تفعيل تنبيهات الإقامة' : 'تم تعطيل تنبيهات الإقامة');
  };

  const updatePrayerAdhanSetting = (prayerId: ObligatoryPrayerId, patch: Partial<PrayerAdhanSetting>) => {
    const currentPrayerCfg = adhanCfg[prayerId] || { enabled: true, voice: 'alafasy', mode: 'full', vibrate: true };
    const updated: AppSettings = {
      ...settings,
      prayersAdhanConfig: {
        ...adhanCfg,
        [prayerId]: {
          ...currentPrayerCfg,
          ...patch,
        },
      },
    };
    setSettings(updated);
    StorageService.saveSettings(updated);

  };

  const updateIqamahOffset = (prayerId: ObligatoryPrayerId, newMinutes: number) => {
    const clamped = Math.max(5, Math.min(45, newMinutes));
    const updatedOffsets: IqamahOffsets = {
      ...iqamahOffsets,
      [prayerId]: clamped,
    };
    const updated: AppSettings = {
      ...settings,
      iqamahSettings: {
        ...settings.iqamahSettings,
        offsets: updatedOffsets,
      },
    };
    setSettings(updated);
    StorageService.saveSettings(updated);

    const pInfo = PRAYERS_LIST.find((p) => p.id === prayerId);
    notifyChange(`تم ضبط إقامة ${pInfo?.name || prayerId} بعد ${clamped} دقيقة`);
  };

  // 5-Second Test Adhan State & Timer
  const [testCountdown, setTestCountdown] = useState<number | null>(null);
  const testTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (testTimerRef.current) clearInterval(testTimerRef.current);
      AudioService.stop();
    };
  }, []);

  const handleTrigger5SecTest = async (prayerId: ObligatoryPrayerId = 'asr') => {
    if (testCountdown !== null) return;
    setTestCountdown(5);

    const pInfo = PRAYERS_LIST.find((p) => p.id === prayerId) || PRAYERS_LIST[0];
    const prayerCfg = adhanCfg[prayerId] || { voice: 'alafasy' };
    const voiceObj = MUADHIN_VOICES.find((v) => v.id === prayerCfg.voice) || MUADHIN_VOICES[0];
    const iqMinutes = iqamahOffsets[prayerId] ?? 15;

    notifyChange('⏳ جاري جدولة تجربة الأذان بعد 5 ثوانٍ... يمكنك قفل الشاشة الآن!');

    try {
      await NativePermissionsBridge.triggerTestAdhan(5, {
        prayerId: pInfo.id,
        prayerName: pInfo.name,
        prayerTime: 'الآن',
        muadhinName: voiceObj.name,
        audioUrl: voiceObj.audioUrl,
      });
    } catch (e: any) {
      console.warn('triggerTestAdhan failed:', e);
    }

    let rem = 5;
    if (testTimerRef.current) clearInterval(testTimerRef.current);
    testTimerRef.current = setInterval(() => {
      rem -= 1;
      if (rem <= 0) {
        if (testTimerRef.current) clearInterval(testTimerRef.current);
        setTestCountdown(null);
      } else {
        setTestCountdown(rem);
      }
    }, 1000);
  };

  const handleCancel5SecTest = () => {
    if (testTimerRef.current) clearInterval(testTimerRef.current);
    testTimerRef.current = null;
    setTestCountdown(null);
    notifyChange('تم إلغاء تجربة الأذان');
  };

  const handleTestFullScreenAdhan = async (prayerId: ObligatoryPrayerId) => {
    const pInfo = PRAYERS_LIST.find((p) => p.id === prayerId) || PRAYERS_LIST[0];
    const prayerCfg = adhanCfg[prayerId] || { voice: 'alafasy' };
    const voiceObj = MUADHIN_VOICES.find((v) => v.id === prayerCfg.voice) || MUADHIN_VOICES[0];
    const iqMinutes = iqamahOffsets[prayerId] ?? 15;

    setTestingPrayer(prayerId);

    try {
      const res = await NativePermissionsBridge.showFullScreenAzan({
        prayerId: pInfo.id,
        prayerName: pInfo.name,
        prayerTime: 'الآن',
        muadhinName: voiceObj.name,
        audioUrl: voiceObj.audioUrl,
        iqamahMinutes: iqMinutes,
        autoDua: adhanCfg.autoPostAdhanDua ?? true,
        autoEcho: adhanCfg.autoEchoEnabled ?? true,
      });

      if (res.requiresPermission) {
        notifyChange(`تم تشغيل شاشة الأذان التجريبية لـ ${pInfo.name}`);
      } else {
        notifyChange(`تم تشغيل شاشة الأذان الملكية لـ ${pInfo.name}`);
      }
    } catch (e: any) {
      console.warn('Test full screen adhan failed:', e);
      notifyChange('جاري العرض التفاعلي...');
    } finally {
      setTimeout(() => setTestingPrayer(null), 1200);
    }
  };

  const handleToggleInlinePrayerAudio = (prayerId: ObligatoryPrayerId) => {
    if (playingPrayerId === prayerId) {
      AudioService.stop();
      setPlayingPrayerId(null);
      notifyChange('تم إيقاف معاينة الصوت');
      return;
    }

    const prayerCfg = adhanCfg[prayerId] || { voice: 'alafasy' };
    let audioUrl = '/audio/adhan_alafasy.mp3';
    if (prayerId === 'fajr') {
      audioUrl = '/audio/adhan_fajr_alafasy.mp3';
    } else {
      const voiceObj = MUADHIN_VOICES.find((v) => v.id === prayerCfg.voice);
      if (voiceObj) {
        audioUrl = voiceObj.audioUrl;
      }
    }

    const pInfo = PRAYERS_LIST.find((p) => p.id === prayerId) || PRAYERS_LIST[0];
    setPlayingPrayerId(prayerId);
    setPreviewAudioId(null);
    notifyChange(`جاري تشغيل أذان ${pInfo.name}...`);

    AudioService.playUrl(
      audioUrl,
      'adhan',
      {
        title: `أذان ${pInfo.name}`,
        subtitle: 'معاينة صوتية سريعة',
      },
      {
        onEnded: () => setPlayingPrayerId(null),
        onError: () => {
          setPlayingPrayerId(null);
          notifyChange('تعذر تشغيل الصوت');
        },
      }
    );
  };

  const handlePreviewVoice = (audioUrl: string, voiceId: string) => {
    if (previewAudioId === voiceId) {
      AudioService.pause();
      setPreviewAudioId(null);
      return;
    }

    setPreviewAudioId(voiceId);
    AudioService.playUrl(
      audioUrl,
      'adhan',
      {
        title: 'أذان تجريبي',
        subtitle: 'تطبيق أثر الملكي',
      },
      {
        onEnded: () => setPreviewAudioId(null),
        onError: () => setPreviewAudioId(null),
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#070707] text-[#F2EBDD] font-arabic pb-32 pt-3 px-3 sm:px-4 max-w-2xl mx-auto selection:bg-[#D4AF37]/30 selection:text-white">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#1A160E] border border-[#D4AF37] text-[#F2EBDD] px-5 py-2.5 rounded-full shadow-[0_10px_30px_rgba(214,179,106,0.3)] flex items-center gap-2.5 text-xs font-bold animate-slideDown">
          <CheckCircle2 className="w-4 h-4 text-[#E6C66E] shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Top Header / Action Row */}
      {!hideHeader ? (
        <div className="flex items-center justify-between gap-3 mb-6 pt-1 pb-4 border-b border-[#D4AF37]/20">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="min-h-[44px] min-w-[44px] rounded-2xl bg-[#151515] border border-[#D4AF37]/35 flex items-center justify-center text-[#E6C66E] hover:border-[#D4AF37] active:scale-95 transition-all shadow-md"
              aria-label="الرجوع للإعدادات"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-[#F2EBDD]">
                  إعدادات الأذان والإقامة
                </h1>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#D4AF37]/15 text-[#E6C66E] border border-[#D4AF37]/40 font-bold">
                  ملكية
                </span>
              </div>
              <p className="text-xs text-[#9E9478] mt-0.5">
                تخصيص الشاشة السينمائية، أصوات المؤذنين، ودقائق الإقامة
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 mb-4 pt-1 pb-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#F2EBDD] flex items-center gap-2">
              <span>إعدادات الأذان وشاشة القفل</span>
            </h2>
            <p className="text-xs text-[#9E9478] mt-0.5">
              تخصيص شاشة الأذان، أصوات المؤذنين لكل صلاة، ودقائق الإقامة
            </p>
          </div>
        </div>
      )}

      {/* Hero Master Card: Royal Adhan Command Center (Clean Rounded Card - No Mihrab Arch) */}
      <div className="athar-card-gold relative overflow-hidden mb-6 p-5 sm:p-6 rounded-2xl">
        {/* Subtle decorative golden glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-[#E6C66E]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Main Overlay Switch Row */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#D4AF37]/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2A2214] to-[#161410] border border-[#D4AF37]/60 flex items-center justify-center text-[#E6C66E] shadow-[0_0_15px_rgba(214,179,106,0.2)]">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-[#F2EBDD]">
                  شاشة الأذان الملكية كاملة الشاشة
                </h3>
                <p className="text-xs text-[#C8A24A] mt-0.5">
                  ظهور فوري وتلقائي فوق شاشة القفل عند دخول وقت كل صلاة
                </p>
              </div>
            </div>

            {/* Switch */}
            <label className="relative inline-flex items-center cursor-pointer min-h-[44px] min-w-[56px] justify-center">
              <input
                type="checkbox"
                checked={adhanCfg.fullScreenOverlayEnabled ?? true}
                onChange={(e) => updateFullScreenOverlayToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-[#252118] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[12px] after:start-[6px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#D4AF37] peer-checked:to-[#F3E5AB]"></div>
            </label>
          </div>

          {/* Master Adhan Sound Switch Row */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#D4AF37]/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1B1812] border border-[#D4AF37]/40 flex items-center justify-center text-[#E6C66E]">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-[#F2EBDD]">
                  النداء الصوتي للأذان
                </h3>
                <p className="text-xs text-[#9E9478] mt-0.5">
                  انطلاق صوت المؤذن في الخلفية حتى لو كان التطبيق مغلقاً
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer min-h-[44px] min-w-[56px] justify-center">
              <input
                type="checkbox"
                checked={settings.adhanEnabled}
                onChange={(e) => updateAdhanMasterToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-[#252118] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[12px] after:start-[6px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#D4AF37] peer-checked:to-[#F3E5AB]"></div>
            </label>
          </div>

          {/* Quick Sub-Toggles (Echo, Dua, Iqamah) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {/* Auto Echo Switch */}
            <div 
              onClick={() => updateAutoEchoToggle(!(adhanCfg.autoEchoEnabled ?? true))}
              className="flex items-center justify-between p-3 rounded-xl bg-[#12110D] border border-[#D4AF37]/25 hover:border-[#D4AF37]/50 cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E6C66E] shrink-0" />
                <span className="text-xs font-semibold text-[#F2EBDD]">الترديد مع المؤذن</span>
              </div>
              <input
                type="checkbox"
                checked={adhanCfg.autoEchoEnabled ?? true}
                onChange={(e) => updateAutoEchoToggle(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
              />
            </div>

            {/* Auto Dua Switch */}
            <div 
              onClick={() => updateAutoPostDuaToggle(!(adhanCfg.autoPostAdhanDua ?? true))}
              className="flex items-center justify-between p-3 rounded-xl bg-[#12110D] border border-[#D4AF37]/25 hover:border-[#D4AF37]/50 cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-[#E6C66E] shrink-0" />
                <span className="text-xs font-semibold text-[#F2EBDD]">دعاء ما بعد الأذان</span>
              </div>
              <input
                type="checkbox"
                checked={adhanCfg.autoPostAdhanDua ?? true}
                onChange={(e) => updateAutoPostDuaToggle(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
              />
            </div>

            {/* Master Iqamah Switch */}
            <div 
              onClick={() => updateIqamahMasterToggle(!(settings.iqamahSettings?.enabled ?? true))}
              className="flex items-center justify-between p-3 rounded-xl bg-[#12110D] border border-[#D4AF37]/25 hover:border-[#D4AF37]/50 cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#E6C66E] shrink-0" />
                <span className="text-xs font-semibold text-[#F2EBDD]">تنبيهات الإقامة</span>
              </div>
              <input
                type="checkbox"
                checked={settings.iqamahSettings?.enabled ?? true}
                onChange={(e) => updateIqamahMasterToggle(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Full-Screen Azan Testing Action Bar */}
          <div className="pt-3 border-t border-[#D4AF37]/20 flex flex-col sm:flex-row items-center gap-2.5">
            {/* Instant Full-Screen Test Button */}
            <button
              onClick={() => handleTestFullScreenAdhan('fajr')}
              disabled={testingPrayer !== null}
              className="w-full sm:flex-1 min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E6C66E] hover:from-[#E6C66E] hover:to-[#F3E5AB] text-[#070707] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_4px_16px_rgba(214,179,106,0.3)] cursor-pointer disabled:opacity-50"
              title="معاينة شاشة الأذان بكامل الشاشة فوراً"
            >
              <Eye className="w-4 h-4 shrink-0" />
              <span>معاينة شاشة الأذان فوراً</span>
            </button>

            {/* 5-Second Delayed Test Button */}
            {testCountdown !== null ? (
              <button
                onClick={handleCancel5SecTest}
                className="w-full sm:w-auto min-h-[44px] px-4 rounded-xl bg-red-950/60 hover:bg-red-900/60 border border-red-500/50 text-red-200 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Clock className="w-4 h-4 animate-spin text-red-400 shrink-0" />
                <span>إلغاء التجربة ({testCountdown}ث)</span>
              </button>
            ) : (
              <button
                onClick={() => handleTrigger5SecTest('fajr')}
                className="w-full sm:w-auto min-h-[44px] px-4 rounded-xl bg-[#181510] hover:bg-[#252015] border border-[#D4AF37]/40 text-[#E6C66E] font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm cursor-pointer"
                title="جدولة تجربة الأذان بعد 5 ثوانٍ لتجربتها فوق قفل الشاشة"
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span>تجربة بعد 5 ثوانٍ ⏳</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section Title */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#D4AF37]"></div>
          <h2 className="text-sm sm:text-base font-bold text-[#F2EBDD]">
            تخصيص الصلوات الخمس والمؤذنين
          </h2>
        </div>
        <span className="text-xs text-[#C8A24A] font-medium">حفظ تلقائي فوري</span>
      </div>

      {/* Prayers List Cards */}
      <div className="space-y-4">
        {PRAYERS_LIST.map((prayer) => {
          const prayerCfg = adhanCfg[prayer.id] || { enabled: true, voice: 'alafasy', mode: 'full', vibrate: true };
          const iqamahMins = iqamahOffsets[prayer.id] ?? prayer.defaultOffset;
          const currentVoice = prayerCfg.voice || 'alafasy';
          const PrayerIcon = prayer.icon;

          return (
            <div
              key={prayer.id}
              className={`rounded-2xl transition-all duration-300 border overflow-hidden ${
                prayerCfg.enabled
                  ? 'bg-gradient-to-b from-[#181510] via-[#12110D] to-[#0A0A08] border-[#D4AF37]/45 shadow-[0_8px_24px_rgba(0,0,0,0.8)]'
                  : 'bg-[#100F0D]/70 border-[#D4AF37]/15 opacity-65'
              }`}
            >
              {/* Prayer Header Row with Islamic Mihrab Motif */}
              <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-[#D4AF37]/15 bg-gradient-to-r from-[#201A0E]/50 via-transparent to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#282012] to-[#14120D] border border-[#D4AF37]/50 flex items-center justify-center text-[#E6C66E] shadow-sm">
                    <PrayerIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#F2EBDD]">
                      <span>{prayer.name}</span>
                    </h3>
                    <p className="text-xs text-[#9E9478] mt-0.5">{prayer.timeEstimate}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleInlinePrayerAudio(prayer.id)}
                    className={`min-h-[40px] px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer ${
                      playingPrayerId === prayer.id
                        ? 'bg-[#D4AF37] text-black border-[#F3E5AB] shadow-[0_0_12px_rgba(214,179,106,0.4)]'
                        : 'bg-[#1E1A12] hover:bg-[#2A2316] border-[#D4AF37]/35 text-[#E6C66E]'
                    }`}
                    title={playingPrayerId === prayer.id ? `إيقاف صوت أذان ${prayer.name}` : `استماع فوري لأذان ${prayer.name}`}
                  >
                    {playingPrayerId === prayer.id ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current animate-pulse shrink-0" />
                        <span>إيقاف</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                        <span>استماع</span>
                      </>
                    )}
                  </button>

                  <label className="relative inline-flex items-center cursor-pointer min-h-[44px] min-w-[50px] justify-center">
                    <input
                      type="checkbox"
                      checked={prayerCfg.enabled}
                      onChange={(e) => updatePrayerAdhanSetting(prayer.id, { enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#252118] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[13px] after:start-[6px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#D4AF37] peer-checked:to-[#F3E5AB]"></div>
                  </label>
                </div>
              </div>

              {/* Sub-controls when enabled */}
              {prayerCfg.enabled && (
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Muadhin Voice Selector */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#C8A24A] font-bold mb-2.5">
                      <span className="flex items-center gap-1.5">
                        <Volume1 className="w-3.5 h-3.5" />
                        صوت الأذان المفضل لهذه الفريضة:
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {MUADHIN_VOICES.map((v) => {
                        const isSelected = currentVoice === v.id;
                        const isPlayingThis = previewAudioId === v.id;

                        return (
                          <div
                            key={v.id}
                            onClick={() => updatePrayerAdhanSetting(prayer.id, { voice: v.id })}
                            className={`p-3 rounded-xl border text-right cursor-pointer flex flex-col justify-between transition-all duration-200 ${
                              isSelected
                                ? 'bg-gradient-to-br from-[#241D12] to-[#17140E] border-[#D4AF37] shadow-[0_0_15px_rgba(214,179,106,0.18)]'
                                : 'bg-[#12110E] border-[#D4AF37]/20 hover:border-[#D4AF37]/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold ${isSelected ? 'text-[#F3E5AB]' : 'text-[#B6B0A3]'}`}>
                                {v.name}
                              </span>
                              {isSelected ? (
                                <div className="w-5 h-5 rounded-full bg-[#D4AF37] text-black flex items-center justify-center shrink-0">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border border-slate-700 shrink-0" />
                              )}
                            </div>

                            <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-white/5">
                              <span className="text-[11px] text-[#9E9478] truncate max-w-[140px]">{v.title}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePreviewVoice(v.audioUrl, v.id);
                                }}
                                className={`min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                  isPlayingThis
                                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                    : 'bg-[#252014] text-[#E6C66E] border border-[#D4AF37]/30 hover:border-[#D4AF37]'
                                }`}
                                title="استماع لعينة الأذان"
                                aria-label="استماع لعينة الأذان"
                              >
                                {isPlayingThis ? (
                                  <VolumeX className="w-4 h-4" />
                                ) : (
                                  <Volume2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Iqamah Minutes Stepper */}
                  <div className="p-3.5 rounded-xl bg-[#12110D] border border-[#D4AF37]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-[#F2EBDD] block">
                        وقت الإقامة بعد الأذان
                      </span>
                      <span className="text-[11px] text-[#9E9478]">
                        تنبيه صوتي وبصري للإقامة بعد انقضاء {iqamahMins} دقيقة
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 self-end sm:self-auto">
                      <button
                        onClick={() => updateIqamahOffset(prayer.id, iqamahMins - 5)}
                        className="min-h-[38px] px-2.5 rounded-lg bg-[#1B1812] border border-[#D4AF37]/30 text-[#E6C66E] font-bold text-xs flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                        aria-label="إنقاص 5 دقائق"
                      >
                        -5
                      </button>
                      <button
                        onClick={() => updateIqamahOffset(prayer.id, iqamahMins - 1)}
                        className="min-h-[38px] w-9 rounded-lg bg-[#1B1812] border border-[#D4AF37]/30 text-[#F2EBDD] font-bold text-sm flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                        aria-label="إنقاص دقيقة واحدة"
                      >
                        -
                      </button>

                      <div className="min-w-[54px] text-center px-1">
                        <span className="font-mono text-base font-bold text-[#E6C66E] tabular-nums">
                          {iqamahMins}
                        </span>
                        <span className="text-[10px] text-[#9E9478] block -mt-1 font-sans">دقيقة</span>
                      </div>

                      <button
                        onClick={() => updateIqamahOffset(prayer.id, iqamahMins + 1)}
                        className="min-h-[38px] w-9 rounded-lg bg-[#1B1812] border border-[#D4AF37]/30 text-[#F2EBDD] font-bold text-sm flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                        aria-label="زيادة دقيقة واحدة"
                      >
                        +
                      </button>
                      <button
                        onClick={() => updateIqamahOffset(prayer.id, iqamahMins + 5)}
                        className="min-h-[38px] px-2.5 rounded-lg bg-[#1B1812] border border-[#D4AF37]/30 text-[#E6C66E] font-bold text-xs flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                        aria-label="زيادة 5 دقائق"
                      >
                        +5
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
