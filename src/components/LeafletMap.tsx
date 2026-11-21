import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  StopWithRealtime,
  TramConvoy,
  DirectionType,
  Incident,
} from '../types';
import {
  STOPS_MAGO_DE_OZ,
  STOPS_AVENIDA_ACADEMIA,
} from '../data/lineData';
import {
  Plus,
  Minus,
  Maximize2,
  Navigation,
} from 'lucide-react';

interface LeafletMapProps {
  stops: StopWithRealtime[];
  trams: TramConvoy[];
  selectedDirection: DirectionType | 'ALL';
  selectedStop: StopWithRealtime | null;
  onSelectStop: (stop: StopWithRealtime) => void;
  selectedTram: TramConvoy | null;
  onSelectTram: (tram: TramConvoy) => void;
  userLocation: [number, number] | null;
  onLocateMe: () => void;
  isLocating: boolean;
  incidents?: Incident[];
  darkMode?: boolean;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  stops,
  trams,
  selectedDirection,
  selectedStop,
  onSelectStop,
  selectedTram,
  onSelectTram,
  userLocation,
  onLocateMe,
  isLocating,
  incidents = [],
  darkMode = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(14);

  // Layers refs
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelLayerRef = useRef<L.TileLayer | null>(null);
  const tracksGroupRef = useRef<L.LayerGroup | null>(null);
  const stopsGroupRef = useRef<L.LayerGroup | null>(null);
  const tramsGroupRef = useRef<L.LayerGroup | null>(null);
  const userLocGroupRef = useRef<L.LayerGroup | null>(null);

  // Stops affected by active incidents
  const incidentStopIds = useMemo(() => {
    const ids = new Set<string>();
    incidents.forEach((inc) => {
      if (inc.active && inc.affectedStops) {
        inc.affectedStops.forEach((s) => ids.add(s.toLowerCase()));
      }
    });
    return ids;
  }, [incidents]);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Zaragoza center (Plaza España / Casco Histórico)
    const initialCenter: [number, number] = [41.652, -0.884];
    const initialZoom = 14;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
      minZoom: 11,
      maxZoom: 19,
    });

    // Add minimal discrete attribution
    L.control
      .attribution({
        position: 'bottomleft',
        prefix: '<a href="https://leafletjs.com" class="hover:underline">Leaflet</a> | &copy; <a href="https://www.esri.com" target="_blank" rel="noopener">Esri</a>',
      })
      .addTo(map);

    // Create layer groups for clean rendering order
    tracksGroupRef.current = L.layerGroup().addTo(map);
    stopsGroupRef.current = L.layerGroup().addTo(map);
    tramsGroupRef.current = L.layerGroup().addTo(map);
    userLocGroupRef.current = L.layerGroup().addTo(map);

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Manage Tile Layer: Modern Soft Gray Canvas (100% Free, no API keys, no payment cards, no watermarks)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    if (labelLayerRef.current) {
      map.removeLayer(labelLayerRef.current);
      labelLayerRef.current = null;
    }

    // Modern Light/Dark Gray Canvas: Soft, architectural, muted grayscale engineered for high-contrast transit visibility
    const baseUrl = darkMode
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

    const refUrl = darkMode
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';

    const baseTile = L.tileLayer(baseUrl, {
      maxNativeZoom: 16,
      maxZoom: 19,
    });

    const labelTile = L.tileLayer(refUrl, {
      maxNativeZoom: 16,
      maxZoom: 19,
    });

    baseTile.addTo(map);
    labelTile.addTo(map);
    tileLayerRef.current = baseTile;
    labelLayerRef.current = labelTile;
  }, [darkMode]);

  // 3. Render Tram Tracks (Polylines with casings)
  useEffect(() => {
    const group = tracksGroupRef.current;
    if (!group) return;
    group.clearLayers();

    const southCoords = STOPS_MAGO_DE_OZ.map(
      (s) => [s.coordinates[1], s.coordinates[0]] as [number, number]
    );
    const northCoords = STOPS_AVENIDA_ACADEMIA.map(
      (s) => [s.coordinates[1], s.coordinates[0]] as [number, number]
    );

    const casingColor = darkMode ? '#0f172a' : '#ffffff';

    // South Track (Marrón #9c4927)
    if (selectedDirection === 'ALL' || selectedDirection === 'MAGO_DE_OZ') {
      // Casing
      L.polyline(southCoords, {
        color: casingColor,
        weight: 8,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(group);

      // Core Line
      L.polyline(southCoords, {
        color: '#9c4927',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(group);
    }

    // North Track (Verde #277a52)
    if (selectedDirection === 'ALL' || selectedDirection === 'AVENIDA_ACADEMIA') {
      // Casing
      L.polyline(northCoords, {
        color: casingColor,
        weight: 8,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(group);

      // Core Line
      L.polyline(northCoords, {
        color: '#277a52',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(group);
    }
  }, [selectedDirection, darkMode]);

  // 4. Render Tram Stops with Anti-Collision Smart Placement & Larger High-Contrast Typography
  useEffect(() => {
    const group = stopsGroupRef.current;
    const map = mapRef.current;
    if (!group || !map) return;
    group.clearLayers();

    const visibleStops =
      selectedDirection === 'ALL'
        ? stops
        : stops.filter((s) => s.direction === selectedDirection);

    const zoom = map.getZoom();

    // Prioritize stops for label placement:
    // 1. Selected stop (always full label with top zIndex)
    // 2. Stop with active incident
    // 3. Stop with tram arriving right now (ETA <= 1 min)
    // 4. Key major stations (Plaza España, Gran Vía, etc.)
    // 5. Earlier ETA
    // 6. Natural sequence order
    const prioritySorted = [...visibleStops].sort((a, b) => {
      if (selectedStop?.id === a.id) return -1;
      if (selectedStop?.id === b.id) return 1;

      const aInc = incidentStopIds.has(a.id.toLowerCase());
      const bInc = incidentStopIds.has(b.id.toLowerCase());
      if (aInc !== bInc) return aInc ? -1 : 1;

      const aEta = a.destinos?.[0]?.minutos ?? 999;
      const bEta = b.destinos?.[0]?.minutos ?? 999;
      const aImminent = aEta <= 1;
      const bImminent = bEta <= 1;
      if (aImminent !== bImminent) return aImminent ? -1 : 1;

      if (a.isKeyStation !== b.isKeyStation) return a.isKeyStation ? -1 : 1;
      if (aEta !== bEta) return aEta - bEta;
      return a.sequenceOrder - b.sequenceOrder;
    });

    // Track placed bounding boxes in projected pixel coordinates
    type BoundingBox = { left: number; right: number; top: number; bottom: number };
    const placedBoxes: BoundingBox[] = [];

    // Collision detection helper with safety margins
    const collidesWithPlaced = (candidate: BoundingBox): boolean => {
      return placedBoxes.some((b) => {
        const horizontalOverlap = !(candidate.right + 8 < b.left || candidate.left > b.right + 8);
        const verticalOverlap = !(candidate.bottom + 6 < b.top || candidate.top > b.bottom + 6);
        return horizontalOverlap && verticalOverlap;
      });
    };

    // Calculate layout decision for each stop
    type StopPlacement = {
      stop: StopWithRealtime;
      mode: 'full' | 'compact' | 'dot-only';
      side: 'left' | 'right';
    };

    const placementMap = new Map<string, StopPlacement>();

    prioritySorted.forEach((stop) => {
      const isSouth = stop.direction === 'MAGO_DE_OZ';
      const isSelected = selectedStop?.id === stop.id;
      const firstEta = stop.destinos?.[0]?.minutos;
      const hasEta = firstEta !== undefined;

      // Projected pixel position of stop marker at current zoom
      const pt = map.project(L.latLng(stop.coordinates[1], stop.coordinates[0]), zoom);

      // Estimated label dimensions for larger typography (13px font bold + ETA badge)
      const charWidth = 8.5;
      const nameWidth = stop.cleanName.length * charWidth + 26;
      const etaWidth = hasEta ? 44 : 0;
      const labelWidth = Math.max(90, nameWidth + etaWidth);
      const labelHeight = 34;

      const top = pt.y - labelHeight / 2;
      const bottom = pt.y + labelHeight / 2;

      // Preferred side:
      // Linea Marrón (isSouth): Left
      // Linea Verde (!isSouth): Right
      const preferredSide: 'left' | 'right' = isSouth ? 'left' : 'right';
      const altSide: 'left' | 'right' = isSouth ? 'right' : 'left';

      // 1. If this is the selected stop, always grant full label
      if (isSelected) {
        const left = preferredSide === 'left' ? pt.x - 14 - labelWidth : pt.x + 14;
        const right = preferredSide === 'left' ? pt.x - 14 : pt.x + 14 + labelWidth;
        placedBoxes.push({ left, right, top, bottom });
        placementMap.set(stop.id, { stop, mode: 'full', side: preferredSide });
        return;
      }

      // 2. At very low zoom (< 13), show dots only except key stations
      if (zoom < 13 && !stop.isKeyStation) {
        placementMap.set(stop.id, { stop, mode: 'dot-only', side: preferredSide });
        return;
      }

      // Check preferred side box
      const prefLeft = preferredSide === 'left' ? pt.x - 14 - labelWidth : pt.x + 14;
      const prefRight = preferredSide === 'left' ? pt.x - 14 : pt.x + 14 + labelWidth;
      const prefBox = { left: prefLeft, right: prefRight, top, bottom };

      if (!collidesWithPlaced(prefBox)) {
        placedBoxes.push(prefBox);
        placementMap.set(stop.id, { stop, mode: 'full', side: preferredSide });
        return;
      }

      // If preferred side collides, check if alternate side is free
      const altLeft = altSide === 'left' ? pt.x - 14 - labelWidth : pt.x + 14;
      const altRight = altSide === 'left' ? pt.x - 14 : pt.x + 14 + labelWidth;
      const altBox = { left: altLeft, right: altRight, top, bottom };

      if (!collidesWithPlaced(altBox)) {
        placedBoxes.push(altBox);
        placementMap.set(stop.id, { stop, mode: 'full', side: altSide });
        return;
      }

      // Both full sides collide! Check if a compact ETA badge fits on preferred side
      if (hasEta) {
        const compactWidth = 36;
        const compactHeight = 24;
        const cTop = pt.y - compactHeight / 2;
        const cBottom = pt.y + compactHeight / 2;
        const cLeft = preferredSide === 'left' ? pt.x - 12 - compactWidth : pt.x + 12;
        const cRight = preferredSide === 'left' ? pt.x - 12 : pt.x + 12 + compactWidth;
        const compactBox = { left: cLeft, right: cRight, top: cTop, bottom: cBottom };

        if (!collidesWithPlaced(compactBox)) {
          placedBoxes.push(compactBox);
          placementMap.set(stop.id, { stop, mode: 'compact', side: preferredSide });
          return;
        }
      }

      // If even compact would collide, show clean dot only so it NEVER covers another label's text!
      placementMap.set(stop.id, { stop, mode: 'dot-only', side: preferredSide });
    });

    visibleStops.forEach((stop) => {
      const placement = placementMap.get(stop.id) || {
        stop,
        mode: 'full',
        side: stop.direction === 'MAGO_DE_OZ' ? 'left' : 'right',
      };

      const isSouth = stop.direction === 'MAGO_DE_OZ';
      const isSelected = selectedStop?.id === stop.id;
      const hasIncident = incidentStopIds.has(stop.id.toLowerCase());
      const themeColor = isSouth ? '#9c4927' : '#277a52';

      // First arrival ETA if available
      const firstEta = stop.destinos?.[0]?.minutos;
      const isAtStation = firstEta === 0;
      const etaText =
        firstEta !== undefined
          ? isAtStation
            ? '0 min'
            : `${firstEta}m`
          : null;

      const side = placement.side;
      const mode = placement.mode;

      // Flex direction and positioning based on side
      const labelSideClass =
        side === 'left'
          ? 'right-3.5 flex-row-reverse text-right'
          : 'left-3.5 flex-row text-left';

      // ETA badge styling: high contrast, larger font
      const etaBadgeHtml = etaText
        ? `<span class="px-1.5 py-0.5 rounded-md text-xs font-black text-white shadow-xs tracking-tight shrink-0 select-none ${
            isAtStation ? 'bg-amber-500 animate-pulse' : ''
          }" style="${isAtStation ? '' : `background-color: ${themeColor}`}">
            ${etaText}
          </span>`
        : '';

      // Full label pill with larger text
      const fullLabelHtml = `
        <div class="absolute top-1/2 -translate-y-1/2 flex items-center gap-1.5 ${labelSideClass} pointer-events-auto transition-transform group-hover:scale-105 z-20">
          <span class="px-2.5 py-1 rounded-xl text-xs sm:text-[13px] font-bold shadow-sm backdrop-blur-md border transition-all select-none whitespace-nowrap ${
            isSelected
              ? 'bg-stone-900 text-white border-stone-950 dark:bg-white dark:text-stone-950 dark:border-white shadow-md ring-2 ring-amber-400 font-extrabold'
              : 'bg-white/95 text-stone-900 border-stone-200/90 dark:bg-stone-900/95 dark:text-stone-100 dark:border-stone-700/90 group-hover:border-stone-400 group-hover:shadow-md'
          }">
            ${stop.cleanName}
          </span>
          ${etaBadgeHtml}
        </div>
      `;

      // Compact ETA badge (for stops where full name would collide)
      const compactLabelHtml = etaText
        ? `
        <div class="absolute top-1/2 -translate-y-1/2 flex items-center ${labelSideClass} pointer-events-auto z-20">
          <span class="px-1.5 py-0.5 rounded-md text-[11px] font-black text-white shadow-xs select-none ${
            isAtStation ? 'bg-amber-500 animate-pulse' : ''
          }" style="${isAtStation ? '' : `background-color: ${themeColor}`}">
            ${etaText}
          </span>
        </div>
      `
        : '';

      // Tooltip shown on hover when label is compact or dot-only
      const hoverTooltipHtml =
        mode !== 'full'
          ? `
        <div class="hidden group-hover:flex absolute bottom-full left-1/2 -translate-x-1/2 mb-2 items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-900/95 text-white dark:bg-white dark:text-stone-900 text-xs font-bold shadow-xl border border-white/20 whitespace-nowrap z-50 pointer-events-none">
          <span>${stop.cleanName}</span>
          ${etaText ? `<span class="px-1.5 py-0.2 rounded text-[10px] font-black ${isAtStation ? 'bg-amber-400 text-black' : 'bg-stone-700 text-white'}">${etaText}</span>` : ''}
        </div>
      `
          : '';

      const html = `
        <div class="relative flex items-center justify-center cursor-pointer group pointer-events-auto">
          <!-- Station Circle Marker Centered at (0, 0) -->
          <div class="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center shrink-0 z-10">
            ${
              isSelected
                ? `<div class="absolute w-8 h-8 rounded-full animate-ping opacity-45" style="background-color: ${themeColor}"></div>`
                : ''
            }
            <div class="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full border-2 border-white dark:border-slate-900 shadow-sm flex items-center justify-center transition-transform duration-150 group-hover:scale-125" style="background-color: ${themeColor};">
              <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>
            ${
              hasIncident
                ? `<div class="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-500 rounded-full border border-white flex items-center justify-center text-[8px] font-bold text-white shadow-xs">!</div>`
                : ''
            }
          </div>

          <!-- Stop Label Pill (Full / Compact / Tooltip) -->
          ${mode === 'full' ? fullLabelHtml : mode === 'compact' ? compactLabelHtml : ''}
          ${hoverTooltipHtml}
        </div>
      `;

      const icon = L.divIcon({
        html,
        className: 'tram-stop-marker',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([stop.coordinates[1], stop.coordinates[0]], {
        icon,
        zIndexOffset: isSelected ? 2500 : mode === 'full' ? 800 : 400,
      });

      marker.on('click', () => {
        onSelectStop(stop);
      });

      marker.addTo(group);
    });
  }, [stops, selectedDirection, selectedStop, incidentStopIds, onSelectStop, currentZoom]);

  // 5. Render Active Real-Time Tram Convoys
  useEffect(() => {
    const group = tramsGroupRef.current;
    if (!group) return;
    group.clearLayers();

    const visibleTrams =
      selectedDirection === 'ALL'
        ? trams
        : trams.filter((t) => t.direction === selectedDirection);

    visibleTrams.forEach((tram) => {
      const isSouth = tram.direction === 'MAGO_DE_OZ';
      const isSelected = selectedTram?.id === tram.id;
      const isAtStop = tram.status === 'at_stop';
      const themeColor = isSouth ? '#9c4927' : '#277a52';

      /**
       * Simplified tram icon:
       * - Only the circular tram icon (no convoy ID / model text on the map button)
       * - Stop indicator badge when stopped at a station
       */
      const html = `
        <div class="relative flex items-center justify-center cursor-pointer group pointer-events-auto" style="transform: translate(-50%, -50%);">
          <!-- Pulse Ping ring -->
          <div class="absolute w-8 h-8 rounded-full animate-ping opacity-35" style="background-color: ${themeColor}"></div>

          <!-- Circular Tram Icon Button -->
          <div class="relative w-7 h-7 rounded-full text-white shadow-md border-2 border-white dark:border-slate-900 flex items-center justify-center transition-transform group-hover:scale-110 ${
            isSelected ? 'ring-2 ring-amber-400 scale-110' : ''
          }" style="background-color: ${themeColor};">
            <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 15.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V5c0-3.5-3.58-4-8-4s-8 .5-8 4v10.5zm8 1.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6-7H6V5h12v5z"/>
            </svg>

            <!-- Señalizador de parada cuando corresponde -->
            ${
              isAtStop
                ? `<span class="absolute -top-1.5 -right-1.5 px-1 py-0.2 bg-amber-500 text-white rounded-full text-[7px] font-extrabold uppercase border border-white dark:border-slate-900 shadow-xs tracking-tighter">STOP</span>`
                : ''
            }
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html,
        className: 'tram-convoy-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([tram.coordinates[1], tram.coordinates[0]], {
        icon,
        zIndexOffset: isSelected ? 2000 : 1500,
      });

      marker.on('click', () => {
        onSelectTram(tram);
      });

      marker.addTo(group);
    });
  }, [trams, selectedDirection, selectedTram, onSelectTram]);

  // 6. User Geolocation Marker
  useEffect(() => {
    const group = userLocGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!userLocation) return;

    const html = `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500 animate-ping"></div>
        <div class="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md"></div>
      </div>
    `;

    const icon = L.divIcon({
      html,
      className: 'user-location-marker',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    L.marker([userLocation[1], userLocation[0]], {
      icon,
      zIndexOffset: 3000,
    }).addTo(group);
  }, [userLocation]);

  // 7. Pan to selected stop when it changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedStop) return;

    map.panTo([selectedStop.coordinates[1], selectedStop.coordinates[0]], {
      animate: true,
      duration: 0.6,
    });
  }, [selectedStop]);

  // Map Controls
  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const handleCenterCity = () => {
    mapRef.current?.flyTo([41.652, -0.884], 14, { duration: 0.8 });
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-stone-100 dark:bg-stone-900 select-none">
      {/* The Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Map Navigation & Zoom Controls - elevated and adaptive to all screen sizes & safe areas */}
      <div
        id="map-controls-container"
        className="absolute flex flex-col gap-2 z-10 adaptive-map-controls transition-all duration-200"
      >
        <button
          type="button"
          id="map-locate-btn"
          onClick={onLocateMe}
          disabled={isLocating}
          aria-label="Ubicar mi posición"
          title="Centrar en mi ubicación"
          className="w-11 h-11 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl shadow-md border border-stone-200/80 dark:border-stone-800 flex items-center justify-center text-stone-700 dark:text-stone-200 hover:text-stone-900 dark:hover:text-white active:bg-stone-100 dark:active:bg-stone-800 transition"
        >
          <Navigation
            size={18}
            className={isLocating ? 'animate-spin text-stone-700 dark:text-stone-300' : ''}
          />
        </button>

        <button
          type="button"
          id="map-reset-view-btn"
          onClick={handleCenterCity}
          aria-label="Centrar en Zaragoza"
          title="Centrar en Zaragoza"
          className="w-11 h-11 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl shadow-md border border-stone-200/80 dark:border-stone-800 flex items-center justify-center text-stone-700 dark:text-stone-200 hover:text-stone-900 dark:hover:text-white active:bg-stone-100 dark:active:bg-stone-800 transition"
        >
          <Maximize2 size={18} />
        </button>

        <div className="flex flex-col bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl shadow-md border border-stone-200/80 dark:border-stone-800 overflow-hidden">
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="Acercar zoom"
            className="w-11 h-11 flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition border-b border-stone-200/60 dark:border-stone-800"
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Alejar zoom"
            className="w-11 h-11 flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <Minus size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
