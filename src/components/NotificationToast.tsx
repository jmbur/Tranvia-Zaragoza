import React, { useEffect } from 'react';
import { AppNotification } from '../types';
import { Bell, X, ArrowRight, Clock } from 'lucide-react';

interface NotificationToastProps {
  notification: AppNotification | null;
  onDismiss: () => void;
  onSelectStop?: (stopName: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
  onSelectStop,
}) => {
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 6500);
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  const isSouth = notification.direction === 'MAGO_DE_OZ';

  return (
    <div
      id="notification-toast"
      className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto shadow-2xl"
    >
      <div
        className={`p-3.5 rounded-2xl bg-white border ${
          isSouth ? 'border-red-300' : 'border-blue-300'
        } shadow-lg flex items-start gap-3`}
      >
        {/* Direction-colored icon badge: Zaragoza Red for South */}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-white shadow-xs ${
            isSouth ? 'bg-red-600' : 'bg-blue-600'
          }`}
        >
          <Bell size={18} className="animate-bounce" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                isSouth ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
              }`}
            >
              L1 • {isSouth ? 'Sur' : 'Norte'}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Alerta de llegada
            </span>
          </div>

          <h4 className="text-sm font-bold text-slate-900 mt-0.5 truncate">
            {notification.title}
          </h4>

          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
            {notification.message}
          </p>

          {/* Quick Action */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => {
                onSelectStop?.(notification.stopName);
                onDismiss();
              }}
              className={`text-xs font-bold flex items-center gap-1 ${
                isSouth ? 'text-red-700 hover:text-red-800' : 'text-blue-700 hover:text-blue-800'
              }`}
            >
              <span>Ver parada {notification.stopName}</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition shrink-0"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
