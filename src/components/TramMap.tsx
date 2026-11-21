import React from 'react';
import {
  StopWithRealtime,
  TramConvoy,
  DirectionType,
  Incident,
} from '../types';
import { LeafletMap } from './LeafletMap';

interface TramMapProps {
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
  onOpenIncidents?: () => void;
  darkMode?: boolean;
}

export const TramMap: React.FC<TramMapProps> = ({
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
  return (
    <LeafletMap
      stops={stops}
      trams={trams}
      selectedDirection={selectedDirection}
      selectedStop={selectedStop}
      onSelectStop={onSelectStop}
      selectedTram={selectedTram}
      onSelectTram={onSelectTram}
      userLocation={userLocation}
      onLocateMe={onLocateMe}
      isLocating={isLocating}
      incidents={incidents}
      darkMode={darkMode}
    />
  );
};
