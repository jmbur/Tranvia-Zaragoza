import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import webpush from 'web-push';
import { ALL_STOPS_METADATA } from './src/data/lineData';

const app = express();
const PORT = 3000;

app.use(express.json());

// Web Push VAPID configuration for Web & Android PWA push notifications
const DEFAULT_VAPID_PUBLIC_KEY =
  'BEOsi3t_ud9Z1ok54dO7A1MhN0GHeOF5N0tk4aPG_uAXkOdwoUXKZCuT2uepbN0CdDE3_fUg6AG2iN4a-fPP1g8';
const DEFAULT_VAPID_PRIVATE_KEY =
  'o-TqtsOzQ3leeoXekUx3TuqnxUlptKw9z3rFIf2LknQ';

function isValidVapidPublicKey(key: string | undefined): boolean {
  if (!key || typeof key !== 'string') return false;
  try {
    const buf = Buffer.from(key, 'base64url');
    return buf.length === 65 && buf[0] === 4;
  } catch {
    return false;
  }
}

const effectiveVapidPublicKey =
  isValidVapidPublicKey(process.env.VAPID_PUBLIC_KEY)
    ? process.env.VAPID_PUBLIC_KEY!
    : DEFAULT_VAPID_PUBLIC_KEY;

const effectiveVapidPrivateKey =
  process.env.VAPID_PRIVATE_KEY && process.env.VAPID_PRIVATE_KEY.length > 20
    ? process.env.VAPID_PRIVATE_KEY
    : DEFAULT_VAPID_PRIVATE_KEY;

try {
  webpush.setVapidDetails(
    'mailto:soporte@tranviazaragoza.es',
    effectiveVapidPublicKey,
    effectiveVapidPrivateKey
  );
  console.log('WebPush VAPID details configured successfully.');
} catch (vapidErr) {
  console.warn('Failed to configure VAPID details for webpush:', vapidErr);
}

interface PushRule {
  stopId: string;
  stopName: string;
  thresholdMinutes: number;
  direction?: string;
  enabled: boolean;
  timeRangeEnabled?: boolean;
  timeRangeStart?: string;
  timeRangeEnd?: string;
  daysOfWeek?: number[];
}

function isPushRuleInScheduledWindow(rule: PushRule, targetDate: Date = new Date()): boolean {
  if (!rule.timeRangeEnabled) return true;

  if (rule.daysOfWeek && rule.daysOfWeek.length > 0 && rule.daysOfWeek.length < 7) {
    const jsDay = targetDate.getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    if (!rule.daysOfWeek.includes(isoDay)) return false;
  }

  const start = rule.timeRangeStart || '07:30';
  const end = rule.timeRangeEnd || '09:30';

  const [startH, startM] = start.split(':').map((v) => parseInt(v, 10) || 0);
  const [endH, endM] = end.split(':').map((v) => parseInt(v, 10) || 0);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const currentMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}

interface PushSubscriptionRecord {
  subscription: webpush.PushSubscription;
  rules: PushRule[];
  notifiedCache: Record<string, number>;
  updatedAt: number;
}

// In-memory store of active push notification subscriptions
const pushSubscriptions = new Map<string, PushSubscriptionRecord>();

// In-memory cache to prevent overloading Zaragoza municipal servers and ensure sub-10ms user response
interface CacheEntry {
  timestamp: number;
  data: any;
}

let stopsCache: CacheEntry | null = null;
const CACHE_TTL_MS = 15_000; // 15 seconds

const ZARAGOZA_API_URL =
  'https://www.zaragoza.es/sede/servicio/urbanismo-infraestructuras/transporte-urbano/parada-tranvia.json?rows=60';

/**
 * Generates realistic timetable estimates based on official Tranvía Zaragoza operating schedule
 * used when municipal open data servers are unreachable or timing out.
 */
function generateScheduledStopsData() {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const hour = now.getHours();

  // Official headway: Peak: 5-5.5m | Normal daytime: 6-7m | Evening: 9-10m | Night: 15m
  let headway = 6;
  if (hour >= 7 && hour < 21) {
    headway = 5.5;
  } else if (hour >= 21 && hour < 24) {
    headway = 9;
  } else if (hour >= 0 && hour < 5) {
    headway = 15;
  } else {
    headway = 10;
  }

  return ALL_STOPS_METADATA.map((meta) => {
    // Travel time offset along the sequence (approx 1.6 minutes per station)
    const travelOffset = meta.sequenceIndex * 1.6;
    const timePhase = (currentMinutes - travelOffset + 1440) % headway;
    const nextIn = Math.max(0, Math.round((headway - timePhase) % headway));
    const followingIn = Math.round(nextIn + headway);

    const destName = meta.direction === 'MAGO_DE_OZ' ? 'MAGO DE OZ' : 'AVENIDA ACADEMIA';

    return {
      id: meta.id,
      title: meta.name,
      geometry: {
        type: 'Point',
        coordinates: meta.coordinates,
      },
      destinos: [
        { linea: 'L1', destino: destName, minutos: nextIn },
        { linea: 'L1', destino: destName, minutos: followingIn },
      ],
      mensajes: [],
      lastUpdated: now.toISOString(),
    };
  });
}

async function fetchZaragozaTramStops() {
  const now = Date.now();
  if (stopsCache && now - stopsCache.timestamp < CACHE_TTL_MS) {
    return { data: stopsCache.data, isCached: true };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(ZARAGOZA_API_URL, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TranviaZaragoza/1.0',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.result) && json.result.length > 0) {
        stopsCache = { timestamp: now, data: json.result };
        return { data: json.result, isCached: false };
      }
    }
  } catch {
    // Network timeout or blocked connection to external municipal server
  }

  // Graceful fallback to existing cache or scheduled timetable
  if (stopsCache) {
    return { data: stopsCache.data, isCached: true, stale: true };
  }

  const scheduled = generateScheduledStopsData();
  return { data: scheduled, isCached: false, estimated: true };
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'tranvia-zaragoza-proxy' });
});

// Web Push VAPID Public Key for Client Registration
app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: effectiveVapidPublicKey });
});

// Register or update device push subscription with user notification rules
app.post('/api/push/subscribe', (req, res) => {
  try {
    const { subscription, rules } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Subscription and endpoint are required' });
    }

    const existing = pushSubscriptions.get(subscription.endpoint);
    pushSubscriptions.set(subscription.endpoint, {
      subscription,
      rules: Array.isArray(rules) ? rules : [],
      notifiedCache: existing ? existing.notifiedCache : {},
      updatedAt: Date.now(),
    });

    res.json({
      success: true,
      registered: true,
      activeSubscribers: pushSubscriptions.size,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save subscription' });
  }
});

// Unsubscribe a device
app.post('/api/push/unsubscribe', (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      pushSubscriptions.delete(endpoint);
    }
    res.json({ success: true, activeSubscribers: pushSubscriptions.size });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Test push notification dispatch (delivers to Android/Web notification drawer even if closed)
app.post('/api/push/test', async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Subscription is required' });
    }

    const testPayload = JSON.stringify({
      title: 'Tranvía Zaragoza L1',
      body: '¡Avisos push activos! Recibirás avisos en tu teléfono incluso con la app cerrada.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'tz-test-push',
      data: { url: '/' },
    });

    await webpush.sendNotification(subscription, testPayload);
    res.json({ success: true, message: 'Notificación de prueba enviada con éxito' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send test push' });
  }
});

function parseIncidentsFromData(stopsData: any[]): any[] {
  const incidents: any[] = [];
  const seenMessages = new Set<string>();

  // Extract real messages from stops
  stopsData.forEach((stop: any) => {
    if (Array.isArray(stop.mensajes)) {
      stop.mensajes.forEach((m: string) => {
        const cleaned = m.trim();
        if (
          cleaned &&
          !cleaned.includes('QR') &&
          !cleaned.includes('www.tranviasdezaragoza.es') &&
          !cleaned.includes('Telefono') &&
          !seenMessages.has(cleaned)
        ) {
          seenMessages.add(cleaned);

          // Determine category & severity
          const lower = cleaned.toLowerCase();
          let severity: 'high' | 'medium' | 'info' = 'info';
          let category: 'corte' | 'retraso' | 'obras' | 'aviso' = 'aviso';

          if (lower.includes('corte') || lower.includes('interrump') || lower.includes('suspensión') || lower.includes('sin servicio')) {
            severity = 'high';
            category = 'corte';
          } else if (lower.includes('retraso') || lower.includes('demora') || lower.includes('alteración') || lower.includes('frecuencia')) {
            severity = 'medium';
            category = 'retraso';
          } else if (lower.includes('obra') || lower.includes('trabajos') || lower.includes('mantenimiento')) {
            severity = 'medium';
            category = 'obras';
          }

          incidents.push({
            id: `inc-${incidents.length + 1}-${Date.now().toString(36)}`,
            title: category === 'corte' ? 'Corte puntual en el servicio' : category === 'retraso' ? 'Alteración de frecuencias' : 'Aviso oficial de servicio',
            description: cleaned,
            severity,
            category,
            affectedStops: [stop.title || stop.id],
            timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            source: 'Tranvías de Zaragoza',
            active: true,
          });
        }
      });
    }
  });

  // Always ensure official service status is present if no incidents
  if (incidents.length === 0) {
    incidents.push({
      id: 'inc-norm-01',
      title: 'Servicio ordinario Línea 1',
      description: 'Circulación fluida en todo el trazado entre Mago de Oz y Av. de la Academia. Frecuencias habituales de paso sin incidencias activas en vía.',
      severity: 'info',
      category: 'aviso',
      affectedSection: 'Toda la línea (Mago de Oz ↔ Av. Academia)',
      timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      source: 'Tranvías de Zaragoza',
      active: true,
    });
  }

  return incidents;
}

app.get('/api/tranvia/incidencias', async (req, res) => {
  try {
    const { data } = await fetchZaragozaTramStops();
    const incidents = parseIncidentsFromData(data);
    res.json({
      success: true,
      lastUpdated: new Date().toISOString(),
      count: incidents.length,
      incidents,
    });
  } catch (error: any) {
    res.json({
      success: true,
      lastUpdated: new Date().toISOString(),
      count: 1,
      incidents: [
        {
          id: 'inc-default',
          title: 'Servicio habitual Línea 1',
          description: 'Frecuencia regular cada 5 a 7 minutos en días lectivos/laborables.',
          severity: 'info',
          category: 'aviso',
          timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          source: 'Tranvías de Zaragoza',
          active: true,
        },
      ],
    });
  }
});

app.get('/api/tranvia/paradas', async (req, res) => {
  try {
    const { data, isCached, stale, estimated } = await fetchZaragozaTramStops();
    const incidents = parseIncidentsFromData(data);

    // Extract any system broadcast messages from stops
    const alertsSet = new Set<string>();
    data.forEach((stop: any) => {
      if (Array.isArray(stop.mensajes)) {
        stop.mensajes.forEach((m: string) => {
          const cleaned = m.trim();
          if (
            cleaned &&
            !cleaned.includes('QR') &&
            !cleaned.includes('www.tranviasdezaragoza.es') &&
            !cleaned.includes('Telefono')
          ) {
            alertsSet.add(cleaned);
          }
        });
      }
    });

    res.json({
      success: true,
      totalStops: data.length,
      lastUpdated: new Date().toISOString(),
      isCached: !!isCached,
      stale: !!stale,
      estimated: !!estimated,
      alerts: Array.from(alertsSet),
      incidents,
      stops: data,
    });
  } catch (error: any) {
    const fallbackData = generateScheduledStopsData();
    res.json({
      success: true,
      totalStops: fallbackData.length,
      lastUpdated: new Date().toISOString(),
      isCached: false,
      stale: false,
      estimated: true,
      alerts: [],
      incidents: [
        {
          id: 'inc-norm-01',
          title: 'Servicio ordinario Línea 1',
          description: 'Frecuencias habituales de paso entre Mago de Oz y Av. de la Academia.',
          severity: 'info',
          category: 'aviso',
          affectedSection: 'Toda la línea (Mago de Oz ↔ Av. Academia)',
          timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          source: 'Tranvías de Zaragoza',
          active: true,
        },
      ],
      stops: fallbackData,
    });
  }
});

// Background Push Notification Dispatcher
// Evaluates active arrival rules for registered devices even if the user closed the app
async function checkAndDispatchPushNotifications() {
  if (pushSubscriptions.size === 0) return;

  try {
    const { data: stops } = await fetchZaragozaTramStops();
    if (!Array.isArray(stops) || stops.length === 0) return;

    const stopMap = new Map<string, any>();
    stops.forEach((s: any) => stopMap.set(String(s.id), s));

    const now = Date.now();
    const staleThreshold = 1000 * 60 * 60 * 24 * 7; // 7 days

    for (const [endpoint, record] of Array.from(pushSubscriptions.entries())) {
      if (now - record.updatedAt > staleThreshold) {
        pushSubscriptions.delete(endpoint);
        continue;
      }

      for (const rule of record.rules) {
        if (!rule.enabled) continue;
        if (!isPushRuleInScheduledWindow(rule, new Date(now))) continue;
        const stop = stopMap.get(String(rule.stopId));
        if (!stop || !Array.isArray(stop.destinos) || stop.destinos.length === 0) continue;

        // Filter arrivals matching direction if specified
        const matchingArrivals = stop.destinos.filter((d: any) => {
          if (!rule.direction || rule.direction === 'ALL') return true;
          const dest = (d.destino || '').toUpperCase();
          if (rule.direction === 'MAGO_DE_OZ') {
            return dest.includes('MAGO') || dest.includes('OZ') || dest.includes('VALDESPARTERA');
          } else {
            return dest.includes('ACADEMIA') || dest.includes('GOYA') || dest.includes('PARQUE');
          }
        });

        if (matchingArrivals.length === 0) continue;
        const arrival = matchingArrivals[0];
        const minutes = arrival.minutos;

        if (minutes <= rule.thresholdMinutes) {
          // 4-minute deduplication window per stop arrival
          const dedupeKey = `${rule.stopId}-${arrival.destino}-${Math.floor(now / (4 * 60 * 1000))}`;
          if (!record.notifiedCache[dedupeKey]) {
            record.notifiedCache[dedupeKey] = now;

            const minutesText = minutes === 0 ? 'está llegando' : `llega en ${minutes} min`;
            const payload = JSON.stringify({
              title: `Tranvía L1: ${rule.stopName}`,
              body: `Convoy destino ${arrival.destino} ${minutesText} a la parada ${rule.stopName}.`,
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              tag: `tz-${rule.stopId}-${arrival.destino}`,
              data: { url: '/', stopId: rule.stopId },
            });

            try {
              await webpush.sendNotification(record.subscription, payload);
            } catch (err: any) {
              if (err.statusCode === 404 || err.statusCode === 410) {
                pushSubscriptions.delete(endpoint);
                break;
              }
            }
          }
        }
      }
    }
  } catch (err: any) {
    // Non-blocking log
  }
}

// Check push notifications every 20 seconds
setInterval(checkAndDispatchPushNotifications, 20_000);

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (
            filePath.endsWith('index.html') ||
            filePath.endsWith('sw.js') ||
            filePath.endsWith('manifest.json')
          ) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          }
        },
      })
    );
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tranvía Zaragoza server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
