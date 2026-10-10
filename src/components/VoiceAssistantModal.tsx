import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  X, 
  Sparkles, 
  Compass, 
  BookOpen, 
  Heart, 
  Clock, 
  Send, 
  Settings2, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Square,
  HelpCircle
} from 'lucide-react';
import { Coordinates, NavigationTab } from '../types';
import { 
  VoiceAssistant, 
  VoiceCommandResult, 
  VoiceAssistantSettings, 
  earconEngine 
} from '../services/voiceAssistantService';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: Coordinates;
  onNavigate: (tab: NavigationTab) => void;
  onOpenSurah: (surahNumber: number) => void;
  onPlayAdhkar: (category: 'morning' | 'evening') => void;
  onOpenTasbih: () => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  coordinates,
  onNavigate,
  onOpenSurah,
  onPlayAdhkar,
  onOpenTasbih,
}) => {
  const [listenState, setListenState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [manualInput, setManualInput] = useState<string>('');
  const [lastResult, setLastResult] = useState<VoiceCommandResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settings, setSettings] = useState<VoiceAssistantSettings>(VoiceAssistant.getSettings());
  const [isSupported, setIsSupported] = useState<boolean>(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsSupported(VoiceAssistant.isSpeechRecognitionSupported());
  }, []);

  // When modal opens, auto-start listening if supported
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setTranscript('');
      // Announce modal opening for screen readers
      VoiceAssistant.announceToScreenReader('تم فتح نافذة المساعد الصوتي لأثر. الميكروفون جاهز للاستماع لأمرك.');
      
      // Give a tiny delay for dialog to mount and play earcon
      const timer = setTimeout(() => {
        handleStartListening();
      }, 300);

      return () => clearTimeout(timer);
    } else {
      VoiceAssistant.stopListening();
      VoiceAssistant.stopSpeaking();
      setListenState('idle');
    }
  }, [isOpen]);

  // Handle keyboard shortcut Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleStartListening = () => {
    if (!isSupported) {
      setErrorMessage('متصفحك لا يدعم التعرف الصوتي المباشر، يمكنك كتابة الأمر في المربع أدناه.');
      return;
    }

    setErrorMessage(null);
    setTranscript('');
    VoiceAssistant.stopSpeaking();

    VoiceAssistant.startListening(
      (text, isFinal) => {
        setTranscript(text);
        if (isFinal) {
          handleExecuteCommand(text);
        }
      },
      (err) => {
        setErrorMessage(err);
        setListenState('idle');
      },
      (st) => {
        setListenState(st);
      }
    );
  };

  const handleStopListening = () => {
    VoiceAssistant.stopListening();
    setListenState('idle');
  };

  const handleExecuteCommand = async (commandText: string) => {
    if (!commandText.trim()) return;

    setListenState('processing');
    VoiceAssistant.stopListening();

    try {
      const result = await VoiceAssistant.parseAndExecuteCommand(commandText, coordinates);
      setLastResult(result);
      setListenState('speaking');

      // Play success earcon chime
      if (settings.soundChimes) {
        earconEngine.playSuccessChime();
      }

      // Execute application action
      executeAction(result);

      // Speak response with TTS
      await VoiceAssistant.speak(result.spokenResponse, () => {
        setListenState('idle');
      });
    } catch (err) {
      console.error('Failed to parse command:', err);
      setErrorMessage('حدث خطأ أثناء تنفيذ الأمر. حاول مرة أخرى.');
      setListenState('idle');
    }
  };

  const executeAction = (result: VoiceCommandResult) => {
    switch (result.actionType) {
      case 'NAVIGATE':
        if (result.navigationTab) {
          onNavigate(result.navigationTab);
        }
        break;
      case 'OPEN_SURAH':
        if (result.surahNumber) {
          onNavigate('quran');
          onOpenSurah(result.surahNumber);
        }
        break;
      case 'PLAY_ADHKAR':
        if (result.adhkarCategory) {
          onNavigate('adhkar');
          onPlayAdhkar(result.adhkarCategory);
        }
        break;
      case 'OPEN_TASBIH':
        onOpenTasbih();
        break;
      case 'STOP_AUDIO':
        // Audio stopped in service
        break;
      default:
        break;
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const text = manualInput.trim();
    setTranscript(text);
    setManualInput('');
    handleExecuteCommand(text);
  };

  const handleQuickChip = (phrase: string) => {
    setTranscript(phrase);
    handleExecuteCommand(phrase);
  };

  const handleReplaySpokenResponse = () => {
    if (lastResult?.spokenResponse) {
      setListenState('speaking');
      VoiceAssistant.speak(lastResult.spokenResponse, () => {
        setListenState('idle');
      });
    }
  };

  const updateSetting = <K extends keyof VoiceAssistantSettings>(key: K, val: VoiceAssistantSettings[K]) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    VoiceAssistant.saveSettings({ [key]: val });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-modal-title"
      aria-describedby="voice-modal-desc"
    >
      <div 
        className="w-full max-w-lg bg-[#0C1015] border-t sm:border border-[#D4AF37]/30 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#AA7C11]/10 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 id="voice-modal-title" className="text-base font-bold text-slate-100 flex items-center gap-2">
                المساعد الصوتي لأثر
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 font-normal">
                  Accessibility First
                </span>
              </h2>
              <p id="voice-modal-desc" className="text-[11px] text-slate-400">
                أوامر صوتية ذكية ونطق تفاعلي لدعم ذوي الهمم ومكفوفي البصر
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl transition-all ${
                showSettings 
                  ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              aria-label="إعدادات الصوت والنطق"
              title="إعدادات الصوت والنطق"
            >
              <Settings2 size={18} />
            </button>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              aria-label="إغلاق المساعد الصوتي"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Settings Drawer (Expandable) */}
        {showSettings && (
          <div className="p-4 bg-slate-900/90 border-b border-slate-800 space-y-3 text-xs animate-in slide-in-from-top duration-150">
            <div className="font-bold text-[#D4AF37] flex items-center gap-1.5">
              <Settings2 size={14} />
              <span>إعدادات الوصول السريع لذوي الهمم</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer">
                <div>
                  <span className="font-semibold block text-slate-200">نطق الردود صوتياً (TTS)</span>
                  <span className="text-[10px] text-slate-400">ينطق النتيجة بصوت واضح بعد كل إجراء</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoSpeak}
                  onChange={(e) => updateSetting('autoSpeak', e.target.checked)}
                  className="w-4 h-4 accent-[#D4AF37] rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer">
                <div>
                  <span className="font-semibold block text-slate-200">الاستماع عند فتح التطبيق</span>
                  <span className="text-[10px] text-slate-400">يبدأ الاستماع تلقائياً لمكفوفي البصر</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoListenOnAppOpen}
                  onChange={(e) => updateSetting('autoListenOnAppOpen', e.target.checked)}
                  className="w-4 h-4 accent-[#D4AF37] rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer">
                <div>
                  <span className="font-semibold block text-slate-200">التنبيه الصوتي (Earcons)</span>
                  <span className="text-[10px] text-slate-400">إشارات نغمية تؤكد بدء وانتهاء الاستماع</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundChimes}
                  onChange={(e) => updateSetting('soundChimes', e.target.checked)}
                  className="w-4 h-4 accent-[#D4AF37] rounded"
                />
              </label>

              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-center">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-200">سرعة النطق:</span>
                  <span className="text-[#D4AF37] font-bold">{settings.speechRate}x</span>
                </div>
                <div className="flex gap-2">
                  {[0.85, 1.0, 1.15].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => updateSetting('speechRate', rate)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                        settings.speechRate === rate
                          ? 'bg-[#D4AF37] text-slate-950'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {rate === 0.85 ? 'هادئ' : rate === 1.0 ? 'طبيعي' : 'سريع'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Central Microphone & Audio Wave State */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative">
              {/* Pulsing rings when listening */}
              {listenState === 'listening' && (
                <>
                  <div className="absolute inset-0 -m-3 rounded-full bg-[#D4AF37]/20 animate-ping opacity-75" />
                  <div className="absolute inset-0 -m-6 rounded-full bg-[#D4AF37]/10 animate-pulse" />
                </>
              )}

              {/* Central Mic Button */}
              <button
                onClick={listenState === 'listening' ? handleStopListening : handleStartListening}
                className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all transform active:scale-95 shadow-2xl ${
                  listenState === 'listening'
                    ? 'bg-gradient-to-tr from-amber-500 via-[#D4AF37] to-yellow-300 text-slate-950 ring-4 ring-[#D4AF37]/50 shadow-[#D4AF37]/40'
                    : listenState === 'processing'
                    ? 'bg-amber-600/40 text-amber-300 ring-2 ring-amber-500/50 animate-pulse'
                    : listenState === 'speaking'
                    ? 'bg-emerald-600/40 text-emerald-300 ring-2 ring-emerald-500/50'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-[#D4AF37] border-2 border-[#D4AF37]/40 hover:border-[#D4AF37]'
                }`}
                aria-label={
                  listenState === 'listening' 
                    ? 'جاري الاستماع الآن، اضغط لإيقاف الاستماع' 
                    : 'اضغط للبدء في التحدث أو استخدم لوحة المفاتيح'
                }
              >
                {listenState === 'listening' ? (
                  <>
                    <Mic size={36} className="animate-bounce" />
                    <span className="text-[10px] font-bold mt-1">أستمع لك...</span>
                  </>
                ) : listenState === 'processing' ? (
                  <>
                    <Sparkles size={34} className="animate-spin" />
                    <span className="text-[10px] font-bold mt-1">تحليل...</span>
                  </>
                ) : listenState === 'speaking' ? (
                  <>
                    <Volume2 size={36} className="animate-pulse" />
                    <span className="text-[10px] font-bold mt-1">يتحدث...</span>
                  </>
                ) : (
                  <>
                    <Mic size={34} />
                    <span className="text-[10px] font-bold mt-1">تحدث الآن</span>
                  </>
                )}
              </button>
            </div>

            {/* Status Live Indicator Text */}
            <div className="mt-4 text-center" aria-live="polite">
              {listenState === 'listening' && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>تحدث الآن بوضوح (جاري الاستماع للأمر)...</span>
                </div>
              )}
              {listenState === 'processing' && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold">
                  <Sparkles size={13} className="animate-spin" />
                  <span>جارٍ تحليل وفهم الأمر الصوتي...</span>
                </div>
              )}
              {listenState === 'speaking' && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                  <Volume2 size={13} />
                  <span>جارٍ نطق الرد الصوتي...</span>
                </div>
              )}
              {listenState === 'idle' && !errorMessage && !lastResult && (
                <p className="text-xs text-slate-400">
                  اضغط على الميكروفون أو اضغط مفتاح <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300 font-mono text-[10px]">V</kbd> للتحدث
                </p>
              )}
            </div>
          </div>

          {/* User's Spoken Transcript Box */}
          {transcript && (
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-right space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block">ما سمعه التطبيق منك:</span>
              <p className="text-sm font-semibold text-slate-100 flex items-center justify-between">
                <span>"{transcript}"</span>
                <span className="text-[10px] text-[#D4AF37] px-2 py-0.5 rounded-md bg-[#D4AF37]/10">صوتي</span>
              </p>
            </div>
          )}

          {/* Assistant's Response Card */}
          {lastResult && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121922] to-[#0D131A] border border-[#D4AF37]/40 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#D4AF37] flex items-center gap-1.5">
                  <Sparkles size={14} />
                  <span>رد رفيق أثر:</span>
                </span>
                <button
                  onClick={handleReplaySpokenResponse}
                  className="px-2.5 py-1 rounded-lg bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] text-[11px] font-bold flex items-center gap-1 transition-colors"
                  aria-label="إعادة نطق الرد الصوتي"
                >
                  <Volume2 size={13} />
                  <span>إعادة النطق</span>
                </button>
              </div>

              <p className="text-sm font-bold text-slate-100 leading-relaxed">
                {lastResult.displayResponse}
              </p>

              {lastResult.actionType !== 'NONE' && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
                  <CheckCircle2 size={14} />
                  <span>تم تنفيذ الإجراء المطلوب داخل التطبيق بنجاح.</span>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Voice Command Chips */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-slate-300 block flex items-center justify-between">
              <span>أوامر صوتية سريعة (جرب الضغط عليها):</span>
              <span className="text-[10px] text-slate-400 font-normal">اضغط للتجربة الفورية</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => handleQuickChip('كم متبقي على صلاة المغرب؟')}
                className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-[#D4AF37]/10 border border-slate-800 hover:border-[#D4AF37]/40 text-right text-xs text-slate-200 hover:text-[#D4AF37] flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-[#D4AF37]" />
                  <span>كم متبقي على صلاة المغرب؟</span>
                </div>
                <span className="text-[10px] text-slate-500 group-hover:text-[#D4AF37]">تشغيل</span>
              </button>

              <button
                onClick={() => handleQuickChip('شغّل أذكار الصباح')}
                className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-[#D4AF37]/10 border border-slate-800 hover:border-[#D4AF37]/40 text-right text-xs text-slate-200 hover:text-[#D4AF37] flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Heart size={15} className="text-rose-400" />
                  <span>شغّل أذكار الصباح</span>
                </div>
                <span className="text-[10px] text-slate-500 group-hover:text-[#D4AF37]">تشغيل</span>
              </button>

              <button
                onClick={() => handleQuickChip('قراءة سورة الكهف')}
                className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-[#D4AF37]/10 border border-slate-800 hover:border-[#D4AF37]/40 text-right text-xs text-slate-200 hover:text-[#D4AF37] flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <BookOpen size={15} className="text-emerald-400" />
                  <span>قراءة سورة الكهف</span>
                </div>
                <span className="text-[10px] text-slate-500 group-hover:text-[#D4AF37]">فتح</span>
              </button>

              <button
                onClick={() => handleQuickChip('أين القبلة؟')}
                className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-[#D4AF37]/10 border border-slate-800 hover:border-[#D4AF37]/40 text-right text-xs text-slate-200 hover:text-[#D4AF37] flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Compass size={15} className="text-amber-400" />
                  <span>أين القبلة؟</span>
                </div>
                <span className="text-[10px] text-slate-500 group-hover:text-[#D4AF37]">تحديد</span>
              </button>

              <button
                onClick={() => handleQuickChip('رفيق أثر والسكينة')}
                className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-[#D4AF37]/10 border border-slate-800 hover:border-[#D4AF37]/40 text-right text-xs text-slate-200 hover:text-[#D4AF37] flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-[#D4AF37]" />
                  <span>رفيق أثر وواحة السكينة</span>
                </div>
                <span className="text-[10px] text-slate-500 group-hover:text-[#D4AF37]">فتح</span>
              </button>

              <button
                onClick={() => handleQuickChip('حساب الزكاة')}
                className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-[#D4AF37]/10 border border-slate-800 hover:border-[#D4AF37]/40 text-right text-xs text-slate-200 hover:text-[#D4AF37] flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-cyan-400" />
                  <span>حساب الزكاة والصدقات</span>
                </div>
                <span className="text-[10px] text-slate-500 group-hover:text-[#D4AF37]">حساب</span>
              </button>
            </div>
          </div>

          {/* Text Input Fallback (Accessibility fallback for typing) */}
          <form onSubmit={handleManualSubmit} className="pt-2">
            <label htmlFor="voice-text-input" className="text-[11px] text-slate-400 block mb-1.5">
              أو اكتب الأمر هنا (إذا تعذر استخدام الميكروفون):
            </label>
            <div className="flex items-center gap-2">
              <input
                id="voice-text-input"
                ref={inputRef}
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="مثال: كم متبقي على العصر؟ أو سورة يس..."
                className="flex-1 bg-slate-900/90 border border-slate-800 focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="p-2.5 rounded-xl bg-[#D4AF37] text-slate-950 font-bold hover:bg-[#f3ca48] disabled:opacity-40 transition-colors"
                aria-label="إرسال الأمر المكتوب"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>متوافق كلياً مع قارئات الشاشة (TalkBack / VoiceOver)</span>
          </span>
          <button
            onClick={() => VoiceAssistant.stopSpeaking()}
            className="hover:text-slate-200 text-slate-400 flex items-center gap-1"
            title="إيقاف النطق الحالي"
          >
            <VolumeX size={13} />
            <span>كتم النطق</span>
          </button>
        </div>
      </div>
    </div>
  );
};
