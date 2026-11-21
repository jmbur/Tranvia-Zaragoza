import React, { useState } from 'react';
import {
  Star,
  X,
  Clock,
  Bell,
  MapPin,
  ChevronRight,
  Sparkles,
  Search,
} from 'lucide-react';
import { DirectionType, NotificationRule, StopWithRealtime } from '../types';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  stops: StopWithRealtime[];
  favorites: string[];
  onToggleFavorite: (stopId: string) => void;
  onSelectStop: (stop: StopWithRealtime) => void;
  selectedDirection: DirectionType | 'ALL';
  notificationRules: NotificationRule[];
  onToggleNotification: (stop: StopWithRealtime, threshold: number) => void;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({
  isOpen,
  onClose,
  stops,
  favorites,
  onToggleFavorite,
  onSelectStop,
  selectedDirection,
  notificationRules,
  onToggleNotification,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  if (!isOpen) return null;

  // Get favorite stops objects
  const favoriteStops = stops.filter((s) => favorites.includes(s.id));

  // Get other stops for adding
  const nonFavoriteStops = stops.filter(
    (s) =>
      !favorites.includes(s.id) &&
      (filterQuery === '' ||
        s.cleanName.toLowerCase().includes(filterQuery.toLowerCase()) ||
        s.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
        s.neighborhood.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="favorites-title"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-stone-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 dark:bg-amber-500/25 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Star size={18} className="fill-amber-500 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="favorites-title"
                  className="text-base font-bold text-slate-900 dark:text-slate-100"
                >
                  Paradas Favoritas
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800">
                  {favoriteStops.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tiempos en directo y acceso prioritario
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar ventana de favoritas"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 divide-y divide-slate-100 dark:divide-slate-800/60">
          {/* Active Favorites Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Tus Paradas Guardadas
              </span>
              <span className="text-[11px] text-slate-400">
                Toca para ver en el mapa
              </span>
            </div>

            {favoriteStops.length === 0 ? (
              <div className="py-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4">
                <Star size={28} className="mx-auto text-amber-400/60 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Aún no tienes paradas favoritas
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  Marca la estrella en cualquiera de las paradas a continuación para ver sus tiempos aquí en tiempo real.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {favoriteStops.map((stop) => {
                  const nextArrival = stop.destinos?.[0];
                  const followingArrival = stop.destinos?.[1];
                  const matchedRule = notificationRules.find(
                    (r) => r.stopId === stop.id && r.enabled
                  );
                  const hasRule = !!matchedRule;

                  return (
                    <div
                      key={stop.id}
                      className="p-3 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl hover:border-red-400/80 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      {/* Left: Stop Info and Arrivals */}
                      <div
                        onClick={() => {
                          onSelectStop(stop);
                          onClose();
                        }}
                        className="cursor-pointer flex-1 min-w-0"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin size={17} className="text-red-600 shrink-0" />
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition truncate">
                            {stop.cleanName}
                          </h3>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                              stop.direction === 'MAGO_DE_OZ'
                                ? 'bg-[#9c4927]/15 text-[#9c4927] dark:text-[#f3a890]'
                                : 'bg-[#277a52]/15 text-[#277a52] dark:text-[#a3e6be]'
                            }`}
                          >
                            {stop.direction === 'MAGO_DE_OZ' ? 'Mago Oz' : 'Academia'}
                          </span>
                        </div>

                        {/* Real-time Arrival Pills */}
                        <div className="flex items-center gap-2 mt-2">
                          {nextArrival ? (
                            <div className="flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200/80 dark:border-red-900/60">
                              <Clock size={14} className="text-red-600" />
                              <span>
                                {nextArrival.minutos === 0
                                  ? 'En parada'
                                  : `${nextArrival.minutos} min`}
                              </span>
                              <span className="text-[11px] text-red-500 dark:text-red-400 truncate max-w-[110px]">
                                ({nextArrival.destino})
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              Sin estimación
                            </span>
                          )}

                          {followingArrival && (
                            <div className="hidden sm:flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              <span>Siguiente: {followingArrival.minutos} min</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        {/* Toggle push alert button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleNotification(stop, 3);
                          }}
                          title={
                            hasRule
                              ? 'Aviso push activado para esta parada'
                              : 'Activar aviso push a 3 min'
                          }
                          aria-label={`Aviso push parada ${stop.cleanName}`}
                          className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 border transition ${
                            hasRule
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/80 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <Bell
                            size={15}
                            className={
                              hasRule
                                ? 'fill-emerald-600 text-emerald-600 dark:fill-emerald-400 dark:text-emerald-400'
                                : ''
                            }
                          />
                          <span className="text-[11px] hidden sm:inline">
                            {hasRule
                              ? matchedRule?.timeRangeEnabled
                                ? `${matchedRule.timeRangeStart}-${matchedRule.timeRangeEnd}`
                                : 'Aviso activo'
                              : 'Avisar'}
                          </span>
                        </button>

                        {/* Unstar / Remove favorite */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(stop.id);
                          }}
                          title="Quitar de favoritas"
                          aria-label={`Quitar ${stop.cleanName} de favoritas`}
                          className="p-2 rounded-xl text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition border border-amber-200 dark:border-amber-800/60"
                        >
                          <Star size={16} className="fill-amber-500 text-amber-500" />
                        </button>

                        {/* Select arrow */}
                        <button
                          onClick={() => {
                            onSelectStop(stop);
                            onClose();
                          }}
                          aria-label="Ver parada en mapa"
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add more stops section */}
          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" />
                Añadir otras paradas a favoritas
              </span>
            </div>

            {/* Simple filter input to find any stop */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Buscar parada para añadir (ej. Pilar, Romareda, Actur)..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500/40"
              />
            </div>

            {/* Quick list of addable stops */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {nonFavoriteStops.slice(0, 10).map((stop) => (
                <div
                  key={stop.id}
                  className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-xl flex items-center justify-between gap-2 hover:border-slate-300 dark:hover:border-slate-600 transition"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {stop.cleanName}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {stop.direction === 'MAGO_DE_OZ' ? 'Hacia Mago Oz' : 'Hacia Academia'}
                    </p>
                  </div>

                  <button
                    onClick={() => onToggleFavorite(stop.id)}
                    title="Añadir a favoritas"
                    aria-label={`Añadir ${stop.cleanName} a favoritas`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition border border-slate-200 dark:border-slate-700 shrink-0"
                  >
                    <Star size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-900 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Guarda tus paradas frecuentes para tener acceso rápido en todo momento.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-900 transition"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
