import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
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
  CheckCircle2
} from 'lucide-react';
import { Coordinates, NavigationTab } from '../types';
import { 
  VoiceAssistant, 
  VoiceCommandResult, 
  VoiceAssistantSettings, 
  earconEngine 
} from '../services/voiceAssistantService';
import { AtharBrandLogo } from './AtharBrandLogo';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: Coordinates;
  onNavigate: (tab: NavigationTab) => void;
  onOpenSurah: (surahNumber: number) => void;
  onPlaySurah?: (surahNumber: number) => void;
  onPlayAdhkar: (category: 'morning' | 'evening') => void;
  onOpenTasbih: () => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  coordinates,
  onNavigate,
  onOpenSurah,
  onPlaySurah,
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

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setTranscript('');
      VoiceAssistant.announceToScreenReader('تم فتح نافذة المساعد الصوتي لأثر. اضغط على زر الميكروفون للتحدث أو اختر أمراً صوتياً سريعاً.');
    } else {
      VoiceAssistant.stopListening();
      VoiceAssistant.stopSpeaking();
      setListenState('idle');
    }
  }, [isOpen]);

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

  const handleStartListening = async () => {
    if (!isSupported) {
      setErrorMessage('متصفحك لا يدعم التعرف الصوتي المباشر، يمكنك كتابة الأمر في المربع أدناه.');
      return;
    }

    setErrorMessage(null);
    setTranscript('');
    VoiceAssistant.stopSpeaking();

    try {
      await VoiceAssistant.requestMicrophonePermission();
    } catch {}

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

      if (settings.soundChimes) {
        earconEngine.playSuccessChime();
      }

      executeAction(result);

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
      case 'PLAY_SURAH':
        if (result.surahNumber) {
          onNavigate('quran');
          if (onPlaySurah) {
            onPlaySurah(result.surahNumber);
          } else {
            onOpenSurah(result.surahNumber);
          }
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/88 backdrop-blur-xl animate-in fade-in duration-200 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-modal-title"
      aria-describedby="voice-modal-desc"
    >
      <div 
        className="w-full max-w-lg bg-gradient-to-b from-[#17140D] via-[#0E0D0A] to-[#080705] border-t sm:border border-[#C8A24A]/55 rounded-t-3xl sm:rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[90vh] text-white"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#C8A24A]/25 bg-[#12100B]/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AtharBrandLogo size="sm" />
            <div>
              <h2 id="voice-modal-title" className="text-base font-extrabold text-[#F3E5AB] flex items-center gap-2">
                المساعد الصوتي الملكي لأثر
              </h2>
              <p id="voice-modal-desc" className="text-[11px] text-[#C4B998]">
                أوامر صوتية ذكية ونطق تفاعلي لدعم ذوي الهمم ومكفوفي البصر
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl transition-all border ${
                showSettings 
                  ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#070707] border-[#F3E5AB] shadow' 
                  : 'bg-[#1A160E] text-[#E6C66E] border-[#C8A24A]/35 hover:border-[#E6C66E]'
              }`}
              aria-label="إعدادات الصوت والنطق"
              title="إعدادات الصوت والنطق"
            >
              <Settings2 size={18} />
            </button>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="p-2 rounded-xl bg-[#1A160E] text-[#C4B998] hover:text-white border border-[#C8A24A]/30 hover:border-[#E6C66E] transition-colors"
              aria-label="إغلاق المساعد الصوتي"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Settings Drawer (Expandable in Royal Black & Gold) */}
        {showSettings && (
          <div className="p-4 bg-[#12100B] border-b border-[#C8A24A]/30 space-y-3 text-xs animate-in slide-in-from-top duration-150">
            <div className="font-extrabold text-[#E6C66E] flex items-center gap-1.5">
              <Settings2 size={14} />
              <span>إعدادات المساعد الصوتي والوصول السريع</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-[#18150E] border border-[#C8A24A]/35 cursor-pointer hover:border-[#E6C66E]/60 transition-colors">
                <div>
                  <span className="font-extrabold block text-[#F3E5AB]">نطق الردود صوتياً (TTS)</span>
                  <span className="text-[10px] text-[#C4B998]">ينطق النتيجة بصوت واضح بعد كل إجراء</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoSpeak}
                  onChange={(e) => updateSetting('autoSpeak', e.target.checked)}
                  className="w-4 h-4 accent-[#C8A24A] rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-[#18150E] border border-[#C8A24A]/35 cursor-pointer hover:border-[#E6C66E]/60 transition-colors">
                <div>
                  <span className="font-extrabold block text-[#F3E5AB]">الاستماع عند فتح التطبيق</span>
                  <span className="text-[10px] text-[#C4B998]">يبدأ الاستماع تلقائياً لمكفوفي البصر</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoListenOnAppOpen}
                  onChange={(e) => updateSetting('autoListenOnAppOpen', e.target.checked)}
                  className="w-4 h-4 accent-[#C8A24A] rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-[#18150E] border border-[#C8A24A]/35 cursor-pointer hover:border-[#E6C66E]/60 transition-colors">
                <div>
                  <span className="font-extrabold block text-[#F3E5AB]">التنبيه الصوتي (Earcons)</span>
                  <span className="text-[10px] text-[#C4B998]">إشارات نغمية تؤكد بدء وانتهاء الاستماع</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundChimes}
                  onChange={(e) => updateSetting('soundChimes', e.target.checked)}
                  className="w-4 h-4 accent-[#C8A24A] rounded"
                />
              </label>

              <div className="p-3 rounded-2xl bg-[#18150E] border border-[#C8A24A]/35 flex flex-col justify-center">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-extrabold text-[#F3E5AB]">سرعة النطق:</span>
                  <span className="text-[#E6C66E] font-extrabold font-mono">{settings.speechRate}x</span>
                </div>
                <div className="flex gap-1.5">
                  {[0.85, 1.0, 1.15].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => updateSetting('speechRate', rate)}
                      className={`flex-1 py-1 rounded-xl text-[10px] font-extrabold border transition-all ${
                        settings.speechRate === rate
                          ? 'bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#070707] border-[#F3E5AB]'
                          : 'bg-[#0E0D0A] text-[#C4B998] border-[#C8A24A]/30 hover:border-[#E6C66E]'
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
              {listenState === 'listening' && (
                <>
                  <div className="absolute inset-0 -m-3 rounded-full bg-[#E6C66E]/25 animate-ping opacity-75" />
                  <div className="absolute inset-0 -m-6 rounded-full bg-[#C8A24A]/15 animate-pulse" />
                </>
              )}

              {/* Central Mic Button */}
              <button
                onClick={listenState === 'listening' ? handleStopListening : handleStartListening}
                className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all transform active:scale-95 shadow-2xl ${
                  listenState === 'listening'
                    ? 'bg-gradient-to-b from-[#E6C66E] via-[#C8A24A] to-[#A67C1E] text-[#070707] ring-4 ring-[#E6C66E]/50 shadow-[0_0_30px_rgba(200,162,74,0.6)]'
                    : listenState === 'processing'
                    ? 'bg-[#241E11] text-[#E6C66E] ring-2 ring-[#E6C66E]/60 animate-pulse'
                    : listenState === 'speaking'
                    ? 'bg-[#241E11] text-[#F3E5AB] ring-2 ring-[#E6C66E]'
                    : 'bg-gradient-to-b from-[#1F1A10] to-[#12100B] hover:from-[#292215] hover:to-[#18150E] text-[#E6C66E] border-2 border-[#C8A24A]/55 hover:border-[#E6C66E]'
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
                    <span className="text-[10px] font-extrabold mt-1">أستمع لك...</span>
                  </>
                ) : listenState === 'processing' ? (
                  <>
                    <Sparkles size={34} className="animate-spin" />
                    <span className="text-[10px] font-extrabold mt-1">تحليل...</span>
                  </>
                ) : listenState === 'speaking' ? (
                  <>
                    <Volume2 size={36} className="animate-pulse" />
                    <span className="text-[10px] font-extrabold mt-1">يتحدث...</span>
                  </>
                ) : (
                  <>
                    <Mic size={34} />
                    <span className="text-[10px] font-extrabold mt-1">تحدث الآن</span>
                  </>
                )}
              </button>
            </div>

            {/* Status Live Indicator Text */}
            <div className="mt-4 text-center" aria-live="polite">
              {listenState === 'listening' && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#C8A24A]/20 border border-[#E6C66E]/50 text-[#F3E5AB] text-xs font-extrabold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-[#E6C66E] animate-ping" />
                  <span>تحدث الآن بوضوح (جاري الاستماع للأمر)...</span>
                </div>
              )}
              {listenState === 'processing' && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1F1A10] border border-[#C8A24A]/50 text-[#E6C66E] text-xs font-extrabold">
                  <Sparkles size={13} className="animate-spin" />
                  <span>جارٍ تحليل وفهم الأمر الصوتي...</span>
                </div>
              )}
              {listenState === 'speaking' && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1F1A10] border border-[#E6C66E]/60 text-[#F3E5AB] text-xs font-extrabold">
                  <Volume2 size={13} className="text-[#E6C66E]" />
                  <span>جارٍ نطق الرد الصوتي...</span>
                </div>
              )}
              {listenState === 'idle' && !errorMessage && !lastResult && (
                <p className="text-xs text-[#C4B998]">
                  اضغط على الميكروفون أو اضغط مفتاح <kbd className="px-1.5 py-0.5 bg-[#1A160E] rounded border border-[#C8A24A]/40 text-[#E6C66E] font-mono text-[10px]">V</kbd> للتحدث
                </p>
              )}
            </div>
          </div>

          {/* User's Spoken Transcript Box */}
          {transcript && (
            <div className="p-3.5 rounded-2xl bg-[#14120D] border border-[#C8A24A]/35 text-right space-y-1">
              <span className="text-[10px] font-bold text-[#C4B998] block">ما سمعه التطبيق منك:</span>
              <p className="text-sm font-extrabold text-white flex items-center justify-between">
                <span>"{transcript}"</span>
                <span className="text-[10px] text-[#E6C66E] px-2 py-0.5 rounded-md bg-[#C8A24A]/20 border border-[#C8A24A]/40">صوتي</span>
              </p>
            </div>
          )}

          {/* Assistant's Response Card */}
          {lastResult && (
            <div className="p-4 rounded-2xl bg-gradient-to-b from-[#1E1910] to-[#12100B] border border-[#C8A24A]/55 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#E6C66E] flex items-center gap-1.5">
                  <Sparkles size={14} />
                  <span>رد رفيق أثر:</span>
                </span>
                <button
                  onClick={handleReplaySpokenResponse}
                  className="px-2.5 py-1 rounded-xl bg-[#C8A24A]/20 hover:bg-[#C8A24A]/35 text-[#E6C66E] border border-[#C8A24A]/45 text-[11px] font-extrabold flex items-center gap-1 transition-colors"
                  aria-label="إعادة نطق الرد الصوتي"
                >
                  <Volume2 size={13} />
                  <span>إعادة النطق</span>
                </button>
              </div>

              <p className="text-sm font-extrabold text-[#F3E5AB] leading-relaxed">
                {lastResult.displayResponse}
              </p>

              {lastResult.actionType !== 'NONE' && (
                <div className="pt-2 border-t border-[#C8A24A]/25 flex items-center gap-2 text-[11px] text-[#E6C66E] font-bold">
                  <CheckCircle2 size={14} />
                  <span>تم تنفيذ الإجراء المطلوب داخل التطبيق بنجاح.</span>
                </div>
              )}
            </div>
          )}

          {/* Interactive Guidance / Status Notice */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-[#18150E] border border-[#C8A24A]/50 text-white text-xs space-y-2.5 shadow-lg">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="shrink-0 text-[#E6C66E]" />
                <span className="leading-relaxed font-semibold text-[#F3E5AB]">{errorMessage}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    await VoiceAssistant.requestMicrophonePermission();
                    setErrorMessage(null);
                    inputRef.current?.focus();
                  }}
                  className="flex-1 py-2 px-3 athar-btn-primary rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
                >
                  <CheckCircle2 size={14} />
                  <span>تفعيل الوضع الذكي للأوامر الصوتية ✓</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Voice Command Chips */}
          <div className="space-y-2.5">
            <span className="text-xs font-extrabold text-[#E6C66E] flex items-center justify-between">
              <span>أوامر صوتية سريعة (جرب الضغط عليها):</span>
              <span className="text-[10px] text-[#C4B998] font-medium">اضغط للتجربة الفورية</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { cmd: 'شغل سورة يوسف', icon: Volume2, badge: 'تلاوة 🎧' },
                { cmd: 'استماع سورة الكهف', icon: Volume2, badge: 'تلاوة 🎧' },
                { cmd: 'كم متبقي على صلاة المغرب؟', icon: Clock, badge: 'سؤال' },
                { cmd: 'شغّل أذكار الصباح', icon: Heart, badge: 'تشغيل' },
                { cmd: 'قراءة سورة الكهف', icon: BookOpen, badge: 'فتح' },
                { cmd: 'أين القبلة؟', icon: Compass, badge: 'تحديد' },
                { cmd: 'رفيق أثر والسكينة', icon: Sparkles, badge: 'فتح' },
                { cmd: 'حساب الزكاة', icon: Sparkles, badge: 'حساب' },
              ].map((item) => {
                const IconComp = item.icon;
                return (
                  <button
                    key={item.cmd}
                    onClick={() => handleQuickChip(item.cmd)}
                    className="p-2.5 rounded-2xl bg-[#14120D] hover:bg-[#1E1A11] border border-[#C8A24A]/35 hover:border-[#E6C66E] text-right text-xs text-[#F3E5AB] flex items-center justify-between transition-all group shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <IconComp size={15} className="text-[#E6C66E]" />
                      <span className="font-bold group-hover:text-white">{item.cmd}</span>
                    </div>
                    <span className="text-[10px] text-[#C8A24A] group-hover:text-[#E6C66E] font-bold">
                      {item.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text Input Fallback */}
          <form onSubmit={handleManualSubmit} className="pt-2">
            <label htmlFor="voice-text-input" className="text-[11px] text-[#C4B998] font-bold block mb-1.5">
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
                className="flex-1 bg-[#14120D] border border-[#C8A24A]/40 focus:border-[#E6C66E] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#8E8268] outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="p-2.5 rounded-xl bg-gradient-to-b from-[#E6C66E] to-[#B88A2D] text-[#070707] font-extrabold hover:brightness-110 disabled:opacity-40 transition-all shadow"
                aria-label="إرسال الأمر المكتوب"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-[#C8A24A]/25 bg-[#0B0A08] flex items-center justify-between text-[11px] text-[#C4B998]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#E6C66E]" />
            <span>متوافق كلياً مع قارئات الشاشة (TalkBack / VoiceOver)</span>
          </span>
          <button
            onClick={() => VoiceAssistant.stopSpeaking()}
            className="hover:text-[#E6C66E] text-[#C4B998] font-bold flex items-center gap-1 transition-colors"
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
