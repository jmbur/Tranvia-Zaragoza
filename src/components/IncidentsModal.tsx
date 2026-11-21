import React from 'react';
import { Incident, StopWithRealtime } from '../types';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  ExternalLink,
  MapPin,
  TrainFront,
  ShieldCheck,
  AlertOctagon,
} from 'lucide-react';

interface IncidentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidents: Incident[];
  stops: StopWithRealtime[];
  onSelectStop?: (stop: StopWithRealtime) => void;
}

export const IncidentsModal: React.FC<IncidentsModalProps> = ({
  isOpen,
  onClose,
  incidents,
  stops,
  onSelectStop,
}) => {
  if (!isOpen) return null;

  const hasHighSeverity = incidents.some((inc) => inc.severity === 'high');
  const hasMediumSeverity = incidents.some((inc) => inc.severity === 'medium');

  const overallStatus = hasHighSeverity
    ? {
        label: 'Corte o alteración severa',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
        bgClass: 'bg-rose-50 border-rose-200',
        icon: AlertOctagon,
        iconColor: 'text-rose-600',
        desc: 'Existe una interrupción en algún tramo de la línea. Consulta el detalle abajo.',
      }
    : hasMediumSeverity
    ? {
        label: 'Frecuencias alteradas / Aviso',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        bgClass: 'bg-amber-50 border-amber-200',
        icon: AlertTriangle,
        iconColor: 'text-amber-600',
        desc: 'Servicio activo con posibles demoras en tramos concretos.',
      }
    : {
        label: 'Servicio ordinario normal',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        bgClass: 'bg-emerald-50 border-emerald-200',
        icon: CheckCircle2,
        iconColor: 'text-emerald-600',
        desc: 'Línea 1 funcionando sin incidencias reseñables en vía. Frecuencias habituales.',
      };

  const StatusIcon = overallStatus.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div
        id="incidents-modal"
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shadow-xs ${
                hasHighSeverity
                  ? 'bg-rose-600 text-white'
                  : hasMediumSeverity
                  ? 'bg-amber-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Incidencias y Avisos de Servicio
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Información oficial en tiempo real del Tranvía de Zaragoza
              </p>
            </div>
          </div>

          <button
            id="incidents-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Overall Line Status Banner */}
          <div
            className={`p-4 rounded-2xl border ${overallStatus.bgClass} dark:bg-slate-800/80 dark:border-slate-700 flex items-start gap-3`}
          >
            <StatusIcon size={20} className={`shrink-0 ${overallStatus.iconColor} mt-0.5`} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-slate-100">Estado Línea 1</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${overallStatus.badgeClass}`}
                >
                  {overallStatus.label}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {overallStatus.desc}
              </p>
            </div>
          </div>

          {/* List of active alerts & notices */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Avisos activos ({incidents.length})
              </h3>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Actualizado en tiempo real
              </span>
            </div>

            <div className="space-y-2.5">
              {incidents.map((incident) => {
                const isHigh = incident.severity === 'high';
                const isMedium = incident.severity === 'medium';

                return (
                  <div
                    key={incident.id}
                    className={`p-3.5 rounded-2xl border transition ${
                      isHigh
                        ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                        : isMedium
                        ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isHigh
                              ? 'bg-rose-500'
                              : isMedium
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {incident.title}
                        </h4>
                      </div>

                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium shrink-0">
                        {incident.timestamp}
                      </span>
                    </div>

                    <p className="text-slate-700 dark:text-slate-300 text-[11px] mt-1.5 leading-relaxed">
                      {incident.description}
                    </p>

                    {incident.affectedSection && (
                      <div className="mt-2 text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <TrainFront size={12} className="text-slate-400" />
                        <span>Tramo: <strong className="text-slate-800 dark:text-slate-200">{incident.affectedSection}</strong></span>
                      </div>
                    )}

                    {/* Source tag & Affected Stops chips */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        Fuente: {incident.source}
                      </span>

                      {incident.affectedStops && incident.affectedStops.length > 0 && onSelectStop && (
                        <div className="flex flex-wrap gap-1">
                          {incident.affectedStops.map((stopName, idx) => {
                            const matched = stops.find(
                              (s) =>
                                s.cleanName.toLowerCase() === stopName.toLowerCase() ||
                                s.name.toLowerCase() === stopName.toLowerCase() ||
                                s.id === stopName
                            );
                            if (!matched) return null;
                            return (
                              <button
                                key={idx}
                                onClick={() => {
                                  onSelectStop(matched);
                                  onClose();
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 text-slate-700 dark:text-slate-200 hover:text-emerald-800 dark:hover:text-emerald-400 rounded-lg text-[10px] font-semibold transition shadow-2xs"
                              >
                                <MapPin size={10} className="text-emerald-600 dark:text-emerald-400" />
                                <span>Ver {matched.cleanName}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Useful Official Links */}
          <div className="pt-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Info size={14} className="text-slate-400" />
                <span>Atención al cliente Tranvías: 902 20 50 10</span>
              </div>
              <a
                href="https://www.tranviasdezaragoza.es"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 font-bold flex items-center gap-1"
              >
                <span>Web oficial</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-900 dark:bg-stone-700 dark:hover:bg-stone-600 text-white rounded-xl font-bold text-xs transition shadow-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
