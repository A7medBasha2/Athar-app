import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { ReminderEngine } from '../services/reminderService';
import { NativePermissions } from '../services/nativePermissionsBridge';
import { PrayersAdhanConfig, ObligatoryPrayerId } from '../types';
import { 
  Bell, BellRing, BellOff, Volume2, VolumeX, Smartphone, 
  ShieldCheck, Sparkles, RefreshCw, Play, Timer, ExternalLink, 
  Check, CheckCircle2, ChevronRight, AlertCircle
} from 'lucide-react';

interface RemindersViewProps {
  onClose?: () => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({ onClose }) => {
  const [prayersConfig, setPrayersConfig] = useState<PrayersAdhanConfig>(() =>
    StorageService.getPrayersAdhanConfig()
  );
  const [countdown5s, setCountdown5s] = useState<number | null>(null);
  const [selectedPrayer, setSelectedPrayer] = useState<ObligatoryPrayerId>('maghrib');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setPrayersConfig(StorageService.getPrayersAdhanConfig());
    };
    window.addEventListener('athar_adhan_config_changed', handleUpdate);
    return () => {
      window.removeEventListener('athar_adhan_config_changed', handleUpdate);
    };
  }, []);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleTogglePrayer = (prayerId: ObligatoryPrayerId) => {
    const nextVal = StorageService.togglePrayerAdhan(prayerId);
    setPrayersConfig(StorageService.getPrayersAdhanConfig());
    const names: Record<ObligatoryPrayerId, string> = {
      fajr: 'الفجر',
      dhuhr: 'الظهر',
      asr: 'العصر',
      maghrib: 'المغرب',
      isha: 'العشاء',
    };
    showToast(`${nextVal ? 'تم تفعيل' : 'تم كتم/تعطيل'} أذان صلاة ${names[prayerId]}`);
  };

  const handleResetAllAlerts = () => {
    StorageService.resetPrayersAdhanConfig();
    setPrayersConfig(StorageService.getPrayersAdhanConfig());
    showToast('تم حذف كافة التخصيصات السابقة وإعادة ضبط تنبيهات الصلوات الخمس بنجاح ✓');
  };

  const handleTrigger5Seconds = () => {
    showToast('بدأ العد التنازلي: اقفل شاشة الموبايل أو اخرج من التطبيق الآن!');
    setCountdown5s(5);
    ReminderEngine.trigger5SecondDelayedTest(selectedPrayer, (sec) => {
      if (sec > 0) {
        setCountdown5s(sec);
      } else {
        setCountdown5s(null);
      }
    });
  };

  const prayersList: { id: ObligatoryPrayerId; name: string; desc: string }[] = [
    { id: 'fajr', name: 'صلاة الفجر', desc: 'نداء الفجر وبداية اليوم المبارك' },
    { id: 'dhuhr', name: 'صلاة الظهر', desc: 'نداء الهاجرة ومنتصف النهار' },
    { id: 'asr', name: 'صلاة العصر', desc: 'الصلاة الوسطى ومطلع الإشراق' },
    { id: 'maghrib', name: 'صلاة المغرب', desc: 'نداء الغروب والإفطار' },
    { id: 'isha', name: 'صلاة العشاء', desc: 'نداء السكينة وخاتمة اليوم' },
  ];

  return (
    <div className="athar-page-container space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="sticky top-2 z-50 p-3 rounded-xl bg-gradient-to-r from-[#211B0E] via-[#2F2613] to-[#211B0E] border border-[#E6C66E]/70 text-[#F5EFE0] text-xs font-bold flex items-center gap-2.5 shadow-[0_12px_30px_rgba(0,0,0,0.9)] animate-slideDown">
          <CheckCircle2 size={16} className="text-[#E6C66E] shrink-0" />
          <span className="leading-snug">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-[#C8A24A]/30 bg-gradient-to-b from-[#18140D] via-[#0E0C08] to-[#070605] shadow-[0_15px_45px_rgba(0,0,0,0.95)] pt-6 pb-5 px-5 text-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-[#E6C66E] text-black flex items-center justify-center shadow-[0_0_20px_rgba(230,198,110,0.45)] mb-2.5">
            <BellRing size={22} className="animate-pulse" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#F5EFE0] font-arabic">
            مركز التنبيهات وشاشة الأذان الملكية
          </h1>
          <p className="text-xs text-[#C4B998] mt-1 max-w-sm leading-relaxed">
            تنبيهات الصلوات الخمس الإجبارية الفاخرة وشاشة الأذان ذات الأولوية القصوى
          </p>
        </div>
      </div>

      {/* HERO CARD: Interactive Test Buttons */}
      <div className="relative overflow-hidden p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#211A0E] via-[#141009] to-[#0A0805] border-2 border-[#E6C66E]/60 shadow-[0_12px_36px_rgba(0,0,0,0.9)] space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-[#C8A24A]/25">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#E6C66E]">
            <Sparkles size={15} />
            <span>معاينة وتجربة شاشة الأذان الملكية:</span>
          </div>

          {/* Prayer Picker for Testing */}
          <div className="flex items-center gap-1 bg-[#0D0B08] p-1 rounded-xl border border-[#C8A24A]/30 text-[11px] font-bold">
            <button
              onClick={() => setSelectedPrayer('fajr')}
              className={`px-2 py-0.5 rounded-lg transition-all ${
                selectedPrayer === 'fajr' ? 'bg-[#E6C66E] text-black font-black' : 'text-[#A89E88]'
              }`}
            >
              الفجر
            </button>
            <button
              onClick={() => setSelectedPrayer('maghrib')}
              className={`px-2 py-0.5 rounded-lg transition-all ${
                selectedPrayer === 'maghrib' ? 'bg-[#E6C66E] text-black font-black' : 'text-[#A89E88]'
              }`}
            >
              المغرب
            </button>
          </div>
        </div>

        {/* 5-Second Countdown Banner */}
        {countdown5s !== null && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#3D2C0C] via-[#2D2109] to-[#1F1706] border-2 border-[#E6C66E] text-center shadow-[0_0_25px_rgba(230,198,110,0.5)] animate-pulse">
            <div className="text-3xl font-black text-[#FFFDF8] font-mono">
              {countdown5s} ثوانٍ
            </div>
            <p className="text-xs font-bold text-[#F3E5AB] mt-1">
              اقفل شاشة الموبايل أو اخرج من التطبيق الآن لاختبار التنبيه الإجباري عالي الأولوية!
            </p>
          </div>
        )}

        <div className="space-y-2">
          {/* Button: 5-Second Delayed Test */}
          <button
            onClick={handleTrigger5Seconds}
            disabled={countdown5s !== null}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-l from-[#E6C66E] via-[#C8A24A] to-[#A6802B] text-black font-black text-xs flex items-center justify-center gap-2 border border-[#FFF2C2] hover:brightness-105 active:scale-98 shadow-md cursor-pointer disabled:opacity-60"
          >
            <Timer size={16} className="text-black" />
            <span>
              {countdown5s !== null ? `جارٍ العد: ${countdown5s} ثوانٍ (اقفل الشاشة أو اخرج الآن)...` : 'إرسال تنبيه تجريبي بعد ٥ ثوانٍ (لقفل الشاشة والخروج)'}
            </span>
          </button>
        </div>

        <p className="text-[11px] text-[#A89E88] text-center leading-relaxed">
          💡 يتيح زر الـ ٥ ثوانٍ قفل شاشة الهاتف أو الخروج لأي تطبيق آخر لاختبار ظهور التنبيه كـ Overlay إجباري.
        </p>
      </div>

      {/* 5 Prayers Alert Settings */}
      <div className="p-4 rounded-2xl bg-[#0E0C08] border border-[#C8A24A]/30 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#C8A24A]/20">
          <div>
            <h3 className="text-xs font-extrabold text-[#F5EFE0]">
              تنبيهات الصلوات الخمس الحالية
            </h3>
            <p className="text-[10px] text-[#A89E88]">
              التحكم الكامل في تشغيل أو كتم أذان كل صلاة
            </p>
          </div>

          <button
            onClick={handleResetAllAlerts}
            className="px-2.5 py-1 rounded-xl bg-[#17130C] border border-[#C8A24A]/40 text-[#E6C66E] hover:text-[#FFF2C2] text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>حذف التخصيصات وإعادة الضبط</span>
          </button>
        </div>

        <div className="space-y-2">
          {prayersList.map((prayer) => {
            const isEnabled = prayersConfig[prayer.id]?.enabled ?? true;
            return (
              <div
                key={prayer.id}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  isEnabled
                    ? 'bg-gradient-to-r from-[#1A150D] to-[#100D09] border-[#C8A24A]/40'
                    : 'bg-[#0B0907] border-[#C8A24A]/15 opacity-65'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isEnabled
                        ? 'bg-[#E6C66E] text-black shadow-sm'
                        : 'bg-[#18140D] text-[#8C8370] border border-[#C8A24A]/25'
                    }`}
                  >
                    {isEnabled ? <Bell size={15} /> : <VolumeX size={15} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#F5EFE0]">{prayer.name}</span>
                      <span
                        className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold ${
                          isEnabled
                            ? 'bg-[#E6C66E]/20 text-[#E6C66E] border border-[#E6C66E]/30'
                            : 'bg-[#1C160B] text-[#8C8370]'
                        }`}
                      >
                        {isEnabled ? 'أذان كامل مفعل' : 'تنبيه مكتوم'}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#A89E88] block mt-0.5">
                      {prayer.desc}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleTogglePrayer(prayer.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    isEnabled
                      ? 'bg-[#2A2111] border border-[#E6C66E]/60 text-[#E6C66E] hover:bg-[#342914]'
                      : 'bg-[#141009] border border-[#C8A24A]/30 text-[#A89E88] hover:text-[#F5EFE0]'
                  }`}
                >
                  {isEnabled ? 'مفعل ✓' : 'تعطيل'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Smart Flip-to-Mute Feature Box */}
      <div className="p-3.5 rounded-2xl bg-[#0E0C08] border border-[#C8A24A]/30 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#261E10] border border-[#E6C66E]/50 flex items-center justify-center text-[#E6C66E]">
              <Smartphone size={18} />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-[#F5EFE0]">
                خاصية الميوت الذكية (قلب شاشة الهاتف)
              </h4>
              <p className="text-[10px] text-[#A89E88]">
                اقلب الموبايل على وجهه لكتم الصوت فوراً مع استمرار عرض الكلمات
              </p>
            </div>
          </div>

          <input
            type="checkbox"
            checked={prayersConfig.smartFlipToMute ?? true}
            onChange={(e) => {
              const updated = {
                ...prayersConfig,
                smartFlipToMute: e.target.checked,
              };
              StorageService.savePrayersAdhanConfig(updated);
              setPrayersConfig(updated);
              showToast(e.target.checked ? 'تم تفعيل كتم الصوت بقلب الهاتف ✓' : 'تم تعطيل الخاصية');
            }}
            className="accent-[#E6C66E] w-4 h-4 cursor-pointer"
          />
        </div>

        <p className="text-[11px] text-[#C4B998] leading-relaxed">
          ✨ عند تشغيل الصوت مجدداً، يستمر الأذان من الموضع اللحظي نفسه مباشرة دون إعادة التكبيرات من البداية.
        </p>
      </div>

      {/* Android Permissions Hub */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#17130B] to-[#0E0C08] border border-[#C8A24A]/35 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#C8A24A]/20">
          <ShieldCheck size={16} className="text-[#E6C66E]" />
          <h4 className="text-xs font-extrabold text-[#F5EFE0]">
            أذونات أندرويد لعمل شاشة الأذان فوق التطبيقات وشاشة القفل
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => {
              NativePermissions.openOverlaySettings().catch(() => {});
              showToast('تم فتح إعدادات الظهور فوق التطبيقات وشاشة القفل');
            }}
            className="p-2.5 rounded-xl bg-[#120F0A] border border-[#C8A24A]/30 hover:border-[#E6C66E] flex items-center justify-between text-right text-xs font-bold text-[#F5EFE0] transition-all cursor-pointer"
          >
            <div>
              <div className="text-[11px] text-[#E6C66E]">الظهور فوق التطبيقات</div>
              <div className="text-[9.5px] text-[#A89E88]">Draw over other apps & Lock Screen</div>
            </div>
            <ExternalLink size={13} className="text-[#E6C66E]" />
          </button>

          <button
            onClick={() => {
              NativePermissions.openExactAlarmSettings().catch(() => {});
              showToast('تم فتح إعدادات المنبهات الدقيقة (Exact Alarms)');
            }}
            className="p-2.5 rounded-xl bg-[#120F0A] border border-[#C8A24A]/30 hover:border-[#E6C66E] flex items-center justify-between text-right text-xs font-bold text-[#F5EFE0] transition-all cursor-pointer"
          >
            <div>
              <div className="text-[11px] text-[#E6C66E]">المنبهات الدقيقة</div>
              <div className="text-[9.5px] text-[#A89E88]">Schedule Exact Alarms (Doze Mode)</div>
            </div>
            <ExternalLink size={13} className="text-[#E6C66E]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemindersView;
