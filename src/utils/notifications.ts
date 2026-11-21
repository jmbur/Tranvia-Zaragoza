import { AppNotification, DestinationArrival, DirectionType, NotificationRule, StopWithRealtime } from '../types';

const NOTIFICATION_STORAGE_KEY = 'tz_notification_rules';
const NOTIFIED_CACHE_KEY = 'tz_notified_convoy_cache';
const PERMISSION_STORAGE_KEY = 'tz_push_notifications_enabled';

// Pleasant transit chime using Web Audio API
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export function playTransitChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    // First tone (G4)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(392, ctx.currentTime);
    gain1.gain.setValueAtTime(0.08, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    // Second tone (C5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(523.25, ctx.currentTime + 0.15);
    gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.55);
  } catch (e) {
    // AudioContext blocked by browser policy before user gesture
  }
}

/**
 * Loads notification rules from localStorage
 */
export function loadNotificationRules(): NotificationRule[] {
  try {
    const saved = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('Error loading notification rules', e);
  }
  // Default rule for key favorite stop
  return [
    {
      stopId: '1301',
      stopName: 'Gran Vía',
      direction: 'MAGO_DE_OZ',
      thresholdMinutes: 3,
      enabled: true,
    },
  ];
}

/**
 * Saves notification rules to localStorage
 */
export function saveNotificationRules(rules: NotificationRule[]): void {
  try {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(rules));
    // Asynchronously update server push registration so Android/Web push receives updates with app closed
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      syncPushSubscriptionWithServer(rules).catch(() => {});
    }
  } catch (e) {
    console.warn('Error saving notification rules', e);
  }
}

/**
 * Converts a base64 string to a Uint8Array for VAPID subscription
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

/**
 * Gets or initializes the Service Worker registration for PWA and Android push notifications
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        return reg;
      })
      .catch((err) => {
        console.warn('Service worker registration failed:', err);
        return null;
      });
  }
  return swRegistrationPromise;
}

/**
 * Check if running inside an iframe (like AI Studio preview or embedded viewer)
 */
export function isRunningInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Check if Web Notifications are supported
 */
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current browser notification permission
 */
export function getPushPermission(): NotificationPermission {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
}

export interface PushPermissionResult {
  permission: NotificationPermission;
  isInIframe: boolean;
  status: 'granted' | 'denied' | 'default' | 'iframe_restricted' | 'unsupported';
  message: string;
}

/**
 * Request permission from browser and register Web Push subscription.
 * Handles top-level window vs iframe restrictions, Promise vs callback APIs,
 * and sets up background Service Worker push subscriptions.
 */
export async function requestPushPermission(rules?: NotificationRule[]): Promise<PushPermissionResult> {
  const inIframe = isRunningInIframe();

  if (!isPushSupported()) {
    return {
      permission: 'denied',
      isInIframe: inIframe,
      status: 'unsupported',
      message: 'Este navegador o entorno no soporta la API de notificaciones push.',
    };
  }

  // Inside an iframe, modern Chromium/WebKit explicitly blocks Notification.requestPermission()
  if (inIframe) {
    return {
      permission: Notification.permission,
      isInIframe: true,
      status: 'iframe_restricted',
      message: 'Por seguridad, el navegador no permite solicitar permisos de notificación dentro de un marco integrado (iframe). Abre la app en una pestaña nueva para activarlas.',
    };
  }

  // If user previously blocked notifications for this origin in browser settings
  if (Notification.permission === 'denied') {
    return {
      permission: 'denied',
      isInIframe: false,
      status: 'denied',
      message: 'Las notificaciones están bloqueadas en los ajustes de tu navegador. Toca el candado 🔒 junto a la dirección y cambia las notificaciones a "Permitir".',
    };
  }

  try {
    let perm: NotificationPermission;
    // Support both modern Promise-based requestPermission and legacy callback API
    try {
      const requestPromise = Notification.requestPermission();
      if (requestPromise && typeof (requestPromise as any).then === 'function') {
        perm = await requestPromise;
      } else {
        perm = await new Promise<NotificationPermission>((resolve) => {
          Notification.requestPermission((res) => resolve(res));
        });
      }
    } catch (innerErr: any) {
      if (innerErr && (innerErr.name === 'TypeError' || innerErr.message?.includes('top-level') || innerErr.message?.includes('browsing context'))) {
        return {
          permission: Notification.permission,
          isInIframe: true,
          status: 'iframe_restricted',
          message: 'Por seguridad, el navegador requiere abrir la app en una pestaña nueva para activar las notificaciones push.',
        };
      }
      perm = 'denied';
    }

    localStorage.setItem(PERMISSION_STORAGE_KEY, perm === 'granted' ? 'true' : 'false');

    if (perm === 'granted') {
      try {
        await getServiceWorkerRegistration();
        if (rules) {
          await syncPushSubscriptionWithServer(rules);
        }
      } catch (swErr) {
        console.warn('Error during SW push registration:', swErr);
      }
      return {
        permission: 'granted',
        isInIframe: false,
        status: 'granted',
        message: '¡Notificaciones push activadas correctamente!',
      };
    } else if (perm === 'denied') {
      return {
        permission: 'denied',
        isInIframe: false,
        status: 'denied',
        message: 'Has denegado el permiso. Puedes habilitarlo en el candado 🔒 de la barra de direcciones.',
      };
    } else {
      return {
        permission: 'default',
        isInIframe: false,
        status: 'default',
        message: 'Solicitud cancelada. Puedes volver a intentarlo cuando desees.',
      };
    }
  } catch (err: any) {
    console.warn('Could not request notification permission', err);
    const isIframeErr = err?.message?.includes('top-level') || err?.message?.includes('browsing context');
    return {
      permission: Notification.permission,
      isInIframe: inIframe || isIframeErr,
      status: isIframeErr ? 'iframe_restricted' : 'denied',
      message: isIframeErr
        ? 'Abre la app en una pestaña nueva para que el navegador te permita activar las notificaciones.'
        : 'No se pudo completar la solicitud de permisos en este momento.',
    };
  }
}

/**
 * Syncs user notification rules with the server for background Web Push delivery
 * even when the app is closed on Android / desktop.
 */
export async function syncPushSubscriptionWithServer(rules: NotificationRule[]): Promise<boolean> {
  try {
    if (!isPushSupported() || Notification.permission !== 'granted') return false;
    const reg = await getServiceWorkerRegistration();
    if (!reg || !('pushManager' in reg)) return false;

    // Fetch VAPID key
    const res = await fetch('/api/push/vapid-public-key');
    if (!res.ok) return false;
    const { publicKey } = await res.json();
    if (!publicKey) return false;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    if (sub) {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub,
          rules,
        }),
      });
      return true;
    }
  } catch (err) {
    console.warn('[Push sync error]', err);
  }
  return false;
}

/**
 * Dispatches a test Web Push notification directly from server through push service
 */
export async function sendServerTestPush(): Promise<boolean> {
  try {
    const reg = await getServiceWorkerRegistration();
    if (!reg || !('pushManager' in reg)) return false;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return false;

    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Test push error]', err);
    return false;
  }
}

/**
 * Send a clear and concise push notification to the user.
 * On Android, always uses ServiceWorkerRegistration.showNotification() to prevent
 * "Illegal constructor" TypeError.
 */
export async function sendPushNotification(notification: AppNotification): Promise<void> {
  // Play subtle transit alert chime
  playTransitChime();

  if (!isPushSupported() || Notification.permission !== 'granted') return;

  const dirText = notification.direction === 'MAGO_DE_OZ' ? 'Mago de Oz' : 'Av. Academia';
  const bodyText = `Sentido ${dirText}: Tranvía previsto en ${
    notification.etaMinutes === 0 ? 'menos de 1' : notification.etaMinutes
  } min a ${notification.stopName}.`;

  const options: NotificationOptions & { vibrate?: number[] } = {
    body: bodyText,
    icon: '/tram-icon-192.png',
    badge: '/tram-icon-192.png',
    tag: `tz-arrival-${notification.stopName}-${notification.direction}`,
    vibrate: [200, 100, 200],
    data: { url: '/', stopId: notification.stopName },
  };

  // Primary path for Android & PWAs: Service Worker showNotification
  try {
    const reg = await getServiceWorkerRegistration();
    if (reg && 'showNotification' in reg) {
      await reg.showNotification(notification.title, options);
      return;
    }
  } catch (e) {
    console.warn('SW notification fallback', e);
  }

  // Secondary fallback for standard desktop browser window
  try {
    new Notification(notification.title, options);
  } catch (e) {
    console.warn('Native notification failed, in-app banner will display', e);
  }
}

/**
 * Anti-spam cache: tracks notified combinations (stopId + arrivalMinutes + hourWindow)
 */
function getNotifiedCache(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(NOTIFIED_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function recordNotified(key: string): void {
  try {
    const cache = getNotifiedCache();
    cache[key] = Date.now();
    sessionStorage.setItem(NOTIFIED_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

/**
 * Checks if a given timestamp or date falls within the rule's scheduled time window and active days
 */
export function isRuleInScheduledWindow(
  rule: NotificationRule,
  targetDate: Date = new Date()
): boolean {
  if (!rule.timeRangeEnabled) {
    return true; // No time restriction, valid 24h
  }

  // 1. Day of week check (if specified)
  if (rule.daysOfWeek && rule.daysOfWeek.length > 0 && rule.daysOfWeek.length < 7) {
    // JS getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
    const jsDay = targetDate.getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay; // 1 = Lun, 7 = Dom
    if (!rule.daysOfWeek.includes(isoDay)) {
      return false;
    }
  }

  // 2. Time range check (HH:mm)
  const start = rule.timeRangeStart || '07:30';
  const end = rule.timeRangeEnd || '09:30';

  const [startH, startM] = start.split(':').map((v) => parseInt(v, 10) || 0);
  const [endH, endM] = end.split(':').map((v) => parseInt(v, 10) || 0);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const currentMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();

  if (startMinutes <= endMinutes) {
    // Normal single-day range (e.g., 07:30 to 09:30)
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    // Overnight range spanning midnight (e.g., 23:00 to 02:00)
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}

/**
 * Returns a human-readable summary of the rule's active schedule
 */
export function getRuleScheduleSummary(rule: NotificationRule): string {
  if (!rule.timeRangeEnabled) {
    return 'Todo el día (24h)';
  }

  const start = rule.timeRangeStart || '07:30';
  const end = rule.timeRangeEnd || '09:30';

  let daysText = '';
  if (rule.daysOfWeek && rule.daysOfWeek.length > 0 && rule.daysOfWeek.length < 7) {
    const isWeekdays =
      rule.daysOfWeek.length === 5 &&
      [1, 2, 3, 4, 5].every((d) => rule.daysOfWeek?.includes(d));
    const isWeekend =
      rule.daysOfWeek.length === 2 &&
      [6, 7].every((d) => rule.daysOfWeek?.includes(d));

    if (isWeekdays) {
      daysText = ' (L-V)';
    } else if (isWeekend) {
      daysText = ' (Fin de semana)';
    } else {
      const dayNames = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      daysText = ` (${rule.daysOfWeek.map((d) => dayNames[d]).join(', ')})`;
    }
  }

  return `${start} - ${end}${daysText}`;
}

/**
 * Evaluates stops and upcoming arrivals against configured notification rules.
 * Returns triggered notifications.
 */
export function evaluateNotificationRules(
  stops: StopWithRealtime[],
  rules: NotificationRule[]
): AppNotification[] {
  const triggered: AppNotification[] = [];
  const cache = getNotifiedCache();
  const now = Date.now();
  const nowDate = new Date(now);

  rules.forEach((rule) => {
    if (!rule.enabled) return;

    // Check if current time/day is within rule's scheduled franja horaria
    if (!isRuleInScheduledWindow(rule, nowDate)) return;

    // Find corresponding stop
    const stop = stops.find((s) => s.id === rule.stopId || s.cleanName.toLowerCase() === rule.stopName.toLowerCase());
    if (!stop || !stop.destinos || stop.destinos.length === 0) return;

    // Filter arrivals matching direction if specified
    const matchingArrivals = stop.destinos.filter((d) => {
      if (!rule.direction) return true;
      const dest = (d.destino || '').toUpperCase();
      if (rule.direction === 'MAGO_DE_OZ') {
        return dest.includes('MAGO') || dest.includes('OZ') || dest.includes('VALDESPARTERA');
      } else {
        return dest.includes('ACADEMIA') || dest.includes('GOYA') || dest.includes('PARQUE');
      }
    });

    if (matchingArrivals.length === 0) return;
    const arrival = matchingArrivals[0];
    const minutes = arrival.minutos;

    // Trigger condition: tram is within the user-specified threshold (e.g. <= 3 min)
    if (minutes <= rule.thresholdMinutes) {
      // Create a unique key per arrival event (valid for 5 minutes)
      const arrivalHourBucket = Math.floor(now / (5 * 60 * 1000));
      const dedupeKey = `${stop.id}-${arrival.destino}-${arrivalHourBucket}`;

      if (!cache[dedupeKey]) {
        recordNotified(dedupeKey);

        const dirLabel = stop.direction === 'MAGO_DE_OZ' ? 'Sur (Mago de Oz)' : 'Norte (Av. Academia)';
        const minutesLabel = minutes === 0 ? 'está llegando' : `llega en ${minutes} min`;

        triggered.push({
          id: `notif-${now}-${stop.id}`,
          line: 'L1',
          title: `Tranvía L1: Llegada a ${stop.cleanName}`,
          message: `El convoy destino ${arrival.destino} ${minutesLabel} a la parada ${stop.cleanName} (${dirLabel}).`,
          stopName: stop.cleanName,
          destination: arrival.destino,
          etaMinutes: minutes,
          direction: stop.direction,
          timestamp: now,
        });
      }
    }
  });

  return triggered;
}
