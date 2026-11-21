import React from 'react';
import { TramConvoy } from '../types';
import {
  X,
  TrainFront,
  Clock,
  Gauge,
  Compass,
} from 'lucide-react';

interface TramModalProps {
  tram: TramConvoy | null;
  onClose: () => void;
}

export const TramModal: React.FC<TramModalProps> = ({ tram, onClose }) => {
  if (!tram) return null;

  const isSouth = tram.direction === 'MAGO_DE_OZ';

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-40"
        onClick={onClose}
      />
      <div
        id="tram-detail-card"
        className="fixed left-4 right-4 max-w-sm mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 z-50 p-4"
        style={{ bottom: 'calc(max(1.5rem, env(safe-area-inset-bottom, 0px) + 1.25rem))' }}
      >
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center font-bold shadow-xs ${
              isSouth ? 'bg-[#9c4927]' : 'bg-[#277a52]'
            }`}>
              <TrainFront size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Convoy {tram.id}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  isSouth
                    ? 'bg-[#fbeee8] dark:bg-[#3d1d14] text-[#9c4927] dark:text-[#f3a890] border-[#f0cfc4] dark:border-[#5a2b1f]'
                    : 'bg-[#eaf5f0] dark:bg-[#0f2c1e] text-[#277a52] dark:text-[#9fe2c0] border-[#bfe2ce] dark:border-[#1d5237]'
                }`}>
                  {isSouth ? 'Hacia Mago de Oz' : 'Hacia Av. Academia'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Modelo CAF Urbos 3 • 100% piso bajo
              </p>
            </div>
          </div>

          <button
            id="tram-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="py-3 space-y-2.5 text-xs">
          {/* Status & Next Stop */}
          <div className="p-3 bg-stone-50 dark:bg-slate-800/60 rounded-2xl flex items-center justify-between border border-stone-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {tram.status === 'at_stop'
                  ? 'Detenido en parada'
                  : 'En circulación'}
              </span>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-stone-400 dark:text-stone-500 uppercase font-semibold">
                Próxima parada
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                {tram.nextStopName}
              </div>
            </div>
          </div>

          {/* Destination & ETA */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-2xl bg-stone-50 dark:bg-slate-800/70 border border-stone-200/80 dark:border-slate-700/80">
              <div className="text-[10px] font-semibold uppercase text-stone-500 dark:text-stone-400">
                Destino final
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-xs mt-0.5 truncate">
                {tram.destinationName}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-stone-50 dark:bg-slate-800/70 border border-stone-200/80 dark:border-slate-700/80">
              <div className="text-[10px] font-semibold uppercase text-stone-500 dark:text-stone-400">
                Tiempo estimado
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-xs mt-0.5">
                {tram.etaMinutes === 0 ? 'En parada' : `~${tram.etaMinutes} min`}
              </div>
            </div>
          </div>

          {/* Additional details: speed and orientation */}
          <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400 text-[11px] pt-1">
            <div className="flex items-center gap-1.5 p-2 bg-stone-50 dark:bg-slate-800/60 rounded-xl">
              <Gauge size={13} className="text-slate-400 dark:text-slate-500" />
              <span>Velocidad: ~{tram.speedKmH} km/h</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 bg-stone-50 dark:bg-slate-800/60 rounded-xl">
              <Compass size={13} className="text-slate-400 dark:text-slate-500" />
              <span>Rumbo: {Math.round(tram.headingAngle)}°</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-stone-800 hover:bg-stone-900 dark:bg-stone-700 dark:hover:bg-stone-600 text-white rounded-xl font-bold text-xs transition"
        >
          Cerrar
        </button>
      </div>
    </>
  );
};
