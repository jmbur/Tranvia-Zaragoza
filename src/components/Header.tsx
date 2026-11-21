import React from 'react';
import {
  Map,
  ListFilter,
  RefreshCw,
  AlertTriangle,
  Bell,
  Star,
  ArrowRight,
  ArrowLeftRight,
} from 'lucide-react';
import { DirectionType, ViewMode } from '../types';

interface HeaderProps {
  viewMode: ViewMode;
  onToggleViewMode: (mode: ViewMode) => void;
  selectedDirection: DirectionType | 'ALL';
  onChangeDirection: (dir: DirectionType | 'ALL') => void;
  lastUpdated: string | null;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenIncidents: () => void;
  incidentsCount: number;
  hasDisruption: boolean;
  onOpenNotifications: () => void;
  activeAlertsCount: number;
  onOpenFavorites: () => void;
  favoritesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  onToggleViewMode,
  selectedDirection,
  onChangeDirection,
  lastUpdated,
  isLoading,
  onRefresh,
  onOpenIncidents,
  incidentsCount,
  hasDisruption,
  onOpenNotifications,
  activeAlertsCount,
  onOpenFavorites,
  favoritesCount,
}) => {
  return (
    <header className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shrink-0 z-30 transition-colors shadow-xs">
      {/* 1. Top Bar: Brand on the left, View Mode (Mapa/Línea) and Refresh at the top right */}
      <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        {/* Brand with Modern Tram Icon & Zaragoza Red Identity */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden shadow-xs shrink-0 border border-slate-200/80 dark:border-slate-700 bg-slate-200 dark:bg-slate-800">
            <img
              src="/tram-icon-192.png"
              alt="Tranvía Zaragoza"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                Tranvía Zaragoza
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-red-600 text-white shrink-0 tracking-tight leading-none shadow-xs">
                L1
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden xs:inline">En directo</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">
              Mago de Oz ↔ Av. Academia
            </p>
          </div>
        </div>

        {/* Top Right Corner: View Mode Toggle (Map vs List) + Refresh */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* View Mode Toggle: Map vs Line Schematic */}
          <div
            id="view-mode-selector"
            className="bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center shrink-0 min-h-[38px] sm:min-h-[40px] shadow-xs"
          >
            <button
              id="view-mode-map-btn"
              onClick={() => onToggleViewMode('map')}
              aria-label="Ver en modo Mapa"
              className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                viewMode === 'map'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Map size={14} className="shrink-0" />
              <span>Mapa</span>
            </button>
            <button
              id="view-mode-schematic-btn"
              onClick={() => onToggleViewMode('schematic')}
              aria-label="Ver en modo Listado de Línea"
              className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                viewMode === 'schematic'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ListFilter size={14} className="shrink-0" />
              <span>Línea</span>
            </button>
          </div>

          {/* Refresh Data Button */}
          <button
            id="manual-refresh-btn"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Actualizar datos en tiempo real"
            title="Actualizar datos"
            className="min-h-[38px] min-w-[38px] sm:min-h-[40px] sm:min-w-[40px] p-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 active:bg-slate-100 transition flex items-center justify-center shadow-xs"
          >
            <RefreshCw
              size={16}
              className={isLoading ? 'animate-spin text-red-600 dark:text-red-400' : ''}
            />
          </button>
        </div>
      </div>

      {/* 2. Action Controls Toolbar: Favoritas, Avisos, Incidencias */}
      <div className="px-3 pb-1.5 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full">
          {/* Dedicated Favorite Stops Button */}
          <button
            id="favorites-header-btn"
            onClick={onOpenFavorites}
            aria-label="Ver paradas favoritas"
            title="Paradas favoritas y accesos directos"
            className={`min-h-[38px] sm:min-h-[40px] px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 shadow-xs ${
              favoritesCount > 0
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Star
              size={15}
              className={
                favoritesCount > 0
                  ? 'fill-amber-500 text-amber-500 shrink-0'
                  : 'text-amber-500 shrink-0'
              }
            />
            <span className="font-bold truncate">Favoritas</span>
            <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center text-white bg-amber-500 shadow-xs shrink-0">
              {favoritesCount}
            </span>
          </button>

          {/* Push Notifications Bell Button */}
          <button
            id="notifications-header-btn"
            onClick={onOpenNotifications}
            aria-label="Configurar avisos de llegada"
            title="Avisos de llegada de tranvías"
            className={`min-h-[38px] sm:min-h-[40px] px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 shadow-xs ${
              activeAlertsCount > 0
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Bell size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bold truncate">Avisos</span>
            {activeAlertsCount > 0 && (
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center text-white bg-emerald-600 shadow-xs shrink-0">
                {activeAlertsCount}
              </span>
            )}
          </button>

          {/* Incidencias / Alertas Oficiales */}
          <button
            id="incidents-header-btn"
            onClick={onOpenIncidents}
            aria-label="Ver incidencias del servicio"
            title="Incidencias y avisos de servicio"
            className={`min-h-[38px] sm:min-h-[40px] px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 shadow-xs ${
              hasDisruption
                ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-700 text-red-950 dark:text-red-200 animate-pulse'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <AlertTriangle
              size={15}
              className={hasDisruption ? 'text-red-600 dark:text-red-400 shrink-0' : 'text-amber-500 shrink-0'}
            />
            <span className="font-bold truncate">Incidencias</span>
            {incidentsCount > 0 && (
              <span
                className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center text-white shadow-xs shrink-0 ${
                  hasDisruption ? 'bg-red-600' : 'bg-amber-500'
                }`}
              >
                {incidentsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 3. Direction Selector: Large, accessible buttons with directional arrows and no text cutoff */}
      <div className="px-3 pb-2.5 pt-0.5 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full">
          <button
            id="filter-dir-all-btn"
            onClick={() => onChangeDirection('ALL')}
            aria-label="Filtrar por ambos sentidos"
            className={`min-h-[38px] sm:min-h-[40px] px-1.5 sm:px-2 rounded-xl text-xs sm:text-sm font-bold text-center transition flex items-center justify-center gap-1.5 shadow-xs ${
              selectedDirection === 'ALL'
                ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <ArrowLeftRight size={14} className="shrink-0 text-current" />
            <span className="truncate">
              Ambos <span className="hidden sm:inline">sentidos</span>
            </span>
          </button>

          <button
            id="filter-dir-mago-btn"
            onClick={() => onChangeDirection('MAGO_DE_OZ')}
            aria-label="Filtrar sentido hacia Mago de Oz"
            className={`min-h-[38px] sm:min-h-[40px] px-1.5 sm:px-2 rounded-xl text-xs sm:text-sm font-bold text-center transition flex items-center justify-center gap-1.5 shadow-xs ${
              selectedDirection === 'MAGO_DE_OZ'
                ? 'bg-[#9c4927] text-white'
                : 'bg-[#9c4927]/10 dark:bg-[#9c4927]/20 text-[#9c4927] dark:text-[#f3a890] border border-[#9c4927]/30 dark:border-[#9c4927]/40 hover:bg-[#9c4927]/20'
            }`}
          >
            <ArrowRight size={14} className="shrink-0 text-current" />
            <span className="truncate">Mago de Oz</span>
          </button>

          <button
            id="filter-dir-academia-btn"
            onClick={() => onChangeDirection('AVENIDA_ACADEMIA')}
            aria-label="Filtrar sentido hacia Avenida Academia"
            className={`min-h-[38px] sm:min-h-[40px] px-1.5 sm:px-2 rounded-xl text-xs sm:text-sm font-bold text-center transition flex items-center justify-center gap-1.5 shadow-xs ${
              selectedDirection === 'AVENIDA_ACADEMIA'
                ? 'bg-[#277a52] text-white'
                : 'bg-[#277a52]/10 dark:bg-[#277a52]/20 text-[#277a52] dark:text-[#a3e6be] border border-[#277a52]/30 dark:border-[#277a52]/40 hover:bg-[#277a52]/20'
            }`}
          >
            <ArrowRight size={14} className="shrink-0 text-current" />
            <span className="truncate">Av. Academia</span>
          </button>
        </div>
      </div>
    </header>
  );
};
