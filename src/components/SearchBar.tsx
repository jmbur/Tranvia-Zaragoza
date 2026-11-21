import React, { useState, useMemo } from 'react';
import { Search, X, Star, Clock } from 'lucide-react';
import { StopWithRealtime, DirectionType } from '../types';

interface SearchBarProps {
  stops: StopWithRealtime[];
  selectedDirection: DirectionType | 'ALL';
  favorites: string[];
  onSelectStop: (stop: StopWithRealtime) => void;
  onToggleFavorite: (stopId: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  stops,
  selectedDirection,
  favorites,
  onSelectStop,
  onToggleFavorite,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  const filteredStops = useMemo(() => {
    let list = stops;

    if (selectedDirection !== 'ALL') {
      list = list.filter((s) => s.direction === selectedDirection);
    }

    if (showOnlyFavorites) {
      list = list.filter((s) => favorites.includes(s.id));
    }

    if (!query.trim()) {
      return list;
    }

    const q = query.toLowerCase().trim();
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.cleanName.toLowerCase().includes(q) ||
        s.neighborhood.toLowerCase().includes(q) ||
        s.code.includes(q)
    );
  }, [stops, selectedDirection, showOnlyFavorites, favorites, query]);

  return (
    <div className="relative w-full">
      {/* Search trigger button or input */}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none">
          <Search size={17} />
        </div>
        <input
          id="stop-search-input"
          type="text"
          placeholder="Buscar parada (Plaza España, Pilar, Romareda...)"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          className="w-full pl-9 pr-20 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition"
        />

        <div className="absolute right-2 flex items-center gap-1">
          {query && (
            <button
              id="clear-search-btn"
              onClick={() => {
                setQuery('');
              }}
              className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Limpiar búsqueda"
            >
              <X size={15} />
            </button>
          )}

          <button
            id="toggle-favorites-filter-btn"
            onClick={() => setShowOnlyFavorites((prev) => !prev)}
            className={`p-1.5 rounded-lg text-xs font-medium transition ${
              showOnlyFavorites
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Ver paradas favoritas"
          >
            <Star
              size={15}
              className={showOnlyFavorites ? 'fill-amber-500 text-amber-500' : ''}
            />
          </button>
        </div>
      </div>

      {/* Floating Dropdown Results */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full mt-1.5 max-h-72 overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-800 z-50 py-1.5">
            <div className="px-3 py-1.5 flex items-center justify-between text-[11px] font-medium text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
              <span>{filteredStops.length} paradas encontradas</span>
              {favorites.length > 0 && (
                <button
                  onClick={() => setShowOnlyFavorites((v) => !v)}
                  className="text-stone-700 dark:text-stone-300 hover:underline font-semibold"
                >
                  {showOnlyFavorites ? 'Ver todas' : `Solo favoritas (${favorites.length})`}
                </button>
              )}
            </div>

            {filteredStops.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No se encontraron paradas para "{query}"
              </div>
            ) : (
              filteredStops.map((stop) => {
                const isFav = favorites.includes(stop.id);
                const isSouth = stop.direction === 'MAGO_DE_OZ';
                const nextArrival = stop.destinos?.[0]?.minutos;

                return (
                  <div
                    key={`${stop.id}-${stop.direction}`}
                    onClick={() => {
                      onSelectStop(stop);
                      setIsOpen(false);
                    }}
                    className="px-3.5 py-2.5 hover:bg-stone-50 dark:hover:bg-slate-800/80 active:bg-stone-100 dark:active:bg-slate-800 cursor-pointer flex items-center justify-between border-b border-stone-100 dark:border-slate-800/60 last:border-none transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                        {stop.code}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                          {stop.cleanName}
                        </div>
                        <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5 truncate">
                          <span>{stop.neighborhood}</span>
                          <span>•</span>
                          <span className={`font-semibold ${isSouth ? 'text-[#b85635] dark:text-[#d97753]' : 'text-[#2d7a86] dark:text-[#4ea8b6]'}`}>
                            {isSouth ? 'Mago de Oz' : 'Av. Academia'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {nextArrival !== undefined && (
                        <div
                          className={`text-xs font-extrabold px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs ${
                            nextArrival === 0
                              ? 'bg-emerald-600 text-white dark:bg-emerald-500 ring-2 ring-emerald-400/30'
                              : 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                          }`}
                        >
                          <Clock size={12} />
                          <span>
                            {nextArrival === 0 ? 'En parada' : `${nextArrival} min`}
                          </span>
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(stop.id);
                        }}
                        className="p-1 text-slate-300 dark:text-slate-600 hover:text-amber-500 dark:hover:text-amber-400 transition"
                      >
                        <Star
                          size={14}
                          className={isFav ? 'fill-amber-400 text-amber-500' : ''}
                        />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};
