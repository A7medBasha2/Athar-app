import React, { useState } from 'react';
import { 
  ArrowRight, Bell, Volume2, VolumeX, Shield, Play, 
  Sparkles, CheckCircle2, Clock, Check, Moon, Sun, 
  Sunset, Compass, HeartHandshake, Eye
} from 'lucide-react';
import { AppSettings, ObligatoryPrayerId, PrayerAdhanSetting, IqamahOffsets } from '../types';
import { StorageService } from '../services/storageService';
import { NativePermissionsBridge } from '../services/nativePermissionsBridge';
import { AudioService } from '../services/audioService';

interface Props {
  onBack: () => void;
}

const PRAYERS_LIST: Array<{
  id: ObligatoryPrayerId;
  name: string;
  defaultOffset: number;
  icon: typeof Sun;
  timeEstimate: string;
}> = [
  { id: 'fajr', name: 'صلاة الفجر', defaultOffset: 20, icon: Moon, timeEstimate: 'الفجر والصبح' },
  { id: 'dhuhr', name: 'صلاة الظهر', defaultOffset: 15, icon: Sun, timeEstimate: 'الظهيرة والزوال' },
  { id: 'asr', name: 'صلاة العصر', defaultOffset: 15, icon: Compass, timeEstimate: 'العصر والشمس ساطعة' },
  { id: 'maghrib', name: 'صلاة المغرب', defaultOffset: 10, icon: Sunset, timeEstimate: 'الغروب والشفق' },
  { id: 'isha', name: 'صلاة العشاء', defaultOffset: 15, icon: Moon, timeEstimate: 'العشاء وهدوء الليل' },
];

const MUADHIN_VOICES: Array<{
  id: 'alafasy' | 'makkah' | 'madinah' | 'alaqsa';
  name: string;
  title: string;
  audioUrl: string;
}> = [
  { id: 'alafasy', name: 'مشاري راشد العفاسي', title: 'تلاوة ندية خاشعة ومميزة', audioUrl: '/audio/adhan_alafasy.mp3' },
  { id: 'makkah', name: 'الحرم المكي الشريف', title: 'أذان المسجد الحرام بمكة', audioUrl: '/audio/adhan_makkah.mp3' },
  { id: 'madinah', name: 'المسجد النبوي الشريف', title: 'أذان الروضة الشريفة بالمدينة', audioUrl: '/audio/adhan_madinah.mp3' },
  { id: 'alaqsa', name: 'المسجد الأقصى المبارك', title: 'أذان القدس والمسجد الأقصى', audioUrl: '/audio/adhan_alaqsa.mp3' },
];

export const AdhanIqamahSettingsView: React.FC<Props> = ({ onBack }) => {
  const [settings, setSettings] = useState<AppSettings>(() => StorageService.getSettings());
  const [testingPrayer, setTestingPrayer] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [previewAudioId, setPreviewAudioId] = useState<string | null>(null);

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
    notifyChange(val ? 'تم تفعيل منظومة الأذان' : 'تم تعطيل منظومة الأذان');
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
    notifyChange(val ? 'تم تفعيل شاشة الأذان العائمة فوق التطبيقات' : 'تم تعطيل الشاشة العائمة');
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
    notifyChange(`تم ضبط إقامة ${prayerId} بعد ${clamped} دقيقة`);
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
        subtitle: 'تطبيق أثر',
      },
      {
        onEnded: () => setPreviewAudioId(null),
        onError: () => setPreviewAudioId(null),
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#07090B] text-slate-100 font-sans pb-28 pt-3 px-4 max-w-2xl mx-auto selection:bg-[#D4AF37]/30 selection:text-white">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#161410] border border-[#D4AF37]/80 text-[#F2EBDD] px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-slideDown">
          <CheckCircle2 className="w-4 h-4 text-[#E6C66E]" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 mb-6 pt-2 pb-3 border-b border-[#D4AF37]/20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-11 h-11 rounded-2xl bg-[#141619] border border-[#D4AF37]/30 flex items-center justify-center text-[#E6C66E] active:scale-95 transition-all shadow-md"
            aria-label="الرجوع للإعدادات"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#F5F2EB] flex items-center gap-2">
              <span>إعدادات الأذان والإقامة</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-[#D4AF37]/15 text-[#E6C66E] border border-[#D4AF37]/40 font-mono">
                الملكية
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              تخصيص الشاشة العائمة، أصوات المؤذنين، ودقائق الإقامة لكل صلاة
            </p>
          </div>
        </div>

        <button
          onClick={() => handleTestFullScreenAdhan('asr')}
          disabled={testingPrayer !== null}
          className="h-11 px-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-[#07090B] font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#D4AF37]/20 active:scale-95 transition-all shrink-0"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>تجربة الشاشة</span>
        </button>
      </div>

      {/* Hero Master Card: Full-Screen Overlay & Core Controls */}
      <div className="rounded-3xl p-5 mb-6 relative overflow-hidden bg-gradient-to-br from-[#181A1E] via-[#121417] to-[#0A0C0E] border border-[#D4AF37]/40 shadow-2xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#E6C66E]">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#F7F3E8]">شاشة الأذان العائمة كاملة الشاشة</h3>
                <p className="text-xs text-[#C8A24A]">ظهور فوري وتلقائي فوق شاشة القفل عند موعد الأذان</p>
              </div>
            </div>

            {/* Switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={adhanCfg.fullScreenOverlayEnabled ?? true}
                onChange={(e) => updateFullScreenOverlayToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-13 h-7 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#D4AF37] peer-checked:to-[#F3E5AB]"></div>
            </label>
          </div>

          <div className="pt-2 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Auto Echo Switch */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0D0F12] border border-[#D4AF37]/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-slate-200 font-medium">الترديد مع المؤذن</span>
              </div>
              <input
                type="checkbox"
                checked={adhanCfg.autoEchoEnabled ?? true}
                onChange={(e) => updateAutoEchoToggle(e.target.checked)}
                className="w-4 h-4 rounded text-[#D4AF37] focus:ring-[#D4AF37] bg-slate-900 border-slate-700"
              />
            </div>

            {/* Auto Dua Switch */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0D0F12] border border-[#D4AF37]/20">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-slate-200 font-medium">دعاء ما بعد الأذان</span>
              </div>
              <input
                type="checkbox"
                checked={adhanCfg.autoPostAdhanDua ?? true}
                onChange={(e) => updateAutoPostDuaToggle(e.target.checked)}
                className="w-4 h-4 rounded text-[#D4AF37] focus:ring-[#D4AF37] bg-slate-900 border-slate-700"
              />
            </div>

            {/* Master Adhan Switch */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0D0F12] border border-[#D4AF37]/20">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-slate-200 font-medium">صوت الأذان المبارك</span>
              </div>
              <input
                type="checkbox"
                checked={settings.adhanEnabled}
                onChange={(e) => updateAdhanMasterToggle(e.target.checked)}
                className="w-4 h-4 rounded text-[#D4AF37] focus:ring-[#D4AF37] bg-slate-900 border-slate-700"
              />
            </div>

            {/* Master Iqamah Switch */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0D0F12] border border-[#D4AF37]/20">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-slate-200 font-medium">تنبيهات الإقامة</span>
              </div>
              <input
                type="checkbox"
                checked={settings.iqamahSettings?.enabled ?? true}
                onChange={(e) => updateIqamahMasterToggle(e.target.checked)}
                className="w-4 h-4 rounded text-[#D4AF37] focus:ring-[#D4AF37] bg-slate-900 border-slate-700"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section Title */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-base font-bold text-[#F2EBDD] flex items-center gap-2">
          <span>تخصيص الصلوات الخمس</span>
          <span className="text-xs text-slate-400 font-normal">المؤذن وتوقيت الإقامة</span>
        </h2>
        <span className="text-xs text-[#D4AF37] font-semibold">حفظ تلقائي</span>
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
              className={`rounded-2xl p-4 transition-all duration-200 border ${
                prayerCfg.enabled
                  ? 'bg-gradient-to-b from-[#14161A] to-[#0E1012] border-[#D4AF37]/35 shadow-lg shadow-black/40'
                  : 'bg-[#0E1012]/80 border-slate-800 opacity-70'
              }`}
            >
              {/* Prayer Header Row */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#E6C66E]">
                    <PrayerIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#F7F3E8]">{prayer.name}</h3>
                    <p className="text-[11px] text-slate-400">{prayer.timeEstimate}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestFullScreenAdhan(prayer.id)}
                    className="h-8 px-2.5 rounded-lg bg-[#1B1E22] hover:bg-[#252A30] border border-[#D4AF37]/30 text-[#E6C66E] text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all"
                    title="تجربة شاشة الأذان لهذه الصلاة"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>معاينة</span>
                  </button>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prayerCfg.enabled}
                      onChange={(e) => updatePrayerAdhanSetting(prayer.id, { enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4AF37]"></div>
                  </label>
                </div>
              </div>

              {/* Sub-controls when enabled */}
              {prayerCfg.enabled && (
                <div className="mt-3 space-y-3 pt-1">
                  {/* Muadhin Voice Selector */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#C8A24A] font-semibold mb-2">
                      <span>صوت الأذان المفضل:</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {MUADHIN_VOICES.map((v) => {
                        const isSelected = currentVoice === v.id;
                        const isPlayingThis = previewAudioId === v.id;

                        return (
                          <div
                            key={v.id}
                            onClick={() => updatePrayerAdhanSetting(prayer.id, { voice: v.id })}
                            className={`p-2.5 rounded-xl border text-right cursor-pointer flex flex-col justify-between transition-all ${
                              isSelected
                                ? 'bg-[#1C1810] border-[#D4AF37] shadow-md'
                                : 'bg-[#0E1012] border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold ${isSelected ? 'text-[#F3E5AB]' : 'text-slate-300'}`}>
                                {v.name}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#D4AF37]" />}
                            </div>

                            <div className="mt-2 flex items-center justify-between pt-1 border-t border-white/5">
                              <span className="text-[10px] text-slate-500 truncate">{v.title}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePreviewVoice(v.audioUrl, v.id);
                                }}
                                className="w-6 h-6 rounded-md bg-[#252118] flex items-center justify-center text-[#D4AF37] hover:bg-[#332B1E]"
                                title="استماع للعينة"
                              >
                                {isPlayingThis ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Iqamah Minutes Stepper */}
                  <div className="p-3 rounded-xl bg-[#090B0D] border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#F2EBDD] block">دقيقة الإقامة بعد الأذان</span>
                      <span className="text-[11px] text-slate-400">تنبيه تلقائي قبل الصلاة بـ {iqamahMins} دقيقة</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateIqamahOffset(prayer.id, iqamahMins - 5)}
                        className="w-8 h-8 rounded-lg bg-[#181B1F] border border-slate-700 text-[#E6C66E] font-bold text-sm flex items-center justify-center active:scale-90 transition-transform"
                        aria-label="إنقاص دقائق الإقامة"
                      >
                        -5
                      </button>
                      <button
                        onClick={() => updateIqamahOffset(prayer.id, iqamahMins - 1)}
                        className="w-8 h-8 rounded-lg bg-[#181B1F] border border-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center active:scale-90 transition-transform"
                        aria-label="إنقاص دقيقة"
                      >
                        -
                      </button>

                      <div className="min-w-[48px] text-center">
                        <span className="font-mono text-base font-bold text-[#D4AF37]">{iqamahMins}</span>
                        <span className="text-[10px] text-slate-400 block -mt-1">دقيقة</span>
                      </div>

                      <button
                        onClick={() => updateIqamahOffset(prayer.id, iqamahMins + 1)}
                        className="w-8 h-8 rounded-lg bg-[#181B1F] border border-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center active:scale-90 transition-transform"
                        aria-label="زيادة دقيقة"
                      >
                        +
                      </button>
                      <button
                        onClick={() => updateIqamahOffset(prayer.id, iqamahMins + 5)}
                        className="w-8 h-8 rounded-lg bg-[#181B1F] border border-slate-700 text-[#E6C66E] font-bold text-sm flex items-center justify-center active:scale-90 transition-transform"
                        aria-label="زيادة دقائق الإقامة"
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

      {/* Permissions & Device Readiness Footer Notice */}
      <div className="mt-6 p-4 rounded-2xl bg-[#14161A]/80 border border-[#D4AF37]/20 flex items-start gap-3">
        <Shield className="w-5 h-5 text-[#E6C66E] shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <p className="font-bold text-[#F2EBDD] mb-1">ضمان ظهور شاشة الأذان في موعدها الدقيق:</p>
          <p>
            تعمل الشاشة بأولوية قصوى من خلال إذن <span className="text-[#D4AF37] font-semibold">«الظهور فوق التطبيقات»</span> وتعمل حتى مع إغلاق الشاشة بالكامل عبر محرك الأندرويد الأصلي Media3 ExoPlayer.
          </p>
        </div>
      </div>
    </div>
  );
};
