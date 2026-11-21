import React, { useState } from 'react';
import {
  StopWithRealtime,
  DirectionType,
  Incident,
  NotificationRule,
} from '../types';
import {
  isRuleInScheduledWindow,
  getRuleScheduleSummary,
} from '../utils/notifications';
import {
  X,
  Star,
  Clock,
  TrainFront,
  AlertTriangle,
  MapPin,
  ExternalLink,
  Bell,
  BellRing,
  Calendar,
  Sunrise,
  Sun,
  Sunset,
  Moon,
} from 'lucide-react';

interface StopDrawerProps {
  stop: StopWithRealtime | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (stopId: string) => void;
  onCenterOnMap: (stop: StopWithRealtime) => void;
  incidents?: Incident[];
  onOpenIncidents?: () => void;
  notificationRule?: NotificationRule;
  onToggleNotificationRule?: (stop: StopWithRealtime, threshold: number) => void;
  onUpdateNotificationRule?: (rule: NotificationRule) => void;
}

export const StopDrawer: React.FC<StopDrawerProps> = ({
  stop,
  onClose,
  isFavorite,
  onToggleFavorite,
  onCenterOnMap,
  incidents = [],
  onOpenIncidents,
  notificationRule,
  onToggleNotificationRule,
  onUpdateNotificationRule,
}) => {
  if (!stop) return null;

  const isSouth = stop.direction === 'MAGO_DE_OZ';
  const arrivals = stop.destinos || [];
  const primaryArrival = arrivals[0];
  const subsequentArrivals = arrivals.slice(1);

  // Relevant incidents for this stop or general line
  const stopIncidents = incidents.filter((inc) => {
    if (!inc.active) return false;
    if (inc.affectedStops && inc.affectedStops.some(
      (s) =>
        s.toLowerCase() === stop.cleanName.toLowerCase() ||
        s.toLowerCase() === stop.name.toLowerCase() ||
        s === stop.id
    )) {
      return true;
    }
    // Also show high severity corte or line-wide notices
    return inc.severity === 'high';
  });

  // Calculate estimated clock time for arrivals
  const formatEstimatedTime = (minutes: number) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isNotifActive = notificationRule?.enabled;
  const notifThreshold = notificationRule?.thresholdMinutes || 3;

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-up Bottom Card */}
      <div
        id="stop-detail-drawer"
        className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-slate-200/90 dark:border-slate-800 z-50 overflow-hidden transition-transform duration-200"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        {/* Drag handle */}
        <div className="pt-2.5 pb-1 flex justify-center cursor-pointer" onClick={onClose}>
          <div className="w-12 h-1.5 rounded-full bg-slate-300/80 dark:bg-slate-700" />
        </div>

        <div className="px-5 pt-2 pb-5 max-h-[82vh] overflow-y-auto">
          {/* Header row: Station Name, Code, Favorite and Close */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded-lg text-xs font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700/80"
                >
                  Parada #{stop.code}
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {stop.neighborhood}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 truncate tracking-tight">
                {stop.cleanName}
              </h2>

              <p className="text-xs sm:text-sm font-medium text-stone-600 dark:text-stone-400 mt-0.5 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isSouth ? 'bg-[#b85635]' : 'bg-[#2d7a86]'}`} />
                <span className={`font-semibold ${isSouth ? 'text-[#b85635] dark:text-[#d97753]' : 'text-[#2d7a86] dark:text-[#4ea8b6]'}`}>
                  {isSouth
                    ? 'Mago de Oz (Valdespartera)'
                    : 'Av. Academia (Parque Goya)'}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                id="drawer-fav-btn"
                onClick={() => onToggleFavorite(stop.id)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-amber-500 dark:hover:text-amber-400 active:bg-slate-50 dark:active:bg-slate-800 transition"
                title={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              >
                <Star
                  size={18}
                  className={isFavorite ? 'fill-amber-400 text-amber-500' : ''}
                />
              </button>

              <button
                id="drawer-close-btn"
                onClick={onClose}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Real-Time Waiting Times Hero Card (Softer Moreno/Slate Luxury Tone) */}
          <div className="my-4 p-4 rounded-2xl bg-gradient-to-br from-stone-800 to-stone-900 dark:from-slate-800 dark:to-slate-900 text-stone-100 shadow-md border border-stone-700/60 dark:border-slate-700/60 transition-colors">
            <div className="flex items-center justify-between text-xs font-medium text-stone-300 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Tiempo de espera en directo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-red-600 text-white flex items-center justify-center font-bold text-[9px]">
                  L1
                </span>
                <span className="font-semibold text-stone-200">Tranvía</span>
              </div>
            </div>

            {primaryArrival ? (
              <div className="flex items-baseline justify-between mt-2">
                <div>
                  <div className="text-4xl sm:text-5xl font-black tracking-tight flex items-baseline gap-2 text-white">
                    {primaryArrival.minutos === 0 ? (
                      <span>En parada</span>
                    ) : (
                      <>
                        <span>{primaryArrival.minutos}</span>
                        <span className="text-2xl sm:text-3xl font-bold text-stone-300">
                          min
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-sm font-medium text-stone-300 mt-1">
                    Destino: <strong className="text-white font-bold">{primaryArrival.destino}</strong>
                  </div>
                </div>

                <div className="text-right text-xs bg-black/25 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/10">
                  <div className="text-stone-300 text-[11px]">Hora estimada</div>
                  <div className="font-bold text-base text-white">
                    {formatEstimatedTime(primaryArrival.minutos)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-2 text-center text-sm font-medium text-stone-300">
                Frecuencia regular: tranvías cada 5-7 minutos
              </div>
            )}
          </div>

          {/* Push Notification Quick Action: "Avisarme al llegar" */}
          {onToggleNotificationRule && (
            <div className="mb-4 p-3 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-200/80 dark:border-slate-700/80">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold transition ${
                      isNotifActive
                        ? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900'
                        : 'bg-stone-200 dark:bg-slate-700 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    {isNotifActive ? <BellRing size={16} /> : <Bell size={16} />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {isNotifActive ? 'Aviso activo para esta parada' : 'Avisarme cuando llegue el tranvía'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isNotifActive
                        ? `Recibirás una notificación cuando falten ${notifThreshold} min`
                        : 'Notificación push al acercarse a la parada'}
                    </div>
                  </div>
                </div>

                <button
                  id="toggle-stop-notif-btn"
                  onClick={() => onToggleNotificationRule(stop, notifThreshold)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                    isNotifActive
                      ? 'bg-stone-200 dark:bg-slate-700 text-stone-800 dark:text-stone-200 hover:bg-stone-300 dark:hover:bg-slate-600'
                      : 'bg-stone-800 hover:bg-stone-900 dark:bg-stone-200 dark:hover:bg-white text-white dark:text-stone-900'
                  }`}
                >
                  {isNotifActive ? 'Desactivar' : 'Activar'}
                </button>
              </div>

              {/* Threshold options when active */}
              {isNotifActive && (
                <div className="mt-2.5 pt-2 border-t border-stone-200/60 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    Avisar con antelación:
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 5].map((m) => (
                      <button
                        key={m}
                        onClick={() => onToggleNotificationRule(stop, m)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                          notifThreshold === m
                            ? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900 shadow-xs'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {m} min
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Franja horaria when notification active */}
              {isNotifActive && notificationRule && onUpdateNotificationRule && (
                <div className="mt-2.5 pt-2 border-t border-stone-200/60 dark:border-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Calendar size={12} className="text-slate-400 shrink-0" />
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                        Franja horaria:
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-semibold truncate ${
                          notificationRule.timeRangeEnabled
                            ? isRuleInScheduledWindow(notificationRule)
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {getRuleScheduleSummary(notificationRule)}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        const willEnable = !notificationRule.timeRangeEnabled;
                        onUpdateNotificationRule({
                          ...notificationRule,
                          timeRangeEnabled: willEnable,
                          timeRangeStart: notificationRule.timeRangeStart || '07:30',
                          timeRangeEnd: notificationRule.timeRangeEnd || '09:30',
                          daysOfWeek:
                            notificationRule.daysOfWeek && notificationRule.daysOfWeek.length > 0
                              ? notificationRule.daysOfWeek
                              : [1, 2, 3, 4, 5],
                        });
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition shrink-0 ${
                        notificationRule.timeRangeEnabled
                          ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {notificationRule.timeRangeEnabled ? 'Modificar' : 'Fijar horario'}
                    </button>
                  </div>

                  {notificationRule.timeRangeEnabled && (
                    <div className="mt-2 p-2.5 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block mb-1">
                            Hora inicio (Desde)
                          </label>
                          <input
                            type="time"
                            value={notificationRule.timeRangeStart || '07:30'}
                            onChange={(e) =>
                              onUpdateNotificationRule({
                                ...notificationRule,
                                timeRangeStart: e.target.value,
                              })
                            }
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-stone-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block mb-1">
                            Hora fin (Hasta)
                          </label>
                          <input
                            type="time"
                            value={notificationRule.timeRangeEnd || '09:30'}
                            onChange={(e) =>
                              onUpdateNotificationRule({
                                ...notificationRule,
                                timeRangeEnd: e.target.value,
                              })
                            }
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-stone-500"
                          />
                        </div>
                      </div>

                      {/* Presets */}
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block mb-1">
                          Franjas habituales:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                          {[
                            { label: 'Mañana', start: '07:00', end: '09:30', icon: Sunrise },
                            { label: 'Mediodía', start: '13:30', end: '15:30', icon: Sun },
                            { label: 'Tarde', start: '17:30', end: '20:30', icon: Sunset },
                            { label: 'Noche', start: '22:00', end: '00:30', icon: Moon },
                          ].map((preset) => {
                            const isSelected =
                              notificationRule.timeRangeStart === preset.start &&
                              notificationRule.timeRangeEnd === preset.end;
                            const IconComp = preset.icon;
                            return (
                              <button
                                key={preset.label}
                                onClick={() =>
                                  onUpdateNotificationRule({
                                    ...notificationRule,
                                    timeRangeStart: preset.start,
                                    timeRangeEnd: preset.end,
                                  })
                                }
                                className={`px-1.5 py-1 rounded-lg text-[10px] font-semibold border flex items-center justify-center gap-1 transition ${
                                  isSelected
                                    ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 border-transparent shadow-2xs'
                                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                              >
                                <IconComp size={11} className="shrink-0" />
                                <span>{preset.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Days of week selector */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-slate-400 font-medium">
                            Días activos:
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                onUpdateNotificationRule({
                                  ...notificationRule,
                                  daysOfWeek: [1, 2, 3, 4, 5],
                                })
                              }
                              className="text-[9px] font-semibold text-stone-600 dark:text-stone-300 hover:underline px-1"
                            >
                              Laborables (L-V)
                            </button>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <button
                              onClick={() =>
                                onUpdateNotificationRule({
                                  ...notificationRule,
                                  daysOfWeek: [],
                                })
                              }
                              className="text-[9px] font-semibold text-stone-600 dark:text-stone-300 hover:underline px-1"
                            >
                              Todos los días
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                          {[
                            { id: 1, label: 'L' },
                            { id: 2, label: 'M' },
                            { id: 3, label: 'X' },
                            { id: 4, label: 'J' },
                            { id: 5, label: 'V' },
                            { id: 6, label: 'S' },
                            { id: 7, label: 'D' },
                          ].map((d) => {
                            const isDaySelected =
                              !notificationRule.daysOfWeek ||
                              notificationRule.daysOfWeek.length === 0 ||
                              notificationRule.daysOfWeek.includes(d.id);
                            return (
                              <button
                                key={d.id}
                                onClick={() => {
                                  const currentDays =
                                    notificationRule.daysOfWeek &&
                                    notificationRule.daysOfWeek.length > 0
                                      ? [...notificationRule.daysOfWeek]
                                      : [1, 2, 3, 4, 5, 6, 7];
                                  const newDays = currentDays.includes(d.id)
                                    ? currentDays.filter((x) => x !== d.id)
                                    : [...currentDays, d.id];
                                  onUpdateNotificationRule({
                                    ...notificationRule,
                                    daysOfWeek: newDays.length === 7 ? [] : newDays,
                                  });
                                }}
                                className={`py-1 rounded-md text-[10px] font-bold text-center transition ${
                                  isDaySelected
                                    ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 shadow-2xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                              >
                                {d.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Status summary & switch back to 24h button */}
                      <div className="pt-1 flex items-center justify-between text-[10px]">
                        <span
                          className={`font-medium ${
                            isRuleInScheduledWindow(notificationRule)
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {isRuleInScheduledWindow(notificationRule)
                            ? '● Alarma activa en este momento'
                            : '○ Pausada ahora (fuera de la franja horaria)'}
                        </span>

                        <button
                          onClick={() =>
                            onUpdateNotificationRule({
                              ...notificationRule,
                              timeRangeEnabled: false,
                            })
                          }
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
                        >
                          Desactivar franja (24h)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* INCIDENCIAS ESPECÍFICAS DE ESTA PARADA / SERVICIO */}
          {(stopIncidents.length > 0 || (stop.mensajes && stop.mensajes.length > 0)) && (
            <div className="mb-4 p-3.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-xs text-amber-950 dark:text-amber-200">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300">
                  <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                  <span>Incidencias / Avisos que afectan a esta parada</span>
                </div>
                {onOpenIncidents && (
                  <button
                    onClick={onOpenIncidents}
                    className="text-[10px] font-bold text-amber-800 dark:text-amber-300 hover:underline"
                  >
                    Ver todas
                  </button>
                )}
              </div>

              {/* Stop specific API broadcast messages */}
              {stop.mensajes && stop.mensajes.length > 0 && (
                <ul className="space-y-1 text-[11px] text-amber-900 dark:text-amber-200 list-disc list-inside mb-2">
                  {stop.mensajes.map((m, i) => (
                    <li key={i} className="leading-snug">{m}</li>
                  ))}
                </ul>
              )}

              {/* Parsed active incidents */}
              {stopIncidents.map((inc) => (
                <div key={inc.id} className="pt-1.5 border-t border-amber-200/60 dark:border-amber-900/40 first:border-none first:pt-0">
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-[11px]">{inc.title}</div>
                  <div className="text-slate-700 dark:text-slate-300 text-[11px] mt-0.5">{inc.description}</div>
                </div>
              ))}
            </div>
          )}

          {/* Next Subsequent Arrivals List */}
          {subsequentArrivals.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Siguientes convoyes
              </h3>
              <div className="space-y-2">
                {subsequentArrivals.map((arr, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                        L1
                      </div>
                      <div>
                        <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                          {arr.destino}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Previsto: {formatEstimatedTime(arr.minutos)}
                        </div>
                      </div>
                    </div>

                    <div className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5 shadow-2xs">
                      <Clock
                        size={13}
                        className="text-stone-500 dark:text-stone-400"
                      />
                      <span>{arr.minutos} min</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stop Connections */}
          {stop.connections && stop.connections.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Transbordos y conexiones
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {stop.connections.map((conn, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium"
                  >
                    {conn}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons: Centrar en mapa / Abrir navegación */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              id="drawer-center-map-btn"
              onClick={() => {
                onCenterOnMap(stop);
                onClose();
              }}
              className="w-full py-2.5 px-3 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <MapPin size={14} className="text-stone-600 dark:text-stone-400" />
              <span>Ver en mapa</span>
            </button>

            <a
              id="drawer-google-maps-btn"
              href={`https://www.google.com/maps/search/?api=1&query=${stop.coordinates[1]},${stop.coordinates[0]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 bg-stone-800 hover:bg-stone-900 dark:bg-stone-700 dark:hover:bg-stone-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
            >
              <ExternalLink size={14} />
              <span>Cómo llegar</span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
};
