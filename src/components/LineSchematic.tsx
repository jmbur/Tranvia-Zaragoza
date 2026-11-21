import React, { useMemo } from 'react';
import {
  StopWithRealtime,
  TramConvoy,
  DirectionType,
  Incident,
} from '../types';
import {
  Clock,
  Star,
  ChevronRight,
  ArrowDown,
  ArrowUp,
  TrainFront,
  AlertTriangle,
} from 'lucide-react';

interface LineSchematicProps {
  stops: StopWithRealtime[];
  trams: TramConvoy[];
  selectedDirection: DirectionType | 'ALL';
  selectedStop: StopWithRealtime | null;
  onSelectStop: (stop: StopWithRealtime) => void;
  favorites: string[];
  onToggleFavorite: (stopId: string) => void;
  incidents?: Incident[];
  onOpenIncidents?: () => void;
}

export const LineSchematic: React.FC<LineSchematicProps> = ({
  stops,
  trams,
  selectedDirection,
  selectedStop,
  onSelectStop,
  favorites,
  onToggleFavorite,
  incidents = [],
  onOpenIncidents,
}) => {
  // Sort and filter stops along the line
  const sortedStops = useMemo(() => {
    let filtered = stops;
    if (selectedDirection !== 'ALL') {
      filtered = stops.filter((s) => s.direction === selectedDirection);
    }
    // Sort in geographic sequence: Mago de Oz (North to South) or Academia (South to North)
    return [...filtered].sort((a, b) => {
      if (selectedDirection === 'AVENIDA_ACADEMIA') {
        return a.sequenceOrder - b.sequenceOrder;
      }
      return a.sequenceOrder - b.sequenceOrder;
    });
  }, [stops, selectedDirection]);

  const isSouth = selectedDirection === 'MAGO_DE_OZ';
  const isNorth = selectedDirection === 'AVENIDA_ACADEMIA';

  const directionTitle = isSouth
    ? 'Hacia Mago de Oz'
    : isNorth
    ? 'Hacia Av. Academia'
    : 'Recorrido Línea 1';

  return (
    <div
      id="line-schematic-view"
      className="w-full h-full overflow-y-auto bg-stone-50/60 dark:bg-slate-950 p-4 pb-28 md:max-w-2xl md:mx-auto transition-colors"
    >
      {/* Header Banner */}
      <div className="mb-4 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-stone-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-stone-800 dark:text-stone-200">
            {isSouth ? (
              <ArrowDown size={14} />
            ) : isNorth ? (
              <ArrowUp size={14} />
            ) : null}
            <span>{directionTitle}</span>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            Tiempos de espera en tiempo real y pasos por parada
          </p>
        </div>

        <div className="text-right">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            Línea 1
          </span>
        </div>
      </div>

      {/* Vertical Spine Line with Stops */}
      <div className="relative pl-6">
        {/* Soft moreno / stone spine line */}
        <div className="absolute left-[34px] top-6 bottom-6 w-1.5 rounded-full bg-stone-300 dark:bg-stone-700" />

        <div className="space-y-3">
          {sortedStops.map((stop, idx) => {
            const isSelected = selectedStop?.id === stop.id;
            const isFav = favorites.includes(stop.id);
            const stopIsSouth = stop.direction === 'MAGO_DE_OZ';

            // Check if there is a tram currently at or heading immediately to this stop
            const tramAtThisStop = trams.find(
              (t) =>
                t.currentStopId === stop.id ||
                (t.nextStopId === stop.id && t.etaMinutes === 0)
            );
            const tramApproaching = trams.find(
              (t) => t.nextStopId === stop.id && t.status === 'in_transit'
            );

            // Destinos / Waiting times
            const nextArrivals = stop.destinos?.slice(0, 2) || [];
            const hasStopIncident =
              (stop.mensajes && stop.mensajes.length > 0) ||
              incidents.some(
                (inc) =>
                  inc.active &&
                  inc.affectedStops?.some(
                    (s) =>
                      s.toLowerCase() === stop.cleanName.toLowerCase() ||
                      s.toLowerCase() === stop.id.toLowerCase()
                  )
              );

            return (
              <div key={`${stop.id}-${stop.direction}-${idx}`} className="relative">
                {/* Approaching Tram Indicator on track between stops */}
                {tramApproaching && (
                  <div className="relative -top-1 ml-0.5 mb-1.5 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full text-white bg-stone-800 dark:bg-stone-700 flex items-center justify-center shadow-md z-10 animate-bounce">
                      <TrainFront size={14} />
                    </div>
                    <div className="text-white text-[11px] font-bold px-2.5 py-0.5 rounded-lg shadow-xs flex items-center gap-1.5 bg-stone-900 dark:bg-slate-800 border border-stone-700">
                      <span>Tranvía {tramApproaching.id}</span>
                      <span className="opacity-40">•</span>
                      <span>Llegando en {tramApproaching.etaMinutes} min</span>
                    </div>
                  </div>
                )}

                {/* Stop Card */}
                <div
                  id={`schematic-stop-${stop.id}`}
                  onClick={() => onSelectStop(stop)}
                  className={`relative flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer active:scale-[0.99] ${
                    isSelected
                      ? 'bg-stone-100/90 dark:bg-stone-800/90 border-stone-400 dark:border-stone-600 ring-2 ring-stone-400/20 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-stone-200/80 dark:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-800/80 shadow-xs'
                  }`}
                >
                  {/* Station Node on Spine */}
                  <div
                    className={`absolute -left-[27px] w-5 h-5 rounded-full border-2 bg-white dark:bg-slate-900 flex items-center justify-center z-10 transition ${
                      isSelected
                        ? 'border-stone-800 dark:border-stone-300 ring-4 ring-stone-200 dark:ring-stone-800'
                        : stop.isKeyStation
                        ? 'border-stone-700 dark:border-stone-400'
                        : 'border-stone-400 dark:border-stone-600'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isSelected || stop.isKeyStation
                          ? 'bg-stone-800 dark:bg-stone-200'
                          : 'bg-stone-400 dark:bg-stone-600'
                      }`}
                    />
                  </div>

                  {/* Stop Information */}
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-base sm:text-[17px] font-bold truncate tracking-tight ${
                          isSelected
                            ? 'text-stone-950 dark:text-stone-100 font-extrabold'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {stop.cleanName}
                      </h3>
                      {stop.isKeyStation && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700 uppercase tracking-wide">
                          Principal
                        </span>
                      )}
                      {hasStopIncident && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenIncidents?.();
                          }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                        >
                          <AlertTriangle size={11} />
                          Aviso
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-2 mt-0.5 truncate">
                      <span className="font-medium">{stop.neighborhood}</span>
                      <span className={`font-semibold ${stopIsSouth ? 'text-[#b85635] dark:text-[#d97753]' : 'text-[#2d7a86] dark:text-[#4ea8b6]'}`}>
                        {stopIsSouth ? 'Mago de Oz' : 'Av. Academia'}
                      </span>
                      {stop.distanceMeters && (
                        <>
                          <span>•</span>
                          <span className="text-stone-700 dark:text-stone-300 font-semibold">
                            A {stop.distanceMeters} m
                          </span>
                        </>
                      )}
                    </div>

                    {/* Connections badges */}
                    {stop.connections && stop.connections.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {stop.connections.map((c, i) => (
                          <span
                            key={i}
                            className="text-[11px] px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-md font-semibold border border-stone-200/60 dark:border-stone-700/60"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Real-time Arrival Pills & Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Tram directly at stop icon */}
                    {tramAtThisStop && (
                      <div className="flex items-center gap-1.5 text-white px-2.5 py-1 rounded-xl text-xs font-bold shadow-xs bg-amber-600 dark:bg-amber-500 animate-pulse">
                        <TrainFront size={14} />
                        <span className="hidden sm:inline">En parada</span>
                      </div>
                    )}

                    {/* Next ETA Badges */}
                    <div className="flex flex-col items-end gap-1.5">
                      {nextArrivals.length > 0 ? (
                        nextArrivals.map((dest, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-extrabold transition shadow-2xs ${
                              dest.minutos === 0
                                ? 'bg-emerald-600 text-white dark:bg-emerald-500 ring-2 ring-emerald-400/30'
                                : i === 0
                                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                                : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200/80 dark:border-stone-700'
                            }`}
                          >
                            <Clock size={13} className="shrink-0" />
                            <span>
                              {dest.minutos === 0 ? 'En parada' : `${dest.minutos} min`}
                            </span>
                            <span className="text-[10px] sm:text-[11px] opacity-70 font-bold ml-0.5">
                              ({dest.destino.includes('Mago') ? 'Sur' : 'Norte'})
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                          Sin datos
                        </span>
                      )}
                    </div>

                    {/* Favorite Button */}
                    <button
                      id={`fav-btn-${stop.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(stop.id);
                      }}
                      className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-amber-500 dark:hover:text-amber-400 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Star
                        size={16}
                        className={isFav ? 'fill-amber-400 text-amber-500' : ''}
                      />
                    </button>

                    <ChevronRight size={16} className="text-slate-300 dark:text-slate-600" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
