import React, { useState, useEffect } from 'react';
import { InAppNotification, NotificationService } from '../services/notificationService';
import { AudioService } from '../services/audioService';
import { Bell, X, Play, Clock, Heart } from 'lucide-react';

interface AndroidNotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidNotificationDrawer: React.FC<AndroidNotificationDrawerProps> = ({
  isOpen,
  onClose
}) => {
  const [history, setHistory] = useState<InAppNotification[]>([]);

  useEffect(() => {
    setHistory(NotificationService.getHistory());

    const unsubscribe = NotificationService.subscribe(() => {
      setHistory(NotificationService.getHistory());
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      {/* Full Android Notification Drawer / Shade */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-start">
          <div className="w-full max-w-md mx-auto bg-[#0E1318] border-b border-slate-800 rounded-b-3xl p-4 shadow-2xl animate-slideDown max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-[#D4AF37]" />
                <h3 className="text-sm font-bold text-slate-100">لوحة الإشعارات والتذكيرات</h3>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    onClick={() => {
                      NotificationService.clearHistory();
                      setHistory([]);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1"
                  >
                    مسح الكل
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1 rounded-full text-slate-400 hover:text-white"
                  aria-label="إغلاق اللوحة"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
              {history.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  لا توجد إشعارات سابقة حالياً
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#151C24] border border-slate-800/80 rounded-xl p-3 text-right flex items-start gap-3"
                  >
                    <div className="p-2 bg-[#D4AF37]/15 rounded-lg text-[#D4AF37] shrink-0 mt-0.5">
                      <Bell size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-200">{item.title}</span>
                        <span className="tabular-nums">
                          {new Date(item.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{item.body}</p>
                      {item.actionText && (
                        <button
                          onClick={() => {
                            item.onAction?.();
                            onClose();
                          }}
                          className="mt-2 text-xs font-semibold text-[#D4AF37] hover:underline inline-flex items-center gap-1"
                        >
                          <Play size={11} fill="currentColor" />
                          <span>{item.actionText}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
