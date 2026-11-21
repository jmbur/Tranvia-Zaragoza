import React, { useState, useEffect } from 'react';
import { StopWithRealtime, NotificationRule, DirectionType } from '../types';
import {
  isPushSupported,
  getPushPermission,
  requestPushPermission,
  sendServerTestPush,
  isRunningInIframe,
  playTransitChime,
  isRuleInScheduledWindow,
  getRuleScheduleSummary,
} from '../utils/notifications';
import {
  X,
  Bell,
  Check,
  Clock,
  Trash2,
  Plus,
  Volume2,
  Smartphone,
  Info,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Calendar,
  Sun,
  Sunrise,
  Sunset,
  Moon,
} from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stops: StopWithRealtime[];
  rules: NotificationRule[];
  onUpdateRules: (rules: NotificationRule[]) => void;
  favorites: string[];
  onSelectStop: (stop: StopWithRealtime) => void;
  onShowTestNotification: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  stops,
  rules,
  onUpdateRules,
  onShowTestNotification,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isIframe, setIsIframe] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{
    type: 'success' | 'warning' | 'info';
    text: string;
  } | null>(null);
  const [defaultThreshold] = useState<number>(3);
  const [selectedAddStopId, setSelectedAddStopId] = useState<string>('');
  const [isSendingServerPush, setIsSendingServerPush] = useState(false);
  const [serverPushSuccess, setServerPushSuccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (isOpen) {
      const inIframe = isRunningInIframe();
      setIsIframe(inIframe);
      if (isPushSupported()) {
        setPermission(getPushPermission());
      }
      setStatusFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEnablePermission = async () => {
    setIsRequestingPermission(true);
    setStatusFeedback(null);

    // Warm up audio chime with user interaction gesture
    playTransitChime();

    try {
      const res = await requestPushPermission(rules);
      setPermission(res.permission);

      if (res.status === 'granted') {
        setStatusFeedback({
          type: 'success',
          text: '¡Notificaciones push concedidas con éxito! Tu dispositivo recibirá avisos de llegada.',
        });
      } else if (res.status === 'iframe_restricted') {
        setStatusFeedback({
          type: 'warning',
          text: 'Por seguridad del navegador, las notificaciones no se pueden solicitar dentro del marco incrustado. Abre la app en una pestaña nueva.',
        });
      } else if (res.status === 'denied') {
        setStatusFeedback({
          type: 'warning',
          text: 'El navegador tiene bloqueadas las notificaciones para este sitio. Toca el icono de candado 🔒 en la barra de direcciones para permitirlas.',
        });
      } else {
        setStatusFeedback({
          type: 'info',
          text: res.message || 'Solicitud de permiso finalizada.',
        });
      }
    } catch (err: any) {
      console.warn('Error enabling push permission:', err);
      setStatusFeedback({
        type: 'warning',
        text: 'No se pudo activar el permiso en este contexto. Abre la app en una pestaña nueva.',
      });
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleServerTestPush = async () => {
    setIsSendingServerPush(true);
    setServerPushSuccess(null);
    try {
      const ok = await sendServerTestPush();
      setServerPushSuccess(ok);
      if (!ok) {
        // Fallback to in-app chime and test notification
        playTransitChime();
        onShowTestNotification();
      }
    } catch {
      playTransitChime();
      onShowTestNotification();
    } finally {
      setIsSendingServerPush(false);
      setTimeout(() => setServerPushSuccess(null), 4000);
    }
  };

  const handleManualTestSoundAndToast = () => {
    playTransitChime();
    onShowTestNotification();
  };

  const handleToggleRule = (stopId: string, dir: DirectionType) => {
    const updated = rules.map((r) =>
      r.stopId === stopId && r.direction === dir
        ? { ...r, enabled: !r.enabled }
        : r
    );
    onUpdateRules(updated);
  };

  const handleChangeThreshold = (stopId: string, dir: DirectionType, minutes: number) => {
    const updated = rules.map((r) =>
      r.stopId === stopId && r.direction === dir
        ? { ...r, thresholdMinutes: minutes }
        : r
    );
    onUpdateRules(updated);
  };

  const handleToggleTimeRange = (stopId: string, dir: DirectionType) => {
    const updated = rules.map((r) => {
      if (r.stopId === stopId && r.direction === dir) {
        const willEnable = !r.timeRangeEnabled;
        return {
          ...r,
          timeRangeEnabled: willEnable,
          timeRangeStart: r.timeRangeStart || '07:30',
          timeRangeEnd: r.timeRangeEnd || '09:30',
          daysOfWeek: r.daysOfWeek && r.daysOfWeek.length > 0 ? r.daysOfWeek : [1, 2, 3, 4, 5],
        };
      }
      return r;
    });
    onUpdateRules(updated);
  };

  const handleUpdateTimeRange = (
    stopId: string,
    dir: DirectionType,
    fields: Partial<NotificationRule>
  ) => {
    const updated = rules.map((r) =>
      r.stopId === stopId && r.direction === dir ? { ...r, ...fields } : r
    );
    onUpdateRules(updated);
  };

  const handleRemoveRule = (stopId: string, dir: DirectionType) => {
    const updated = rules.filter(
      (r) => !(r.stopId === stopId && r.direction === dir)
    );
    onUpdateRules(updated);
  };

  const handleAddRuleForStop = (stopId: string) => {
    const stop = stops.find((s) => s.id === stopId);
    if (!stop) return;

    // Check if rule already exists
    const exists = rules.some(
      (r) => r.stopId === stop.id && r.direction === stop.direction
    );
    if (exists) {
      onUpdateRules(
        rules.map((r) =>
          r.stopId === stop.id && r.direction === stop.direction
            ? { ...r, enabled: true }
            : r
        )
      );
    } else {
      const newRule: NotificationRule = {
        stopId: stop.id,
        stopName: stop.cleanName,
        direction: stop.direction,
        thresholdMinutes: defaultThreshold,
        enabled: true,
        timeRangeEnabled: false,
        timeRangeStart: '07:30',
        timeRangeEnd: '09:30',
        daysOfWeek: [1, 2, 3, 4, 5],
      };
      onUpdateRules([...rules, newRule]);
    }
    setSelectedAddStopId('');
  };

  const appUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div
        id="notifications-config-modal"
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Bell size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Avisos de Llegada de Tranvía
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Notificación push y sonido cuando tu tranvía esté a X minutos
              </p>
            </div>
          </div>

          <button
            id="notif-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Permission Status Banner */}
          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-slate-800/60 border border-stone-200/80 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                  <span>Permiso de notificaciones push</span>
                  {permission === 'granted' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                      <Check size={11} />
                      Activo
                    </span>
                  ) : permission === 'denied' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300">
                      Bloqueado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                      Inactivo
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {permission === 'granted'
                    ? 'Recibirás avisos en pantalla y en la barra del móvil incluso con la app cerrada en Android.'
                    : isIframe
                    ? 'Para activar las alertas push del sistema operativo, abre la app en una pestaña nueva.'
                    : permission === 'denied'
                    ? 'Las notificaciones están bloqueadas en los ajustes de tu navegador.'
                    : 'Activa los avisos para que el navegador te solicite permiso.'}
                </p>
              </div>

              {/* Action Buttons: Open in new tab or Activate */}
              <div className="shrink-0 flex items-center gap-1.5">
                {isIframe ? (
                  <a
                    id="open-new-tab-push-btn"
                    href={appUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl font-bold shrink-0 shadow-xs transition flex items-center gap-1.5 text-xs"
                  >
                    <span>Abrir en pestaña</span>
                    <ExternalLink size={13} />
                  </a>
                ) : permission !== 'granted' ? (
                  <button
                    id="enable-browser-push-btn"
                    onClick={handleEnablePermission}
                    disabled={isRequestingPermission}
                    className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl font-bold shrink-0 shadow-xs transition flex items-center gap-1.5 text-xs disabled:opacity-50"
                  >
                    {isRequestingPermission && <RefreshCw size={12} className="animate-spin" />}
                    <span>{isRequestingPermission ? 'Activando...' : 'Activar'}</span>
                  </button>
                ) : null}
              </div>
            </div>

            {/* If in iframe: Explain why browser blocks requestPermission inside iframe */}
            {isIframe && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <Info size={14} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="font-semibold">Aviso del navegador para la vista previa</p>
                  <p className="text-[10px] text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                    Chrome, Safari y Android prohíben solicitar permisos push dentro de marcos integrados (iframe). Pulsa en <strong>&ldquo;Abrir en pestaña&rdquo;</strong> y allí podrás hacer clic en <strong>Activar</strong> para autorizar las alertas nativas.
                  </p>
                </div>
              </div>
            )}

            {/* If blocked by browser settings */}
            {permission === 'denied' && !isIframe && (
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-[11px] text-red-900 dark:text-red-200 flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <div>
                  <p className="font-semibold">Permiso bloqueado en este sitio</p>
                  <p className="text-[10px] text-red-800/90 dark:text-red-300/90 mt-0.5">
                    Toca el icono del candado 🔒 o de configuración en la barra de direcciones de tu navegador, cambia <em>Notificaciones</em> a <strong>Permitir</strong> y vuelve a cargar la página.
                  </p>
                </div>
              </div>
            )}

            {/* Status Feedback banner */}
            {statusFeedback && (
              <div
                className={`p-2.5 rounded-xl text-[11px] font-medium border flex items-center gap-2 ${
                  statusFeedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                    : statusFeedback.type === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-800 dark:text-amber-300'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Info size={14} className="shrink-0" />
                <span>{statusFeedback.text}</span>
              </div>
            )}
          </div>

          {/* Test Controls: In-App sound & banner test + Real OS Push Test */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Smartphone size={16} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                    <span>Avisos nativos y en segundo plano</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                      Android & Web
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Service Worker, Web Push VAPID y sonido transit integrado.
                  </p>
                </div>
              </div>
            </div>

            {/* Test Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                id="test-sound-and-banner-btn"
                onClick={handleManualTestSoundAndToast}
                className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition shadow-xs text-xs"
              >
                <Volume2 size={15} className="text-red-600 dark:text-red-400 shrink-0" />
                <span>Probar sonido y aviso</span>
              </button>

              <button
                id="test-phone-push-btn"
                onClick={handleServerTestPush}
                disabled={isSendingServerPush}
                className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSendingServerPush ? (
                  <RefreshCw size={14} className="animate-spin shrink-0" />
                ) : (
                  <Bell size={14} className="shrink-0" />
                )}
                <span>{isSendingServerPush ? 'Enviando...' : 'Probar en teléfono (Push)'}</span>
              </button>
            </div>

            {serverPushSuccess === true && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
                ✓ Notificación push enviada al sistema operativo de tu dispositivo.
              </p>
            )}

            <div className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <Info size={13} className="shrink-0 mt-0.5 text-slate-400" />
              <span>
                Con el permiso activo, el servidor monitoriza las llegadas y envía alertas push a la barra de notificaciones de tu móvil aunque apagues la pantalla.
              </span>
            </div>
          </div>

          {/* Quick Add Stop For Notifications */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Añadir parada para notificaciones
            </h3>
            <div className="flex gap-2">
              <select
                id="add-notif-stop-select"
                value={selectedAddStopId}
                onChange={(e) => setSelectedAddStopId(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-stone-500"
              >
                <option value="">Selecciona una parada...</option>
                {stops.map((s) => (
                  <option key={`${s.id}-${s.direction}`} value={s.id}>
                    {s.cleanName} ({s.direction === 'MAGO_DE_OZ' ? 'Mago de Oz' : 'Av. Academia'})
                  </option>
                ))}
              </select>
              <button
                id="add-notif-rule-btn"
                disabled={!selectedAddStopId}
                onClick={() => handleAddRuleForStop(selectedAddStopId)}
                className="px-3 py-2 bg-stone-800 hover:bg-stone-900 dark:bg-stone-200 dark:hover:bg-white text-white dark:text-stone-900 disabled:opacity-40 rounded-xl font-bold flex items-center gap-1 shadow-xs transition"
              >
                <Plus size={14} />
                <span>Añadir</span>
              </button>
            </div>
          </div>

          {/* Active Rules List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Paradas monitorizadas ({rules.length})
              </h3>
            </div>

            {rules.length === 0 ? (
              <div className="p-4 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                No tienes paradas configuradas. Selecciona una parada arriba o pulsa la campana en la ficha de cualquier parada.
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map((rule) => {
                  const isSouth = rule.direction === 'MAGO_DE_OZ';
                  return (
                    <div
                      key={`${rule.stopId}-${rule.direction}`}
                      className={`p-3 rounded-2xl border transition ${
                        rule.enabled
                          ? 'bg-stone-50/70 dark:bg-slate-800/60 border-stone-200/90 dark:border-slate-700/80'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${isSouth ? 'bg-[#b85635]' : 'bg-[#2d7a86]'}`} />
                            <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                              {rule.stopName}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                              isSouth
                                ? 'bg-[#fbeee8] dark:bg-[#3d1d14] text-[#a64728] dark:text-[#f3a890] border-[#f0cfc4] dark:border-[#5a2b1f]'
                                : 'bg-[#eaf5f7] dark:bg-[#122e33] text-[#22636d] dark:text-[#9fe2ec] border-[#c4e6eb] dark:border-[#1d474f]'
                            }`}>
                              {isSouth ? 'Mago de Oz' : 'Av. Academia'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Destino: {isSouth ? 'Mago de Oz' : 'Av. Academia'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleRule(rule.stopId, rule.direction)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                              rule.enabled
                                ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {rule.enabled ? 'Activa' : 'Pausada'}
                          </button>
                          <button
                            onClick={() => handleRemoveRule(rule.stopId, rule.direction)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                            title="Eliminar aviso"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Minute Threshold Selector */}
                      <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                        <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" />
                          <span>Avisar con antelación:</span>
                        </span>

                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 5].map((m) => (
                            <button
                              key={m}
                              onClick={() =>
                                handleChangeThreshold(rule.stopId, rule.direction, m)
                              }
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                                rule.thresholdMinutes === m
                                  ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 shadow-xs'
                                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                            >
                              {m} min
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Time Range (Franja horaria) Selector */}
                      {(() => {
                        const inScheduleNow = isRuleInScheduledWindow(rule);
                        return (
                          <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Calendar size={12} className="text-slate-400 shrink-0" />
                                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                  Franja horaria:
                                </span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded font-semibold truncate ${
                                    rule.timeRangeEnabled
                                      ? inScheduleNow
                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {getRuleScheduleSummary(rule)}
                                </span>
                              </div>

                              <button
                                onClick={() => handleToggleTimeRange(rule.stopId, rule.direction)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition shrink-0 ${
                                  rule.timeRangeEnabled
                                    ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900'
                                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {rule.timeRangeEnabled ? 'Modificar' : 'Fijar horario'}
                              </button>
                            </div>

                            {/* Expanded Time Range Settings */}
                            {rule.timeRangeEnabled && (
                              <div className="mt-2 p-2.5 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                                {/* Time inputs: Desde y Hasta */}
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block mb-1">
                                      Hora inicio (Desde)
                                    </label>
                                    <input
                                      type="time"
                                      value={rule.timeRangeStart || '07:30'}
                                      onChange={(e) =>
                                        handleUpdateTimeRange(rule.stopId, rule.direction, {
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
                                      value={rule.timeRangeEnd || '09:30'}
                                      onChange={(e) =>
                                        handleUpdateTimeRange(rule.stopId, rule.direction, {
                                          timeRangeEnd: e.target.value,
                                        })
                                      }
                                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-stone-500"
                                    />
                                  </div>
                                </div>

                                {/* Preset quick buttons */}
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
                                        rule.timeRangeStart === preset.start &&
                                        rule.timeRangeEnd === preset.end;
                                      const IconComp = preset.icon;
                                      return (
                                        <button
                                          key={preset.label}
                                          onClick={() =>
                                            handleUpdateTimeRange(rule.stopId, rule.direction, {
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
                                          handleUpdateTimeRange(rule.stopId, rule.direction, {
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
                                          handleUpdateTimeRange(rule.stopId, rule.direction, {
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
                                        !rule.daysOfWeek ||
                                        rule.daysOfWeek.length === 0 ||
                                        rule.daysOfWeek.includes(d.id);
                                      return (
                                        <button
                                          key={d.id}
                                          onClick={() => {
                                            const currentDays =
                                              rule.daysOfWeek && rule.daysOfWeek.length > 0
                                                ? [...rule.daysOfWeek]
                                                : [1, 2, 3, 4, 5, 6, 7];
                                            const newDays = currentDays.includes(d.id)
                                              ? currentDays.filter((x) => x !== d.id)
                                              : [...currentDays, d.id];
                                            handleUpdateTimeRange(rule.stopId, rule.direction, {
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
                                      inScheduleNow
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-amber-600 dark:text-amber-400'
                                    }`}
                                  >
                                    {inScheduleNow
                                      ? '● Alarma activa en este momento'
                                      : '○ Pausada ahora (fuera de la franja horaria)'}
                                  </span>

                                  <button
                                    onClick={() =>
                                      handleUpdateTimeRange(rule.stopId, rule.direction, {
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
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-900 dark:bg-stone-700 dark:hover:bg-stone-600 text-white rounded-xl font-bold text-xs transition shadow-xs"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
