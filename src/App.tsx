import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StopWithRealtime,
  TramConvoy,
  DirectionType,
  ViewMode,
  ApiResponse,
  Incident,
  NotificationRule,
  AppNotification,
} from './types';
import {
  ALL_STOPS_METADATA,
} from './data/lineData';
import {
  mergeStopsWithRealtime,
  detectActiveTrams,
} from './utils/tramEngine';
import { calculateHaversineDistance } from './utils/geo';
import {
  loadNotificationRules,
  saveNotificationRules,
  evaluateNotificationRules,
  sendPushNotification,
  playTransitChime,
  getServiceWorkerRegistration,
  syncPushSubscriptionWithServer,
  requestPushPermission,
} from './utils/notifications';
import { Header } from './components/Header';
import { FavoritesModal } from './components/FavoritesModal';
import { TramMap } from './components/TramMap';
import { LineSchematic } from './components/LineSchematic';
import { StopDrawer } from './components/StopDrawer';
import { TramModal } from './components/TramModal';
import { IncidentsModal } from './components/IncidentsModal';
import { NotificationsModal } from './components/NotificationsModal';
import { NotificationToast } from './components/NotificationToast';
import { AlertTriangle, ChevronRight, X, Sun, Moon } from 'lucide-react';

export default function App() {
  // Navigation & View State
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [selectedDirection, setSelectedDirection] = useState<DirectionType | 'ALL'>('ALL');
  const [selectedStop, setSelectedStop] = useState<StopWithRealtime | null>(null);
  const [selectedTram, setSelectedTram] = useState<TramConvoy | null>(null);

  // Modals & Drawers
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);
  const [isIncidentsModalOpen, setIsIncidentsModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [dismissedAlertBanner, setDismissedAlertBanner] = useState(false);

  // Push Notifications State
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>(() =>
    loadNotificationRules()
  );
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  // Real-time Data State
  const [stops, setStops] = useState<StopWithRealtime[]>(() =>
    mergeStopsWithRealtime(ALL_STOPS_METADATA, [])
  );
  const [trams, setTrams] = useState<TramConvoy[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Geolocation
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Dark Mode State with persistence and system preference detection
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('tz_dark_mode');
      if (saved !== null) {
        return JSON.parse(saved);
      }
      return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('tz_dark_mode', JSON.stringify(darkMode));
    } catch {}
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleToggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  // Favorites (Saved in localStorage)
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tz_favorite_stops');
      return saved ? JSON.parse(saved) : ['1101', '1301', '1501', '1801'];
    } catch {
      return ['1101', '1301', '1501', '1801'];
    }
  });

  // Save favorites to localStorage
  const handleToggleFavorite = (stopId: string) => {
    setFavorites((prev) => {
      const updated = prev.includes(stopId)
        ? prev.filter((id) => id !== stopId)
        : [...prev, stopId];
      try {
        localStorage.setItem('tz_favorite_stops', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Notification Rules Management
  const handleUpdateRules = (updated: NotificationRule[]) => {
    setNotificationRules(updated);
    saveNotificationRules(updated);
  };

  const handleToggleStopNotification = (stop: StopWithRealtime, threshold: number) => {
    const existingIndex = notificationRules.findIndex(
      (r) => r.stopId === stop.id && r.direction === stop.direction
    );

    let updated: NotificationRule[];
    if (existingIndex >= 0) {
      const existing = notificationRules[existingIndex];
      if (existing.enabled && existing.thresholdMinutes === threshold) {
        // Disable
        updated = notificationRules.map((r, i) =>
          i === existingIndex ? { ...r, enabled: false } : r
        );
      } else {
        // Enable or update threshold
        updated = notificationRules.map((r, i) =>
          i === existingIndex ? { ...r, enabled: true, thresholdMinutes: threshold } : r
        );
      }
    } else {
      updated = [
        ...notificationRules,
        {
          stopId: stop.id,
          stopName: stop.cleanName,
          direction: stop.direction,
          thresholdMinutes: threshold,
          enabled: true,
          timeRangeEnabled: false,
          timeRangeStart: '07:30',
          timeRangeEnd: '09:30',
          daysOfWeek: [1, 2, 3, 4, 5],
        },
      ];
    }

    handleUpdateRules(updated);

    // Also prompt push permission if not yet decided and supported
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      requestPushPermission(updated).catch(() => {});
    }
  };

  const handleUpdateSingleRule = (updatedRule: NotificationRule) => {
    const updated = notificationRules.map((r) =>
      r.stopId === updatedRule.stopId && r.direction === updatedRule.direction
        ? updatedRule
        : r
    );
    handleUpdateRules(updated);
  };

  // Trigger test notification
  const handleShowTestNotification = () => {
    const testNotif: AppNotification = {
      id: `test-${Date.now()}`,
      line: 'L1',
      title: 'Tranvía L1: Llegada a Gran Vía',
      message: 'Sentido Sur (Mago de Oz): Convoy aproximándose, llegada estimada en 2 min.',
      stopName: 'Gran Vía',
      destination: 'Mago de Oz',
      etaMinutes: 2,
      direction: 'MAGO_DE_OZ',
      timestamp: Date.now(),
    };

    sendPushNotification(testNotif);
    setActiveToast(testNotif);
  };

  // 1. Fetch Real-time Stop & Incident Data from API
  const fetchRealtimeData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setApiError(null);

    try {
      const response = await fetch('/api/tranvia/paradas');
      if (!response.ok) {
        throw new Error(`Error de conexión: ${response.status}`);
      }

      const json: ApiResponse = await response.json();

      if (json.success && Array.isArray(json.stops)) {
        // Merge with static metadata
        const merged = mergeStopsWithRealtime(ALL_STOPS_METADATA, json.stops);

        // Calculate distances if user location is available
        const withDistances = userLocation
          ? merged.map((s) => ({
              ...s,
              distanceMeters: calculateHaversineDistance(userLocation, s.coordinates),
            }))
          : merged;

        setStops(withDistances);
        setLastUpdated(json.lastUpdated);

        // Update incidents list
        if (json.incidents && json.incidents.length > 0) {
          setIncidents(json.incidents);
        }

        // Detect and calculate active moving trams
        const southTrams = detectActiveTrams(withDistances, 'MAGO_DE_OZ');
        const northTrams = detectActiveTrams(withDistances, 'AVENIDA_ACADEMIA');
        const allNewTrams = [...southTrams, ...northTrams];
        setTrams(allNewTrams);

        // Keep selected tram in sync if user has details opened
        setSelectedTram((prev) => {
          if (!prev) return null;
          const updated = allNewTrams.find(
            (t) =>
              t.id === prev.id ||
              (t.direction === prev.direction &&
                (t.currentStopId === prev.currentStopId ||
                  t.nextStopId === prev.nextStopId))
          );
          return updated || prev;
        });

        // Keep selected stop updated with new arrival data
        setSelectedStop((prev) => {
          if (!prev) return null;
          const updated = withDistances.find((s) => s.id === prev.id);
          return updated || prev;
        });

        // Evaluate Push Notification Rules against newly arrived data
        const triggeredNotifs = evaluateNotificationRules(withDistances, notificationRules);
        if (triggeredNotifs.length > 0) {
          const firstNotif = triggeredNotifs[0];
          sendPushNotification(firstNotif);
          setActiveToast(firstNotif);
        }
      } else {
        throw new Error('Formato de datos no reconocido');
      }
    } catch {
      // Fallback calculation for stops and trams based on schedule
      const fallbackMerged = mergeStopsWithRealtime(ALL_STOPS_METADATA, []);
      const withDistances = userLocation
        ? fallbackMerged.map((s) => ({
            ...s,
            distanceMeters: calculateHaversineDistance(userLocation, s.coordinates),
          }))
        : fallbackMerged;
      setStops(withDistances);
      const southTrams = detectActiveTrams(withDistances, 'MAGO_DE_OZ');
      const northTrams = detectActiveTrams(withDistances, 'AVENIDA_ACADEMIA');
      setTrams([...southTrams, ...northTrams]);
      setLastUpdated(new Date().toISOString());
    } finally {
      setIsLoading(false);
    }
  }, [userLocation, notificationRules]);

  // Register Service Worker and sync notification rules with push server
  useEffect(() => {
    getServiceWorkerRegistration();
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      syncPushSubscriptionWithServer(notificationRules);
    }
  }, [notificationRules]);

  // Initial load
  useEffect(() => {
    fetchRealtimeData();
  }, [fetchRealtimeData]);

  // Periodic polling with visibility detection
  useEffect(() => {
    const interval = setInterval(() => {
      // If user has locked screen or switched browser tabs, do not poll
      if (document.hidden) return;
      fetchRealtimeData(true);
    }, 15_000);

    return () => clearInterval(interval);
  }, [fetchRealtimeData]);

  // Handle Geolocation to find closest stop
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no está disponible en su dispositivo.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userCoord: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];
        setUserLocation(userCoord);
        setIsLocating(false);

        // Find closest stop
        let closestStop: StopWithRealtime | null = null;
        let minDistance = Infinity;

        const updatedStops = stops.map((stop) => {
          const dist = calculateHaversineDistance(userCoord, stop.coordinates);
          if (dist < minDistance) {
            minDistance = dist;
            closestStop = stop;
          }
          return { ...stop, distanceMeters: dist };
        });

        setStops(updatedStops);

        if (closestStop) {
          setSelectedStop(closestStop);
        }
      },
      (error) => {
        setIsLocating(false);
        console.warn('Geolocation error:', error.message);
        // Default to Plaza España in central Zaragoza
        setUserLocation([-0.8815, 41.6514]);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Center on map handler from drawer or search
  const handleCenterOnMap = (stop: StopWithRealtime) => {
    setViewMode('map');
    setSelectedStop(stop);
  };

  // Active notification rule for selected stop
  const selectedStopRule = useMemo(() => {
    if (!selectedStop) return undefined;
    return notificationRules.find(
      (r) => r.stopId === selectedStop.id && r.direction === selectedStop.direction
    );
  }, [selectedStop, notificationRules]);

  // Check if any active incident has medium or high severity
  const activeDisruption = useMemo(() => {
    return incidents.find((inc) => inc.active && (inc.severity === 'high' || inc.severity === 'medium'));
  }, [incidents]);

  const hasDisruption = !!activeDisruption;
  const activeAlertsCount = notificationRules.filter((r) => r.enabled).length;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden select-none transition-colors">
      {/* 1. Header Bar with Controls */}
      <Header
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        selectedDirection={selectedDirection}
        onChangeDirection={setSelectedDirection}
        lastUpdated={lastUpdated}
        isLoading={isLoading}
        onRefresh={() => fetchRealtimeData(false)}
        onOpenIncidents={() => setIsIncidentsModalOpen(true)}
        incidentsCount={incidents.length}
        hasDisruption={hasDisruption}
        onOpenNotifications={() => setIsNotificationsModalOpen(true)}
        activeAlertsCount={activeAlertsCount}
        onOpenFavorites={() => setIsFavoritesModalOpen(true)}
        favoritesCount={favorites.length}
      />

      {/* 2. Real-Time Incidents Banner (General Map Overview) */}
      {hasDisruption && !dismissedAlertBanner && (
        <div
          id="active-incident-overview-banner"
          className="mx-3 mb-1.5 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-900/60 rounded-2xl text-amber-950 dark:text-amber-200 text-xs flex items-center justify-between gap-2 shadow-xs shrink-0 max-w-xl self-center w-[calc(100%-1.5rem)] animate-in fade-in"
        >
          <div
            onClick={() => setIsIncidentsModalOpen(true)}
            className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
          >
            <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="truncate">
              <span className="font-bold mr-1.5 text-slate-900 dark:text-slate-100">{activeDisruption?.title}:</span>
              <span className="text-amber-800 dark:text-amber-300 text-[11px] truncate">
                {activeDisruption?.description}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsIncidentsModalOpen(true)}
              className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 rounded-lg text-[10px] font-bold hover:bg-amber-100 dark:hover:bg-slate-700 transition flex items-center gap-0.5"
            >
              <span>Ver</span>
              <ChevronRight size={11} />
            </button>
            <button
              onClick={() => setDismissedAlertBanner(true)}
              className="p-1 text-amber-500 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition"
              aria-label="Cerrar aviso"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* 4. Main View Area (High-Resolution Map vs Schematic) */}
      <main className="flex-1 relative overflow-hidden">
        {viewMode === 'map' ? (
          <TramMap
            stops={stops}
            trams={trams}
            selectedDirection={selectedDirection}
            selectedStop={selectedStop}
            onSelectStop={setSelectedStop}
            selectedTram={selectedTram}
            onSelectTram={setSelectedTram}
            userLocation={userLocation}
            onLocateMe={handleLocateMe}
            isLocating={isLocating}
            incidents={incidents}
            onOpenIncidents={() => setIsIncidentsModalOpen(true)}
            darkMode={darkMode}
          />
        ) : (
          <LineSchematic
            stops={stops}
            trams={trams}
            selectedDirection={selectedDirection}
            selectedStop={selectedStop}
            onSelectStop={setSelectedStop}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            incidents={incidents}
            onOpenIncidents={() => setIsIncidentsModalOpen(true)}
          />
        )}
      </main>

      {/* 5. Stop Details Bottom Drawer with Incidents & Arrival Alerts */}
      <StopDrawer
        stop={selectedStop}
        onClose={() => setSelectedStop(null)}
        isFavorite={selectedStop ? favorites.includes(selectedStop.id) : false}
        onToggleFavorite={handleToggleFavorite}
        onCenterOnMap={handleCenterOnMap}
        incidents={incidents}
        onOpenIncidents={() => setIsIncidentsModalOpen(true)}
        notificationRule={selectedStopRule}
        onToggleNotificationRule={handleToggleStopNotification}
        onUpdateNotificationRule={handleUpdateSingleRule}
      />

      {/* 6. Tram Convoy Details Modal */}
      <TramModal
        tram={selectedTram}
        onClose={() => setSelectedTram(null)}
      />

      {/* 7. Real-Time Incidents Section Modal */}
      <IncidentsModal
        isOpen={isIncidentsModalOpen}
        onClose={() => setIsIncidentsModalOpen(false)}
        incidents={incidents}
        stops={stops}
        onSelectStop={(stop) => {
          setSelectedStop(stop);
          setViewMode('map');
        }}
      />

      {/* 8. Favorites Stops & Direct Access Modal */}
      <FavoritesModal
        isOpen={isFavoritesModalOpen}
        onClose={() => setIsFavoritesModalOpen(false)}
        stops={stops}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
        onSelectStop={(stop) => {
          setSelectedStop(stop);
          setViewMode('map');
        }}
        selectedDirection={selectedDirection}
        notificationRules={notificationRules}
        onToggleNotification={handleToggleStopNotification}
      />

      {/* 9. Push Notifications Setup & Favorite Stops Alerts Modal */}
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        stops={stops}
        rules={notificationRules}
        onUpdateRules={handleUpdateRules}
        favorites={favorites}
        onSelectStop={(stop) => {
          setSelectedStop(stop);
          setViewMode('map');
        }}
        onShowTestNotification={handleShowTestNotification}
      />

      {/* 9. Floating Push Notification Toast Alert */}
      <NotificationToast
        notification={activeToast}
        onDismiss={() => setActiveToast(null)}
        onSelectStop={(stopName) => {
          const found = stops.find(
            (s) => s.cleanName.toLowerCase() === stopName.toLowerCase()
          );
          if (found) {
            setSelectedStop(found);
            setViewMode('map');
          }
        }}
      />

      {/* 10. Floating Dark Mode Toggle (Bottom-Left Corner) - elevated & adaptive */}
      <button
        id="floating-dark-mode-btn"
        onClick={handleToggleDarkMode}
        aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        title={darkMode ? 'Modo claro' : 'Modo oscuro'}
        className="fixed z-30 w-11 h-11 adaptive-dark-mode-btn bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-md border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-amber-500 dark:hover:text-amber-400 active:scale-95 transition-all cursor-pointer"
      >
        {darkMode ? (
          <Sun size={19} className="text-amber-400" />
        ) : (
          <Moon size={19} className="text-slate-600" />
        )}
      </button>
    </div>
  );
}
