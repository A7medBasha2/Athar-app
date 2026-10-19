import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  MinusCircle,
  RefreshCw,
  Send,
  ExternalLink,
  Smartphone,
  Cpu,
  Layers,
  Volume2,
  VolumeX,
  Bell,
  BellRing,
  Info,
  ChevronLeft,
  X,
  Sparkles,
  Sliders,
  Check,
  Play,
} from 'lucide-react';
import {
  NativePermissionsBridge,
  DeviceDiagnosticInfo,
  NotificationChannelsResult,
  ReadinessCheckItem,
  ReadinessItemStatus,
} from '../services/nativePermissionsBridge';
import { StorageService } from '../services/storageService';

interface NotificationReadinessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationReadinessModal: React.FC<NotificationReadinessModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [deviceInfo, setDeviceInfo] = useState<DeviceDiagnosticInfo | null>(null);
  const [channelsInfo, setChannelsInfo] = useState<NotificationChannelsResult | null>(null);
  const [checks, setChecks] = useState<ReadinessCheckItem[]>([]);
  const [overallReady, setOverallReady] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Test notification options
  const [testMode, setTestMode] = useState<'notification_audio' | 'notification_only' | 'notification_play_button'>('notification_audio');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);

  const runDiagnostics = useCallback(async () => {
    setLoading(true);
    setFeedbackMessage(null);
    try {
      const settings = StorageService.getSettings();
      const isFloatingOverlayWanted = Boolean((settings as any).systemOverlayEnabled || (settings as any).floatingOverlayEnabled);

      const result = await NativePermissionsBridge.runComprehensiveReadinessCheck(isFloatingOverlayWanted);
      setDeviceInfo(result.deviceInfo);
      setChannelsInfo(result.channelsInfo);
      setChecks(result.checks);
      setOverallReady(result.overallReady);
    } catch (e: any) {
      console.warn('[NotificationReadinessModal] diagnostics error:', e);
      setFeedbackMessage({
        text: 'تعذّر إتمام الفحص الشامل لبعض الصلاحيات، يرجى إعادة المحاولة.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen, runDiagnostics]);

  // Handle re-checking on window focus (after returning from system settings)
  useEffect(() => {
    if (!isOpen) return;

    const handleFocus = () => {
      runDiagnostics();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [isOpen, runDiagnostics]);

  const handleSendTestNotification = async () => {
    if (isSendingTest) return;
    setIsSendingTest(true);
    setFeedbackMessage(null);

    try {
      const modeLabels: Record<string, string> = {
        notification_audio: 'مصاحب بصوت ناعم',
        notification_only: 'صامت دون صوت',
        notification_play_button: 'مزود بزر تشغيل تفاعلي',
      };

      const now = new Date();
      const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const success = await NativePermissionsBridge.sendDiagnosticNotification({
        mode: testMode,
        playSound: testMode === 'notification_audio',
        title: 'فحص نظام التنبيهات (تجربة تشخيصية)',
        body: `تم إرسال هذا الإشعار التجريبي في [${timeStr}]. النمط: ${modeLabels[testMode]} ✓`,
      });

      if (success) {
        setFeedbackMessage({
          text: `تم إرسال الإشعار التجريبي بنجاح بنمط (${modeLabels[testMode]}). تفقد شريط إشعارات هاتفك الآن.`,
          type: 'success',
        });
      } else {
        setFeedbackMessage({
          text: 'لم نتمكن من إرسال الإشعار، يرجى التأكد من تفعيل إذن إشعارات النظام أولاً.',
          type: 'error',
        });
      }
    } catch (e: any) {
      setFeedbackMessage({
        text: `تعذّر إرسال الإشعار: ${e?.message || 'خطأ غير متوقع'}`,
        type: 'error',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleOpenManufacturerSettings = async () => {
    if (!deviceInfo) return;
    try {
      await NativePermissionsBridge.openManufacturerSettings(deviceInfo.vendor);
      localStorage.setItem('athar_perm_autostart_verified', 'true');
      setFeedbackMessage({
        text: 'تم توجيهك لصفحة إعدادات النظام. بعد الانتهاء، ارجع للتطبيق لتحديث الحالة تلقائياً.',
        type: 'info',
      });
    } catch (e) {
      console.warn('Failed to open manufacturer settings:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div
        className="relative w-full max-w-xl my-auto rounded-3xl border border-[#C8A24A]/40 bg-gradient-to-b from-[#18140E] via-[#120F09] to-[#0A0805] text-[#F5EFE0] shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[92vh]"
        dir="rtl"
      >
        {/* Ambient Top Glow */}
        <div
          className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-32 rounded-full blur-3xl pointer-events-none opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(230, 198, 110, 0.45) 0%, rgba(200, 162, 74, 0.15) 50%, transparent 70%)',
          }}
        />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between p-4.5 sm:p-5 border-b border-[#C8A24A]/25 bg-[#14100A]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2D2311] to-[#120E06] border border-[#E6C66E]/50 flex items-center justify-center text-[#E6C66E] shadow-md shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#F5EFE0] font-arabic">
                جاهزية التنبيهات على جهازك
              </h2>
              <p className="text-[11px] text-[#A89E88] font-arabic">
                فحص تقني دقيق لصلاحيات النظام وإعدادات المصنّع لضمان وصول التنبيهات
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-stone-400 hover:text-stone-200 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="إغلاق النافذة"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Feedback Banner */}
          {feedbackMessage && (
            <div
              className={`p-3 rounded-2xl border text-xs font-arabic flex items-start gap-2.5 animate-slideDown ${
                feedbackMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : feedbackMessage.type === 'error'
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  : 'bg-[#211B0E] border-[#C8A24A]/40 text-[#E6C66E]'
              }`}
            >
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : feedbackMessage.type === 'error' ? (
                <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <Info size={16} className="text-[#E6C66E] shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{feedbackMessage.text}</span>
            </div>
          )}

          {/* Device Profile Card */}
          {deviceInfo && (
            <div className="p-3.5 rounded-2xl border border-[#C8A24A]/25 bg-black/40 space-y-2">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                <div className="flex items-center gap-2 text-[#E6C66E] font-bold">
                  <Smartphone size={15} />
                  <span>بيانات الجهاز والنظام</span>
                </div>
                <span className="font-mono text-[11px] text-[#A89E88] px-2 py-0.5 rounded bg-white/5">
                  Android {deviceInfo.release} (API {deviceInfo.sdkInt})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-stone-400 text-[10px] block">المصنّع والطراز:</span>
                  <span className="font-bold text-[#F5EFE0] truncate block">
                    {deviceInfo.manufacturer.toUpperCase()} · {deviceInfo.model}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 text-[10px] block">واجهة النظام:</span>
                  <span className="font-bold text-[#E6C66E] truncate block">
                    {deviceInfo.customRom || deviceInfo.vendorName}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Readiness Checks List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-stone-300">تقرير الصلاحيات وحالة النظام:</span>
              <span className="text-[11px] text-[#A89E88]">
                {checks.filter((c) => c.status === 'READY').length} من {checks.length} جاهزة
              </span>
            </div>

            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-stone-400">
                <RefreshCw size={24} className="animate-spin text-[#E6C66E]" />
                <span className="text-xs">جاري فحص حالة الصلاحيات والنظام...</span>
              </div>
            ) : (
              checks.map((item) => {
                const isReady = item.status === 'READY';
                const isActionRequired = item.status === 'ACTION_REQUIRED';
                const isNotRequired = item.status === 'NOT_REQUIRED';

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isReady
                        ? 'border-emerald-500/25 bg-emerald-950/15'
                        : isActionRequired
                        ? 'border-amber-500/35 bg-[#20180B]/60 shadow-[0_4px_16px_rgba(200,162,74,0.12)]'
                        : 'border-white/5 bg-black/30 opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isReady ? (
                            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                          ) : isActionRequired ? (
                            <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                          ) : (
                            <MinusCircle size={16} className="text-stone-500 shrink-0" />
                          )}
                          <h4 className="text-xs sm:text-sm font-bold text-[#F5EFE0] truncate">
                            {item.title}
                          </h4>
                        </div>
                        <p className="text-[11px] text-[#A89E88] mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {/* Status text according to strict requirements: جاهز, يحتاج إلى تفعيل, غير مطلوب, تعذّر التحقق */}
                        <span
                          className={`text-xs font-bold ${
                            isReady
                              ? 'text-emerald-400'
                              : isActionRequired
                              ? 'text-amber-400'
                              : 'text-stone-400'
                          }`}
                        >
                          {item.statusTextArabic}
                        </span>

                        {item.actionAvailable && (
                          <button
                            onClick={async () => {
                              if (item.actionHandler) {
                                await item.actionHandler();
                                setTimeout(runDiagnostics, 1200);
                              }
                            }}
                            className="py-1 px-2.5 rounded-lg bg-[#2A2111] hover:bg-[#382C17] border border-[#C8A24A]/40 text-[#E6C66E] text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm"
                          >
                            <span>{item.actionTextArabic || 'فتح الإعداد'}</span>
                            <ExternalLink size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Manufacturer Specific Guidance Box */}
          {deviceInfo && (
            <div className="p-4 rounded-2xl border border-[#C8A24A]/30 bg-gradient-to-b from-[#1E170C] to-[#120E07] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#E6C66E]">
                <Cpu size={16} />
                <span>إرشادات مخصصة لأجهزة ({deviceInfo.vendorName})</span>
              </div>

              {deviceInfo.vendor === 'xiaomi' ? (
                <div className="space-y-2 text-[11px] text-stone-300 leading-relaxed">
                  <p>
                    تعتمد أجهزة شاومي وريدمي وبوكو نظام إدارة طاقة صارم يقوم بإيقاف التطبيقات في الخلفية. لضمان الأذان بدقة:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-stone-400 pr-1">
                    <li>تفعيل <strong className="text-[#E6C66E]">التشغيل التلقائي (Autostart)</strong> لتطبيق أثر.</li>
                    <li>ضبط موفر البطارية على <strong className="text-[#E6C66E]">لا توجد قيود (No restrictions)</strong>.</li>
                    <li>قفل تطبيق أثر في شاشة التطبيقات المفتوحة (Lock in Recents).</li>
                  </ol>
                  <button
                    onClick={handleOpenManufacturerSettings}
                    className="w-full mt-2 py-2 px-3 rounded-xl bg-[#2D2311] hover:bg-[#3A2D17] border border-[#E6C66E]/50 text-[#E6C66E] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <span>فتح إعدادات شاومي للتشغيل التلقائي والبطارية</span>
                    <ExternalLink size={12} />
                  </button>
                </div>
              ) : deviceInfo.vendor === 'samsung' ? (
                <div className="space-y-2 text-[11px] text-stone-300 leading-relaxed">
                  <p>
                    في هواتف سامسونج (One UI)، قد تضع خدمات العناية بالجهاز التطبيق في وضع السكون التلقائي:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-stone-400 pr-1">
                    <li>إضافة «أثر» إلى قائمة <strong className="text-[#E6C66E]">التطبيقات التي لا توضع في وضع السكون أبداً (Never sleeping apps)</strong>.</li>
                    <li>إلغاء تفعيل وضع توفير الطاقة للخدمة المستمرة.</li>
                  </ol>
                  <button
                    onClick={handleOpenManufacturerSettings}
                    className="w-full mt-2 py-2 px-3 rounded-xl bg-[#2D2311] hover:bg-[#3A2D17] border border-[#E6C66E]/50 text-[#E6C66E] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <span>فتح إعدادات بطارية سامسونج</span>
                    <ExternalLink size={12} />
                  </button>
                </div>
              ) : deviceInfo.vendor === 'oppo' || deviceInfo.vendor === 'oneplus' || deviceInfo.vendor === 'vivo' || deviceInfo.vendor === 'honor' ? (
                <div className="space-y-2 text-[11px] text-stone-300 leading-relaxed">
                  <p>
                    تتطلب واجهات {deviceInfo.vendorName} السماح بالنشاط الكامل في الخلفية:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-stone-400 pr-1">
                    <li>السماح بـ <strong className="text-[#E6C66E]">بدء التشغيل التلقائي وإدارة التشغيل</strong>.</li>
                    <li>السماح بـ <strong className="text-[#E6C66E]">النشاط بالخلفية دون قيود</strong>.</li>
                  </ol>
                  <button
                    onClick={handleOpenManufacturerSettings}
                    className="w-full mt-2 py-2 px-3 rounded-xl bg-[#2D2311] hover:bg-[#3A2D17] border border-[#E6C66E]/50 text-[#E6C66E] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <span>فتح إعدادات النشاط في الخلفية</span>
                    <ExternalLink size={12} />
                  </button>
                </div>
              ) : (
                <div className="text-[11px] text-stone-300 leading-relaxed space-y-1.5">
                  <p>
                    يعمل جهازك بنظام أندرويد قياسي. احرص فقط على إبقاء التطبيق مستثنى من «تحسين البطارية» والسماح بـ «المنبهات الدقيقة».
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Honest Technical Transparency Note */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[10px] text-stone-400 leading-relaxed space-y-1">
            <span className="font-bold text-[#A89E88] block">شفافية تقنية ونزاهة:</span>
            <p>
              تفعيل كافة الصلاحيات يمنح التطبيق كل المقومات البرمجية المطلوبة، ولكن بقاء التنبيهات دقيقة 100% في الخلفية يخضع أيضاً لقواعد الشركة المصنعة للجهاز عند بقاء الشاشة مغلقة لساعات طويلة (Doze Mode).
            </p>
          </div>

          {/* Test Notification Chamber */}
          <div className="p-4 rounded-2xl border border-[#C8A24A]/30 bg-black/50 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#F5EFE0]">
                <BellRing size={16} className="text-[#E6C66E]" />
                <span>إرسال إشعار تجريبي فوري</span>
              </div>
              <span className="text-[10px] text-[#A89E88]">فحص آمن دون المساس بجدولك</span>
            </div>

            {/* Test Mode Selector as requested by user in clarification */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-stone-400 block font-arabic">
                اختر نمط الإشعار التجريبي:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTestMode('notification_audio')}
                  className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    testMode === 'notification_audio'
                      ? 'bg-[#292011] border-[#E6C66E] text-[#E6C66E] shadow-sm'
                      : 'bg-[#120F09] border-[#C8A24A]/20 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Volume2 size={14} />
                  <span>مع صوت ناعم</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTestMode('notification_only')}
                  className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    testMode === 'notification_only'
                      ? 'bg-[#292011] border-[#E6C66E] text-[#E6C66E] shadow-sm'
                      : 'bg-[#120F09] border-[#C8A24A]/20 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <VolumeX size={14} />
                  <span>صامت فقط</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTestMode('notification_play_button')}
                  className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    testMode === 'notification_play_button'
                      ? 'bg-[#292011] border-[#E6C66E] text-[#E6C66E] shadow-sm'
                      : 'bg-[#120F09] border-[#C8A24A]/20 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Play size={14} />
                  <span>زر تفاعلي</span>
                </button>
              </div>
            </div>

            <button
              onClick={handleSendTestNotification}
              disabled={isSendingTest || loading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#C8A24A] via-[#E2C374] to-[#B38D33] text-[#141009] font-black text-xs shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <Send size={14} className={isSendingTest ? 'animate-bounce' : ''} />
              <span>{isSendingTest ? 'جاري إرسال الإشعار...' : 'إرسال إشعار تجريبي الآن'}</span>
            </button>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#C8A24A]/25 bg-[#14100A]/80 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-[#241B0E] hover:bg-[#322614] border border-[#C8A24A]/40 text-[#E6C66E] font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>فحص نظام التنبيهات</span>
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-32 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-stone-300 font-bold text-xs transition-colors cursor-pointer text-center"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
